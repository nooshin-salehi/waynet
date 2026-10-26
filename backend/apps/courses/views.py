import mimetypes
import re
import secrets
from pathlib import Path
from django.conf import settings
from django.core import signing
from django.http import HttpResponse, StreamingHttpResponse
from rest_framework import viewsets, serializers
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, NotFound
from apps.core.permissions import CatalogPermission, TeachingPermission
from apps.learning.services import has_session_access
from .models import Category, Course, CourseSession, Career
from .serializers import CategorySerializer, CourseSerializer, SessionSerializer, CareerSerializer

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [CatalogPermission]
    def perform_destroy(self, instance):
        if instance.courses.exists():
            raise serializers.ValidationError('دسته‌بندی دارای دوره است.')
        instance.delete()

class CareerViewSet(viewsets.ModelViewSet):
    queryset = Career.objects.all()
    serializer_class = CareerSerializer
    permission_classes = [CatalogPermission]

class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.select_related('teacher_user').prefetch_related('sessions').all()
    serializer_class = CourseSerializer
    permission_classes = [TeachingPermission]
    def get_queryset(self):
        q = super().get_queryset()
        user = self.request.user
        if self.request.query_params.get('mine') == '1':
            if not user.is_authenticated:
                return q.none()
            q = q.filter(teacher_user=user)
        elif self.action == 'list' and not (user.is_authenticated and user.role == 'admin'):
            q = q.filter(is_active=True)
        category = self.request.query_params.get('category')
        teacher = self.request.query_params.get('teacher')
        search = self.request.query_params.get('q')
        if category: q = q.filter(category_id=category)
        if teacher: q = q.filter(teacher_user_id=teacher)
        if search: q = q.filter(title__icontains=search)
        return q
    def perform_create(self, serializer):
        if self.request.user.role == 'teacher':
            serializer.save(teacher_user=self.request.user, teacher=self.request.user.fullname, is_active=True)
        else:
            serializer.save()
    def perform_update(self, serializer):
        if self.request.user.role == 'teacher':
            serializer.save(teacher_user=self.request.user, is_active=serializer.instance.is_active)
        else:
            serializer.save()
    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save()
    @action(detail=True, methods=['post'])
    def class_link(self, request, pk=None):
        course = self.get_object()
        s = serializers.URLField(allow_blank=True)
        course.class_link = s.run_validation(request.data.get('url', '')) or None
        course.save()
        return Response(self.get_serializer(course).data)

class SessionViewSet(viewsets.ModelViewSet):
    queryset = CourseSession.objects.select_related('course').all().order_by('order', 'pk')
    serializer_class = SessionSerializer
    permission_classes = [TeachingPermission]
    def get_queryset(self):
        q = super().get_queryset()
        course = self.request.query_params.get('course')
        return q.filter(course_id=course) if course else q
    def check_course(self, course):
        user = self.request.user
        if user.role != 'admin' and course.teacher_user_id != user.pk:
            raise PermissionDenied('فقط مدرس همین دوره می‌تواند آن را تغییر دهد.')
    def perform_create(self, serializer):
        self.check_course(serializer.validated_data['course'])
        serializer.save(teacher=serializer.validated_data['course'].teacher_user)
    def perform_update(self, serializer):
        if 'course' in serializer.validated_data and serializer.validated_data['course'] != serializer.instance.course:
            raise serializers.ValidationError('دوره جلسه قابل تغییر نیست.')
        serializer.save()
    @action(detail=True, methods=['post'])
    def move(self, request, pk=None):
        session = self.get_object()
        session.order = serializers.IntegerField(min_value=0).run_validation(request.data.get('order'))
        session.save()
        return Response(self.get_serializer(session).data)
    @action(detail=True, methods=['post', 'delete'])
    def video(self, request, pk=None):
        session = self.get_object()
        if request.method == 'DELETE':
            if session.video_file: session.video_file.delete(save=False)
            session.video_status = 'none'
            session.video_size = 0
            session.save()
            return Response({'ok': True})
        upload = request.FILES.get('file')
        if not upload or upload.size > settings.MAX_VIDEO_BYTES or Path(upload.name).suffix.lower() not in ['.mp4', '.webm']:
            raise serializers.ValidationError('فایل MP4 یا WebM با حجم مجاز لازم است.')
        # Private filesystem storage: never expose this field through public serializers.
        from django.core.files.storage import FileSystemStorage
        storage = FileSystemStorage(location=settings.PRIVATE_MEDIA_ROOT)
        name = storage.save(f'courses/{session.course_id}/{secrets.token_hex(16)}{Path(upload.name).suffix.lower()}', upload)
        if session.video_file:
            old = session.video_file.name
            storage.delete(old)
        session.video_file.name = name
        session.video_original_name = Path(upload.name).name
        session.video_mime = mimetypes.guess_type(upload.name)[0] or 'video/mp4'
        session.video_size = upload.size
        session.video_status = 'ready'
        session.save()
        return Response(self.get_serializer(session).data)
    @action(detail=True, methods=['get'], permission_classes=[AllowAny])
    def playback(self, request, pk=None):
        session = self.get_object()
        if not has_session_access(request.user, session):
            raise PermissionDenied('این جلسه قفل است.')
        if not session.video_file and not (settings.ALLOW_SAMPLE_VIDEO and (settings.PRIVATE_MEDIA_ROOT / 'sample-lesson.mp4').is_file()):
            raise NotFound('ویدیو بارگذاری نشده است.')
        token = signing.dumps({'session': session.pk, 'user': request.user.pk if request.user.is_authenticated else None}, salt='video')
        return Response({'url': f'{settings.BACKEND_URL}/api/stream/{token}/', 'expires_in': settings.VIDEO_TOKEN_TTL})

@api_view(['GET'])
@permission_classes([AllowAny])
def stream(request, token):
    from apps.accounts.models import User
    try:
        data = signing.loads(token, salt='video', max_age=settings.VIDEO_TOKEN_TTL)
    except signing.BadSignature:
        raise PermissionDenied('لینک منقضی یا نامعتبر است.')
    session = CourseSession.objects.select_related('course').filter(pk=data['session']).first()
    user = User.objects.filter(pk=data['user'], is_active=True).first() if data['user'] else None
    if not session or not has_session_access(user, session):
        raise PermissionDenied('دسترسی لغو شده است.')
    base = settings.PRIVATE_MEDIA_ROOT.resolve()
    name = session.video_file.name or ('sample-lesson.mp4' if settings.ALLOW_SAMPLE_VIDEO else '')
    target = (base / name).resolve()
    if not target.is_relative_to(base) or not target.is_file():
        raise NotFound('ویدیو موجود نیست.')
    prefix = settings.VIDEO_ACCEL_REDIRECT_PREFIX
    if prefix:
        # nginx فایل و Range را خودش مدیریت می‌کند؛ worker پایتون آزاد می‌ماند.
        response = HttpResponse(status=200, content_type=session.video_mime or 'video/mp4')
        response['X-Accel-Redirect'] = prefix.rstrip('/') + '/' + target.relative_to(base).as_posix()
        response['Accept-Ranges'] = 'bytes'
        response['Cache-Control'] = 'private, no-store'
        return response
    size = target.stat().st_size
    start, end, status = 0, size-1, 200
    range_header = request.headers.get('Range')
    if range_header:
        match = re.fullmatch(r'bytes=(\d*)-(\d*)', range_header)
        if not match or not any(match.groups()):
            return Response(status=416, headers={'Content-Range': f'bytes */{size}'})
        a,b = match.groups()
        if a:
            start = int(a)
            end = min(int(b), size-1) if b else size-1
        else:
            start = max(0, size-int(b))
        if start > end or start >= size:
            return Response(status=416, headers={'Content-Range': f'bytes */{size}'})
        status = 206
    def chunks():
        with target.open('rb') as video:
            video.seek(start)
            remaining = end-start+1
            while remaining > 0:
                chunk = video.read(min(65536, remaining))
                if not chunk: break
                remaining -= len(chunk)
                yield chunk
    response = StreamingHttpResponse(chunks(), status=status, content_type=session.video_mime or 'video/mp4')
    response['Accept-Ranges'] = 'bytes'
    response['Content-Length'] = str(end-start+1)
    response['Cache-Control'] = 'private, no-store'
    if status == 206: response['Content-Range'] = f'bytes {start}-{end}/{size}'
    return response

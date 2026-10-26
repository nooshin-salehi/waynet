from django.db.models import Q
from django.db import transaction
from django.utils import timezone
from rest_framework import viewsets, serializers
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from apps.core.permissions import IsAdmin
from .models import Enrollment, SessionAccessGrant, CourseProgress, CourseAnnouncement, CourseQuestion
from .serializers import EnrollmentSerializer, GrantSerializer, ProgressSerializer, AnnouncementSerializer, QuestionSerializer
from .services import has_course_access, has_session_access

class EnrollmentViewSet(viewsets.ModelViewSet):
    queryset = Enrollment.objects.all()
    serializer_class = EnrollmentSerializer
    permission_classes = [IsAdmin]

class GrantViewSet(viewsets.ModelViewSet):
    queryset = SessionAccessGrant.objects.all()
    serializer_class = GrantSerializer
    permission_classes = [IsAdmin]
    def perform_create(self, serializer):
        serializer.save(granted_by=self.request.user)

class ProgressViewSet(viewsets.ModelViewSet):
    queryset = CourseProgress.objects.select_related('session__course').all()
    serializer_class = ProgressSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'head', 'options']
    def get_queryset(self):
        return super().get_queryset().filter(student=self.request.user)
    def create(self, request, *args, **kwargs):
        s = self.get_serializer(data=request.data)
        s.is_valid(raise_exception=True)
        session = s.validated_data['session']
        if not has_session_access(request.user, session):
            raise PermissionDenied('دسترسی به جلسه ندارید.')
        with transaction.atomic():
            obj, _ = CourseProgress.objects.select_for_update().get_or_create(student=request.user, course=session.course, session=session)
            obj.watched_duration = max(obj.watched_duration, s.validated_data.get('watched_duration', 0))
            obj.completed = obj.completed or s.validated_data.get('completed', False)
            obj.save()
        return Response(self.get_serializer(obj).data)

class AnnouncementViewSet(viewsets.ModelViewSet):
    queryset = CourseAnnouncement.objects.select_related('course').order_by('-announcement_date')
    serializer_class = AnnouncementSerializer
    def get_queryset(self):
        q = super().get_queryset()
        user = self.request.user
        if user.role == 'teacher': q = q.filter(course__teacher_user=user)
        elif user.role != 'admin':
            q = q.filter(course__enrollment__student=user, course__enrollment__status__in=['active', 'completed']).filter(Q(course__enrollment__expires_at__isnull=True)|Q(course__enrollment__expires_at__gt=timezone.now())).distinct()
        course = self.request.query_params.get('course')
        return q.filter(course_id=course) if course else q
    def ensure_teacher(self, course):
        user = self.request.user
        if user.role != 'admin' and (user.role != 'teacher' or course.teacher_user_id != user.pk):
            raise PermissionDenied('فقط مدرس همین دوره مجاز است.')
    def perform_create(self, serializer):
        course = serializer.validated_data['course']
        self.ensure_teacher(course)
        serializer.save(teacher=self.request.user)
    def perform_update(self, serializer):
        self.ensure_teacher(serializer.instance.course)
        if serializer.validated_data.get('course', serializer.instance.course) != serializer.instance.course:
            raise serializers.ValidationError('دوره قابل تغییر نیست.')
        serializer.save()
    def perform_destroy(self, instance):
        self.ensure_teacher(instance.course)
        instance.delete()

class QuestionViewSet(viewsets.ModelViewSet):
    queryset = CourseQuestion.objects.select_related('course').order_by('-created_at')
    serializer_class = QuestionSerializer
    def get_queryset(self):
        q = super().get_queryset()
        user = self.request.user
        if user.role == 'teacher': q = q.filter(course__teacher_user=user)
        elif user.role != 'admin': q = q.filter(student=user)
        course = self.request.query_params.get('course')
        return q.filter(course_id=course) if course else q
    def perform_create(self, serializer):
        course = serializer.validated_data['course']
        if not has_course_access(self.request.user, course) or not course.teacher_user:
            raise PermissionDenied('ثبت سوال نیاز به دسترسی دوره و مدرس دارد.')
        serializer.save(student=self.request.user, teacher=course.teacher_user)
    def perform_update(self, serializer):
        if serializer.instance.student_id != self.request.user.pk:
            raise PermissionDenied()
        serializer.save(course=serializer.instance.course)
    def perform_destroy(self, instance):
        if self.request.user.role != 'admin' and instance.student_id != self.request.user.pk:
            raise PermissionDenied()
        instance.delete()
    @action(detail=True, methods=['post', 'delete'])
    def reply(self, request, pk=None):
        obj = self.get_object()
        if request.user.role != 'admin' and (request.user.role != 'teacher' or obj.course.teacher_user_id != request.user.pk):
            raise PermissionDenied()
        obj.reply_text = serializers.CharField().run_validation(request.data.get('text')) if request.method == 'POST' else ''
        obj.replied_at = timezone.now() if obj.reply_text else None
        obj.save()
        return Response(self.get_serializer(obj).data)

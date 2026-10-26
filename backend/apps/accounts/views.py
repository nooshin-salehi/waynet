from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.conf import settings
from rest_framework import viewsets, serializers
from rest_framework.decorators import api_view, permission_classes, throttle_classes, action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.throttling import SimpleRateThrottle
from rest_framework.response import Response
from apps.core.permissions import IsAdmin
import hmac
import re
from datetime import timedelta
from django.db import transaction
from django.utils import timezone
from .models import User, AuthToken, PhoneVerification
from .services import make_code, hash_code, send_verification_sms, SmsError
from .serializers import UserSerializer, InstructorSerializer

class AuthThrottle(SimpleRateThrottle):
    scope = 'auth'
    def get_cache_key(self, request, view):
        return self.cache_format % {'scope': self.scope, 'ident': self.get_ident(request)}

def auth_result(user):
    raw, token = AuthToken.issue(user)
    return {'token': raw, 'user': UserSerializer(user).data}

@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([AuthThrottle])
def login(request):
    user = User.objects.filter(phone=request.data.get('phone')).first()
    if not user or not user.is_active or not user.check_password(request.data.get('password', '')):
        return Response({'detail': 'شماره موبایل یا رمز عبور نادرست است.'}, status=400)
    return Response(auth_result(user))

PHONE_RE = re.compile(r'09[0-9]{9}')

def issue_code(phone, purpose):
    """ساخت و ارسال کد پیامکی (ثبت‌نام یا بازیابی رمز) با رعایت فاصلهٔ ارسال مجدد."""
    now = timezone.now()
    existing = PhoneVerification.objects.filter(phone=phone, purpose=purpose).first()
    if existing:
        wait = settings.SMS_RESEND_COOLDOWN - (now - existing.last_sent_at).total_seconds()
        if wait > 0:
            return Response({'detail': f'لطفاً {int(wait) + 1} ثانیه دیگر دوباره تلاش کنید.', 'retry_after': int(wait) + 1}, status=429)
    code = make_code()
    result = {'ttl': settings.SMS_CODE_TTL, 'cooldown': settings.SMS_RESEND_COOLDOWN}
    if settings.DEBUG and not settings.KAVENEGAR_API_KEY:
        result['debug_code'] = code  # فقط برای توسعهٔ محلی بدون کلید کاوه‌نگار
    else:
        try:
            send_verification_sms(phone, code, purpose)
        except SmsError as exc:
            return Response({'detail': str(exc)}, status=503)
    PhoneVerification.objects.update_or_create(phone=phone, purpose=purpose, defaults={
        'code_hash': hash_code(phone, code, purpose), 'attempts': 0, 'last_sent_at': now,
        'expires_at': now + timedelta(seconds=settings.SMS_CODE_TTL)})
    return Response(result)

@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([AuthThrottle])
def send_code(request):
    phone = str(request.data.get('phone', '')).strip()
    if not PHONE_RE.fullmatch(phone):
        raise serializers.ValidationError({'phone': 'شماره موبایل معتبر وارد کنید.'})
    if User.objects.filter(phone=phone).exists():
        raise serializers.ValidationError({'phone': 'با این شماره قبلاً ثبت‌نام شده است.'})
    response = issue_code(phone, 'register')
    if response.status_code == 200:
        response.data['detail'] = 'کد تأیید برای شما پیامک شد.'
    return response

def check_code(phone, code, purpose='register'):
    # خطا باید بعد از خروج از تراکنش پرتاب شود، وگرنه شمارش تلاش‌های اشتباه rollback می‌شود.
    error = None
    with transaction.atomic():
        pv = PhoneVerification.objects.select_for_update().filter(phone=phone, purpose=purpose).first()
        if not pv or pv.expires_at < timezone.now():
            error = 'کد تأیید منقضی شده است؛ کد جدید بگیرید.'
        elif pv.attempts >= settings.SMS_MAX_ATTEMPTS:
            pv.delete()
            error = 'تعداد تلاش‌ها زیاد بود؛ کد جدید بگیرید.'
        elif not hmac.compare_digest(pv.code_hash, hash_code(phone, str(code).strip(), purpose)):
            pv.attempts += 1
            pv.save(update_fields=['attempts'])
            error = 'کد تأیید نادرست است.'
        else:
            pv.delete()
    if error:
        raise serializers.ValidationError(error)

@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([AuthThrottle])
def register(request):
    data = {k: request.data.get(k, '') for k in ('phone', 'fullname', 'password')}
    s = UserSerializer(data={**data, 'role': 'student'})
    s.is_valid(raise_exception=True)
    check_code(s.validated_data['phone'], request.data.get('code', ''))
    return Response(auth_result(s.save()), status=201)

@api_view(['POST'])
def logout(request):
    request.auth.delete()
    return Response({'ok': True})

@api_view(['GET', 'PATCH'])
def me(request):
    if request.method == 'PATCH':
        allowed = ('fullname', 'name', 'specialty', 'teaching_field', 'bio')
        s = UserSerializer(request.user, data={k:v for k,v in request.data.items() if k in allowed}, partial=True)
        s.is_valid(raise_exception=True)
        s.save()
    return Response(UserSerializer(request.user).data)

@api_view(['POST'])
def change_password(request):
    if not request.user.check_password(request.data.get('old_password', '')):
        raise serializers.ValidationError('رمز فعلی نادرست است.')
    password = request.data.get('password', '')
    try:
        validate_password(password, request.user)
    except DjangoValidationError as exc:
        raise serializers.ValidationError(exc.messages)
    request.user.set_password(password)
    request.user.save()
    request.user.tokens.all().delete()
    return Response({'ok': True})

@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([AuthThrottle])
def forgot_password(request):
    """ارسال کد بازیابی رمز به شمارهٔ کاربر. پاسخ برای شمارهٔ ناموجود هم یکسان است تا وجود حساب فاش نشود."""
    phone = str(request.data.get('phone', '')).strip()
    if not PHONE_RE.fullmatch(phone):
        raise serializers.ValidationError({'phone': 'شماره موبایل معتبر وارد کنید.'})
    generic = {'detail': 'اگر با این شماره حساب داشته باشید، کد بازیابی پیامک می‌شود.', 'ttl': settings.SMS_CODE_TTL, 'cooldown': settings.SMS_RESEND_COOLDOWN}
    if not User.objects.filter(phone=phone, is_active=True).exists():
        return Response(generic)
    response = issue_code(phone, 'reset')
    if response.status_code == 200:
        response.data['detail'] = generic['detail']
    return response

@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([AuthThrottle])
def reset_password(request):
    """تأیید کد پیامکی و تعیین رمز جدید."""
    phone = str(request.data.get('phone', '')).strip()
    user = User.objects.filter(phone=phone, is_active=True).first()
    if not user:
        raise serializers.ValidationError('کد تأیید نادرست یا منقضی است.')
    password = request.data.get('password', '')
    try:
        validate_password(password, user)  # قبل از مصرف کد، تا رمز ضعیف کد را نسوزاند
    except DjangoValidationError as exc:
        raise serializers.ValidationError(exc.messages)
    check_code(phone, request.data.get('code', ''), 'reset')
    user.set_password(password)
    user.save()
    user.tokens.all().delete()
    return Response({'ok': True})

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('-created_at')
    serializer_class = UserSerializer
    permission_classes = [IsAdmin]
    def get_queryset(self):
        q = super().get_queryset()
        role = self.request.query_params.get('role')
        return q.filter(role=role) if role else q
    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        user = self.get_object()
        if user == request.user:
            raise serializers.ValidationError('حساب خود را غیرفعال نکنید.')
        user.is_active = not user.is_active
        user.save()
        user.tokens.all().delete()
        return Response(self.get_serializer(user).data)
    def perform_destroy(self, instance):
        if instance == self.request.user:
            raise serializers.ValidationError('حساب خود را حذف نکنید.')
        instance.is_active = False
        instance.save()
        instance.tokens.all().delete()

class InstructorViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.filter(role='teacher', is_active=True)
    serializer_class = InstructorSerializer
    permission_classes = [AllowAny]

from django.db import models
from django.utils import timezone
from django.conf import settings
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
import secrets

class UserManager(BaseUserManager):

    def create_user(self, phone, password=None, **extra):
        if not phone:
            raise ValueError('Phone is required')
        extra.setdefault('name', extra.get('fullname', ''))
        u = self.model(phone=phone, **extra)
        u.set_password(password) if password else u.set_unusable_password()
        u.save(using=self._db)
        return u

    def create_superuser(self, phone, password, **extra):
        extra.update(role='admin', is_staff=True, is_superuser=True, is_active=True)
        return self.create_user(phone, password, **extra)

class User(AbstractBaseUser, PermissionsMixin):
    # پیش‌فرض Django ۱۲۸ نویسه است و هش scrypt قدیمی (با پیشوند و salt) از آن بلندتر است؛ PostgreSQL برخلاف SQLite این را رد می‌کند.
    password = models.CharField('password', max_length=255)
    legacy_id = models.CharField(max_length=120, unique=True, null=True, blank=True)
    ROLE_CHOICES = [('admin', 'admin'), ('teacher', 'teacher'), ('student', 'student')]
    phone = models.CharField(max_length=32, unique=True)
    fullname = models.CharField(max_length=180)
    name = models.CharField(max_length=180, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='student')
    avatar = models.CharField(max_length=500, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    specialty = models.CharField(max_length=255, blank=True, null=True)
    teaching_field = models.CharField(max_length=255, blank=True, null=True)
    bio = models.TextField(blank=True, null=True)
    price_overrides = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_staff = models.BooleanField(default=False)
    USERNAME_FIELD = 'phone'
    REQUIRED_FIELDS = ['fullname']
    objects = UserManager()

    def __str__(self):
        return self.fullname or self.phone

class AuthToken(models.Model):
    key = models.CharField(max_length=64, unique=True, db_index=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='tokens')
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    @classmethod
    def issue(cls, user):
        import hashlib
        from datetime import timedelta
        raw = secrets.token_urlsafe(48)
        token = cls.objects.create(key=hashlib.sha256(raw.encode()).hexdigest(), user=user, expires_at=timezone.now() + timedelta(hours=8 if user.role == 'admin' else 168))
        return (raw, token)


class PhoneVerification(models.Model):
    """کد تأیید پیامکی ثبت‌نام و بازیابی رمز؛ کد فقط به‌صورت هش نگه‌داری می‌شود."""
    phone = models.CharField(max_length=32)
    purpose = models.CharField(max_length=16, default='register')  # register | reset
    code_hash = models.CharField(max_length=64)
    attempts = models.PositiveSmallIntegerField(default=0)
    last_sent_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField()

    class Meta:
        unique_together = [('phone', 'purpose')]

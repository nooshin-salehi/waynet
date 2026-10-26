from django.db import models
from django.utils import timezone
from django.conf import settings
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
import secrets
from apps.core.storage import PrivateVideoStorage

class Category(models.Model):
    id = models.CharField(max_length=80, primary_key=True)
    title = models.CharField(max_length=200)
    short = models.CharField(max_length=200)
    type = models.CharField(max_length=80)
    desc = models.TextField()
    icon = models.CharField(max_length=80)

class Course(models.Model):
    id = models.CharField(max_length=120, primary_key=True)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name='courses')
    title = models.CharField(max_length=300)
    category_name = models.CharField(max_length=120)
    teacher = models.CharField(max_length=180)
    teacher_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='courses')
    duration = models.CharField(max_length=100)
    capacity = models.CharField(max_length=100)
    price = models.CharField(max_length=100)
    desc = models.TextField()
    type = models.CharField(max_length=80)
    level = models.CharField(max_length=100)
    audience = models.TextField()
    prerequisites = models.TextField()
    goals = models.JSONField(default=list)
    skills = models.JSONField(default=list)
    features = models.JSONField(default=list)
    is_active = models.BooleanField(default=True)
    class_link = models.URLField(blank=True, null=True)

class CourseSession(models.Model):
    legacy_id = models.CharField(max_length=120, unique=True, null=True, blank=True)
    course = models.ForeignKey('courses.Course', on_delete=models.CASCADE, related_name='sessions')
    teacher = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='teaching_sessions')
    title = models.CharField(max_length=300)
    description = models.TextField(blank=True)
    video_url = models.URLField(blank=True, null=True)
    duration = models.CharField(max_length=100, blank=True)
    order = models.PositiveIntegerField(default=0)
    is_free = models.BooleanField(default=False)
    video_file = models.FileField(storage=PrivateVideoStorage(), upload_to='courses/', blank=True, null=True)
    video_original_name = models.CharField(max_length=300, blank=True)
    video_size = models.BigIntegerField(default=0)
    video_mime = models.CharField(max_length=120, blank=True)
    video_status = models.CharField(max_length=20, default='none')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class Career(models.Model):
    id = models.CharField(max_length=120, primary_key=True)
    title = models.CharField(max_length=200)
    summary = models.CharField(max_length=500)
    description = models.TextField()
    course_ids = models.JSONField(default=list)

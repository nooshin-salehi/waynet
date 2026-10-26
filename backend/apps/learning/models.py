from django.db import models
from django.utils import timezone
from django.conf import settings
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
import secrets

class Enrollment(models.Model):
    legacy_id = models.CharField(max_length=120, unique=True, null=True, blank=True)
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='enrollments')
    course = models.ForeignKey('courses.Course', on_delete=models.CASCADE)
    order = models.ForeignKey('commerce.Order', on_delete=models.SET_NULL, null=True, blank=True)
    enrolled_at = models.DateTimeField(default=timezone.now)
    status = models.CharField(max_length=30, choices=[(v, v) for v in ['active', 'completed', 'cancelled', 'expired']], default='active')
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['student', 'course'], condition=models.Q(status='active'), name='unique_active_enrollment')]

class SessionAccessGrant(models.Model):
    legacy_id = models.CharField(max_length=120, unique=True, null=True, blank=True)
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='session_grants')
    course = models.ForeignKey('courses.Course', on_delete=models.CASCADE)
    session = models.ForeignKey('courses.CourseSession', on_delete=models.CASCADE)
    granted_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='granted_sessions')
    granted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [('student', 'course', 'session')]

class CourseProgress(models.Model):
    legacy_id = models.CharField(max_length=120, unique=True, null=True, blank=True)
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='progress')
    course = models.ForeignKey('courses.Course', on_delete=models.CASCADE)
    session = models.ForeignKey('courses.CourseSession', on_delete=models.CASCADE)
    watched_duration = models.PositiveIntegerField(default=0)
    completed = models.BooleanField(default=False)
    last_watched_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [('student', 'course', 'session')]

class CourseAnnouncement(models.Model):
    legacy_id = models.CharField(max_length=120, unique=True, null=True, blank=True)
    course = models.ForeignKey('courses.Course', on_delete=models.CASCADE, related_name='announcements')
    teacher = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    title = models.CharField(max_length=300)
    text = models.TextField()
    announcement_date = models.DateTimeField(default=timezone.now)
    class_link = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

class CourseQuestion(models.Model):
    legacy_id = models.CharField(max_length=120, unique=True, null=True, blank=True)
    TYPE = [('question', 'question'), ('comment', 'comment')]
    course = models.ForeignKey('courses.Course', on_delete=models.CASCADE, related_name='questions')
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    teacher = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='answered_questions')
    type = models.CharField(max_length=20, choices=TYPE, default='question')
    text = models.TextField()
    reply_text = models.TextField(blank=True)
    replied_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

from django.db import models
from django.utils import timezone
from django.conf import settings
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
import secrets

class Testimonial(models.Model):
    legacy_id = models.CharField(max_length=120, unique=True, null=True, blank=True)
    name = models.CharField(max_length=180)
    role = models.CharField(max_length=180, blank=True)
    text = models.TextField()
    phone = models.CharField(max_length=32)
    approved = models.BooleanField(default=False)
    reply_text = models.TextField(blank=True)
    replied_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

class ContactMessage(models.Model):
    name = models.CharField(max_length=180)
    phone = models.CharField(max_length=32, blank=True)
    email = models.EmailField(blank=True)
    text = models.TextField()
    service = models.CharField(max_length=120, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

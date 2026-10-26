from django.db import models
from django.utils import timezone
from django.conf import settings
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
import secrets

class Order(models.Model):
    legacy_id = models.CharField(max_length=120, unique=True, null=True, blank=True)
    STATUS = [('pending', 'pending'), ('paid', 'paid'), ('failed', 'failed')]
    session_id = models.CharField(max_length=120)
    phone = models.CharField(max_length=32, blank=True)
    items = models.JSONField(default=list)
    amount = models.PositiveBigIntegerField()
    authority = models.CharField(max_length=200, blank=True, null=True, unique=True)
    ref_id = models.CharField(max_length=200, blank=True)
    status = models.CharField(max_length=20, choices=STATUS, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

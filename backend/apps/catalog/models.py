from django.db import models
from django.utils import timezone
from django.conf import settings
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
import secrets

class Product(models.Model):
    id = models.CharField(max_length=120, primary_key=True)
    name = models.CharField(max_length=200)
    short = models.CharField(max_length=200)
    type = models.CharField(max_length=80)
    desc = models.TextField()
    price = models.PositiveBigIntegerField()
    specs = models.JSONField(default=list)
    image = models.FileField(upload_to='products/', blank=True, null=True)

class Service(models.Model):
    id = models.CharField(max_length=120, primary_key=True)
    title = models.CharField(max_length=200)
    short = models.CharField(max_length=200)
    type = models.CharField(max_length=80)
    desc = models.TextField()
    steps = models.JSONField(default=list)
    benefits = models.JSONField(default=list)
    features = models.JSONField(default=list)
    image = models.FileField(upload_to='services/', blank=True, null=True)

class Rack(models.Model):
    id = models.CharField(max_length=120, primary_key=True)
    name = models.CharField(max_length=200)
    capacity = models.CharField(max_length=80)
    terms = models.TextField()
    duration = models.CharField(max_length=100)
    price_note = models.TextField()
    equipment = models.JSONField(default=list)
    specs = models.JSONField(default=list)
    image = models.FileField(upload_to='racks/', blank=True, null=True)

class RackRequest(models.Model):
    legacy_id = models.CharField(max_length=120, unique=True, null=True, blank=True)
    STATUS = [('pending', 'pending'), ('approved', 'approved'), ('rejected', 'rejected')]
    name = models.CharField(max_length=180)
    phone = models.CharField(max_length=32)
    email = models.EmailField(blank=True)
    rack = models.ForeignKey(Rack, on_delete=models.SET_NULL, null=True, blank=True)
    duration = models.CharField(max_length=100, blank=True)
    start_date = models.CharField(max_length=50, blank=True)
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

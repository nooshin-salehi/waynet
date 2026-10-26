from django.utils import timezone
from rest_framework import viewsets, serializers
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from apps.core.permissions import IsAdmin
from .models import Testimonial, ContactMessage
from .serializers import TestimonialSerializer, ContactSerializer

class TestimonialViewSet(viewsets.ModelViewSet):
    queryset = Testimonial.objects.all().order_by('-created_at')
    serializer_class = TestimonialSerializer
    def get_permissions(self):
        if self.action in ('list', 'retrieve'): return [AllowAny()]
        if self.action == 'create': return [IsAuthenticated()]
        return [IsAdmin()]
    def get_queryset(self):
        q = super().get_queryset()
        user = self.request.user
        return q if user.is_authenticated and user.role == 'admin' else q.filter(approved=True)
    def perform_create(self, serializer):
        serializer.save(phone=self.request.user.phone, approved=False)
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        obj = self.get_object(); obj.approved = True; obj.save()
        return Response(self.get_serializer(obj).data)
    @action(detail=True, methods=['post', 'delete'])
    def reply(self, request, pk=None):
        obj = self.get_object()
        obj.reply_text = serializers.CharField().run_validation(request.data.get('text')) if request.method == 'POST' else ''
        obj.replied_at = timezone.now() if obj.reply_text else None
        obj.save()
        return Response(self.get_serializer(obj).data)

class ContactViewSet(viewsets.ModelViewSet):
    queryset = ContactMessage.objects.all().order_by('-created_at')
    serializer_class = ContactSerializer
    def get_permissions(self):
        return [AllowAny()] if self.action == 'create' else [IsAdmin()]

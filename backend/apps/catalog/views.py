from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from apps.core.permissions import CatalogPermission, IsAdmin
from .models import Product, Service, Rack, RackRequest
from .serializers import ProductSerializer, ServiceSerializer, RackSerializer, RackRequestSerializer

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [CatalogPermission]

class ServiceViewSet(viewsets.ModelViewSet):
    queryset = Service.objects.all()
    serializer_class = ServiceSerializer
    permission_classes = [CatalogPermission]

class RackViewSet(viewsets.ModelViewSet):
    queryset = Rack.objects.all()
    serializer_class = RackSerializer
    permission_classes = [CatalogPermission]

class RackRequestViewSet(viewsets.ModelViewSet):
    queryset = RackRequest.objects.all().order_by('-created_at')
    serializer_class = RackRequestSerializer
    def get_permissions(self):
        return [AllowAny()] if self.action == 'create' else [IsAdmin()]
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        obj = self.get_object(); obj.status = 'approved'; obj.save()
        return Response(self.get_serializer(obj).data)
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        obj = self.get_object(); obj.status = 'rejected'; obj.save()
        return Response(self.get_serializer(obj).data)

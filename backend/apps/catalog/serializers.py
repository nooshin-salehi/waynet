from rest_framework import serializers
from .models import Product, Service, Rack, RackRequest

class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = '__all__'
        read_only_fields = ['status', 'created_at']

class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = '__all__'
        read_only_fields = ['status', 'created_at']

class RackSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rack
        fields = '__all__'
        read_only_fields = ['status', 'created_at']

class RackRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = RackRequest
        fields = '__all__'
        read_only_fields = ['status', 'created_at']

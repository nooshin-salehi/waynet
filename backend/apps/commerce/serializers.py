from rest_framework import serializers
from .models import Order

class OrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ['id', 'phone', 'items', 'amount', 'status', 'authority', 'ref_id', 'created_at']
        read_only_fields = fields

class CheckoutItemSerializer(serializers.Serializer):
    type = serializers.ChoiceField(choices=['course', 'product'])
    id = serializers.CharField(max_length=120)
    qty = serializers.IntegerField(min_value=1, max_value=100, default=1)

class CheckoutSerializer(serializers.Serializer):
    items = CheckoutItemSerializer(many=True, allow_empty=False)
    def validate_items(self, items):
        if len(items) > 100:
            raise serializers.ValidationError('سبد بیش از حد بزرگ است.')
        if len({(i['type'], i['id']) for i in items}) != len(items):
            raise serializers.ValidationError('کالای تکراری در سبد است.')
        return items

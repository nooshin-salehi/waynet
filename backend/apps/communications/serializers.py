from rest_framework import serializers
from .models import Testimonial, ContactMessage

class TestimonialSerializer(serializers.ModelSerializer):
    reply = serializers.SerializerMethodField()
    class Meta:
        model = Testimonial
        fields = ['id', 'name', 'role', 'text', 'approved', 'reply', 'created_at']
        read_only_fields = ['approved', 'created_at']
    def get_reply(self, obj):
        return {'text': obj.reply_text, 'repliedAt': obj.replied_at} if obj.reply_text else None

class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactMessage
        fields = '__all__'
        read_only_fields = ['created_at']

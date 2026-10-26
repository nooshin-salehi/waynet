from rest_framework import serializers
from .models import Category, Course, CourseSession, Career
from apps.learning.services import has_course_access, has_session_access

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'

class SessionSerializer(serializers.ModelSerializer):
    locked = serializers.SerializerMethodField()
    class Meta:
        model = CourseSession
        fields = ['id', 'course', 'teacher', 'title', 'description', 'duration', 'order', 'is_free', 'video_url', 'video_status', 'video_original_name', 'video_size', 'locked']
        read_only_fields = ['teacher', 'video_status', 'video_original_name', 'video_size']
    def get_locked(self, obj):
        return not has_session_access(self.context.get('request').user, obj)

class CourseSerializer(serializers.ModelSerializer):
    sessions = SessionSerializer(many=True, read_only=True)
    teacher_name = serializers.SerializerMethodField()
    class_link = serializers.SerializerMethodField()
    class Meta:
        model = Course
        fields = '__all__'
    def get_teacher_name(self, obj):
        return obj.teacher_user.fullname if obj.teacher_user else obj.teacher
    def get_class_link(self, obj):
        return obj.class_link if has_course_access(self.context['request'].user, obj) else None
    def validate_id(self, value):
        if self.instance and value != self.instance.pk:
            raise serializers.ValidationError('شناسه دوره قابل تغییر نیست.')
        return value
    def validate_teacher_user(self, user):
        if user and (user.role != 'teacher' or not user.is_active):
            raise serializers.ValidationError('مدرس فعال انتخاب کنید.')
        return user

class CareerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Career
        fields = '__all__'

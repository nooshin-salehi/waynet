from rest_framework import serializers
from .models import Enrollment, CourseProgress, SessionAccessGrant, CourseAnnouncement, CourseQuestion

class EnrollmentSerializer(serializers.ModelSerializer):
    status = serializers.ChoiceField(choices=['active', 'completed', 'cancelled', 'expired'], default='active')
    class Meta:
        model = Enrollment
        fields = '__all__'
    def validate(self, data):
        student = data.get('student', getattr(self.instance, 'student', None))
        if student and student.role != 'student':
            raise serializers.ValidationError('دانشجو انتخاب کنید.')
        return data

class GrantSerializer(serializers.ModelSerializer):
    class Meta:
        model = SessionAccessGrant
        fields = '__all__'
        read_only_fields = ['granted_by', 'granted_at']
    def validate(self, data):
        session = data.get('session', getattr(self.instance, 'session', None))
        course = data.get('course', getattr(self.instance, 'course', None))
        student = data.get('student', getattr(self.instance, 'student', None))
        if session.course_id != course.pk or student.role != 'student':
            raise serializers.ValidationError('جلسه و دوره یا دانشجو نامعتبر است.')
        return data

class ProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseProgress
        fields = '__all__'
        read_only_fields = ['student', 'course', 'last_watched_at']
        validators = []

class AnnouncementSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseAnnouncement
        fields = '__all__'
        read_only_fields = ['teacher', 'created_at']

class QuestionSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    class Meta:
        model = CourseQuestion
        fields = '__all__'
        read_only_fields = ['student', 'teacher', 'reply_text', 'replied_at', 'created_at']
    def get_student_name(self, obj):
        return obj.student.fullname

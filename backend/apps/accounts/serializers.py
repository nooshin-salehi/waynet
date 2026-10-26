import re
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from .models import User

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    class Meta:
        model = User
        fields = ['id', 'phone', 'fullname', 'name', 'role', 'avatar', 'is_active', 'specialty', 'teaching_field', 'bio', 'price_overrides', 'created_at', 'password']
        read_only_fields = ['created_at']
    def validate_phone(self, value):
        if not re.fullmatch(r'09[0-9]{9}', value):
            raise serializers.ValidationError('شماره موبایل معتبر وارد کنید.')
        return value
    def validate_password(self, value):
        try:
            validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.messages)
        return value
    def validate_price_overrides(self, data):
        if not isinstance(data, dict) or any(not isinstance(v, int) or isinstance(v, bool) or v < 0 for v in data.values()):
            raise serializers.ValidationError('قیمت اختصاصی باید عدد صحیح غیرمنفی باشد.')
        from apps.courses.models import Course
        if set(data) - set(Course.objects.filter(pk__in=data).values_list('pk', flat=True)):
            raise serializers.ValidationError('دوره قیمت اختصاصی موجود نیست.')
        return data
    def create(self, data):
        password = data.pop('password', None)
        if not password:
            raise serializers.ValidationError({'password': 'رمز عبور الزامی است.'})
        return User.objects.create_user(password=password, **data)
    def update(self, instance, data):
        password = data.pop('password', None)
        instance = super().update(instance, data)
        if password:
            instance.set_password(password)
            instance.tokens.all().delete()
            instance.save()
        return instance

class InstructorSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'fullname', 'name', 'avatar', 'specialty', 'teaching_field', 'bio']

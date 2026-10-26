from rest_framework.permissions import BasePermission, SAFE_METHODS

class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_active and request.user.role == 'admin'

class CatalogPermission(IsAdmin):
    def has_permission(self, request, view):
        return request.method in SAFE_METHODS or super().has_permission(request, view)

class TeachingPermission(BasePermission):
    def has_permission(self, request, view):
        return request.method in SAFE_METHODS or (request.user.is_authenticated and request.user.role in ('teacher', 'admin'))

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return request.user.role == 'admin' or getattr(obj, 'teacher_user_id', None) == request.user.pk or getattr(obj, 'course', None) and obj.course.teacher_user_id == request.user.pk

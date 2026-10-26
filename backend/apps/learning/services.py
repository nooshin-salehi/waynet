from django.db.models import Q
from django.utils import timezone
from .models import Enrollment, SessionAccessGrant

def has_course_access(user, course):
    if not user or not user.is_authenticated or not user.is_active:
        return False
    if user.role == 'admin' or user.role == 'teacher' and course.teacher_user_id == user.pk:
        return True
    return Enrollment.objects.filter(student=user, course=course, status__in=['active', 'completed']).filter(Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now())).exists()

def has_session_access(user, session):
    if session.is_free:
        return True
    return has_course_access(user, session.course) or bool(user and user.is_authenticated and user.is_active and SessionAccessGrant.objects.filter(student=user, session=session, course=session.course).exists())

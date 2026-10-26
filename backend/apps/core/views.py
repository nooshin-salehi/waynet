from django.db.models import Sum, Q
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from apps.accounts.models import User
from apps.accounts.serializers import UserSerializer, InstructorSerializer
from apps.courses.models import Course, Career, CourseSession
from apps.courses.serializers import CourseSerializer, CareerSerializer
from apps.learning.models import Enrollment
from apps.commerce.models import Order
from apps.catalog.models import Product, Service, RackRequest
from apps.communications.models import Testimonial
from apps.communications.serializers import TestimonialSerializer
from .permissions import IsAdmin

@api_view(['GET'])
@permission_classes([AllowAny])
def home(request):
    context = {'request': request}
    return Response({
        'courses': CourseSerializer(Course.objects.filter(is_active=True).prefetch_related('sessions'), many=True, context=context).data,
        'careers': CareerSerializer(Career.objects.all(), many=True).data,
        'instructors': InstructorSerializer(User.objects.filter(role='teacher', is_active=True), many=True).data,
        'testimonials': TestimonialSerializer(Testimonial.objects.filter(approved=True), many=True).data,
    })

@api_view(['GET'])
def dashboard(request):
    enrollments = Enrollment.objects.filter(student=request.user, status__in=['active', 'completed']).filter(Q(expires_at__isnull=True)|Q(expires_at__gt=timezone.now()))
    return Response({'user': UserSerializer(request.user).data, 'courses': CourseSerializer(Course.objects.filter(pk__in=enrollments.values('course_id')).prefetch_related('sessions'), many=True, context={'request': request}).data,
        'ordersCount': Order.objects.filter(phone=request.user.phone, status='paid').count()})

@api_view(['GET'])
@permission_classes([IsAdmin])
def admin_dashboard(request):
    return Response({'userCount': User.objects.count(), 'teacherCount': User.objects.filter(role='teacher').count(),
        'studentCount': User.objects.filter(role='student').count(), 'courseCount': Course.objects.count(),
        'sessionCount': CourseSession.objects.count(), 'orderCount': Order.objects.count(),
        'serviceCount': Service.objects.count(), 'productCount': Product.objects.count(),
        'revenue': Order.objects.filter(status='paid').aggregate(total=Sum('amount'))['total'] or 0,
        'pendingRackRequests': RackRequest.objects.filter(status='pending').count()})

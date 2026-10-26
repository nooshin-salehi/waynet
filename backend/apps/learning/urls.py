from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('enrollments', views.EnrollmentViewSet)
router.register('session-access', views.GrantViewSet)
router.register('progress', views.ProgressViewSet)
router.register('announcements', views.AnnouncementViewSet)
router.register('questions', views.QuestionViewSet)
urlpatterns = [path('', include(router.urls))]

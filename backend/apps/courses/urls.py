from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('categories', views.CategoryViewSet)
router.register('courses', views.CourseViewSet)
router.register('sessions', views.SessionViewSet)
router.register('careers', views.CareerViewSet)
urlpatterns = [path('', include(router.urls))]
urlpatterns += [path('stream/<str:token>/', views.stream)]

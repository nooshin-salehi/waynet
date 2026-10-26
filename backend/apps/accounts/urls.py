from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('users', views.UserViewSet)
router.register('instructors', views.InstructorViewSet, basename='instructor')
urlpatterns = [path('', include(router.urls))]
urlpatterns += [path('auth/login/', views.login)]
urlpatterns += [path('auth/send-code/', views.send_code)]
urlpatterns += [path('auth/register/', views.register)]
urlpatterns += [path('auth/logout/', views.logout)]
urlpatterns += [path('auth/me/', views.me)]
urlpatterns += [path('auth/change-password/', views.change_password)]
urlpatterns += [path('auth/forgot-password/', views.forgot_password)]
urlpatterns += [path('auth/reset-password/', views.reset_password)]

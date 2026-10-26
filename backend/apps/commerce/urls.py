from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('orders', views.OrderViewSet)
urlpatterns = [path('', include(router.urls))]
urlpatterns += [path('checkout/', views.checkout), path('payment/callback/', views.payment_callback)]

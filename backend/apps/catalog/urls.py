from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('products', views.ProductViewSet)
router.register('services', views.ServiceViewSet)
router.register('racks', views.RackViewSet)
router.register('rack-requests', views.RackRequestViewSet)
urlpatterns = [path('', include(router.urls))]

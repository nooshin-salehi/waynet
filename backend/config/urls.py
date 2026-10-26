from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from apps.core import views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/home/', views.home),
    path('api/dashboard/', views.dashboard),
    path('api/admin/dashboard/', views.admin_dashboard),
    path('api/', include('apps.accounts.urls')),
    path('api/', include('apps.courses.urls')),
    path('api/', include('apps.learning.urls')),
    path('api/', include('apps.commerce.urls')),
    path('api/', include('apps.catalog.urls')),
    path('api/', include('apps.communications.urls')),
]
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

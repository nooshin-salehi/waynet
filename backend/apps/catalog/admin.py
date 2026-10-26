from django.contrib import admin
from .models import Product, Service, Rack, RackRequest

admin.site.register(Product)
admin.site.register(Service)
admin.site.register(Rack)
admin.site.register(RackRequest)

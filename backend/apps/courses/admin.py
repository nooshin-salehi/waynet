from django.contrib import admin
from .models import Category, Course, CourseSession, Career

admin.site.register(Category)
admin.site.register(Course)
admin.site.register(CourseSession)
admin.site.register(Career)

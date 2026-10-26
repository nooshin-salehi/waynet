from django.contrib import admin
from .models import Enrollment, SessionAccessGrant, CourseProgress, CourseAnnouncement, CourseQuestion

admin.site.register(Enrollment)
admin.site.register(SessionAccessGrant)
admin.site.register(CourseProgress)
admin.site.register(CourseAnnouncement)
admin.site.register(CourseQuestion)

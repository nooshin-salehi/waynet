from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.forms import UserCreationForm, UserChangeForm
from .models import User

class CreateUserForm(UserCreationForm):
    class Meta:
        model = User
        fields = ('phone', 'fullname', 'role')

class ChangeUserForm(UserChangeForm):
    class Meta:
        model = User
        fields = '__all__'

@admin.register(User)
class WaynetUserAdmin(UserAdmin):
    form = ChangeUserForm
    add_form = CreateUserForm
    ordering = ('phone',)
    list_display = ('phone', 'fullname', 'role', 'is_active')
    list_filter = ('role', 'is_active')
    search_fields = ('phone', 'fullname')
    fieldsets = (
        (None, {'fields': ('phone', 'password', 'fullname', 'name', 'role')}),
        ('Profile', {'fields': ('avatar', 'specialty', 'teaching_field', 'bio', 'price_overrides')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
    )
    add_fieldsets = ((None, {'fields': ('phone', 'fullname', 'role', 'password1', 'password2')}),)

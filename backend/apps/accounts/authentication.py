import hashlib
from django.utils import timezone
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from .models import AuthToken

class TokenAuthentication(BaseAuthentication):
    def authenticate_header(self, request):
        return 'Bearer'

    def authenticate(self, request):
        header = request.headers.get('Authorization', '')
        if not header.startswith('Bearer '):
            return None
        digest = hashlib.sha256(header[7:].strip().encode()).hexdigest()
        token = AuthToken.objects.select_related('user').filter(key=digest).first()
        if not token or token.expires_at <= timezone.now() or not token.user.is_active:
            raise AuthenticationFailed('نشست نامعتبر یا منقضی شده است.')
        return token.user, token

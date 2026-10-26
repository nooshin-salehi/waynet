from pathlib import Path
import os
from dotenv import load_dotenv
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / '.env')
DEBUG = os.getenv('DJANGO_DEBUG', 'true').lower() == 'true'
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'development-only-change-before-deploy')
if not DEBUG and SECRET_KEY == 'development-only-change-before-deploy':
    raise ImproperlyConfigured('Set DJANGO_SECRET_KEY in production')
ALLOWED_HOSTS = os.getenv('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')
INSTALLED_APPS = [
    'django.contrib.admin', 'django.contrib.auth', 'django.contrib.contenttypes',
    'django.contrib.sessions', 'django.contrib.messages', 'django.contrib.staticfiles',
    'corsheaders', 'rest_framework',
    'apps.accounts', 'apps.courses', 'apps.learning', 'apps.commerce',
    'apps.catalog', 'apps.communications', 'apps.core',
]
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware', 'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware', 'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware', 'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
]
ROOT_URLCONF = 'config.urls'
TEMPLATES = [{'BACKEND': 'django.template.backends.django.DjangoTemplates', 'DIRS': [], 'APP_DIRS': True,
              'OPTIONS': {'context_processors': ['django.template.context_processors.request',
              'django.contrib.auth.context_processors.auth', 'django.contrib.messages.context_processors.messages']}}]
WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'
DB_ENGINE = os.getenv('DB_ENGINE', 'postgresql').lower()
if DB_ENGINE == 'sqlite':
    # فقط برای آزمایش سریع محلی؛ در production مجاز نیست.
    if not DEBUG:
        raise ImproperlyConfigured('SQLite is not allowed in production; use PostgreSQL (DB_ENGINE=postgresql)')
    DATABASES = {'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': BASE_DIR / os.getenv('SQLITE_PATH', 'db.sqlite3')}}
else:
    DATABASES = {'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME', 'waynet'),
        'USER': os.getenv('DB_USER', 'waynet'),
        'PASSWORD': os.getenv('DB_PASSWORD', ''),
        'HOST': os.getenv('DB_HOST', '127.0.0.1'),
        'PORT': os.getenv('DB_PORT', '5432'),
        'CONN_MAX_AGE': int(os.getenv('DB_CONN_MAX_AGE', '60')),
        'CONN_HEALTH_CHECKS': True,
    }}
AUTH_USER_MODEL = 'accounts.User'
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 8}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
]
LANGUAGE_CODE = 'fa-ir'
TIME_ZONE = 'Asia/Tehran'
USE_I18N = True
USE_TZ = True
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL = '/uploads/'
MEDIA_ROOT = BASE_DIR / 'uploads'
PRIVATE_MEDIA_ROOT = BASE_DIR / 'media'
CORS_ALLOWED_ORIGINS = os.getenv('CORS_ALLOWED_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173').split(',')
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173').rstrip('/')
BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:8000').rstrip('/')
ZARINPAL_MERCHANT_ID = os.getenv('ZARINPAL_MERCHANT_ID', '')
ZARINPAL_SANDBOX = os.getenv('ZARINPAL_SANDBOX', 'true').lower() == 'true'
KAVENEGAR_API_KEY = os.getenv('KAVENEGAR_API_KEY', '').strip()
KAVENEGAR_TEMPLATE = os.getenv('KAVENEGAR_TEMPLATE', 'registerverify').strip()
KAVENEGAR_RESET_TEMPLATE = os.getenv('KAVENEGAR_RESET_TEMPLATE', '').strip() or KAVENEGAR_TEMPLATE
KAVENEGAR_TIMEOUT = int(os.getenv('KAVENEGAR_TIMEOUT', '20'))
SMS_CODE_LENGTH = 5
SMS_CODE_TTL = 120  # ثانیه
SMS_RESEND_COOLDOWN = 60  # ثانیه
SMS_MAX_ATTEMPTS = 5
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': ['apps.accounts.authentication.TokenAuthentication'],
    'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.IsAuthenticated'],
    'DEFAULT_THROTTLE_CLASSES': ['rest_framework.throttling.AnonRateThrottle', 'rest_framework.throttling.UserRateThrottle'],
    'DEFAULT_THROTTLE_RATES': {'anon': '120/min', 'user': '600/min', 'auth': '10/min'},
}
FILE_UPLOAD_MAX_MEMORY_SIZE = 5 * 1024 * 1024
MAX_VIDEO_BYTES = int(os.getenv('MAX_VIDEO_BYTES', str(2 * 1024 * 1024 * 1024)))

PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher',
    'django.contrib.auth.hashers.Argon2PasswordHasher',
    'django.contrib.auth.hashers.BCryptSHA256PasswordHasher',
    'django.contrib.auth.hashers.ScryptPasswordHasher',
    'apps.accounts.hashers.LegacyScryptHasher',
]

ALLOW_SAMPLE_VIDEO = DEBUG
# اعتبار لینک پخش (ثانیه). دسترسی کاربر در هر درخواست دوباره بررسی می‌شود، پس لغو دسترسی فوری اعمال می‌شود.
VIDEO_TOKEN_TTL = int(os.getenv('VIDEO_TOKEN_TTL', '7200'))
# در production با nginx: مثلاً /_protected_video/ . Django فقط مجوز را بررسی می‌کند و nginx خود فایل را می‌فرستد.
# اگر خالی باشد (توسعه)، Django ویدیو را خودش پخش می‌کند.
VIDEO_ACCEL_REDIRECT_PREFIX = os.getenv('VIDEO_ACCEL_REDIRECT_PREFIX', '').strip()


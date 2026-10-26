# Waynet Backend

پروژه مستقل Django + Django REST Framework؛ بدون وابستگی به فایل‌های frontend یا ریشهٔ پروژه.

## پایگاه داده: PostgreSQL

پایگاه داده پیش‌فرض PostgreSQL است. یک‌بار دیتابیس و کاربر بسازید (با psql یا pgAdmin):

```sql
CREATE USER waynet WITH PASSWORD 'یک-رمز-قوی' CREATEDB;
CREATE DATABASE waynet OWNER waynet ENCODING 'UTF8';
```

سپس مقادیر DB_NAME، DB_USER، DB_PASSWORD، DB_HOST و DB_PORT را در `.env` بگذارید (نمونه در `.env.example`). `CREATEDB` برای اجرای تست‌ها لازم است. اگر Docker دارید، `docker compose up -d db` همین کار را انجام می‌دهد.

برای آزمایش خیلی سریع می‌توان `DB_ENGINE=sqlite` گذاشت، ولی در حالت `DEBUG=false` این گزینه رد می‌شود.

```powershell
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
# فقط اگر .env ندارید:
Copy-Item .env.example .env
.venv\Scripts\python.exe manage.py migrate
.venv\Scripts\python.exe manage.py seed_waynet
.venv\Scripts\python.exe manage.py createsuperuser
.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
```

ورود با شماره موبایل است. پنل ادمین React در /admin فرانت و پنل Django در http://127.0.0.1:8000/admin/ برای superuser است.

تنظیمات در config و اپ‌ها زیر apps هستند. هر اپ migrations واقعی و مسیرهای API جدا دارد. پایگاه داده PostgreSQL است (راهنمای بالا).

تنظیمات مستقل در .env.example آمده‌اند. env موجود را بازنویسی نکنید. FRONTEND_URL مقصد بازیابی رمز و بازگشت پرداخت، BACKEND_URL مبنای callback و لینک ویدیو است. در production، DEBUG=false و SECRET_KEY، ALLOWED_HOSTS و CORS متناسب با محیط لازم‌اند.

uploads مخصوص تصاویر عمومی است؛ media ویدیوهای خصوصی را نگه می‌دارد و نباید استاتیک منتشر شود. در production تصاویر عمومی را از وب‌سرور/CDN سرو کنید. env و exports در Git نادیده گرفته می‌شوند.

```powershell
python manage.py check
python manage.py test apps.core
python manage.py makemigrations --check --dry-run
```

## پخش ویدیو

لینک پخش پیش‌فرض ۲ ساعت اعتبار دارد (`VIDEO_TOKEN_TTL`)، ولی دسترسی کاربر در هر درخواست دوباره بررسی می‌شود؛ پس اگر دسترسی لغو شود پخش فوراً قطع می‌شود. اگر لینک وسط درس منقضی شود، پخش‌کنندهٔ سایت خودش لینک تازه می‌گیرد و از همان ثانیه ادامه می‌دهد.

در توسعه Django ویدیو را خودش می‌فرستد. در production این کار را به nginx بسپارید تا Django درگیر هر بیننده نماند: `VIDEO_ACCEL_REDIRECT_PREFIX=/_protected_video/` را در `.env` بگذارید و نمونهٔ `deploy/nginx.conf.example` را به کار ببرید. برای تعداد بیننده‌های بالا یا کاربران دور از سرور، گام بعدی CDN یا ذخیره‌ساز ابری با لینک امضادار (و تبدیل به HLS) است.

[API](API.md) · [انتقال MongoDB و SQLite](MIGRATION.md)

# Waynet — React + Django

پروژه به دو پوشهٔ مستقل تقسیم شده است:

- `backend/`: Django و Django REST Framework، پایگاه داده و API.
- `frontend/`: React و Vite، صفحات و پنل‌های فارسی با CSS و تصاویر نسخهٔ قبلی.

هر پوشه وابستگی‌ها، تنظیمات، راهنمای اجرا و .gitignore خودش را دارد و می‌تواند بعداً ریپازیتوری جدا باشد. هیچ ریپازیتوری یا commit ساخته نشده است.

## اجرای بک‌اند

در PowerShell:

```powershell
cd backend
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
# فقط اگر .env ندارید:
Copy-Item .env.example .env
.venv\Scripts\python.exe manage.py migrate
.venv\Scripts\python.exe manage.py seed_waynet
.venv\Scripts\python.exe manage.py createsuperuser
.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
```

پایگاه داده PostgreSQL است؛ ساخت دیتابیس و تنظیمات اتصال در [backend/README.md](backend/README.md) آمده است. فایل backend/.env در Git نادیده گرفته می‌شود. بعد از migrate، دستور seed_waynet کاتالوگ اولیه را وارد می‌کند و ادمین را با createsuperuser بسازید. ورود با شماره موبایل و رمز است.

## اجرای فرانت

در ترمینال دوم:

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev
```

آدرس: http://127.0.0.1:5173. در توسعه، Vite درخواست‌های /api و /uploads را به Django روی پورت 8000 می‌فرستد. برای سرور جدا VITE_API_URL را در env فرانت تنظیم کنید و مبدا را به CORS_ALLOWED_ORIGINS بک‌اند اضافه کنید.

## ساختار بک‌اند

```text
backend/
  config/             settings, urls, asgi, wsgi
  apps/
    accounts/         کاربران، نقش‌ها، ورود و بازیابی رمز
    courses/          دسته‌بندی، دوره، جلسه، مسیر شغلی و ویدیو
    learning/         ثبت‌نام، دسترسی جلسه، پیشرفت، پرسش و اطلاعیه
    commerce/         سفارش، قیمت‌گذاری و پرداخت زرین‌پال
    catalog/          تجهیزات، خدمات، رک و درخواست اجاره
    communications/   نظرات، پاسخ ادمین و پیام‌های تماس
    core/             داشبورد، ابزار مشترک، seed، import و تست‌ها
  manage.py
  requirements.txt
```

اپ‌ها models، serializers، views، urls، admin و migrations جداگانه دارند. تا زمان دریافت نمونهٔ مشخص از پروژه‌های قبلی شما، ساختار config + apps مبنا قرار گرفته است.

## قابلیت‌ها

کاتالوگ دوره‌ها و مسیرهای شغلی، مدرسان، محصولات، خدمات و رک‌ها؛ ورود/ثبت‌نام؛ پنل دانشجو و پروفایل؛ پنل مدرس با کنترل مالکیت، جلسات، بارگذاری ویدیو، لینک کلاس، اطلاعیه و پاسخ؛ پنل ادمین با مدیریت کاتالوگ، کاربران و نقش‌ها، دسترسی دوره و جلسه، قیمت اختصاصی، نظرات و درخواست‌ها؛ سبد خرید، سفارش و پرداخت.

ویدیوها در backend/media خصوصی‌اند. پخش با لینک امضاشدهٔ پنج‌دقیقه‌ای، بررسی دوبارهٔ دسترسی و پشتیبانی Range انجام می‌شود. در توسعه، جلسهٔ بدون ویدیوی بارگذاری‌شده از نمونهٔ قبلی استفاده می‌کند؛ این رفتار در production خاموش است.

## نسخهٔ قبلی و داده‌ها

نسخهٔ قدیمی Express/EJS (پوشهٔ backend/legacy) حذف شده است؛ همهٔ منطق آن در Django و React بازنویسی شده و CSS و تصاویر به فرانت و پوشهٔ media به بک‌اند منتقل شده‌اند. اگر نسخهٔ قدیمی را می‌خواهید، از نسخهٔ پشتیبان پیش از این تغییر استفاده کنید.

کاتالوگ فایل‌های JS وارد شده است. رکوردهای واقعی MongoDB خودکار وارد نشده‌اند. ابزار انتقال با dry-run و سازگاری رمزهای قبلی آماده است: [راهنمای انتقال](backend/MIGRATION.md).

## بررسی

```powershell
cd backend
python manage.py check
python manage.py test apps.core
python manage.py makemigrations --check --dry-run
```

```powershell
cd frontend
npm.cmd run build
```

تست‌های پرداخت پاسخ درگاه را شبیه‌سازی می‌کنند؛ تراکنش واقعی اجرا نشده است. مرچنت و callback در env بک‌اند تنظیم می‌شوند. کد تأیید ثبت‌نام و کد بازیابی رمز با Verify Lookup کاوه‌نگار ارسال می‌شود (apps/accounts/services.py)؛ متغیرهای KAVENEGAR_* در env بک‌اند تنظیم می‌شوند. بدون کلید و با DEBUG=true، کد آزمایشی در پاسخ API نمایش داده می‌شود. ارسال واقعی پیامک در این محیط تست نشده است.

[راهنمای backend](backend/README.md) · [راهنمای frontend](frontend/README.md) · [API](backend/API.md)

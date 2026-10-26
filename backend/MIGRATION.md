# انتقال دادهٔ MongoDB

کاتالوگ فایل‌های JS با python manage.py seed_waynet وارد می‌شود. این دستور قابل تکرار است و رکورد موجود را بازنویسی نمی‌کند.

برای داده‌های واقعی با ابزار رسمی mongoexport خروجی بگیرید. هر collection باید فایل هم‌نام داشته باشد. importer از JSON array، JSON Lines و Extended JSON پشتیبانی می‌کند.

نمونهٔ دیتابیس محلی waynet، در پوشه backend:

```powershell
New-Item -ItemType Directory -Force exports
$collections = @('users','categories','courses','coursesessions','careers','products','services','racks','rackrequests','orders','enrollments','courseprogresses','sessionaccessgrants','courseannouncements','coursequestions','testimonials')
foreach ($collection in $collections) {
    mongoexport --db waynet --collection $collection --jsonArray --out "exports/$collection.json"
}
python manage.py import_mongodb exports --dry-run
python manage.py import_mongodb exports
```

برای دیتابیس غیرمحلی اتصال واقعی را در mongoexport تنظیم کنید. نام collectionها را با دیتابیس خود تطبیق دهید. importer به MongoDB متصل نمی‌شود.

انتقال در یک تراکنش است و هر خطا تمام تغییرات آن اجرا را rollback می‌کند. dry-run اعتبارسنجی را انجام می‌دهد و سپس rollback می‌کند. collection فاقد فایل نادیده گرفته می‌شود؛ برای انتقال کامل همهٔ موارد بالا را تهیه کنید.

شناسه‌های رشته‌ای کاتالوگ حفظ می‌شوند. ObjectId در legacy_id نگه‌داری و روابط با این نگاشت بازسازی می‌شوند. جلسات نمونهٔ seed هنگام ورود جلسات واقعی همان دوره جایگزین می‌شوند. رمز scrypt قبلی قابل ورود است و پس از اولین ورود به هش استاندارد Django ارتقا می‌یابد. نشست مرورگر و لینک بازیابی قبلی منتقل نمی‌شوند.

media اصلی در این workspace به backend/media منتقل شده است. در انتقال به سروری دیگر آن را با همین ساختار کپی کنید. تصاویر قدیمی public/uploads باید به backend/uploads کپی شوند. exports، دیتابیس و env در Git نادیده گرفته می‌شوند.

روی کپی دیتابیس اجرا کنید و تعداد کاربران/سفارش‌ها، دسترسی‌ها، قیمت‌های اختصاصی و مسیر ویدیو را بررسی کنید. تست موجود dry-run، اجرای تکراری و ورود با رمز قدیمی را پوشش می‌دهد؛ دیتابیس واقعی شما هنوز وارد نشده است.

## انتقال از SQLite به PostgreSQL

اگر قبلاً با `db.sqlite3` کار کرده‌اید و داده‌هایتان را می‌خواهید، در پوشهٔ backend:

```powershell
# ۱) خروجی گرفتن از SQLite (فایل db.sqlite3 تغییر نمی‌کند)
$env:DB_ENGINE = "sqlite"
python manage.py dumpdata --natural-foreign --natural-primary -e contenttypes -e auth.permission -e sessions -e admin.logentry --indent 1 -o data.json
Remove-Item Env:DB_ENGINE

# ۲) ساخت جدول‌ها در PostgreSQL (بعد از تنظیم DB_* در .env) و ورود داده
python manage.py migrate
python manage.py loaddata data.json
```

اگر داده‌ای جز کاتالوگ اولیه و یک ادمین ندارید، ساده‌تر است `migrate` و `seed_waynet` و `createsuperuser` را اجرا کنید. بعد از انتقال تعداد کاربران، دوره‌ها، جلسه‌ها و سفارش‌ها را بشمارید. فایل `data.json` شامل رمزهای هش‌شده است؛ آن را در Git نگذارید و بعد از انتقال پاک کنید.

PostgreSQL فهرست قیدها را سخت‌گیرانه‌تر از SQLite بررسی می‌کند. ستون `password` کاربر به ۲۵۵ نویسه بلند شد (مهاجرت `accounts.0003`) تا هش scrypt قدیمیِ واردشده از MongoDB جا شود.

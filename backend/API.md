# API

پیشوند /api/ است. خروجی JSON و مسیرهای resource دارای slash پایانی هستند. درخواست خصوصی نیاز به هدر Authorization: Bearer <token> دارد. ورود و ثبت‌نام {token, user} می‌دهند. توکن‌ها هش‌شده ذخیره می‌شوند و برای ادمین ۸ ساعت و سایر کاربران ۷ روز اعتبار دارند.

| مسیر | کاربرد و دسترسی |
| --- | --- |
| POST auth/login/ | ورود عمومی |
| POST auth/send-code/ | ارسال کد تأیید پیامکی (کاوه‌نگار) به شمارهٔ ثبت‌نام؛ فاصلهٔ ۶۰ ثانیه بین دو ارسال، اعتبار کد ۲ دقیقه |
| POST auth/register/ | ثبت‌نام عمومی (فقط دانشجو)؛ فیلد `code` (کد پیامکی) الزامی است |
| GET/PATCH auth/me/ | حساب جاری و ویرایش پروفایل |
| POST auth/logout/ | حذف توکن جاری |
| POST auth/change-password/ | old_password, password؛ حذف تمام نشست‌ها |
| POST auth/forgot-password/ | phone؛ ارسال کد بازیابی پیامکی (همان محدودیت ۶۰ ثانیه/۲ دقیقه؛ پاسخ برای شمارهٔ ناموجود یکسان است) |
| POST auth/reset-password/ | phone, code, password؛ کد یک‌بارمصرف است و پس از تغییر رمز همهٔ نشست‌ها حذف می‌شوند |
| GET home/, categories/, careers/, instructors/ | داده‌های عمومی |
| GET courses/?category=:id&q=:text&teacher=:id | فیلتر دوره‌ها |
| GET courses/?mine=1 | دوره‌های مدرس جاری |
| courses/ | خواندن عمومی؛ نوشتن ادمین/مدرس مالک؛ حذف به معنی غیرفعال‌کردن |
| POST courses/:id/class_link/ | url؛ ادمین/مدرس مالک |
| sessions/ | اطلاعات عمومی؛ نوشتن ادمین/مدرس مالک |
| POST/DELETE sessions/:id/video/ | multipart با کلید file؛ ویدیوی MP4/WebM خصوصی |
| POST sessions/:id/move/ | order |
| GET sessions/:id/playback/ | لینک پخش فقط با دسترسی یا جلسه رایگان |
| GET stream/:token/ | Range و بررسی دوباره دسترسی |
| GET/POST progress/ | session, watched_duration, completed؛ فقط کاربر جاری |
| enrollments/, session-access/ | CRUD ادمین؛ تطابق جلسه/دوره بررسی می‌شود |
| announcements/ | خواندن دانشجوی مجاز؛ نوشتن مدرس مالک/ادمین |
| questions/ | دانشجو فقط سوال خودش؛ مدرس فقط دوره خودش |
| POST/DELETE questions/:id/reply/ | text؛ مدرس مالک/ادمین |
| users/ | مدیریت کاربران فقط ادمین؛ password فقط write-only |
| POST users/:id/toggle_active/ | لغو نشست‌ها، فقط ادمین |
| products/, services/, racks/ | خواندن عمومی، تغییر ادمین |
| POST rack-requests/ | درخواست عمومی |
| POST rack-requests/:id/approve/, reject/ | فقط ادمین |
| testimonials/ | فقط نظرات تاییدشده عمومی؛ ثبت با ورود |
| POST testimonials/:id/approve/ | ادمین |
| POST/DELETE testimonials/:id/reply/ | پاسخ ادمین |
| POST contact/ | name, text, phone/email/service |
| GET contact/ | فقط ادمین |
| POST checkout/ | items: [{type: course/product, id, qty}] |
| GET orders/ | سفارش‌های خود کاربر؛ ادمین همه |
| GET payment/callback/ | Authority و Status؛ تایید با مبلغ ذخیره‌شده در سرور |
| GET dashboard/ | دوره‌های در دسترس و آمار سفارش |
| GET admin/dashboard/ | آمار ادمین |

قیمت اختصاصی با price_overrides در users/:id/، به‌شکل نگاشت شناسه دوره به مبلغ تومان تنظیم می‌شود. checkout قیمت ارسالی از فرانت را نادیده می‌گیرد. خرید و دسترسی فقط پس از تایید سرور به سرور درگاه ایجاد می‌شوند.

# Waynet Frontend

پروژه مستقل React + Vite. تمام داده‌ها و عملیات سرور از طریق API انجام می‌شوند. نیازمندی: Node.js 22.12 یا جدیدتر.

```powershell
npm.cmd ci
npm.cmd run dev
npm.cmd run build
```

در توسعه آدرس http://127.0.0.1:5173 است. Vite مسیرهای /api و /uploads را به http://127.0.0.1:8000 proxy می‌کند. برای API مستقل، .env.example را به .env.local کپی و VITE_API_URL را روی آدرس کامل API بگذارید، مثلاً https://api.example.com/api. تغییر env نیاز به restart یا build مجدد دارد.

src/api.js کلاینت API، components.jsx اجزای مشترک و نشست، و فایل‌های Home، PublicPages، AccountPages، Management و TeacherPages صفحات برنامه‌اند. CSS و تصاویر اصلی حفظ شده‌اند.

در production فایل‌های dist را سرو کنید و مسیرهای React را به index.html برگردانید. برای API نسبی، proxy سرور برای /api و /uploads لازم است. برای دامنهٔ دیگر CORS بک‌اند را تنظیم کنید.

نشست Bearer و سبد خرید در localStorage نگه‌داری می‌شوند؛ اعتبار نشست، قیمت نهایی و دسترسی‌ها در سرور بررسی می‌شوند.

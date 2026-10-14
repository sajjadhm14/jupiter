# Jupiter — فرانت‌اند یادآوری

فرانت‌اند React + Vite در `~/projects/jupiter` قرار دارد. بک‌اند پروژهٔ مستقل `~/projects/mars` است. این پروژه package.json، package-lock.json و Dockerfile مستقل دارد و به npm workspace یا پوشهٔ todo وابسته نیست.

## توسعه

Node.js ۲۰٫۱۹ یا بالاتر لازم است:

```bash
cd ~/projects/jupiter
npm ci
npm run dev
```

Vite درخواست‌های `/api` را به بک‌اند روی `http://127.0.0.1:3000` می‌فرستد. بک‌اند را طبق README پروژهٔ Mars اجرا کنید.

## بیلد

```bash
npm run build
```

خروجی در `dist/` ساخته می‌شود. Dockerfile همین پوشه به‌صورت مستقل قابل build است:

```bash
docker build -t jupiter .
```

Nginx درخواست‌های `/api` را به سرویس `mars:3000` در شبکهٔ Docker می‌فرستد. برای اجرای کامل برنامه، Compose داخل پروژهٔ Mars را اجرا کنید:

```bash
cd ~/projects/mars
docker compose up -d --build
```

برای استفاده از خروجی بیلد محلی:

```bash
cd ~/projects/jupiter
npm ci
npm run build
cd ~/projects/mars
docker compose -f compose.yaml -f compose.prebuilt.yaml up -d --build
```

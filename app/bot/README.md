# 🤖 خادم API + بوت تلغرام (خدمة واحدة)

خادم API وبوت تلغرام يعملان معاً في عملية واحدة (`node server.js`).
البوت يستقبل طلبات التحويل ويرسلها للموقع، والموقع هو من يطبق الرسوم.

---

## 🌐 النشر على Render (خدمتين فقط)

### الخدمة 1: Static Site (الموقع/الفرونت إند)

1. اذهب إلى [Render Dashboard](https://dashboard.render.com)
2. اضغط **New** → **Static Site**
3. الإعدادات:

| الحقل | القيمة |
|-------|--------|
| **Name** | `my-website` |
| **Root Directory** | `app/frontend` |
| **Build Command** | `pnpm install && pnpm run build` |
| **Publish Directory** | `dist` |

4. اضغط **Create Static Site**
5. انسخ رابط الموقع

---

### الخدمة 2: Web Service (خادم API + بوت تلغرام معاً)

1. اضغط **New** → **Web Service**
2. الإعدادات:

| الحقل | القيمة |
|-------|--------|
| **Name** | `bot-api-server` |
| **Runtime** | `Node` |
| **Root Directory** | `app/bot` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Plan** | Starter أو أعلى |

3. أضف **Environment Variables**:

| المتغير | القيمة | مطلوب |
|---------|--------|-------|
| `TELEGRAM_BOT_TOKEN` | `123456:ABC-DEF...` (من BotFather) | ✅ نعم |
| `API_BASE_URL` | `https://bot-api-server-xxxx.onrender.com` (رابط نفس الخدمة) | ✅ نعم |
| `API_KEY` | `your-secret-key` (مفتاح تأمين) | اختياري |
| `BOT_NAME` | `AutoConverter Bot` | اختياري |
| `CYCLE_INTERVAL` | `5` (بالثواني) | اختياري |
| `MIN_AMOUNT` | `10` | اختياري |
| `MAX_AMOUNT` | `1000` | اختياري |
| `REVERSE_CONVERSION` | `true` | اختياري |
| `NO_REPEAT_PAIR` | `true` | اختياري |
| `EXECUTION_ORDER` | `random` أو `sequential` | اختياري |

> ⚠️ **ملاحظة**: `API_BASE_URL` = رابط نفس Web Service (لأن البوت والسيرفر في نفس العملية، يمكن استخدام `http://localhost:PORT` أو الرابط الخارجي)

4. اضغط **Create Web Service**

---

### ✅ النتيجة: خدمتين فقط

| الخدمة | النوع | المهمة |
|--------|-------|--------|
| `my-website` | Static Site | الموقع (فرونت إند) |
| `bot-api-server` | Web Service | خادم API + بوت تلغرام |

---

## 📋 كيف يعمل

1. `npm start` يشغل `server.js`
2. `server.js` يبدأ خادم Express (API endpoints)
3. بعد بدء الخادم، يحمّل `bot.js` ويشغل بوت تلغرام
4. إذا لم يكن `TELEGRAM_BOT_TOKEN` موجوداً، الخادم يعمل بدون البوت (API فقط)
5. البوت يستقبل أوامر من تلغرام ويرسل طلبات تحويل إلى نفس الخادم
6. الموقع (فرونت إند) يتصل بالخادم لعرض وإدارة التحويلات

---

## 🚀 التثبيت على VPS

```bash
cd /home/user/converter-bot
npm install

# تعديل config.json بالإعدادات المطلوبة
nano config.json

# تشغيل (API + Bot معاً)
node server.js

# أو باستخدام PM2
pm2 start server.js --name "bot-api-server"
pm2 startup
pm2 save
```

### config.json (للـ VPS فقط):

```json
{
  "api_base_url": "http://localhost:3001",
  "telegram_bot_token": "YOUR_BOT_TOKEN",
  "telegram_chat_id": "",
  "bot_name": "AutoConverter Bot",
  "website_api_key": "your-secret-key",
  "log_file": "bot.log",
  "settings": {
    "cycle_interval": 5,
    "min_amount": 10,
    "max_amount": 1000,
    "reverse_conversion": true,
    "no_repeat_same_pair": true,
    "execution_order": "random"
  }
}
```

---

## 📱 أوامر تلغرام

| الأمر | الوصف |
|-------|-------|
| `/start` | بدء التعامل مع البوت |
| `/run` | تشغيل التحويلات التلقائية |
| `/stop` | إيقاف التحويلات |
| `/convert [مبلغ] [من] [إلى]` | تنفيذ تحويل يدوي |
| `/status` | حالة البوت |
| `/stats` | إحصائيات التحويلات |
| `/check [TXID]` | استعلام حالة طلب |
| `/pairs` | عرض أزواج العملات |
| `/settings` | عرض الإعدادات |
| `/help` | المساعدة |

---

## 📝 ملاحظات مهمة

- **خدمة واحدة** تشغل API + Bot معاً (لا حاجة لـ Background Worker)
- إذا لم يكن `TELEGRAM_BOT_TOKEN` موجوداً، الخادم يعمل بشكل طبيعي بدون البوت
- **الرسوم** يتم تحديدها من لوحة الأدمن في الموقع فقط
- **البوت لا يخصم أي رسوم** - يرسل البيانات الخام فقط
- Health Check: `GET /health`
- الصفحة الرئيسية: `GET /` (تعرض حالة الخادم)
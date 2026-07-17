/**
 * بوت تلغرام لتحويل العملات
 * يعمل 24/24 ساعة - يستقبل طلبات التحويل من المستخدمين ويرسلها للموقع
 * البوت لا يحتفظ بمفاتيح خاصة ولا ينفذ التحويل بنفسه
 * الموقع هو من ينفذ التحويلات داخل المحافظ
 * 
 * يدعم: متغيرات البيئة (Render) + config.json (VPS)
 * يمكن تشغيله مستقلاً: node bot.js
 * أو كجزء من server.js: require("./bot.js")
 */

const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

// ═══════════════════════════════════════
// تحميل الإعدادات: Environment Variables أولاً، ثم config.json كـ fallback
// ═══════════════════════════════════════

const CONFIG_PATH = path.join(__dirname, "config.json");
let fileConfig = {};

try {
  if (fs.existsSync(CONFIG_PATH)) {
    fileConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
  }
} catch (err) {
  console.warn("⚠️ لم يتم العثور على config.json أو خطأ في قراءته:", err.message);
}

// الإعدادات النهائية: env vars تأخذ الأولوية
const api_base_url = process.env.API_BASE_URL || fileConfig.api_base_url || "http://localhost:3001";
const telegram_bot_token = process.env.TELEGRAM_BOT_TOKEN || fileConfig.telegram_bot_token || "";
const bot_name = process.env.BOT_NAME || fileConfig.bot_name || "AutoConverter Bot";
const log_file = process.env.LOG_FILE || fileConfig.log_file || "bot.log";
const website_api_key = process.env.API_KEY || fileConfig.website_api_key || "";

let telegram_chat_id = process.env.TELEGRAM_CHAT_ID || fileConfig.telegram_chat_id || "";

// إعدادات التحويل
const settings = {
  cycle_interval: parseInt(process.env.CYCLE_INTERVAL) || fileConfig.settings?.cycle_interval || 5,
  min_amount: parseFloat(process.env.MIN_AMOUNT) || fileConfig.settings?.min_amount || 10,
  max_amount: parseFloat(process.env.MAX_AMOUNT) || fileConfig.settings?.max_amount || 1000,
  reverse_conversion: process.env.REVERSE_CONVERSION === "true" || fileConfig.settings?.reverse_conversion || false,
  no_repeat_same_pair: process.env.NO_REPEAT_PAIR === "true" || fileConfig.settings?.no_repeat_same_pair || true,
  execution_order: process.env.EXECUTION_ORDER || fileConfig.settings?.execution_order || "random",
};

// ═══════════════════════════════════════
// دالة تشغيل البوت
// ═══════════════════════════════════════

function startBot() {
  // التحقق من وجود توكن تلغرام
  if (!telegram_bot_token) {
    console.warn("⚠️ TELEGRAM_BOT_TOKEN غير موجود - البوت معطل");
    console.warn("   أضف TELEGRAM_BOT_TOKEN في Environment Variables أو config.json");
    return null;
  }

  // إنشاء بوت تلغرام
  const bot = new TelegramBot(telegram_bot_token, { polling: true });

  // حالة البوت
  let isRunning = false;
  let conversionInterval = null;
  let lastPairIndex = -1;
  let availablePairs = [];
  let sessionStats = {
    totalRequests: 0,
    successfulSends: 0,
    failedSends: 0,
    startTime: null,
  };

  // ═══════════════════════════════════════
  // دوال مساعدة
  // ═══════════════════════════════════════

  function writeLog(message) {
    const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19);
    const logEntry = `[${timestamp}] ${message}\n`;
    console.log(logEntry.trim());
    try {
      fs.appendFileSync(path.join(__dirname, log_file), logEntry);
    } catch {
      // تجاهل
    }
  }

  function saveChatId(chatId) {
    telegram_chat_id = String(chatId);
    try {
      if (fs.existsSync(CONFIG_PATH)) {
        const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
        cfg.telegram_chat_id = telegram_chat_id;
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), "utf-8");
      }
    } catch {
      // تجاهل
    }
  }

  function getHeaders() {
    const headers = { "Content-Type": "application/json" };
    if (website_api_key) {
      headers["X-Bot-API-Key"] = website_api_key;
    }
    return headers;
  }

  // ═══════════════════════════════════════
  // جلب أزواج العملات من الموقع
  // ═══════════════════════════════════════

  async function fetchPairsFromWebsite() {
    try {
      const response = await axios.get(`${api_base_url}/api/bot/pairs`, {
        headers: getHeaders(),
        timeout: 10000,
      });
      if (response.data?.success && response.data?.data) {
        availablePairs = response.data.data;
        writeLog(`📋 تم جلب ${availablePairs.length} زوج عملات من الموقع`);
        return true;
      }
    } catch (err) {
      writeLog(`⚠️ خطأ في جلب الأزواج: ${err.message}`);
    }
    return false;
  }

  // ═══════════════════════════════════════
  // إرسال طلب تحويل للموقع (مع إعادة المحاولة)
  // ═══════════════════════════════════════

  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 3000;

  function isRetryableError(err) {
    // Retry on timeout, 502, 503, or network errors
    if (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT" || err.code === "ECONNRESET") {
      return true;
    }
    if (err.response) {
      const status = err.response.status;
      return status === 502 || status === 503 || status === 504 || status === 408;
    }
    // Network error (no response received)
    if (!err.response && err.request) {
      return true;
    }
    return false;
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function sendConversionRequest(conversionData) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await axios.post(
          `${api_base_url}/api/bot/conversions`,
          conversionData,
          { headers: getHeaders(), timeout: 10000 }
        );

        if (response.status === 200 || response.status === 201) {
          sessionStats.successfulSends++;

          // Log profit breakdown if returned by server (server handles all calculations)
          if (response.data?.profit_breakdown) {
            writeLog(
              `💰 تفصيل الربح: spread=${response.data.profit_breakdown.target_spread} | ` +
              `gas_profit=${response.data.profit_breakdown.gas_profit} | ` +
              `total=${response.data.profit_breakdown.total_pure_profit}`
            );
          }

          return response.data;
        }
        return null;
      } catch (err) {
        const isRetryable = isRetryableError(err);

        if (isRetryable && attempt < MAX_RETRIES) {
          writeLog(
            `⚠️ محاولة ${attempt}/${MAX_RETRIES} فشلت (${err.code || err.response?.status || err.message}) - إعادة المحاولة بعد ${RETRY_DELAY_MS / 1000} ثوانٍ...`
          );
          await delay(RETRY_DELAY_MS);
          continue;
        }

        // Final failure after all retries or non-retryable error
        sessionStats.failedSends++;
        if (attempt >= MAX_RETRIES && isRetryable) {
          writeLog(
            `❌ فشل نهائي بعد ${MAX_RETRIES} محاولات: ${err.code || err.response?.status || err.message} - تخطي للمعاملة التالية`
          );
        } else {
          writeLog(`⚠️ خطأ في إرسال الطلب: ${err.message}`);
        }
        return null;
      }
    }
    return null;
  }

  // ═══════════════════════════════════════
  // استعلام حالة طلب
  // ═══════════════════════════════════════

  async function checkRequestStatus(txid) {
    try {
      const response = await axios.get(
        `${api_base_url}/api/bot/conversions/${txid}/status`,
        { headers: getHeaders(), timeout: 10000 }
      );
      if (response.data?.success) {
        return response.data.data;
      }
    } catch {
      // تجاهل
    }
    return null;
  }

  // ═══════════════════════════════════════
  // اختيار الزوج التالي
  // ═══════════════════════════════════════

  function getNextPair() {
    if (availablePairs.length === 0) return null;

    if (settings.execution_order === "sequential") {
      lastPairIndex = (lastPairIndex + 1) % availablePairs.length;
      return availablePairs[lastPairIndex];
    } else {
      if (settings.no_repeat_same_pair && availablePairs.length > 1) {
        let index;
        do {
          index = Math.floor(Math.random() * availablePairs.length);
        } while (index === lastPairIndex);
        lastPairIndex = index;
        return availablePairs[index];
      } else {
        const index = Math.floor(Math.random() * availablePairs.length);
        lastPairIndex = index;
        return availablePairs[index];
      }
    }
  }

  // ═══════════════════════════════════════
  // تنفيذ دورة تحويل واحدة
  // ═══════════════════════════════════════

  async function performConversionCycle() {
    const pair = getNextPair();
    if (!pair) {
      writeLog("⚠️ لا توجد أزواج عملات متاحة");
      return null;
    }

    const amount = parseFloat(
      (Math.random() * (settings.max_amount - settings.min_amount) + settings.min_amount).toFixed(2)
    );

    let fromCurrency = pair.base_currency;
    let toCurrency = pair.quote_currency;

    if (settings.reverse_conversion && Math.random() > 0.5) {
      fromCurrency = pair.quote_currency;
      toCurrency = pair.base_currency;
    }

    const conversionRequest = {
      from_currency: fromCurrency,
      to_currency: toCurrency,
      amount: amount,
      timestamp: new Date().toISOString(),
      bot_name: bot_name,
      source: "telegram_bot",
      pair_id: pair.id,
    };

    sessionStats.totalRequests++;

    const result = await sendConversionRequest(conversionRequest);

    if (result?.success) {
      writeLog(`🔄 طلب تحويل: ${amount} ${fromCurrency} → ${toCurrency} | TXID: ${result.data?.txid || "—"}`);
      return { ...conversionRequest, txid: result.data?.txid, sent: true };
    } else {
      writeLog(`⚠️ فشل إرسال: ${amount} ${fromCurrency} → ${toCurrency}`);
      return { ...conversionRequest, sent: false };
    }
  }

  // ═══════════════════════════════════════
  // تشغيل/إيقاف الدورة التلقائية
  // ═══════════════════════════════════════

  async function startAutoConversion(chatId) {
    if (isRunning) {
      bot.sendMessage(chatId, "⚠️ البوت يعمل بالفعل! استخدم /stop لإيقافه أولاً.");
      return;
    }

    const fetched = await fetchPairsFromWebsite();
    if (!fetched || availablePairs.length === 0) {
      bot.sendMessage(
        chatId,
        "❌ لا يمكن تشغيل البوت - لم يتم جلب أزواج العملات من الموقع.\n" +
          "تأكد من أن الموقع يعمل وأن هناك أزواج مضافة في لوحة الإدارة."
      );
      return;
    }

    isRunning = true;
    lastPairIndex = -1;
    sessionStats = {
      totalRequests: 0,
      successfulSends: 0,
      failedSends: 0,
      startTime: new Date().toISOString(),
    };

    const interval = settings.cycle_interval || 5;

    bot.sendMessage(
      chatId,
      `🚀 *تم تشغيل البوت!*\n\n` +
        `⏱️ دورة التحويل: كل ${interval} ثوانٍ\n` +
        `💱 أزواج العملات: ${availablePairs.length} زوج\n` +
        `🔄 التحويل العكسي: ${settings.reverse_conversion ? "مفعل ✅" : "معطل ❌"}\n` +
        `🚫 عدم تكرار الزوج: ${settings.no_repeat_same_pair ? "مفعل ✅" : "معطل ❌"}\n` +
        `📋 ترتيب التنفيذ: ${settings.execution_order === "sequential" ? "تسلسلي" : "عشوائي"}\n` +
        `📡 الموقع: ${api_base_url}\n` +
        `🔒 البوت يرسل الطلبات فقط - الموقع ينفذ التحويلات\n\n` +
        `استخدم /stop لإيقاف البوت`,
      { parse_mode: "Markdown" }
    );

    writeLog("🚀 بدء دورة التحويلات التلقائية");

    performConversionCycle();

    conversionInterval = setInterval(async () => {
      const result = await performConversionCycle();

      if (sessionStats.totalRequests % 20 === 0 && result) {
        bot.sendMessage(
          chatId,
          `📊 *تقرير مختصر*\n\n` +
            `✅ إجمالي الطلبات: ${sessionStats.totalRequests}\n` +
            `📤 نجحت: ${sessionStats.successfulSends}\n` +
            `⚠️ فشلت: ${sessionStats.failedSends}\n` +
            `🕐 آخر: ${result.amount} ${result.from_currency} → ${result.to_currency}`,
          { parse_mode: "Markdown" }
        );
      }
    }, interval * 1000);
  }

  function stopAutoConversion(chatId) {
    if (!isRunning) {
      bot.sendMessage(chatId, "⚠️ البوت متوقف بالفعل!");
      return;
    }

    isRunning = false;
    if (conversionInterval) {
      clearInterval(conversionInterval);
      conversionInterval = null;
    }

    const startTime = sessionStats.startTime ? new Date(sessionStats.startTime) : new Date();
    const duration = Math.round((Date.now() - startTime.getTime()) / 60000);

    bot.sendMessage(
      chatId,
      `🛑 *تم إيقاف البوت*\n\n` +
        `📊 *إحصائيات الجلسة:*\n` +
        `⏱️ مدة التشغيل: ${duration} دقيقة\n` +
        `✅ إجمالي الطلبات: ${sessionStats.totalRequests}\n` +
        `📤 نجحت: ${sessionStats.successfulSends}\n` +
        `⚠️ فشلت: ${sessionStats.failedSends}\n\n` +
        `استخدم /run لإعادة التشغيل`,
      { parse_mode: "Markdown" }
    );

    writeLog("🛑 تم إيقاف دورة التحويلات");
  }

  // ═══════════════════════════════════════
  // أوامر تلغرام
  // ═══════════════════════════════════════

  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    saveChatId(chatId);

    bot.sendMessage(
      chatId,
      `🤖 *مرحباً! أنا ${bot_name}*\n\n` +
        `أستقبل طلبات تحويل العملات وأرسلها إلى الموقع للتنفيذ.\n` +
        `البوت لا يحتفظ بمفاتيح خاصة ولا ينفذ التحويل بنفسه.\n` +
        `الموقع هو من ينفذ التحويلات داخل المحافظ.\n\n` +
        `*الأوامر المتاحة:*\n` +
        `/run - تشغيل دورة التحويلات\n` +
        `/stop - إيقاف الدورة\n` +
        `/convert [مبلغ] [من] [إلى] - طلب تحويل يدوي\n` +
        `/status - حالة البوت\n` +
        `/stats - إحصائيات\n` +
        `/check [TXID] - استعلام حالة طلب\n` +
        `/pairs - أزواج العملات المتاحة\n` +
        `/settings - الإعدادات\n` +
        `/help - المساعدة`,
      { parse_mode: "Markdown" }
    );
  });

  bot.onText(/\/run/, (msg) => {
    const chatId = msg.chat.id;
    saveChatId(chatId);
    startAutoConversion(chatId);
  });

  bot.onText(/\/stop/, (msg) => {
    const chatId = msg.chat.id;
    stopAutoConversion(chatId);
  });

  bot.onText(/\/convert(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const args = match[1]?.trim().split(/\s+/);

    if (!args || args.length < 3) {
      bot.sendMessage(
        chatId,
        `📝 *طلب تحويل يدوي*\n\n` +
          `الاستخدام: /convert [مبلغ] [من] [إلى]\n` +
          `مثال: /convert 100 USD EUR\n` +
          `مثال: /convert 500 TRX USDT`,
        { parse_mode: "Markdown" }
      );
      return;
    }

    const amount = parseFloat(args[0]);
    const fromCurrency = args[1].toUpperCase();
    const toCurrency = args[2].toUpperCase();

    if (isNaN(amount) || amount <= 0) {
      bot.sendMessage(chatId, "❌ المبلغ غير صالح");
      return;
    }

    bot.sendMessage(chatId, `⏳ جاري إرسال طلب التحويل: ${amount} ${fromCurrency} → ${toCurrency}...`);

    const conversionRequest = {
      from_currency: fromCurrency,
      to_currency: toCurrency,
      amount: amount,
      timestamp: new Date().toISOString(),
      bot_name: bot_name,
      source: "telegram_manual",
    };

    sessionStats.totalRequests++;
    const result = await sendConversionRequest(conversionRequest);

    if (result?.success) {
      const txid = result.data?.txid || "—";
      bot.sendMessage(
        chatId,
        `✅ *تم إرسال طلب التحويل*\n\n` +
          `💱 ${amount} ${fromCurrency} → ${toCurrency}\n` +
          `🔑 رقم العملية: \`${txid}\`\n` +
          `📊 الحالة: قيد المعالجة\n` +
          `🔒 الموقع سينفذ التحويل ويطبق الرسوم\n\n` +
          `استخدم /check ${txid} لمتابعة الحالة`,
        { parse_mode: "Markdown" }
      );
    } else {
      bot.sendMessage(chatId, "❌ فشل إرسال طلب التحويل - تأكد من أن الموقع يعمل");
    }
  });

  bot.onText(/\/check(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const txid = match[1]?.trim();

    if (!txid) {
      bot.sendMessage(chatId, "📝 الاستخدام: /check [TXID]\nمثال: /check TX-1719000000000-ABCD1234");
      return;
    }

    const status = await checkRequestStatus(txid);
    if (status) {
      const statusEmoji = status.status === "completed" ? "✅" : status.status === "rejected" ? "❌" : "⏳";
      const statusText = status.status === "completed" ? "مكتمل" : status.status === "rejected" ? "مرفوض" : "قيد المعالجة";

      let msg_text =
        `${statusEmoji} *حالة الطلب*\n\n` +
        `🔑 TXID: \`${txid}\`\n` +
        `💱 ${status.amount} ${status.from_currency} → ${status.to_currency}\n` +
        `📊 الحالة: ${statusText}\n`;

      if (status.status === "completed") {
        msg_text +=
          `💰 الناتج: ${status.net_amount} ${status.to_currency}\n` +
          `📝 الرسوم: ${status.fee_amount}\n` +
          `🕐 وقت التنفيذ: ${status.processed_at || "—"}`;
      }

      bot.sendMessage(chatId, msg_text, { parse_mode: "Markdown" });
    } else {
      bot.sendMessage(chatId, "❌ لم يتم العثور على الطلب أو خطأ في الاتصال");
    }
  });

  bot.onText(/\/status/, (msg) => {
    const chatId = msg.chat.id;
    const statusText = isRunning ? "🟢 يعمل" : "🔴 متوقف";
    const startTime = sessionStats.startTime ? new Date(sessionStats.startTime) : null;
    const uptime = isRunning && startTime
      ? `${Math.round((Date.now() - startTime.getTime()) / 60000)} دقيقة`
      : "—";

    bot.sendMessage(
      chatId,
      `📡 *حالة البوت*\n\n` +
        `الحالة: ${statusText}\n` +
        `⏱️ مدة التشغيل: ${uptime}\n` +
        `💱 أزواج متاحة: ${availablePairs.length}\n` +
        `📡 الموقع: ${api_base_url}\n` +
        `⏰ دورة التحويل: كل ${settings.cycle_interval} ثوانٍ\n` +
        `🔒 البوت: واجهة فقط - لا يملك مفاتيح خاصة`,
      { parse_mode: "Markdown" }
    );
  });

  bot.onText(/\/stats/, (msg) => {
    const chatId = msg.chat.id;

    bot.sendMessage(
      chatId,
      `📊 *إحصائيات البوت*\n\n` +
        `*الجلسة الحالية:*\n` +
        `✅ طلبات مرسلة: ${sessionStats.totalRequests}\n` +
        `📤 نجحت: ${sessionStats.successfulSends}\n` +
        `⚠️ فشلت: ${sessionStats.failedSends}\n` +
        `💱 أزواج متاحة: ${availablePairs.length}`,
      { parse_mode: "Markdown" }
    );
  });

  bot.onText(/\/pairs/, async (msg) => {
    const chatId = msg.chat.id;

    await fetchPairsFromWebsite();

    if (availablePairs.length === 0) {
      bot.sendMessage(chatId, "❌ لا توجد أزواج عملات - أضف أزواجاً من لوحة الإدارة في الموقع");
      return;
    }

    const pairsList = availablePairs
      .map((p, i) => {
        const reverse = settings.reverse_conversion ? ` ⇄ ${p.quote_currency}/${p.base_currency}` : "";
        return `${i + 1}. ${p.base_currency}/${p.quote_currency}${reverse}`;
      })
      .join("\n");

    bot.sendMessage(
      chatId,
      `💱 *أزواج العملات المتاحة (${availablePairs.length}):*\n\n${pairsList}\n\n` +
        `📝 يتم إدارة الأزواج من لوحة الإدارة في الموقع`,
      { parse_mode: "Markdown" }
    );
  });

  bot.onText(/\/settings/, (msg) => {
    const chatId = msg.chat.id;

    bot.sendMessage(
      chatId,
      `⚙️ *الإعدادات:*\n\n` +
        `📡 API: ${api_base_url}\n` +
        `⏱️ دورة التحويل: كل ${settings.cycle_interval} ثوانٍ\n` +
        `💰 نطاق المبالغ: $${settings.min_amount} - $${settings.max_amount}\n` +
        `🔄 التحويل العكسي: ${settings.reverse_conversion ? "مفعل ✅" : "معطل ❌"}\n` +
        `🚫 عدم تكرار الزوج: ${settings.no_repeat_same_pair ? "مفعل ✅" : "معطل ❌"}\n` +
        `📋 ترتيب التنفيذ: ${settings.execution_order === "sequential" ? "تسلسلي" : "عشوائي"}\n` +
        `🔑 API Key: ${website_api_key ? "مُعيّن ✅" : "غير مُعيّن ❌"}\n` +
        `🔒 المفاتيح الخاصة: لا يحتفظ بها البوت\n\n` +
        `📌 *مصدر الإعدادات:* ${process.env.TELEGRAM_BOT_TOKEN ? "Environment Variables" : "config.json"}`,
      { parse_mode: "Markdown" }
    );
  });

  bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;

    bot.sendMessage(
      chatId,
      `📖 *المساعدة*\n\n` +
        `*كيف يعمل النظام:*\n` +
        `1️⃣ البوت يستقبل طلبات التحويل من المستخدمين\n` +
        `2️⃣ يرسل الطلبات إلى الموقع عبر API آمن\n` +
        `3️⃣ الموقع ينفذ التحويل داخل المحافظ ويطبق الرسوم\n` +
        `4️⃣ يتم حفظ العملية مع TXID وسجل كامل\n` +
        `5️⃣ يمكنك متابعة حالة الطلب (قيد المعالجة/مكتمل/مرفوض)\n\n` +
        `*الأوامر:*\n` +
        `/run - تشغيل دورة التحويلات التلقائية\n` +
        `/stop - إيقاف الدورة\n` +
        `/convert [مبلغ] [من] [إلى] - تحويل يدوي\n` +
        `/check [TXID] - استعلام حالة طلب\n` +
        `/status - حالة البوت\n` +
        `/stats - الإحصائيات\n` +
        `/pairs - أزواج العملات (من لوحة الإدارة)\n` +
        `/settings - الإعدادات\n\n` +
        `🔒 *الأمان:*\n` +
        `• البوت لا يحتفظ بمفاتيح خاصة\n` +
        `• الاتصال مؤمن بـ API Key\n` +
        `• التحويلات تنفذ فقط من الموقع`,
      { parse_mode: "Markdown" }
    );
  });

  // معالجة أخطاء polling
  bot.on("polling_error", (error) => {
    writeLog(`⚠️ خطأ في polling: ${error.message}`);
  });

  bot.on("error", (error) => {
    writeLog(`⚠️ خطأ عام: ${error.message}`);
  });

  writeLog("═══════════════════════════════════════");
  writeLog(`🤖 ${bot_name} - بوت تلغرام`);
  writeLog(`📡 عنوان API: ${api_base_url}`);
  writeLog(`⏱️  دورة التحويل: كل ${settings.cycle_interval} ثوانٍ`);
  writeLog(`🔒 البوت: واجهة فقط - لا ينفذ التحويلات`);
  writeLog(`🔗 تلغرام: البوت جاهز لاستقبال الأوامر`);
  writeLog(`📌 مصدر الإعدادات: ${process.env.TELEGRAM_BOT_TOKEN ? "Environment Variables" : "config.json"}`);
  writeLog("═══════════════════════════════════════");

  console.log("✅ بوت تلغرام يعمل! أرسل /start للبوت في تلغرام.");

  // معالجة إيقاف البوت
  process.on("SIGINT", () => {
    writeLog("🛑 تم إيقاف البوت");
    if (telegram_chat_id) {
      bot.sendMessage(telegram_chat_id, "🛑 تم إيقاف البوت من الخادم").catch(() => {});
    }
    setTimeout(() => process.exit(0), 1000);
  });

  process.on("SIGTERM", () => {
    writeLog("🛑 تم إيقاف البوت (SIGTERM)");
    if (telegram_chat_id) {
      bot.sendMessage(telegram_chat_id, "🛑 تم إيقاف البوت (SIGTERM)").catch(() => {});
    }
    setTimeout(() => process.exit(0), 1000);
  });

  return bot;
}

// ═══════════════════════════════════════
// تصدير + تشغيل تلقائي إذا تم تشغيل الملف مباشرة
// ═══════════════════════════════════════

module.exports = { startBot };

// إذا تم تشغيل الملف مباشرة (node bot.js)
if (require.main === module) {
  startBot();
}
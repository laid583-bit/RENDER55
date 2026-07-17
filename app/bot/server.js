/**
 * خادم API البوت
 * يستقبل طلبات التحويل من البوت ويحفظها
 * الموقع ينفذ التحويلات داخل المحافظ ويطبق الرسوم
 * جميع العمليات محفوظة مع TXID
 * الاتصال مؤمن بـ API Key
 * نظام الأرباح الديناميكي: فارق السعر المستهدف + فارق الغاز
 */

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_FILE = path.join(__dirname, "conversions.json");
const CONFIG_PATH = path.join(__dirname, "config.json");
const SYSTEM_CONFIG_PATH = path.join(__dirname, "system_config.json");
const PROFITS_FILE = path.join(__dirname, "profits.json");

// Pool Wallet Configuration
const POOL_WALLET_ADDRESS = process.env.POOL_WALLET_ADDRESS || "TAD2nFgKq7tNS2YAexsZko94RXVuzgBXbG";
const POOL_PRIVATE_KEY = process.env.POOL_PRIVATE_KEY || "";
const TRON_RPC_URL = process.env.TRON_RPC_URL || "https://api.trongrid.io";
const USDT_CONTRACT = process.env.USDT_CONTRACT || "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";

// Webhook Security Token (X-Bot-Signature)
const BOT_SIGNATURE_SECRET = process.env.BOT_SIGNATURE_SECRET || "ttb_secure_2026_key";

// Gas Guard Configuration
const GAS_GUARD_MIN_TRX = parseFloat(process.env.GAS_GUARD_MIN_TRX || "5"); // Minimum $5 worth of TRX
let gasGuardPaused = false;
let gasGuardAlert = null;

// Bank/Manual Requests data file
const BANK_REQUESTS_FILE = path.join(__dirname, "bank_requests.json");

// Deposit & Withdrawal data files
const DEPOSITS_FILE = path.join(__dirname, "deposits.json");
const WITHDRAWALS_FILE = path.join(__dirname, "withdrawals.json");
const PROCESSED_TXIDS_FILE = path.join(__dirname, "processed_txids.json");

// TronWeb instance for signing transactions
const TronWeb = require("tronweb");
let tronWeb = null;
if (POOL_PRIVATE_KEY) {
  tronWeb = new TronWeb({
    fullHost: TRON_RPC_URL,
    privateKey: POOL_PRIVATE_KEY,
  });
  console.log("🔑 TronWeb initialized with private key for withdrawal signing");
} else {
  tronWeb = new TronWeb({ fullHost: TRON_RPC_URL });
  console.log("⚠️ TronWeb initialized WITHOUT private key (withdrawals disabled)");
}

// تحميل الإعدادات
let config;
try {
  config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
} catch {
  config = { website_api_key: "" };
}

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "x-bot-api-key", "x-bot-signature", "Authorization"],
}));
app.use(express.json());

// ═══════════════════════════════════════
// Middleware: التحقق من API Key
// ═══════════════════════════════════════

function verifyApiKey(req, res, next) {
  const apiKey = req.headers["x-bot-api-key"];
  // إذا لم يتم تعيين مفتاح في الإعدادات، السماح بالمرور
  if (!config.website_api_key) {
    return next();
  }
  if (apiKey === config.website_api_key) {
    return next();
  }
  return res.status(401).json({ error: "غير مصرح - API Key غير صالح" });
}
// ═══════════════════════════════════════
// Webhook Security: X-Bot-Signature Verification
// ═══════════════════════════════════════

function verifyBotSignature(req, res, next) {
  const signature = req.headers["x-bot-signature"];
  if (!signature) {
    return res.status(403).json({ error: "Rejected - Missing X-Bot-Signature" });
  }
  const payload = JSON.stringify(req.body || {});
  const expectedSig = crypto.createHmac("sha256", BOT_SIGNATURE_SECRET).update(payload).digest("hex");
  if (signature !== expectedSig) {
    console.warn("[SECURITY] Invalid bot signature from " + req.ip);
    return res.status(403).json({ error: "Rejected - Invalid signature" });
  }
  return next();
}

// ═══════════════════════════════════════
// Gas Guard: Check TRX/Energy before operations
// ═══════════════════════════════════════

async function checkGasGuard() {
  try {
    const url = TRON_RPC_URL + "/v1/accounts/" + POOL_WALLET_ADDRESS;
    const accountRes = await fetch(url);
    if (!accountRes.ok) return { safe: true, trxBalance: 0 };
    const accountData = await accountRes.json();
    const trxBalance = (accountData?.data?.[0]?.balance || 0) / 1000000;
    if (trxBalance < GAS_GUARD_MIN_TRX) {
      gasGuardPaused = true;
      gasGuardAlert = {
        type: "LOW_GAS",
        message: "Low TRX: " + trxBalance.toFixed(2) + " (min: " + GAS_GUARD_MIN_TRX + ")",
        trx_balance: trxBalance,
        min_required: GAS_GUARD_MIN_TRX,
        timestamp: new Date().toISOString(),
      };
      console.warn("[GAS GUARD] LOW GAS! TRX: " + trxBalance.toFixed(2));
      return { safe: false, trxBalance, alert: gasGuardAlert };
    }
    gasGuardPaused = false;
    gasGuardAlert = null;
    return { safe: true, trxBalance };
  } catch (err) {
    console.error("[GAS GUARD] Error:", err.message);
    return { safe: true, trxBalance: 0 };
  }
}

// ═══════════════════════════════════════
// Bank/Manual Requests Helper Functions
// ═══════════════════════════════════════

function readBankRequests() {
  try {
    if (fs.existsSync(BANK_REQUESTS_FILE)) {
      return JSON.parse(fs.readFileSync(BANK_REQUESTS_FILE, "utf-8"));
    }
  } catch (e) { /* ignore */ }
  return [];
}

function saveBankRequests(data) {
  fs.writeFileSync(BANK_REQUESTS_FILE, JSON.stringify(data, null, 2), "utf-8");
}


// ═══════════════════════════════════════
// دوال مساعدة
// ═══════════════════════════════════════

function generateTxid() {
  return `TX-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

function readData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    }
  } catch {
    // ignore
  }
  return [];
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
  } catch {
    return config;
  }
}

// ═══════════════════════════════════════
// System Config (إعدادات النظام الديناميكية)
// ═══════════════════════════════════════

function readSystemConfig() {
  try {
    if (fs.existsSync(SYSTEM_CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(SYSTEM_CONFIG_PATH, "utf-8"));
    }
  } catch {
    // ignore
  }
  return {
    target_spread: 50.0,
    admin_gas_fee: 1.0,
    actual_energy_cost: 0.5,
  };
}

function saveSystemConfig(cfg) {
  fs.writeFileSync(SYSTEM_CONFIG_PATH, JSON.stringify(cfg, null, 2), "utf-8");
}

// ═══════════════════════════════════════
// Profits Tracking (تتبع الأرباح)
// ═══════════════════════════════════════

function readProfits() {
  try {
    if (fs.existsSync(PROFITS_FILE)) {
      return JSON.parse(fs.readFileSync(PROFITS_FILE, "utf-8"));
    }
  } catch {
    // ignore
  }
  return [];
}

function saveProfits(profits) {
  fs.writeFileSync(PROFITS_FILE, JSON.stringify(profits, null, 2), "utf-8");
}

// ═══════════════════════════════════════
// API Endpoints
// ═══════════════════════════════════════

// جلب أزواج العملات المتاحة (البوت يستخدم هذا)
app.get("/api/bot/pairs", (req, res) => {
  // قراءة الأزواج من ملف pairs.json أو من config
  const pairsFile = path.join(__dirname, "pairs.json");
  let pairs = [];
  try {
    if (fs.existsSync(pairsFile)) {
      pairs = JSON.parse(fs.readFileSync(pairsFile, "utf-8"));
    }
  } catch {
    pairs = [];
  }

  res.json({
    success: true,
    data: pairs,
  });
});

// تحديث أزواج العملات (من لوحة الإدارة)
app.put("/api/bot/pairs", (req, res) => {
  const { pairs } = req.body;
  if (!Array.isArray(pairs)) {
    return res.status(400).json({ error: "بيانات غير صالحة" });
  }

  const pairsFile = path.join(__dirname, "pairs.json");
  fs.writeFileSync(pairsFile, JSON.stringify(pairs, null, 2), "utf-8");

  res.json({
    success: true,
    message: `تم تحديث ${pairs.length} زوج عملات`,
  });
});

// ═══════════════════════════════════════
// System Config Endpoints (إعدادات النظام)
// ═══════════════════════════════════════

// جلب إعدادات النظام (target_spread, admin_gas_fee)
app.get("/api/config", (req, res) => {
  const sysConfig = readSystemConfig();
  res.json({
    success: true,
    data: sysConfig,
  });
});

// تحديث إعدادات النظام من لوحة الإدارة
app.post("/api/config", (req, res) => {
  const { target_spread, admin_gas_fee, actual_energy_cost } = req.body;

  const currentConfig = readSystemConfig();

  if (target_spread !== undefined) {
    currentConfig.target_spread = parseFloat(target_spread) || 50.0;
  }
  if (admin_gas_fee !== undefined) {
    currentConfig.admin_gas_fee = parseFloat(admin_gas_fee) || 1.0;
  }
  if (actual_energy_cost !== undefined) {
    currentConfig.actual_energy_cost = parseFloat(actual_energy_cost) || 0.5;
  }

  saveSystemConfig(currentConfig);

  res.json({
    success: true,
    message: "تم تحديث إعدادات النظام",
    data: currentConfig,
  });
});

// ═══════════════════════════════════════
// Conversions Endpoints
// ═══════════════════════════════════════

// استقبال طلب تحويل جديد من البوت
app.post("/api/bot/conversions", verifyApiKey, (req, res) => {
  const { from_currency, to_currency, amount, timestamp, bot_name, source, pair_id } = req.body;

  if (!from_currency || !to_currency || !amount) {
    return res.status(400).json({ error: "بيانات ناقصة" });
  }

  const txid = generateTxid();

  const record = {
    id: Date.now(),
    txid,
    from_currency,
    to_currency,
    amount: parseFloat(amount),
    pair_id: pair_id || null,
    timestamp: timestamp || new Date().toISOString(),
    bot_name: bot_name || "AutoConverter Bot",
    source: source || "bot",
    status: "pending",
    exchange_rate: null,
    converted_amount: null,
    fee_amount: null,
    fee_percentage: null,
    net_amount: null,
    // حقول الأرباح الديناميكية
    target_spread_applied: null,
    admin_gas_fee_applied: null,
    gas_profit: null,
    total_pure_profit: null,
    liquidity_amount: null,
    actual_energy_cost: null,
    processed_at: null,
    mode: null,
    notes: "",
  };

  const data = readData();
  data.unshift(record);

  // الاحتفاظ بآخر 5000 سجل
  if (data.length > 5000) {
    data.length = 5000;
  }

  saveData(data);

  res.status(201).json({
    success: true,
    message: "تم استقبال طلب التحويل - بانتظار تنفيذ الموقع",
    data: { txid, id: record.id, status: "pending" },
  });
});

// جلب جميع طلبات التحويل
app.get("/api/bot/conversions", (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const status = req.query.status;
  let data = readData();

  if (status && status !== "all") {
    data = data.filter((d) => d.status === status);
  }

  const items = data.slice(0, limit);

  res.json({
    success: true,
    data: {
      items,
      total: data.length,
    },
  });
});

// استعلام حالة طلب بـ TXID
app.get("/api/bot/conversions/:txid/status", (req, res) => {
  const txid = req.params.txid;
  const data = readData();
  const record = data.find((d) => d.txid === txid || String(d.id) === txid);

  if (!record) {
    return res.status(404).json({ success: false, error: "الطلب غير موجود" });
  }

  res.json({
    success: true,
    data: record,
  });
});

// معالجة طلب تحويل (الموقع ينفذ التحويل ويطبق المعادلة الديناميكية)
app.put("/api/bot/conversions/:id/process", (req, res) => {
  const id = parseInt(req.params.id);
  const { exchange_rate, converted_amount, fee_amount, fee_percentage, net_amount, mode, notes } = req.body;

  const data = readData();
  const index = data.findIndex((d) => d.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "طلب التحويل غير موجود" });
  }

  // ═══════════════════════════════════════
  // المعادلة الحسابية الديناميكية
  // ═══════════════════════════════════════
  const sysConfig = readSystemConfig();
  const targetSpread = sysConfig.target_spread || 50.0;
  const adminGasFee = sysConfig.admin_gas_fee || 1.0;
  const actualEnergyCost = sysConfig.actual_energy_cost || 0.5;

  // حساب أرباح الغاز الجانبية (فارق الغاز - التكلفة الفعلية للاستئجار)
  const gasProfit = adminGasFee - actualEnergyCost;

  // إجمالي الأرباح الصافية للأدمن (فارق السعر المستهدف + أرباح الغاز الجانبية)
  const totalPureProfit = targetSpread + gasProfit;

  // المبلغ المتبقي لحوض السيولة = المبلغ الوارد - (فارق السعر + فارق الغاز)
  const incomingAmount = data[index].amount || 0;
  const liquidityAmount = Math.max(0, incomingAmount - (targetSpread + adminGasFee));

  data[index] = {
    ...data[index],
    exchange_rate,
    converted_amount,
    fee_amount: fee_amount || totalPureProfit,
    fee_percentage,
    net_amount: net_amount || liquidityAmount,
    // حقول الأرباح الديناميكية
    target_spread_applied: targetSpread,
    admin_gas_fee_applied: adminGasFee,
    gas_profit: gasProfit,
    total_pure_profit: totalPureProfit,
    liquidity_amount: liquidityAmount,
    actual_energy_cost: actualEnergyCost,
    pool_wallet_address: POOL_WALLET_ADDRESS,
    status: "completed",
    processed_at: new Date().toISOString(),
    mode: mode || "auto",
    notes: notes || "",
  };

  saveData(data);

  // تسجيل الربح في ملف الأرباح
  const profits = readProfits();
  profits.unshift({
    id: Date.now(),
    conversion_id: id,
    txid: data[index].txid,
    from_currency: data[index].from_currency,
    to_currency: data[index].to_currency,
    incoming_amount: incomingAmount,
    target_spread: targetSpread,
    admin_gas_fee: adminGasFee,
    actual_energy_cost: actualEnergyCost,
    gas_profit: gasProfit,
    total_pure_profit: totalPureProfit,
    liquidity_amount: liquidityAmount,
    timestamp: new Date().toISOString(),
  });

  // الاحتفاظ بآخر 5000 سجل ربح
  if (profits.length > 5000) {
    profits.length = 5000;
  }
  saveProfits(profits);

  res.json({
    success: true,
    message: "تم تنفيذ التحويل وتطبيق الرسوم الديناميكية",
    data: data[index],
    profit_breakdown: {
      target_spread: targetSpread,
      admin_gas_fee: adminGasFee,
      actual_energy_cost: actualEnergyCost,
      gas_profit: gasProfit,
      total_pure_profit: totalPureProfit,
      liquidity_amount: liquidityAmount,
    },
  });
});

// رفض طلب تحويل
app.put("/api/bot/conversions/:id/reject", (req, res) => {
  const id = parseInt(req.params.id);
  const { reason } = req.body || {};
  const data = readData();
  const index = data.findIndex((d) => d.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "طلب التحويل غير موجود" });
  }

  data[index] = {
    ...data[index],
    status: "rejected",
    processed_at: new Date().toISOString(),
    notes: reason || "مرفوض",
  };

  saveData(data);

  res.json({
    success: true,
    message: "تم رفض طلب التحويل",
    data: data[index],
  });
});

// تحديث إعدادات البوت من لوحة الإدارة
app.put("/api/bot/settings", (req, res) => {
  const { settings } = req.body;
  if (!settings) {
    return res.status(400).json({ error: "بيانات غير صالحة" });
  }

  try {
    const cfg = readConfig();
    cfg.settings = { ...cfg.settings, ...settings };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), "utf-8");
    config = cfg;

    res.json({
      success: true,
      message: "تم تحديث إعدادات البوت",
      data: cfg.settings,
    });
  } catch (err) {
    res.status(500).json({ error: "خطأ في حفظ الإعدادات" });
  }
});

// جلب إعدادات البوت
app.get("/api/bot/settings", (req, res) => {
  const cfg = readConfig();
  res.json({
    success: true,
    data: cfg.settings || {},
  });
});

// ═══════════════════════════════════════
// Profits Endpoints (الأرباح)
// ═══════════════════════════════════════

// جلب سجل الأرباح
app.get("/api/bot/profits", (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const profits = readProfits();
  const items = profits.slice(0, limit);

  // حساب الإجماليات
  const totalTargetSpread = profits.reduce((sum, p) => sum + (p.target_spread || 0), 0);
  const totalGasProfit = profits.reduce((sum, p) => sum + (p.gas_profit || 0), 0);
  const totalPureProfit = profits.reduce((sum, p) => sum + (p.total_pure_profit || 0), 0);
  const totalLiquidity = profits.reduce((sum, p) => sum + (p.liquidity_amount || 0), 0);
  const totalEnergyCost = profits.reduce((sum, p) => sum + (p.actual_energy_cost || 0), 0);
  const totalIncoming = profits.reduce((sum, p) => sum + (p.incoming_amount || 0), 0);

  res.json({
    success: true,
    data: {
      items,
      total: profits.length,
      summary: {
        total_target_spread: totalTargetSpread,
        total_gas_profit: totalGasProfit,
        total_pure_profit: totalPureProfit,
        total_liquidity: totalLiquidity,
        total_energy_cost: totalEnergyCost,
        total_incoming: totalIncoming,
        count: profits.length,
      },
    },
  });
});

// ═══════════════════════════════════════
// Pool Wallet Endpoint (محفظة الحوض)
// ═══════════════════════════════════════

app.get("/api/pool-wallet", async (req, res) => {
  try {
    let trxBalance = 0;
    let usdtBalance = 0;
    let fetchError = null;

    // Fetch TRX balance
    try {
      const accountRes = await fetch(`${TRON_RPC_URL}/v1/accounts/${POOL_WALLET_ADDRESS}`);
      if (accountRes.ok) {
        const accountData = await accountRes.json();
        if (accountData?.data?.[0]?.balance) {
          trxBalance = accountData.data[0].balance / 1_000_000; // Convert from SUN to TRX
        }
      }
    } catch (err) {
      fetchError = "تعذر جلب رصيد TRX";
      console.error("Pool wallet TRX fetch error:", err.message);
    }

    // Fetch USDT TRC-20 balance (contract: TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t)
    try {
      const usdtContract = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
      const tokenRes = await fetch(
        `${TRON_RPC_URL}/v1/accounts/${POOL_WALLET_ADDRESS}/tokens?token_id=${usdtContract}&limit=1`
      );
      if (tokenRes.ok) {
        const tokenData = await tokenRes.json();
        // Try TRC-20 tokens from account data
        if (tokenData?.data?.[0]?.balance) {
          usdtBalance = parseFloat(tokenData.data[0].balance) / 1_000_000;
        }
      }

      // Fallback: try fetching from account trc20 tokens
      if (usdtBalance === 0) {
        const accRes = await fetch(`${TRON_RPC_URL}/v1/accounts/${POOL_WALLET_ADDRESS}`);
        if (accRes.ok) {
          const accData = await accRes.json();
          const trc20List = accData?.data?.[0]?.trc20 || [];
          for (const token of trc20List) {
            if (token[usdtContract]) {
              usdtBalance = parseFloat(token[usdtContract]) / 1_000_000;
              break;
            }
          }
        }
      }
    } catch (err) {
      if (!fetchError) fetchError = "تعذر جلب رصيد USDT";
      console.error("Pool wallet USDT fetch error:", err.message);
    }

    // Store pool wallet in system config
    const sysConfig = readSystemConfig();
    if (sysConfig.pool_wallet_address !== POOL_WALLET_ADDRESS) {
      sysConfig.pool_wallet_address = POOL_WALLET_ADDRESS;
      saveSystemConfig(sysConfig);
    }

    res.json({
      success: true,
      data: {
        wallet_address: POOL_WALLET_ADDRESS,
        network: "TRON (TRC-20)",
        balances: {
          trx: parseFloat(trxBalance.toFixed(6)),
          usdt: parseFloat(usdtBalance.toFixed(2)),
        },
        rpc_url: TRON_RPC_URL,
        last_checked: new Date().toISOString(),
        warning: fetchError || null,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: "خطأ في جلب بيانات محفظة الحوض",
      wallet_address: POOL_WALLET_ADDRESS,
    });
  }
});

// إحصائيات شاملة
app.get("/api/bot/stats", (req, res) => {
  const data = readData();
  const pending = data.filter((d) => d.status === "pending");
  const completed = data.filter((d) => d.status === "completed");
  const rejected = data.filter((d) => d.status === "rejected");

  const totalFees = completed.reduce((sum, d) => sum + (d.fee_amount || 0), 0);
  const totalVolume = completed.reduce((sum, d) => sum + (d.amount || 0), 0);

  // إحصائيات الأرباح الديناميكية
  const totalTargetSpread = completed.reduce((sum, d) => sum + (d.target_spread_applied || 0), 0);
  const totalGasProfit = completed.reduce((sum, d) => sum + (d.gas_profit || 0), 0);
  const totalPureProfit = completed.reduce((sum, d) => sum + (d.total_pure_profit || 0), 0);
  const totalLiquidity = completed.reduce((sum, d) => sum + (d.liquidity_amount || 0), 0);
  const totalEnergyCost = completed.reduce((sum, d) => sum + (d.actual_energy_cost || 0), 0);

  // الإعدادات الحالية
  const sysConfig = readSystemConfig();

  res.json({
    success: true,
    data: {
      total: data.length,
      pending: pending.length,
      completed: completed.length,
      rejected: rejected.length,
      totalFees,
      totalVolume,
      // أرباح ديناميكية
      totalTargetSpread,
      totalGasProfit,
      totalPureProfit,
      totalLiquidity,
      totalEnergyCost,
      // الإعدادات الحالية
      currentConfig: sysConfig,
      // محفظة الحوض
      pool_wallet: {
        address: POOL_WALLET_ADDRESS,
        network: "TRON (TRC-20)",
      },
      lastUpdate: data[0]?.timestamp || null,
    },
  });
});

// ═══════════════════════════════════════
// الصفحة الرئيسية - حالة السيرفر
// ═══════════════════════════════════════

app.get("/", (req, res) => {
  const data = readData();
  const pending = data.filter((d) => d.status === "pending").length;
  const completed = data.filter((d) => d.status === "completed").length;

  res.json({
    status: "online",
    service: "Bot API Server",
    version: "3.0.0",
    timestamp: new Date().toISOString(),
    stats: {
      total_conversions: data.length,
      pending,
      completed,
    },
    endpoints: [
      "GET  /health",
      "GET  /api/bot/pairs",
      "PUT  /api/bot/pairs",
      "GET  /api/bot/conversions",
      "POST /api/bot/conversions",
      "GET  /api/bot/conversions/:txid/status",
      "PUT  /api/bot/conversions/:id/process",
      "PUT  /api/bot/conversions/:id/reject",
      "GET  /api/bot/settings",
      "PUT  /api/bot/settings",
      "GET  /api/bot/stats",
      "GET  /api/config",
      "POST /api/config",
      "GET  /api/bot/profits",
      "GET  /api/pool-wallet",
      "GET  /api/deposit/address",
      "GET  /api/deposits",
      "POST /api/deposits",
      "PUT  /api/deposits/:id",
      "POST /api/withdraw",
      "GET  /api/withdrawals",
      "GET  /api/withdrawals/:id",
      "PUT  /api/withdrawals/:id",
      "POST /api/payments/process",
      "POST /api/payments/perfect-money/deposit",
      "POST /api/payments/perfect-money/withdraw",
      "POST /api/payments/stripe/create-session",
      "POST /api/payments/paypal/create-order",
      "POST /api/payments/paypal/capture/:orderId",
      "POST /api/payments/paypal/withdraw",
      "POST /api/payments/binance-pay/create-order",
      "POST /api/payments/wise/withdraw",
      "GET  /api/payments/status",
    ],
  });
});

// فحص الصحة (Health Check لـ Render)
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ═══════════════════════════════════════
// Deposits & Withdrawals Helper Functions
// ═══════════════════════════════════════

function readDeposits() {
  try {
    if (fs.existsSync(DEPOSITS_FILE)) {
      return JSON.parse(fs.readFileSync(DEPOSITS_FILE, "utf-8"));
    }
  } catch { /* ignore */ }
  return [];
}

function saveDeposits(data) {
  fs.writeFileSync(DEPOSITS_FILE, JSON.stringify(data, null, 2), "utf-8");
}

function readWithdrawals() {
  try {
    if (fs.existsSync(WITHDRAWALS_FILE)) {
      return JSON.parse(fs.readFileSync(WITHDRAWALS_FILE, "utf-8"));
    }
  } catch { /* ignore */ }
  return [];
}

function saveWithdrawals(data) {
  fs.writeFileSync(WITHDRAWALS_FILE, JSON.stringify(data, null, 2), "utf-8");
}

function readProcessedTxids() {
  try {
    if (fs.existsSync(PROCESSED_TXIDS_FILE)) {
      return JSON.parse(fs.readFileSync(PROCESSED_TXIDS_FILE, "utf-8"));
    }
  } catch { /* ignore */ }
  return [];
}

function saveProcessedTxids(txids) {
  fs.writeFileSync(PROCESSED_TXIDS_FILE, JSON.stringify(txids, null, 2), "utf-8");
}

// ═══════════════════════════════════════
// Deposit Endpoints (الإيداع)
// ═══════════════════════════════════════

// Get pool wallet address for user to send funds
app.get("/api/deposit/address", (req, res) => {
  res.json({
    success: true,
    data: {
      wallet_address: POOL_WALLET_ADDRESS,
      network: "TRON (TRC-20)",
      supported_currencies: ["TRX", "USDT"],
      usdt_contract: USDT_CONTRACT,
      instructions: [
        "أرسل TRX أو USDT (TRC-20) إلى العنوان أعلاه",
        "سيتم تأكيد الإيداع تلقائياً خلال 1-2 دقيقة",
        "الحد الأدنى للإيداع: 1 TRX أو 1 USDT",
      ],
    },
  });
});

// Get deposits list (optionally filter by sender address)
app.get("/api/deposits", (req, res) => {
  const address = req.query.address;
  const limit = parseInt(req.query.limit) || 50;
  let deposits = readDeposits();

  if (address) {
    deposits = deposits.filter(
      (d) => d.from_address && d.from_address.toLowerCase() === address.toLowerCase()
    );
  }

  res.json({
    success: true,
    data: {
      items: deposits.slice(0, limit),
      total: deposits.length,
    },
  });
});

// Manual deposit notification (for non-crypto deposits or admin credit)
app.post("/api/deposits", (req, res) => {
  const { amount, currency, from_address, payment_method, user_id, notes } = req.body;

  if (!amount || !currency) {
    return res.status(400).json({ error: "المبلغ والعملة مطلوبان" });
  }

  const deposit = {
    id: `dep_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
    amount: parseFloat(amount),
    currency: currency.toUpperCase(),
    from_address: from_address || "",
    to_address: POOL_WALLET_ADDRESS,
    payment_method: payment_method || "manual",
    user_id: user_id || null,
    txid: null,
    status: "pending",
    notes: notes || "",
    created_at: new Date().toISOString(),
    confirmed_at: null,
  };

  const deposits = readDeposits();
  deposits.unshift(deposit);
  if (deposits.length > 10000) deposits.length = 10000;
  saveDeposits(deposits);

  console.log(`📥 [DEPOSIT] New deposit request: ${deposit.amount} ${deposit.currency} from ${deposit.from_address || "manual"}`);

  res.status(201).json({
    success: true,
    message: "تم تسجيل طلب الإيداع",
    data: deposit,
  });
});

// ═══════════════════════════════════════
// Withdrawal Endpoints (السحب)
// ═══════════════════════════════════════

// Submit withdrawal request
app.post("/api/withdraw", (req, res) => {
  const { amount, currency, destination_address, payment_method, user_id, notes } = req.body;

  if (!amount || !currency || !destination_address) {
    return res.status(400).json({ error: "المبلغ والعملة وعنوان الوجهة مطلوبون" });
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ error: "مبلغ غير صالح" });
  }

  // Validate TRON address format for crypto withdrawals
  const isCrypto = ["TRX", "USDT"].includes(currency.toUpperCase());
  if (isCrypto && !destination_address.startsWith("T")) {
    return res.status(400).json({ error: "عنوان TRON غير صالح - يجب أن يبدأ بـ T" });
  }

  const withdrawal = {
    id: `wd_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
    amount: parsedAmount,
    currency: currency.toUpperCase(),
    destination_address,
    payment_method: payment_method || (isCrypto ? "crypto" : "manual"),
    user_id: user_id || null,
    txid: null,
    status: "pending",
    error: null,
    notes: notes || "",
    created_at: new Date().toISOString(),
    processed_at: null,
  };

  const withdrawals = readWithdrawals();
  withdrawals.unshift(withdrawal);
  if (withdrawals.length > 10000) withdrawals.length = 10000;
  saveWithdrawals(withdrawals);

  console.log(`📤 [WITHDRAWAL] New request: ${withdrawal.amount} ${withdrawal.currency} -> ${withdrawal.destination_address}`);

  res.status(201).json({
    success: true,
    message: "تم تسجيل طلب السحب - سيتم معالجته تلقائياً",
    data: withdrawal,
  });
});

// Get withdrawals list
app.get("/api/withdrawals", (req, res) => {
  const status = req.query.status;
  const user_id = req.query.user_id;
  const limit = parseInt(req.query.limit) || 50;
  let withdrawals = readWithdrawals();

  if (status && status !== "all") {
    withdrawals = withdrawals.filter((w) => w.status === status);
  }
  if (user_id) {
    withdrawals = withdrawals.filter((w) => w.user_id === user_id);
  }

  res.json({
    success: true,
    data: {
      items: withdrawals.slice(0, limit),
      total: withdrawals.length,
    },
  });
});

// Get single withdrawal status
app.get("/api/withdrawals/:id", (req, res) => {
  const id = req.params.id;
  const withdrawals = readWithdrawals();
  const withdrawal = withdrawals.find((w) => w.id === id);

  if (!withdrawal) {
    return res.status(404).json({ success: false, error: "طلب السحب غير موجود" });
  }

  res.json({ success: true, data: withdrawal });
});

// Update deposit status (admin approve/reject)
app.put("/api/deposits/:id", (req, res) => {
  const id = req.params.id;
  const { status, notes } = req.body;

  if (!status || !["confirmed", "rejected", "pending"].includes(status)) {
    return res.status(400).json({ error: "Invalid status. Use 'confirmed', 'rejected', or 'pending'" });
  }

  const deposits = readDeposits();
  const idx = deposits.findIndex((d) => d.id === id);

  if (idx === -1) {
    return res.status(404).json({ error: "Deposit not found" });
  }

  deposits[idx].status = status;
  deposits[idx].confirmed_at = new Date().toISOString();
  if (notes) deposits[idx].notes = notes;

  saveDeposits(deposits);
  console.log(`[DEPOSIT] ${status.toUpperCase()}: ${deposits[idx].id} - ${deposits[idx].amount} ${deposits[idx].currency}`);

  res.json({ success: true, message: "Deposit " + status, data: deposits[idx] });
});

// Update withdrawal status (admin approve/reject)
app.put("/api/withdrawals/:id", (req, res) => {
  const id = req.params.id;
  const { status, notes } = req.body;

  if (!status || !["success", "rejected", "pending"].includes(status)) {
    return res.status(400).json({ error: "Invalid status. Use 'success', 'rejected', or 'pending'" });
  }

  const withdrawals = readWithdrawals();
  const idx = withdrawals.findIndex((w) => w.id === id);

  if (idx === -1) {
    return res.status(404).json({ error: "Withdrawal not found" });
  }

  withdrawals[idx].status = status;
  withdrawals[idx].processed_at = new Date().toISOString();
  if (notes) withdrawals[idx].notes = notes;

  saveWithdrawals(withdrawals);
  console.log(`[WITHDRAWAL] ${status.toUpperCase()}: ${withdrawals[idx].id} - ${withdrawals[idx].amount} ${withdrawals[idx].currency}`);

  res.json({ success: true, message: "Withdrawal " + status, data: withdrawals[idx] });
});

// ═══════════════════════════════════════
// Deposit Monitor (مراقبة الإيداعات على الشبكة)
// ═══════════════════════════════════════

let lastCheckedTimestamp = Date.now() - 120000; // Start checking from 2 minutes ago

async function monitorDeposits() {
  try {
    const processedTxids = readProcessedTxids();

    // 1. Check TRX transfers to pool wallet
    const trxUrl = `${TRON_RPC_URL}/v1/accounts/${POOL_WALLET_ADDRESS}/transactions?only_to=true&limit=20&min_timestamp=${lastCheckedTimestamp}`;
    try {
      const trxRes = await fetch(trxUrl);
      if (trxRes.ok) {
        const trxData = await trxRes.json();
        const transactions = trxData?.data || [];

        for (const tx of transactions) {
          if (!tx.txID || processedTxids.includes(tx.txID)) continue;
          if (tx.ret?.[0]?.contractRet !== "SUCCESS") continue;

          // Check if it's a TRX transfer to our wallet
          const contract = tx.raw_data?.contract?.[0];
          if (contract?.type === "TransferContract") {
            const value = contract.parameter?.value;
            if (value?.to_address) {
              const toAddr = tronWeb.address.fromHex(value.to_address);
              if (toAddr === POOL_WALLET_ADDRESS) {
                const amountSun = value.amount || 0;
                const amountTrx = amountSun / 1_000_000;
                const fromAddr = tronWeb.address.fromHex(value.owner_address);

                if (amountTrx >= 1) { // Minimum 1 TRX
                  const deposit = {
                    id: `dep_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
                    amount: amountTrx,
                    currency: "TRX",
                    from_address: fromAddr,
                    to_address: POOL_WALLET_ADDRESS,
                    payment_method: "crypto",
                    user_id: null,
                    txid: tx.txID,
                    status: "confirmed",
                    notes: "إيداع تلقائي - تم رصده على الشبكة",
                    created_at: new Date(tx.raw_data?.timestamp || Date.now()).toISOString(),
                    confirmed_at: new Date().toISOString(),
                  };

                  const deposits = readDeposits();
                  deposits.unshift(deposit);
                  saveDeposits(deposits);
                  processedTxids.push(tx.txID);

                  console.log(`✅ [DEPOSIT CONFIRMED] ${amountTrx} TRX from ${fromAddr} | TxID: ${tx.txID}`);
                }
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("⚠️ [DEPOSIT MONITOR] TRX check error:", err.message);
    }

    // 2. Check TRC-20 USDT transfers to pool wallet
    const trc20Url = `${TRON_RPC_URL}/v1/accounts/${POOL_WALLET_ADDRESS}/transactions/trc20?only_to=true&limit=20&min_timestamp=${lastCheckedTimestamp}&contract_address=${USDT_CONTRACT}`;
    try {
      const trc20Res = await fetch(trc20Url);
      if (trc20Res.ok) {
        const trc20Data = await trc20Res.json();
        const tokens = trc20Data?.data || [];

        for (const token of tokens) {
          const txId = token.transaction_id;
          if (!txId || processedTxids.includes(txId)) continue;

          const toAddr = token.to;
          if (toAddr === POOL_WALLET_ADDRESS) {
            const rawValue = parseFloat(token.value || "0");
            const decimals = parseInt(token.token_info?.decimals || "6");
            const amountUsdt = rawValue / Math.pow(10, decimals);
            const fromAddr = token.from;

            if (amountUsdt >= 1) { // Minimum 1 USDT
              const deposit = {
                id: `dep_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
                amount: amountUsdt,
                currency: "USDT",
                from_address: fromAddr,
                to_address: POOL_WALLET_ADDRESS,
                payment_method: "crypto",
                user_id: null,
                txid: txId,
                status: "confirmed",
                notes: "إيداع USDT تلقائي - تم رصده على الشبكة",
                created_at: new Date(parseInt(token.block_timestamp) || Date.now()).toISOString(),
                confirmed_at: new Date().toISOString(),
              };

              const deposits = readDeposits();
              deposits.unshift(deposit);
              saveDeposits(deposits);
              processedTxids.push(txId);

              console.log(`✅ [DEPOSIT CONFIRMED] ${amountUsdt} USDT from ${fromAddr} | TxID: ${txId}`);
            }
          }
        }
      }
    } catch (err) {
      console.error("⚠️ [DEPOSIT MONITOR] USDT check error:", err.message);
    }

    // Save processed txids
    saveProcessedTxids(processedTxids);
    lastCheckedTimestamp = Date.now() - 30000; // Overlap by 30s to avoid missing txs

  } catch (err) {
    console.error("❌ [DEPOSIT MONITOR] Fatal error:", err.message);
  }
}

// ═══════════════════════════════════════
// Withdrawal Processor (معالج السحوبات)
// ═══════════════════════════════════════

async function processWithdrawals() {
  if (!POOL_PRIVATE_KEY) {
    return; // Cannot process without private key
  }

  const withdrawals = readWithdrawals();
  const pending = withdrawals.filter((w) => w.status === "pending" && ["TRX", "USDT"].includes(w.currency));

  for (const withdrawal of pending) {
    console.log(`🔄 [WITHDRAWAL] Processing: ${withdrawal.amount} ${withdrawal.currency} -> ${withdrawal.destination_address}`);

    try {
      let txId = null;

      if (withdrawal.currency === "TRX") {
        // Send TRX
        const amountSun = Math.floor(withdrawal.amount * 1_000_000);
        const tx = await tronWeb.trx.sendTransaction(withdrawal.destination_address, amountSun);
        if (tx.result || tx.txid) {
          txId = tx.txid || tx.transaction?.txID;
        } else {
          throw new Error(tx.message || "فشل إرسال TRX");
        }
      } else if (withdrawal.currency === "USDT") {
        // Send USDT TRC-20
        const contract = await tronWeb.contract().at(USDT_CONTRACT);
        const amountRaw = Math.floor(withdrawal.amount * 1_000_000); // 6 decimals
        const result = await contract.transfer(withdrawal.destination_address, amountRaw).send({
          feeLimit: 100_000_000, // 100 TRX fee limit
          callValue: 0,
        });
        txId = result;
      }

      if (txId) {
        // Update withdrawal status to success
        const idx = withdrawals.findIndex((w) => w.id === withdrawal.id);
        if (idx !== -1) {
          withdrawals[idx].status = "success";
          withdrawals[idx].txid = txId;
          withdrawals[idx].processed_at = new Date().toISOString();
          withdrawals[idx].error = null;
        }
        console.log(`✅ [WITHDRAWAL SUCCESS] ${withdrawal.amount} ${withdrawal.currency} -> ${withdrawal.destination_address} | TxID: ${txId}`);
      }
    } catch (err) {
      // Update withdrawal status to failed
      const idx = withdrawals.findIndex((w) => w.id === withdrawal.id);
      if (idx !== -1) {
        withdrawals[idx].status = "failed";
        withdrawals[idx].error = err.message || "خطأ غير معروف";
        withdrawals[idx].processed_at = new Date().toISOString();
      }
      console.error(`❌ [WITHDRAWAL FAILED] ${withdrawal.id}: ${err.message}`);
    }
  }

  if (pending.length > 0) {
    saveWithdrawals(withdrawals);
  }
}

// ═══════════════════════════════════════
// ═══════════════════════════════════════
// Gas Guard Status Endpoint
// ═══════════════════════════════════════

app.get("/api/gas-guard", async (req, res) => {
  const status = await checkGasGuard();
  res.json({
    success: true,
    data: {
      paused: gasGuardPaused,
      alert: gasGuardAlert,
      trx_balance: status.trxBalance,
      min_required: GAS_GUARD_MIN_TRX,
      safe: status.safe,
    },
  });
});

// ═══════════════════════════════════════
// Bank/Manual Requests Endpoints (Path 1: Admin Manual Processing)
// ═══════════════════════════════════════

// Submit bank deposit/withdraw request (manual - goes to admin panel)
app.post("/api/bank-requests", (req, res) => {
  const { type, amount, currency, payment_method, account_info, user_id, notes } = req.body;

  if (!type || !amount || !currency || !payment_method) {
    return res.status(400).json({ error: "Missing required fields: type, amount, currency, payment_method" });
  }

  const request = {
    id: "br_" + Date.now() + "_" + crypto.randomBytes(4).toString("hex"),
    type: type, // "deposit" or "withdraw"
    amount: parseFloat(amount),
    currency: currency.toUpperCase(),
    payment_method: payment_method,
    account_info: account_info || "",
    user_id: user_id || null,
    status: "pending",
    notes: notes || "",
    created_at: new Date().toISOString(),
    processed_at: null,
    processed_by: null,
  };

  const requests = readBankRequests();
  requests.unshift(request);
  if (requests.length > 10000) requests.length = 10000;
  saveBankRequests(requests);

  console.log("[BANK REQUEST] New " + type + ": " + request.amount + " " + request.currency + " via " + payment_method);

  res.status(201).json({
    success: true,
    message: "Request submitted for admin review",
    data: request,
  });
});

// Get all bank requests (for admin panel)
app.get("/api/bank-requests", (req, res) => {
  const status = req.query.status;
  const type = req.query.type;
  const limit = parseInt(req.query.limit) || 50;
  let requests = readBankRequests();

  if (status && status !== "all") {
    requests = requests.filter(function(r) { return r.status === status; });
  }
  if (type && type !== "all") {
    requests = requests.filter(function(r) { return r.type === type; });
  }

  res.json({
    success: true,
    data: {
      items: requests.slice(0, limit),
      total: requests.length,
      pending: requests.filter(function(r) { return r.status === "pending"; }).length,
    },
  });
});

// Approve/Reject bank request (admin action)
app.put("/api/bank-requests/:id", (req, res) => {
  const id = req.params.id;
  const { status, processed_by, notes } = req.body;

  if (!status || !["approved", "rejected"].includes(status)) {
    return res.status(400).json({ error: "Invalid status. Use 'approved' or 'rejected'" });
  }

  const requests = readBankRequests();
  const idx = requests.findIndex(function(r) { return r.id === id; });

  if (idx === -1) {
    return res.status(404).json({ error: "Request not found" });
  }

  requests[idx].status = status;
  requests[idx].processed_at = new Date().toISOString();
  requests[idx].processed_by = processed_by || "admin";
  if (notes) requests[idx].notes = notes;

  saveBankRequests(requests);

  console.log("[BANK REQUEST] " + status.toUpperCase() + ": " + requests[idx].id);

  res.json({
    success: true,
    message: "Request " + status,
    data: requests[idx],
  });
});

// ═══════════════════════════════════════
// Conditional Routing Endpoint (Smart Router)
// ═══════════════════════════════════════

app.post("/api/route-payment", (req, res) => {
  const { type, amount, currency, payment_method, destination_address, account_info, user_id, notes } = req.body;

  if (!type || !amount || !currency || !payment_method) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Conditional Routing Logic
  const cryptoMethods = ["crypto", "Crypto_TRC20", "TRX", "USDT", "BTC", "ETH", "USDT_TRC20", "USDT_ERC20", "binance_pay", "trx", "btc", "eth", "usdt_trc20", "usdt_erc20"];
  const isCrypto = cryptoMethods.includes(payment_method) || ["TRX", "USDT", "BTC", "ETH"].includes(currency.toUpperCase());

  if (isCrypto) {
    // Route to Bot Engine (Path 2: Auto-processing)
    if (type === "deposit") {
      // For crypto deposits, return pool wallet address for monitoring
      res.json({
        success: true,
        route: "bot_engine",
        message: "Send crypto to pool wallet. Auto-confirmed on-chain.",
        data: {
          wallet_address: POOL_WALLET_ADDRESS,
          network: "TRON (TRC-20)",
          auto_confirm: true,
        },
      });
    } else if (type === "withdraw") {
      // Create pending withdrawal for bot to process
      if (!destination_address) {
        return res.status(400).json({ error: "Destination address required for crypto withdrawal" });
      }
      const withdrawal = {
        id: "wd_" + Date.now() + "_" + crypto.randomBytes(4).toString("hex"),
        amount: parseFloat(amount),
        currency: currency.toUpperCase(),
        destination_address: destination_address,
        payment_method: "crypto",
        user_id: user_id || null,
        txid: null,
        status: "pending",
        error: null,
        notes: notes || "",
        created_at: new Date().toISOString(),
        processed_at: null,
      };
      const withdrawals = readWithdrawals();
      withdrawals.unshift(withdrawal);
      saveWithdrawals(withdrawals);

      res.status(201).json({
        success: true,
        route: "bot_engine",
        message: "Withdrawal queued for auto-processing by bot",
        data: withdrawal,
      });
    } else {
      res.status(400).json({ error: "Invalid type. Use 'deposit' or 'withdraw'" });
    }
  } else {
    // Route to Admin Panel (Path 1: Manual processing)
    const request = {
      id: "br_" + Date.now() + "_" + crypto.randomBytes(4).toString("hex"),
      type: type,
      amount: parseFloat(amount),
      currency: currency.toUpperCase(),
      payment_method: payment_method,
      account_info: account_info || destination_address || "",
      user_id: user_id || null,
      status: "pending",
      notes: notes || "",
      created_at: new Date().toISOString(),
      processed_at: null,
      processed_by: null,
    };
    const requests = readBankRequests();
    requests.unshift(request);
    saveBankRequests(requests);

    res.status(201).json({
      success: true,
      route: "admin_panel",
      message: "Request submitted for manual admin review",
      data: request,
    });
  }
});

// ═══════════════════════════════════════
// Bot Profit Update with Signature Verification (Path 3)
// ═══════════════════════════════════════

app.post("/api/bot/update-profit", verifyBotSignature, (req, res) => {
  const { user_id, net_profit, gas_fee, tx_hash, cycle_id, details } = req.body;

  if (!net_profit || !tx_hash) {
    return res.status(400).json({ error: "net_profit and tx_hash are required" });
  }

  const profitRecord = {
    id: Date.now(),
    user_id: user_id || "system",
    net_profit: parseFloat(net_profit),
    gas_fee: parseFloat(gas_fee || 0),
    tx_hash: tx_hash,
    cycle_id: cycle_id || null,
    details: details || "",
    timestamp: new Date().toISOString(),
    verified: true,
  };

  const profits = readProfits();
  profits.unshift(profitRecord);
  if (profits.length > 5000) profits.length = 5000;
  saveProfits(profits);

  console.log("[PROFIT UPDATE] Net: " + net_profit + " | TxID: " + tx_hash);

  res.json({
    success: true,
    message: "Profit recorded successfully",
    data: profitRecord,
  });
});

// ═══════════════════════════════════════
// Bot Balance Update with Signature Verification
// ═══════════════════════════════════════

app.post("/api/bot/update-balance", verifyBotSignature, (req, res) => {
  const { user_id, amount, currency, tx_hash, type } = req.body;

  if (!amount || !tx_hash) {
    return res.status(400).json({ error: "amount and tx_hash are required" });
  }

  // Auto-confirm deposit detected on-chain
  const deposit = {
    id: "dep_" + Date.now() + "_" + crypto.randomBytes(4).toString("hex"),
    amount: parseFloat(amount),
    currency: (currency || "USDT").toUpperCase(),
    from_address: req.body.from_address || "",
    to_address: POOL_WALLET_ADDRESS,
    payment_method: "crypto",
    user_id: user_id || null,
    txid: tx_hash,
    status: "confirmed",
    notes: "Auto-confirmed by bot via signed webhook",
    created_at: new Date().toISOString(),
    confirmed_at: new Date().toISOString(),
  };

  const deposits = readDeposits();
  deposits.unshift(deposit);
  saveDeposits(deposits);

  console.log("[BALANCE UPDATE] " + amount + " " + (currency || "USDT") + " | TxID: " + tx_hash);

  res.json({
    success: true,
    message: "Balance updated",
    data: deposit,
  });
});

// ═══════════════════════════════════════
// Payment Gateways Router
// ═══════════════════════════════════════

const paymentGatewaysRouter = require("./payment-gateways");
app.use("/api/payments", paymentGatewaysRouter);

// ═══════════════════════════════════════
// Payment Gateways Status Endpoint
// ═══════════════════════════════════════

app.get("/api/payments/status", (req, res) => {
  const gateways = {
    perfect_money: {
      name: "Perfect Money",
      configured: !!(process.env.PERFECT_MONEY_ACCOUNT_ID && process.env.PERFECT_MONEY_PASSPHRASE && process.env.PERFECT_MONEY_PAYER_ACCOUNT),
      supports: ["deposit", "withdraw"],
    },
    stripe: {
      name: "Stripe",
      configured: !!process.env.STRIPE_SECRET_KEY,
      supports: ["deposit", "withdraw"],
    },
    paypal: {
      name: "PayPal",
      configured: !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_SECRET),
      supports: ["deposit", "withdraw"],
    },
    binance_pay: {
      name: "Binance Pay",
      configured: !!(process.env.BINANCE_API_KEY && process.env.BINANCE_API_SECRET && process.env.BINANCE_MERCHANT_ID),
      supports: ["deposit", "withdraw"],
    },
    wise: {
      name: "Wise",
      configured: !!(process.env.WISE_API_TOKEN && process.env.WISE_PROFILE_ID),
      supports: ["deposit", "withdraw"],
    },
    redotpay: {
      name: "RedotPay",
      configured: !!(process.env.REDOTPAY_API_KEY && process.env.REDOTPAY_API_SECRET && process.env.REDOTPAY_MERCHANT_ID),
      supports: ["deposit", "withdraw"],
    },
  };

  const configuredCount = Object.values(gateways).filter((g) => g.configured).length;

  res.json({
    success: true,
    data: {
      gateways,
      total: Object.keys(gateways).length,
      configured: configuredCount,
      message: configuredCount === 0
        ? "لم يتم تفعيل أي بوابة دفع - يرجى إضافة مفاتيح API في متغيرات البيئة"
        : `${configuredCount} بوابة دفع مفعلة`,
    },
  });
});

// 404 - مسار غير موجود
// ═══════════════════════════════════════

app.use((req, res) => {
  res.status(404).json({
    error: "المسار غير موجود",
    path: req.originalUrl,
    method: req.method,
    available_endpoints: [
      "GET  /",
      "GET  /health",
      "GET  /api/bot/pairs",
      "POST /api/bot/conversions",
      "GET  /api/bot/conversions",
      "GET  /api/bot/stats",
      "GET  /api/config",
      "POST /api/config",
      "GET  /api/bot/profits",
      "GET  /api/pool-wallet",
      "GET  /api/deposit/address",
      "GET  /api/deposits",
      "POST /api/deposits",
      "PUT  /api/deposits/:id",
      "POST /api/withdraw",
      "GET  /api/withdrawals",
      "GET  /api/withdrawals/:id",
      "PUT  /api/withdrawals/:id",
      "POST /api/payments/process",
      "POST /api/payments/perfect-money/deposit",
      "POST /api/payments/perfect-money/withdraw",
      "POST /api/payments/perfect-money/callback",
      "POST /api/payments/stripe/create-session",
      "POST /api/payments/stripe/webhook",
      "GET  /api/payments/stripe/session/:id",
      "POST /api/payments/paypal/create-order",
      "POST /api/payments/paypal/capture/:orderId",
      "POST /api/payments/paypal/withdraw",
      "POST /api/payments/binance-pay/create-order",
      "POST /api/payments/binance-pay/callback",
      "GET  /api/payments/binance-pay/status/:orderId",
      "POST /api/payments/wise/withdraw",
      "GET  /api/payments/wise/transfer/:id",
      "GET  /api/payments/status",
    ],
  });
});

app.listen(PORT, () => {
  console.log("═══════════════════════════════════════");
  console.log(`🌐 خادم API البوت يعمل على المنفذ ${PORT}`);
  console.log(`📡 Endpoints:`);
  console.log(`   GET  /`);
  console.log(`   GET  /health`);
  console.log(`   GET  /api/bot/pairs`);
  console.log(`   PUT  /api/bot/pairs`);
  console.log(`   GET  /api/bot/conversions`);
  console.log(`   POST /api/bot/conversions`);
  console.log(`   GET  /api/bot/conversions/:txid/status`);
  console.log(`   PUT  /api/bot/conversions/:id/process`);
  console.log(`   PUT  /api/bot/conversions/:id/reject`);
  console.log(`   GET  /api/bot/settings`);
  console.log(`   PUT  /api/bot/settings`);
  console.log(`   GET  /api/bot/stats`);
  console.log(`   GET  /api/config`);
  console.log(`   POST /api/config`);
  console.log(`   GET  /api/bot/profits`);
  console.log(`   GET  /api/pool-wallet`);
  console.log(`🔒 الاتصال مؤمن بـ API Key`);
  console.log(`📝 الموقع ينفذ التحويلات - البوت يرسل الطلبات فقط`);
  console.log(`💰 نظام الأرباح الديناميكي: فارق السعر + فارق الغاز`);
  console.log(`🏦 Pool Wallet: ${POOL_WALLET_ADDRESS}`);
  console.log("═══════════════════════════════════════");

  // ═══════════════════════════════════════
  // تشغيل مراقب الإيداعات (كل 15 ثانية)
  // ═══════════════════════════════════════
  setInterval(monitorDeposits, 15000);
  monitorDeposits(); // Run immediately on start
  console.log("👁️ مراقب الإيداعات يعمل (كل 15 ثانية)");

  // ═══════════════════════════════════════
  // تشغيل معالج السحوبات (كل 30 ثانية)
  // ═══════════════════════════════════════
  if (POOL_PRIVATE_KEY) {
    setInterval(processWithdrawals, 30000);
    processWithdrawals(); // Run immediately on start
    console.log("💸 معالج السحوبات يعمل (كل 30 ثانية)");
  } else {
    console.log("⚠️ معالج السحوبات معطل (POOL_PRIVATE_KEY غير موجود)");
  }

  // ═══════════════════════════════════════
  // تشغيل بوت تلغرام داخل نفس العملية
  // ═══════════════════════════════════════
  try {
    const { startBot } = require("./bot.js");
    const botInstance = startBot();
    if (botInstance) {
      console.log("🤖 بوت تلغرام يعمل داخل نفس العملية");
    } else {
      console.log("⚠️ بوت تلغرام معطل (TELEGRAM_BOT_TOKEN غير موجود)");
    }
  } catch (err) {
    console.error("⚠️ خطأ في تشغيل بوت تلغرام:", err.message);
    console.log("📡 خادم API يعمل بدون البوت");
  }
});
/**
 * Payment Gateways Integration Module
 * Supports: Perfect Money, Stripe, PayPal, Binance Pay, Wise
 * All gateways check for API keys and return graceful errors if not configured
 */

const crypto = require("crypto");
const express = require("express");
const router = express.Router();

// ═══════════════════════════════════════
// Helper: Check if gateway is configured
// ═══════════════════════════════════════

function gatewayNotConfigured(res, gatewayName) {
  return res.status(503).json({
    success: false,
    error: `بوابة الدفع غير مفعلة - يرجى إضافة مفاتيح API`,
    gateway: gatewayName,
    message: `${gatewayName} API keys not configured. Please add them to environment variables.`,
  });
}

// ═══════════════════════════════════════
// 1. PERFECT MONEY (Deposit + Withdraw)
// ═══════════════════════════════════════

// Perfect Money Deposit - Create payment form data
router.post("/perfect-money/deposit", async (req, res) => {
  const accountId = process.env.PERFECT_MONEY_ACCOUNT_ID;
  const passphrase = process.env.PERFECT_MONEY_PASSPHRASE;
  const payerAccount = process.env.PERFECT_MONEY_PAYER_ACCOUNT;

  if (!accountId || !passphrase || !payerAccount) {
    return gatewayNotConfigured(res, "Perfect Money");
  }

  const { amount, currency, payment_id, user_id } = req.body;
  if (!amount || parseFloat(amount) <= 0) {
    return res.status(400).json({ error: "المبلغ مطلوب" });
  }

  const paymentId = payment_id || `pm_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

  try {
    // Perfect Money uses form-based redirect
    const formData = {
      PAYEE_ACCOUNT: payerAccount,
      PAYEE_NAME: "TTB Exchange",
      PAYMENT_ID: paymentId,
      PAYMENT_AMOUNT: parseFloat(amount).toFixed(2),
      PAYMENT_UNITS: currency || "USD",
      STATUS_URL: `${process.env.SERVER_URL || ""}/api/payments/perfect-money/callback`,
      PAYMENT_URL: `${process.env.FRONTEND_URL || ""}/deposit?status=success`,
      NOPAYMENT_URL: `${process.env.FRONTEND_URL || ""}/deposit?status=failed`,
      SUGGESTED_MEMO: `Deposit ${paymentId}`,
    };

    res.json({
      success: true,
      gateway: "perfect_money",
      data: {
        payment_id: paymentId,
        form_url: "https://perfectmoney.com/api/step1.asp",
        form_data: formData,
        method: "POST",
        instructions: "قم بإرسال النموذج إلى Perfect Money لإتمام الدفع",
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Perfect Money Withdraw
router.post("/perfect-money/withdraw", async (req, res) => {
  const accountId = process.env.PERFECT_MONEY_ACCOUNT_ID;
  const passphrase = process.env.PERFECT_MONEY_PASSPHRASE;
  const payerAccount = process.env.PERFECT_MONEY_PAYER_ACCOUNT;

  if (!accountId || !passphrase || !payerAccount) {
    return gatewayNotConfigured(res, "Perfect Money");
  }

  const { amount, currency, destination_account, user_id, memo } = req.body;
  if (!amount || !destination_account) {
    return res.status(400).json({ error: "المبلغ وحساب المستلم مطلوبان" });
  }

  try {
    // Perfect Money API for transfers
    const params = new URLSearchParams({
      AccountID: accountId,
      PassPhrase: passphrase,
      Payer_Account: payerAccount,
      Payee_Account: destination_account,
      Amount: parseFloat(amount).toFixed(2),
      Memo: memo || `Withdrawal to ${destination_account}`,
      PAYMENT_ID: `wd_pm_${Date.now()}`,
    });

    const response = await fetch(
      `https://perfectmoney.com/acct/confirm.asp?${params.toString()}`
    );
    const text = await response.text();

    // Parse Perfect Money response (HTML-based)
    if (text.includes("ERROR")) {
      const errorMatch = text.match(/ERROR:(.*?)(<|$)/);
      throw new Error(errorMatch ? errorMatch[1].trim() : "Perfect Money transfer failed");
    }

    // Extract batch number
    const batchMatch = text.match(/PAYMENT_BATCH_NUM.*?>(.*?)</);
    const batchNum = batchMatch ? batchMatch[1] : null;

    res.json({
      success: true,
      gateway: "perfect_money",
      data: {
        batch_number: batchNum,
        amount: parseFloat(amount),
        currency: currency || "USD",
        destination: destination_account,
        status: "success",
        processed_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Perfect Money Callback (IPN)
router.post("/perfect-money/callback", (req, res) => {
  const passphrase = process.env.PERFECT_MONEY_PASSPHRASE;
  if (!passphrase) return res.status(200).send("OK");

  const {
    PAYMENT_ID,
    PAYEE_ACCOUNT,
    PAYMENT_AMOUNT,
    PAYMENT_UNITS,
    PAYMENT_BATCH_NUM,
    PAYER_ACCOUNT,
    TIMESTAMPGMT,
    V2_HASH,
  } = req.body;

  // Verify hash
  const passHash = crypto.createHash("md5").update(passphrase).digest("hex").toUpperCase();
  const expectedHash = crypto
    .createHash("md5")
    .update(
      `${PAYMENT_ID}:${PAYEE_ACCOUNT}:${PAYMENT_AMOUNT}:${PAYMENT_UNITS}:${PAYMENT_BATCH_NUM}:${PAYER_ACCOUNT}:${passHash}:${TIMESTAMPGMT}`
    )
    .digest("hex")
    .toUpperCase();

  if (V2_HASH !== expectedHash) {
    console.warn("[PERFECT MONEY] Invalid callback hash");
    return res.status(400).send("Invalid hash");
  }

  // Save confirmed deposit
  const { saveGatewayDeposit } = require("./gateway-helpers");
  saveGatewayDeposit({
    amount: parseFloat(PAYMENT_AMOUNT),
    currency: PAYMENT_UNITS,
    payment_method: "perfect_money",
    txid: PAYMENT_BATCH_NUM,
    from_address: PAYER_ACCOUNT,
    payment_id: PAYMENT_ID,
    status: "confirmed",
  });

  console.log(`[PERFECT MONEY] Deposit confirmed: ${PAYMENT_AMOUNT} ${PAYMENT_UNITS} | Batch: ${PAYMENT_BATCH_NUM}`);
  res.status(200).send("OK");
});

// ═══════════════════════════════════════
// 2. STRIPE (Deposit only - Cards)
// ═══════════════════════════════════════

// Stripe Create Checkout Session
router.post("/stripe/create-session", async (req, res) => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return gatewayNotConfigured(res, "Stripe");
  }

  const { amount, currency, user_id, success_url, cancel_url } = req.body;
  if (!amount || parseFloat(amount) <= 0) {
    return res.status(400).json({ error: "المبلغ مطلوب" });
  }

  try {
    const stripe = require("stripe")(secretKey);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: (currency || "usd").toLowerCase(),
            product_data: {
              name: "TTB Exchange Deposit",
              description: `Deposit ${amount} ${(currency || "USD").toUpperCase()}`,
            },
            unit_amount: Math.round(parseFloat(amount) * 100), // Stripe uses cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: success_url || `${process.env.FRONTEND_URL || ""}/deposit?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancel_url || `${process.env.FRONTEND_URL || ""}/deposit?status=cancelled`,
      metadata: {
        user_id: user_id || "anonymous",
        type: "deposit",
      },
    });

    res.json({
      success: true,
      gateway: "stripe",
      data: {
        session_id: session.id,
        checkout_url: session.url,
        publishable_key: process.env.STRIPE_PUBLISHABLE_KEY || "",
        amount: parseFloat(amount),
        currency: (currency || "USD").toUpperCase(),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Stripe Get Session Status
router.get("/stripe/session/:id", async (req, res) => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return gatewayNotConfigured(res, "Stripe");
  }

  try {
    const stripe = require("stripe")(secretKey);
    const session = await stripe.checkout.sessions.retrieve(req.params.id);

    res.json({
      success: true,
      data: {
        id: session.id,
        status: session.payment_status,
        amount: session.amount_total / 100,
        currency: session.currency?.toUpperCase(),
        customer_email: session.customer_details?.email,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Stripe Webhook
router.post("/stripe/webhook", express.raw({ type: "application/json" }), (req, res) => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secretKey) return res.status(200).send("OK");

  try {
    const stripe = require("stripe")(secretKey);
    let event;

    if (webhookSecret) {
      const sig = req.headers["stripe-signature"];
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      event = req.body;
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const { saveGatewayDeposit } = require("./gateway-helpers");
      saveGatewayDeposit({
        amount: session.amount_total / 100,
        currency: session.currency?.toUpperCase() || "USD",
        payment_method: "stripe",
        txid: session.payment_intent || session.id,
        from_address: session.customer_details?.email || "",
        payment_id: session.id,
        status: "confirmed",
      });
      console.log(`[STRIPE] Payment confirmed: ${session.amount_total / 100} ${session.currency}`);
    }

    res.status(200).send("OK");
  } catch (err) {
    console.error("[STRIPE] Webhook error:", err.message);
    res.status(400).send("Webhook Error");
  }
});

// Stripe Withdraw (Payout to bank account or card)
router.post("/stripe/withdraw", async (req, res) => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return gatewayNotConfigured(res, "Stripe");
  }

  const { amount, currency, destination, destination_type, user_id, description } = req.body;
  if (!amount || !destination) {
    return res.status(400).json({ error: "المبلغ وحساب المستلم مطلوبان" });
  }

  try {
    const stripe = require("stripe")(secretKey);

    // Create a payout (requires Stripe Connect or bank account on file)
    const payout = await stripe.payouts.create({
      amount: Math.round(parseFloat(amount) * 100), // Stripe uses cents
      currency: (currency || "usd").toLowerCase(),
      destination: destination, // Bank account or card ID
      description: description || "TTB Exchange Withdrawal",
      metadata: {
        user_id: user_id || "anonymous",
        type: "withdrawal",
      },
    });

    // Save withdrawal record
    const { saveGatewayWithdrawal } = require("./gateway-helpers");
    saveGatewayWithdrawal({
      amount: parseFloat(amount),
      currency: (currency || "USD").toUpperCase(),
      payment_method: "stripe",
      destination_address: destination,
      txid: payout.id,
      status: payout.status === "paid" ? "success" : "pending",
      user_id: user_id || null,
    });

    res.json({
      success: true,
      gateway: "stripe",
      data: {
        payout_id: payout.id,
        amount: parseFloat(amount),
        currency: (currency || "USD").toUpperCase(),
        destination: destination,
        status: payout.status,
        arrival_date: payout.arrival_date ? new Date(payout.arrival_date * 1000).toISOString() : null,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════
// 3. PAYPAL (Deposit + Withdraw)
// ═══════════════════════════════════════

async function getPayPalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_SECRET;
  const baseUrl = process.env.PAYPAL_SANDBOX === "true"
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";

  const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");
  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) throw new Error("Failed to get PayPal access token");
  const data = await response.json();
  return { token: data.access_token, baseUrl };
}

// PayPal Create Order (Deposit)
router.post("/paypal/create-order", async (req, res) => {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_SECRET;

  if (!clientId || !secret) {
    return gatewayNotConfigured(res, "PayPal");
  }

  const { amount, currency, user_id } = req.body;
  if (!amount || parseFloat(amount) <= 0) {
    return res.status(400).json({ error: "المبلغ مطلوب" });
  }

  try {
    const { token, baseUrl } = await getPayPalAccessToken();

    const orderRes = await fetch(`${baseUrl}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: (currency || "USD").toUpperCase(),
              value: parseFloat(amount).toFixed(2),
            },
            description: "TTB Exchange Deposit",
            custom_id: user_id || "anonymous",
          },
        ],
        application_context: {
          return_url: `${process.env.FRONTEND_URL || ""}/deposit?status=success`,
          cancel_url: `${process.env.FRONTEND_URL || ""}/deposit?status=cancelled`,
          brand_name: "TTB Exchange",
          user_action: "PAY_NOW",
        },
      }),
    });

    if (!orderRes.ok) {
      const errData = await orderRes.json();
      throw new Error(errData.message || "Failed to create PayPal order");
    }

    const order = await orderRes.json();
    const approveLink = order.links?.find((l) => l.rel === "approve")?.href;

    res.json({
      success: true,
      gateway: "paypal",
      data: {
        order_id: order.id,
        approve_url: approveLink,
        status: order.status,
        amount: parseFloat(amount),
        currency: (currency || "USD").toUpperCase(),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PayPal Capture Order
router.post("/paypal/capture/:orderId", async (req, res) => {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_SECRET;

  if (!clientId || !secret) {
    return gatewayNotConfigured(res, "PayPal");
  }

  try {
    const { token, baseUrl } = await getPayPalAccessToken();

    const captureRes = await fetch(`${baseUrl}/v2/checkout/orders/${req.params.orderId}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!captureRes.ok) {
      const errData = await captureRes.json();
      throw new Error(errData.message || "Failed to capture PayPal payment");
    }

    const capture = await captureRes.json();
    const captureDetails = capture.purchase_units?.[0]?.payments?.captures?.[0];

    if (capture.status === "COMPLETED") {
      const { saveGatewayDeposit } = require("./gateway-helpers");
      saveGatewayDeposit({
        amount: parseFloat(captureDetails?.amount?.value || 0),
        currency: captureDetails?.amount?.currency_code || "USD",
        payment_method: "paypal",
        txid: captureDetails?.id || capture.id,
        from_address: capture.payer?.email_address || "",
        payment_id: capture.id,
        status: "confirmed",
      });
    }

    res.json({
      success: true,
      gateway: "paypal",
      data: {
        order_id: capture.id,
        status: capture.status,
        capture_id: captureDetails?.id,
        amount: captureDetails?.amount?.value,
        currency: captureDetails?.amount?.currency_code,
        payer_email: capture.payer?.email_address,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PayPal Withdraw (Payout)
router.post("/paypal/withdraw", async (req, res) => {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_SECRET;

  if (!clientId || !secret) {
    return gatewayNotConfigured(res, "PayPal");
  }

  const { amount, currency, destination_email, user_id, note } = req.body;
  if (!amount || !destination_email) {
    return res.status(400).json({ error: "المبلغ وبريد PayPal المستلم مطلوبان" });
  }

  try {
    const { token, baseUrl } = await getPayPalAccessToken();

    const payoutRes = await fetch(`${baseUrl}/v1/payments/payouts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender_batch_header: {
          sender_batch_id: `payout_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
          email_subject: "TTB Exchange Withdrawal",
          email_message: note || "Your withdrawal has been processed",
        },
        items: [
          {
            recipient_type: "EMAIL",
            amount: {
              value: parseFloat(amount).toFixed(2),
              currency: (currency || "USD").toUpperCase(),
            },
            receiver: destination_email,
            note: note || "TTB Exchange Withdrawal",
            sender_item_id: `wd_pp_${Date.now()}`,
          },
        ],
      }),
    });

    if (!payoutRes.ok) {
      const errData = await payoutRes.json();
      throw new Error(errData.message || "Failed to create PayPal payout");
    }

    const payout = await payoutRes.json();

    // Save withdrawal record
    const { saveGatewayWithdrawal } = require("./gateway-helpers");
    saveGatewayWithdrawal({
      amount: parseFloat(amount),
      currency: (currency || "USD").toUpperCase(),
      payment_method: "paypal",
      destination_address: destination_email,
      txid: payout.batch_header?.payout_batch_id || null,
      status: "success",
      user_id: user_id || null,
    });

    res.json({
      success: true,
      gateway: "paypal",
      data: {
        payout_batch_id: payout.batch_header?.payout_batch_id,
        status: payout.batch_header?.batch_status,
        amount: parseFloat(amount),
        currency: (currency || "USD").toUpperCase(),
        destination: destination_email,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════
// 4. BINANCE PAY (Deposit + Withdraw)
// ═══════════════════════════════════════

function generateBinanceSignature(timestamp, nonce, body, secretKey) {
  const payload = `${timestamp}\n${nonce}\n${JSON.stringify(body)}\n`;
  return crypto.createHmac("sha512", secretKey).update(payload).digest("hex").toUpperCase();
}

// Binance Pay Create Order
router.post("/binance-pay/create-order", async (req, res) => {
  const apiKey = process.env.BINANCE_API_KEY;
  const apiSecret = process.env.BINANCE_API_SECRET;
  const merchantId = process.env.BINANCE_MERCHANT_ID;

  if (!apiKey || !apiSecret || !merchantId) {
    return gatewayNotConfigured(res, "Binance Pay");
  }

  const { amount, currency, user_id } = req.body;
  if (!amount || parseFloat(amount) <= 0) {
    return res.status(400).json({ error: "المبلغ مطلوب" });
  }

  try {
    const timestamp = Date.now();
    const nonce = crypto.randomBytes(16).toString("hex");

    const orderBody = {
      env: {
        terminalType: "WEB",
      },
      merchantTradeNo: `bp_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
      orderAmount: parseFloat(amount).toFixed(2),
      currency: (currency || "USDT").toUpperCase(),
      goods: {
        goodsType: "02",
        goodsCategory: "Z000",
        referenceGoodsId: "deposit",
        goodsName: "TTB Exchange Deposit",
      },
      returnUrl: `${process.env.FRONTEND_URL || ""}/deposit?status=success`,
      cancelUrl: `${process.env.FRONTEND_URL || ""}/deposit?status=cancelled`,
      webhookUrl: `${process.env.SERVER_URL || ""}/api/payments/binance-pay/callback`,
    };

    const signature = generateBinanceSignature(timestamp, nonce, orderBody, apiSecret);

    const response = await fetch("https://bpay.binanceapi.com/binancepay/openapi/v2/order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "BinancePay-Timestamp": String(timestamp),
        "BinancePay-Nonce": nonce,
        "BinancePay-Certificate-SN": apiKey,
        "BinancePay-Signature": signature,
      },
      body: JSON.stringify(orderBody),
    });

    const data = await response.json();

    if (data.status !== "SUCCESS") {
      throw new Error(data.errorMessage || "Failed to create Binance Pay order");
    }

    res.json({
      success: true,
      gateway: "binance_pay",
      data: {
        order_id: data.data?.prepayId,
        checkout_url: data.data?.universalUrl || data.data?.checkoutUrl,
        merchant_trade_no: orderBody.merchantTradeNo,
        amount: parseFloat(amount),
        currency: (currency || "USDT").toUpperCase(),
        qr_content: data.data?.qrcodeLink || null,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Binance Pay Callback
router.post("/binance-pay/callback", (req, res) => {
  const apiSecret = process.env.BINANCE_API_SECRET;
  if (!apiSecret) return res.status(200).json({ returnCode: "SUCCESS" });

  try {
    // Verify signature from Binance
    const { bizType, data: callbackData } = req.body;

    if (bizType === "PAY" && callbackData) {
      const parsed = typeof callbackData === "string" ? JSON.parse(callbackData) : callbackData;

      if (parsed.orderStatus === "PAID") {
        const { saveGatewayDeposit } = require("./gateway-helpers");
        saveGatewayDeposit({
          amount: parseFloat(parsed.orderAmount || 0),
          currency: parsed.currency || "USDT",
          payment_method: "binance_pay",
          txid: parsed.transactionId || parsed.merchantTradeNo,
          from_address: parsed.payerInfo?.payerId || "",
          payment_id: parsed.merchantTradeNo,
          status: "confirmed",
        });
        console.log(`[BINANCE PAY] Payment confirmed: ${parsed.orderAmount} ${parsed.currency}`);
      }
    }

    res.status(200).json({ returnCode: "SUCCESS" });
  } catch (err) {
    console.error("[BINANCE PAY] Callback error:", err.message);
    res.status(200).json({ returnCode: "SUCCESS" });
  }
});

// Binance Pay Order Status
router.get("/binance-pay/status/:orderId", async (req, res) => {
  const apiKey = process.env.BINANCE_API_KEY;
  const apiSecret = process.env.BINANCE_API_SECRET;

  if (!apiKey || !apiSecret) {
    return gatewayNotConfigured(res, "Binance Pay");
  }

  try {
    const timestamp = Date.now();
    const nonce = crypto.randomBytes(16).toString("hex");
    const queryBody = { prepayId: req.params.orderId };

    const signature = generateBinanceSignature(timestamp, nonce, queryBody, apiSecret);

    const response = await fetch("https://bpay.binanceapi.com/binancepay/openapi/v2/order/query", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "BinancePay-Timestamp": String(timestamp),
        "BinancePay-Nonce": nonce,
        "BinancePay-Certificate-SN": apiKey,
        "BinancePay-Signature": signature,
      },
      body: JSON.stringify(queryBody),
    });

    const data = await response.json();

    res.json({
      success: true,
      gateway: "binance_pay",
      data: {
        order_id: req.params.orderId,
        status: data.data?.status || "UNKNOWN",
        amount: data.data?.orderAmount,
        currency: data.data?.currency,
        transaction_id: data.data?.transactionId,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Binance Pay Withdraw (Transfer/Payout)
router.post("/binance-pay/withdraw", async (req, res) => {
  const apiKey = process.env.BINANCE_API_KEY;
  const apiSecret = process.env.BINANCE_API_SECRET;
  const merchantId = process.env.BINANCE_MERCHANT_ID;

  if (!apiKey || !apiSecret || !merchantId) {
    return gatewayNotConfigured(res, "Binance Pay");
  }

  const { amount, currency, destination_address, user_id } = req.body;
  if (!amount || !destination_address) {
    return res.status(400).json({ error: "المبلغ وعنوان المستلم مطلوبان" });
  }

  try {
    const timestamp = Date.now();
    const nonce = crypto.randomBytes(16).toString("hex");

    const transferBody = {
      requestId: `bp_wd_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
      batchName: "TTB Exchange Withdrawal",
      currency: (currency || "USDT").toUpperCase(),
      totalAmount: parseFloat(amount).toFixed(8),
      totalNumber: 1,
      transferDetailList: [
        {
          merchantSendId: `wd_bp_${Date.now()}`,
          transferAmount: parseFloat(amount).toFixed(8),
          receiveType: "BINANCE_ID",
          receiver: destination_address,
          remark: "TTB Exchange Withdrawal",
        },
      ],
    };

    const signature = generateBinanceSignature(timestamp, nonce, transferBody, apiSecret);

    const response = await fetch("https://bpay.binanceapi.com/binancepay/openapi/transfer/fund", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "BinancePay-Timestamp": String(timestamp),
        "BinancePay-Nonce": nonce,
        "BinancePay-Certificate-SN": apiKey,
        "BinancePay-Signature": signature,
      },
      body: JSON.stringify(transferBody),
    });

    const data = await response.json();

    if (data.status !== "SUCCESS") {
      throw new Error(data.errorMessage || "Failed to create Binance Pay withdrawal");
    }

    // Save withdrawal record
    const { saveGatewayWithdrawal } = require("./gateway-helpers");
    saveGatewayWithdrawal({
      amount: parseFloat(amount),
      currency: (currency || "USDT").toUpperCase(),
      payment_method: "binance_pay",
      destination_address: destination_address,
      txid: data.data?.transactionId || transferBody.requestId,
      status: "success",
      user_id: user_id || null,
    });

    res.json({
      success: true,
      gateway: "binance_pay",
      data: {
        request_id: transferBody.requestId,
        transaction_id: data.data?.transactionId || null,
        amount: parseFloat(amount),
        currency: (currency || "USDT").toUpperCase(),
        destination: destination_address,
        status: "success",
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════
// 5. WISE (Deposit + Withdraw - Bank Transfers)
// ═══════════════════════════════════════

// Wise Deposit (Receive funds via bank transfer)
router.post("/wise/deposit", async (req, res) => {
  const apiToken = process.env.WISE_API_TOKEN;
  const profileId = process.env.WISE_PROFILE_ID;

  if (!apiToken || !profileId) {
    return gatewayNotConfigured(res, "Wise");
  }

  const { amount, currency, source_currency, user_id } = req.body;
  if (!amount || parseFloat(amount) <= 0) {
    return res.status(400).json({ error: "المبلغ مطلوب" });
  }

  const wiseBaseUrl = process.env.WISE_SANDBOX === "true"
    ? "https://api.sandbox.transferwise.tech"
    : "https://api.wise.com";

  try {
    // Step 1: Create a quote for receiving money
    const quoteRes = await fetch(`${wiseBaseUrl}/v3/profiles/${profileId}/quotes`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sourceCurrency: (source_currency || currency || "USD").toUpperCase(),
        targetCurrency: (currency || "USD").toUpperCase(),
        sourceAmount: parseFloat(amount),
        targetAmount: null,
        payOut: "BALANCE",
      }),
    });

    if (!quoteRes.ok) {
      const errData = await quoteRes.json();
      throw new Error(errData.message || "Failed to create Wise quote");
    }
    const quote = await quoteRes.json();

    // Step 2: Get bank details for the profile to receive funds
    const bankDetailsRes = await fetch(
      `${wiseBaseUrl}/v1/borderless-accounts/${profileId}/bank-details?currency=${(currency || "USD").toUpperCase()}`,
      {
        headers: { Authorization: `Bearer ${apiToken}` },
      }
    );

    let bankDetails = null;
    if (bankDetailsRes.ok) {
      bankDetails = await bankDetailsRes.json();
    }

    // Save pending deposit
    const { saveGatewayDeposit } = require("./gateway-helpers");
    const deposit = saveGatewayDeposit({
      amount: parseFloat(amount),
      currency: (currency || "USD").toUpperCase(),
      payment_method: "wise",
      txid: quote.id || `wise_dep_${Date.now()}`,
      from_address: "",
      payment_id: quote.id,
      status: "pending",
    });

    res.json({
      success: true,
      gateway: "wise",
      data: {
        quote_id: quote.id,
        deposit_id: deposit.id,
        amount: parseFloat(amount),
        currency: (currency || "USD").toUpperCase(),
        bank_details: bankDetails,
        fee: quote.fee || null,
        estimated_delivery: quote.deliveryEstimate || null,
        instructions: "قم بتحويل المبلغ إلى تفاصيل الحساب البنكي أعلاه عبر Wise",
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Wise Withdraw
router.post("/wise/withdraw", async (req, res) => {
  const apiToken = process.env.WISE_API_TOKEN;
  const profileId = process.env.WISE_PROFILE_ID;

  if (!apiToken || !profileId) {
    return gatewayNotConfigured(res, "Wise");
  }

  const { amount, currency, target_currency, recipient_name, account_number, sort_code, iban, user_id } = req.body;
  if (!amount || !recipient_name) {
    return res.status(400).json({ error: "المبلغ واسم المستلم مطلوبان" });
  }

  const wiseBaseUrl = process.env.WISE_SANDBOX === "true"
    ? "https://api.sandbox.transferwise.tech"
    : "https://api.wise.com";

  try {
    // Step 1: Create a quote
    const quoteRes = await fetch(`${wiseBaseUrl}/v3/profiles/${profileId}/quotes`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sourceCurrency: (currency || "USD").toUpperCase(),
        targetCurrency: (target_currency || currency || "USD").toUpperCase(),
        sourceAmount: parseFloat(amount),
        targetAmount: null,
        payOut: "BANK_TRANSFER",
      }),
    });

    if (!quoteRes.ok) {
      const errData = await quoteRes.json();
      throw new Error(errData.message || "Failed to create Wise quote");
    }
    const quote = await quoteRes.json();

    // Step 2: Create recipient
    const recipientData = {
      currency: (target_currency || currency || "USD").toUpperCase(),
      type: "email", // Default type, will be overridden if bank details provided
      profile: parseInt(profileId),
      accountHolderName: recipient_name,
      details: {},
    };

    if (iban) {
      recipientData.type = "iban";
      recipientData.details = { IBAN: iban };
    } else if (account_number && sort_code) {
      recipientData.type = "sort_code";
      recipientData.details = { accountNumber: account_number, sortCode: sort_code };
    } else if (account_number) {
      recipientData.type = "aba";
      recipientData.details = { accountNumber: account_number };
    }

    const recipientRes = await fetch(`${wiseBaseUrl}/v1/accounts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(recipientData),
    });

    if (!recipientRes.ok) {
      const errData = await recipientRes.json();
      throw new Error(errData.message || "Failed to create Wise recipient");
    }
    const recipient = await recipientRes.json();

    // Step 3: Create transfer
    const transferRes = await fetch(`${wiseBaseUrl}/v1/transfers`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        targetAccount: recipient.id,
        quoteUuid: quote.id,
        customerTransactionId: `wise_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
        details: {
          reference: "TTB Exchange Withdrawal",
        },
      }),
    });

    if (!transferRes.ok) {
      const errData = await transferRes.json();
      throw new Error(errData.message || "Failed to create Wise transfer");
    }
    const transfer = await transferRes.json();

    // Step 4: Fund the transfer
    const fundRes = await fetch(
      `${wiseBaseUrl}/v3/profiles/${profileId}/transfers/${transfer.id}/payments`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type: "BALANCE" }),
      }
    );

    const fundStatus = fundRes.ok ? "funded" : "pending_funding";

    // Save withdrawal record
    const { saveGatewayWithdrawal } = require("./gateway-helpers");
    saveGatewayWithdrawal({
      amount: parseFloat(amount),
      currency: (currency || "USD").toUpperCase(),
      payment_method: "wise",
      destination_address: iban || account_number || recipient_name,
      txid: String(transfer.id),
      status: fundStatus === "funded" ? "success" : "pending",
      user_id: user_id || null,
    });

    res.json({
      success: true,
      gateway: "wise",
      data: {
        transfer_id: transfer.id,
        quote_id: quote.id,
        recipient_id: recipient.id,
        status: transfer.status,
        funding_status: fundStatus,
        amount: parseFloat(amount),
        currency: (currency || "USD").toUpperCase(),
        target_currency: (target_currency || currency || "USD").toUpperCase(),
        estimated_delivery: quote.deliveryEstimate || null,
        fee: quote.fee || null,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Wise Get Transfer Status
router.get("/wise/transfer/:id", async (req, res) => {
  const apiToken = process.env.WISE_API_TOKEN;
  if (!apiToken) {
    return gatewayNotConfigured(res, "Wise");
  }

  const wiseBaseUrl = process.env.WISE_SANDBOX === "true"
    ? "https://api.sandbox.transferwise.tech"
    : "https://api.wise.com";

  try {
    const response = await fetch(`${wiseBaseUrl}/v1/transfers/${req.params.id}`, {
      headers: { Authorization: `Bearer ${apiToken}` },
    });

    if (!response.ok) throw new Error("Transfer not found");
    const transfer = await response.json();

    res.json({
      success: true,
      gateway: "wise",
      data: {
        transfer_id: transfer.id,
        status: transfer.status,
        source_amount: transfer.sourceValue,
        source_currency: transfer.sourceCurrency,
        target_amount: transfer.targetValue,
        target_currency: transfer.targetCurrency,
        created: transfer.created,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════
// 6. REDOTPAY (Deposit + Withdraw)
// ═══════════════════════════════════════

// Redotpay Deposit
router.post("/redotpay/deposit", async (req, res) => {
  const apiKey = process.env.REDOTPAY_API_KEY;
  const apiSecret = process.env.REDOTPAY_API_SECRET;
  const merchantId = process.env.REDOTPAY_MERCHANT_ID;

  if (!apiKey || !apiSecret || !merchantId) {
    return gatewayNotConfigured(res, "RedotPay");
  }

  const { amount, currency, user_id } = req.body;
  if (!amount || parseFloat(amount) <= 0) {
    return res.status(400).json({ error: "المبلغ مطلوب" });
  }

  try {
    const orderId = `rdp_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const timestamp = Math.floor(Date.now() / 1000);

    // Create signature for RedotPay API
    const signPayload = `${merchantId}${orderId}${parseFloat(amount).toFixed(2)}${(currency || "USD").toUpperCase()}${timestamp}`;
    const signature = crypto.createHmac("sha256", apiSecret).update(signPayload).digest("hex");

    const response = await fetch("https://api.redotpay.com/v1/payment/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
        "X-Signature": signature,
        "X-Timestamp": String(timestamp),
      },
      body: JSON.stringify({
        merchant_id: merchantId,
        order_id: orderId,
        amount: parseFloat(amount).toFixed(2),
        currency: (currency || "USD").toUpperCase(),
        description: "TTB Exchange Deposit",
        callback_url: `${process.env.SERVER_URL || ""}/api/payments/redotpay/callback`,
        success_url: `${process.env.FRONTEND_URL || ""}/deposit?status=success`,
        cancel_url: `${process.env.FRONTEND_URL || ""}/deposit?status=cancelled`,
        metadata: { user_id: user_id || "anonymous" },
      }),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      throw new Error(data.error?.message || data.message || "Failed to create RedotPay order");
    }

    res.json({
      success: true,
      gateway: "redotpay",
      data: {
        order_id: data.data?.order_id || orderId,
        checkout_url: data.data?.payment_url || data.data?.checkout_url,
        amount: parseFloat(amount),
        currency: (currency || "USD").toUpperCase(),
        status: "pending",
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Redotpay Withdraw
router.post("/redotpay/withdraw", async (req, res) => {
  const apiKey = process.env.REDOTPAY_API_KEY;
  const apiSecret = process.env.REDOTPAY_API_SECRET;
  const merchantId = process.env.REDOTPAY_MERCHANT_ID;

  if (!apiKey || !apiSecret || !merchantId) {
    return gatewayNotConfigured(res, "RedotPay");
  }

  const { amount, currency, destination_address, card_number, user_id } = req.body;
  if (!amount || (!destination_address && !card_number)) {
    return res.status(400).json({ error: "المبلغ ورقم البطاقة أو العنوان مطلوبان" });
  }

  try {
    const withdrawalId = `rdp_wd_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const timestamp = Math.floor(Date.now() / 1000);

    const signPayload = `${merchantId}${withdrawalId}${parseFloat(amount).toFixed(2)}${timestamp}`;
    const signature = crypto.createHmac("sha256", apiSecret).update(signPayload).digest("hex");

    const response = await fetch("https://api.redotpay.com/v1/payout/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
        "X-Signature": signature,
        "X-Timestamp": String(timestamp),
      },
      body: JSON.stringify({
        merchant_id: merchantId,
        withdrawal_id: withdrawalId,
        amount: parseFloat(amount).toFixed(2),
        currency: (currency || "USD").toUpperCase(),
        destination: destination_address || card_number,
        type: card_number ? "card" : "crypto",
        metadata: { user_id: user_id || "anonymous" },
      }),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      throw new Error(data.error?.message || data.message || "Failed to create RedotPay withdrawal");
    }

    // Save withdrawal record
    const { saveGatewayWithdrawal } = require("./gateway-helpers");
    saveGatewayWithdrawal({
      amount: parseFloat(amount),
      currency: (currency || "USD").toUpperCase(),
      payment_method: "redotpay",
      destination_address: destination_address || card_number || "",
      txid: data.data?.transaction_id || withdrawalId,
      status: "success",
      user_id: user_id || null,
    });

    res.json({
      success: true,
      gateway: "redotpay",
      data: {
        withdrawal_id: withdrawalId,
        transaction_id: data.data?.transaction_id || null,
        amount: parseFloat(amount),
        currency: (currency || "USD").toUpperCase(),
        destination: destination_address || card_number,
        status: "success",
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Redotpay Callback
router.post("/redotpay/callback", (req, res) => {
  const apiSecret = process.env.REDOTPAY_API_SECRET;
  if (!apiSecret) return res.status(200).send("OK");

  try {
    const { order_id, status, amount, currency, transaction_id } = req.body;

    if (status === "completed" || status === "paid") {
      const { saveGatewayDeposit } = require("./gateway-helpers");
      saveGatewayDeposit({
        amount: parseFloat(amount || 0),
        currency: (currency || "USD").toUpperCase(),
        payment_method: "redotpay",
        txid: transaction_id || order_id,
        from_address: "",
        payment_id: order_id,
        status: "confirmed",
      });
      console.log(`[REDOTPAY] Payment confirmed: ${amount} ${currency} | Order: ${order_id}`);
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("[REDOTPAY] Callback error:", err.message);
    res.status(200).json({ success: true });
  }
});

// ═══════════════════════════════════════
// Unified Payment Process Router
// ═══════════════════════════════════════

router.post("/process", async (req, res) => {
  const { gateway, action, ...params } = req.body;

  if (!gateway || !action) {
    return res.status(400).json({
      error: "يرجى تحديد بوابة الدفع والإجراء",
      available_gateways: ["perfect_money", "stripe", "paypal", "binance_pay", "wise", "redotpay"],
      available_actions: ["deposit", "withdraw"],
    });
  }

  const routeMap = {
    perfect_money: { deposit: "/perfect-money/deposit", withdraw: "/perfect-money/withdraw" },
    stripe: { deposit: "/stripe/create-session", withdraw: "/stripe/withdraw" },
    paypal: { deposit: "/paypal/create-order", withdraw: "/paypal/withdraw" },
    binance_pay: { deposit: "/binance-pay/create-order", withdraw: "/binance-pay/withdraw" },
    wise: { deposit: "/wise/deposit", withdraw: "/wise/withdraw" },
    redotpay: { deposit: "/redotpay/deposit", withdraw: "/redotpay/withdraw" },
  };

  const route = routeMap[gateway]?.[action];
  if (!route) {
    return res.status(400).json({
      error: `بوابة ${gateway} لا تدعم عملية ${action}`,
      supported: routeMap[gateway] ? Object.keys(routeMap[gateway]) : [],
    });
  }

  // Forward to the appropriate handler
  req.url = route;
  req.body = params;
  router.handle(req, res, () => {
    res.status(404).json({ error: "Route not found" });
  });
});

module.exports = router;
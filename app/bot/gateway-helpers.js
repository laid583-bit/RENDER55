/**
 * Gateway Helpers - Shared functions for payment gateway callbacks
 * Saves deposits and withdrawals to their respective JSON files
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DEPOSITS_FILE = path.join(__dirname, "deposits.json");
const WITHDRAWALS_FILE = path.join(__dirname, "withdrawals.json");
const POOL_WALLET_ADDRESS = process.env.POOL_WALLET_ADDRESS || "TAD2nFgKq7tNS2YAexsZko94RXVuzgBXbG";

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

/**
 * Save a confirmed deposit from a payment gateway callback
 */
function saveGatewayDeposit({ amount, currency, payment_method, txid, from_address, payment_id, status }) {
  const deposit = {
    id: `dep_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
    amount: parseFloat(amount),
    currency: (currency || "USD").toUpperCase(),
    from_address: from_address || "",
    to_address: POOL_WALLET_ADDRESS,
    payment_method: payment_method,
    user_id: null,
    txid: txid || null,
    status: status || "confirmed",
    notes: `Gateway deposit via ${payment_method}`,
    payment_id: payment_id || null,
    created_at: new Date().toISOString(),
    confirmed_at: new Date().toISOString(),
  };

  const deposits = readDeposits();
  deposits.unshift(deposit);
  if (deposits.length > 10000) deposits.length = 10000;
  saveDeposits(deposits);

  console.log(`💳 [GATEWAY DEPOSIT] ${amount} ${currency} via ${payment_method} | TxID: ${txid || "N/A"}`);
  return deposit;
}

/**
 * Save a withdrawal processed through a payment gateway
 */
function saveGatewayWithdrawal({ amount, currency, payment_method, destination_address, txid, status, user_id }) {
  const withdrawal = {
    id: `wd_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
    amount: parseFloat(amount),
    currency: (currency || "USD").toUpperCase(),
    destination_address: destination_address || "",
    payment_method: payment_method,
    user_id: user_id || null,
    txid: txid || null,
    status: status || "success",
    error: null,
    notes: `Gateway withdrawal via ${payment_method}`,
    created_at: new Date().toISOString(),
    processed_at: new Date().toISOString(),
  };

  const withdrawals = readWithdrawals();
  withdrawals.unshift(withdrawal);
  if (withdrawals.length > 10000) withdrawals.length = 10000;
  saveWithdrawals(withdrawals);

  console.log(`💳 [GATEWAY WITHDRAWAL] ${amount} ${currency} via ${payment_method} -> ${destination_address}`);
  return withdrawal;
}

module.exports = {
  saveGatewayDeposit,
  saveGatewayWithdrawal,
  readDeposits,
  saveDeposits,
  readWithdrawals,
  saveWithdrawals,
};
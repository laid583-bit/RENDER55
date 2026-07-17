import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowUpFromLine,
  Copy,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  RefreshCw,
  Wallet,
  Globe,
  CreditCard,
  ArrowLeft,
} from "lucide-react";
import { getAPIBaseURL } from "@/lib/config";

// Payment methods categorized
const CRYPTO_METHODS = [
  { id: "usdt_trc20", name: "USDT (TRC-20)", currency: "USDT", icon: "₮", color: "text-emerald-400", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/30" },
  { id: "trx", name: "TRX (Tron)", currency: "TRX", icon: "◈", color: "text-red-400", bgColor: "bg-red-500/10", borderColor: "border-red-500/30" },
  { id: "btc", name: "Bitcoin (BTC)", currency: "BTC", icon: "₿", color: "text-orange-400", bgColor: "bg-orange-500/10", borderColor: "border-orange-500/30" },
  { id: "eth", name: "Ethereum (ETH)", currency: "ETH", icon: "Ξ", color: "text-violet-400", bgColor: "bg-violet-500/10", borderColor: "border-violet-500/30" },
  { id: "usdt_erc20", name: "USDT (ERC-20)", currency: "USDT", icon: "₮", color: "text-teal-400", bgColor: "bg-teal-500/10", borderColor: "border-teal-500/30" },
  { id: "binance_pay", name: "Binance Pay", currency: "USDT", icon: "◆", color: "text-yellow-400", bgColor: "bg-yellow-500/10", borderColor: "border-yellow-500/30" },
];

const BANK_METHODS = [
  { id: "stripe", name: "Stripe (بطاقة)", currency: "USD", icon: "💳", color: "text-indigo-400", bgColor: "bg-indigo-500/10", borderColor: "border-indigo-500/30" },
  { id: "paypal", name: "PayPal", currency: "USD", icon: "P", color: "text-blue-400", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/30" },
  { id: "perfect_money", name: "Perfect Money", currency: "USD", icon: "PM", color: "text-red-400", bgColor: "bg-red-500/10", borderColor: "border-red-500/30" },
  { id: "wise", name: "Wise (تحويل بنكي)", currency: "USD", icon: "🌐", color: "text-green-400", bgColor: "bg-green-500/10", borderColor: "border-green-500/30" },
  { id: "redotpay", name: "RedotPay", currency: "USD", icon: "R", color: "text-rose-400", bgColor: "bg-rose-500/10", borderColor: "border-rose-500/30" },
  { id: "payeer", name: "Payeer", currency: "USD", icon: "₽", color: "text-teal-400", bgColor: "bg-teal-500/10", borderColor: "border-teal-500/30" },
  { id: "skrill", name: "Skrill", currency: "USD", icon: "S", color: "text-purple-400", bgColor: "bg-purple-500/10", borderColor: "border-purple-500/30" },
  { id: "neteller", name: "Neteller", currency: "USD", icon: "N", color: "text-green-400", bgColor: "bg-green-500/10", borderColor: "border-green-500/30" },
  { id: "webmoney", name: "WebMoney", currency: "USD", icon: "W", color: "text-blue-300", bgColor: "bg-blue-600/10", borderColor: "border-blue-600/30" },
  { id: "advcash", name: "AdvCash", currency: "USD", icon: "A", color: "text-indigo-400", bgColor: "bg-indigo-500/10", borderColor: "border-indigo-500/30" },
  { id: "western_union", name: "Western Union", currency: "USD", icon: "WU", color: "text-yellow-400", bgColor: "bg-yellow-500/10", borderColor: "border-yellow-500/30" },
  { id: "barid_mob", name: "بريدي موب", currency: "DZD", icon: "BM", color: "text-yellow-400", bgColor: "bg-yellow-500/10", borderColor: "border-yellow-500/30" },
  { id: "bank_transfer", name: "حوالة بنكية", currency: "USD", icon: "🏦", color: "text-cyan-400", bgColor: "bg-cyan-500/10", borderColor: "border-cyan-500/30" },
];

interface DepositRecord {
  id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string;
  txid?: string;
  created_at: string;
  confirmed_at?: string;
}

export default function DepositPage() {
  const navigate = useNavigate();
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [accountInfo, setAccountInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [poolWallet, setPoolWallet] = useState("");
  const [copied, setCopied] = useState(false);
  const [deposits, setDeposits] = useState<DepositRecord[]>([]);
  const [loadingDeposits, setLoadingDeposits] = useState(false);
  const [apiError, setApiError] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [routeInfo, setRouteInfo] = useState<string>("");

  // Determine if selected method is crypto
  const isCryptoMethod = CRYPTO_METHODS.some((m) => m.id === selectedMethod);
  const selectedMethodInfo = [...CRYPTO_METHODS, ...BANK_METHODS].find((m) => m.id === selectedMethod);

  // Fetch pool wallet address
  useEffect(() => {
    fetchPoolWallet();
    fetchDeposits();
  }, []);

  async function fetchPoolWallet() {
    try {
      const res = await fetch(`${getAPIBaseURL()}/api/deposit/address`, {
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) {
        const data = await res.json();
        setPoolWallet(data.data?.wallet_address || "");
        setApiError(false);
      } else {
        setApiError(true);
      }
    } catch {
      setApiError(true);
    }
  }

  async function fetchDeposits() {
    setLoadingDeposits(true);
    setFetchError("");
    try {
      const res = await fetch(`${getAPIBaseURL()}/api/deposits?limit=10`, {
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) {
        const data = await res.json();
        setDeposits(data.data?.items || []);
        setApiError(false);
      } else {
        setFetchError("تعذر جلب الإيداعات من الخادم");
      }
    } catch {
      setFetchError("تعذر الاتصال بالخادم - تأكد من تشغيل البوت");
      setApiError(true);
    }
    setLoadingDeposits(false);
  }

  // Gateway methods that use external payment flow
  const GATEWAY_DEPOSIT_METHODS: Record<string, string> = {
    stripe: "/api/payments/stripe/create-session",
    paypal: "/api/payments/paypal/create-order",
    binance_pay: "/api/payments/binance-pay/create-order",
    perfect_money: "/api/payments/perfect-money/deposit",
    redotpay: "/api/payments/redotpay/deposit",
    wise: "/api/payments/wise/deposit",
  };

  async function handleSubmit() {
    if (!selectedMethod || !amount || parseFloat(amount) <= 0) {
      setError("يرجى اختيار طريقة الدفع وإدخال المبلغ");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess(false);
    setRouteInfo("");

    // Check if this method uses a payment gateway
    const gatewayEndpoint = GATEWAY_DEPOSIT_METHODS[selectedMethod];

    if (gatewayEndpoint) {
      // Use payment gateway API
      try {
        const res = await fetch(`${getAPIBaseURL()}${gatewayEndpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: parseFloat(amount),
            currency: selectedMethodInfo?.currency || "USD",
            user_id: null,
          }),
          signal: AbortSignal.timeout(20000),
        });

        const data = await res.json();

        if (data.success) {
          // Redirect to payment URL if available
          const redirectUrl = data.data?.checkout_url || data.data?.approve_url || data.data?.form_url;
          if (redirectUrl && selectedMethod !== "perfect_money") {
            setSuccess(true);
            setRouteInfo("جاري تحويلك إلى بوابة الدفع...");
            setTimeout(() => {
              window.open(redirectUrl, "_blank");
            }, 1000);
          } else if (selectedMethod === "perfect_money" && data.data?.form_url) {
            // Perfect Money uses form submission
            setSuccess(true);
            setRouteInfo("جاري فتح بوابة Perfect Money...");
            const form = document.createElement("form");
            form.method = "POST";
            form.action = data.data.form_url;
            form.target = "_blank";
            if (data.data.form_data) {
              Object.entries(data.data.form_data).forEach(([key, value]) => {
                const input = document.createElement("input");
                input.type = "hidden";
                input.name = key;
                input.value = value as string;
                form.appendChild(input);
              });
            }
            document.body.appendChild(form);
            form.submit();
            document.body.removeChild(form);
          } else {
            setSuccess(true);
            setRouteInfo("تم إنشاء طلب الدفع بنجاح");
          }
          fetchDeposits();
          setAmount("");
          setAccountInfo("");
        } else {
          setError(data.error || "فشل في إنشاء طلب الدفع");
        }
      } catch {
        setError("تعذر الاتصال ببوابة الدفع - تأكد من تشغيل الخادم");
      }
    } else {
      // Standard deposit flow (crypto or manual bank)
      const payload = {
        amount: parseFloat(amount),
        currency: selectedMethodInfo?.currency || "USD",
        from_address: "",
        payment_method: selectedMethod,
        user_id: null,
        notes: isCryptoMethod ? "crypto deposit - monitoring" : (accountInfo || ""),
      };

      try {
        const res = await fetch(`${getAPIBaseURL()}/api/deposits`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(15000),
        });

        if (res.ok) {
          setSuccess(true);
          if (isCryptoMethod) {
            setRouteInfo("سيتم تأكيد الإيداع تلقائياً عند رصد التحويل على الشبكة");
          } else {
            setRouteInfo("تم إرسال الطلب للمراجعة من قبل الإدارة");
          }
          fetchDeposits();
          setAmount("");
          setAccountInfo("");
        } else {
          const errData = await res.json().catch(() => null);
          setError(errData?.error || "فشل في إرسال الطلب - حاول مرة أخرى");
        }
      } catch {
        setError("تعذر الاتصال بالخادم - تأكد من تشغيل البوت");
      }
    }

    setLoading(false);
  }

  function copyAddress() {
    navigator.clipboard.writeText(poolWallet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">مؤكد</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">قيد المراجعة</Badge>;
      case "monitoring":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">مراقبة الشبكة</Badge>;
      case "rejected":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">مرفوض</Badge>;
      default:
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">{status}</Badge>;
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0F1C] text-white" dir="rtl">
      <Header />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate("/banks")}
          className="mb-4 text-gray-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 ml-2" />
          العودة للبنوك
        </Button>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
            إيداع الأموال
          </h1>
          <p className="text-gray-400 mt-2">اختر طريقة الدفع وأدخل المبلغ المراد إيداعه</p>
          {apiError && (
            <p className="text-yellow-400 text-xs mt-2 flex items-center justify-center gap-1">
              <AlertCircle className="h-3 w-3" />
              الخادم قد يكون في وضع السكون - قد يستغرق الاتصال 30 ثانية
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Payment Method Selection */}
          <div className="space-y-4">
            {/* Crypto Methods */}
            <Card className="bg-[#1F2937] border-[#374151] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Globe className="h-5 w-5 text-amber-400" />
                <h3 className="font-bold text-amber-400">العملات الرقمية</h3>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]">تلقائي</Badge>
              </div>
              <p className="text-gray-500 text-xs mb-3">يتم التأكيد تلقائياً عبر مراقبة الشبكة</p>
              <div className="grid grid-cols-2 gap-2">
                {CRYPTO_METHODS.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => { setSelectedMethod(method.id); setSuccess(false); setError(""); }}
                    className={`p-3 rounded-lg border transition-all text-right ${
                      selectedMethod === method.id
                        ? `${method.bgColor} ${method.borderColor} ring-1 ring-offset-0`
                        : "bg-[#0A0F1C] border-[#374151] hover:border-gray-500"
                    }`}
                  >
                    <span className={`text-lg font-bold ${method.color}`}>{method.icon}</span>
                    <p className="text-xs text-white mt-1">{method.name}</p>
                  </button>
                ))}
              </div>
            </Card>

            {/* Bank/Wallet Methods */}
            <Card className="bg-[#1F2937] border-[#374151] p-4">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="h-5 w-5 text-blue-400" />
                <h3 className="font-bold text-blue-400">البنوك والمحافظ الإلكترونية</h3>
                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-[10px]">يدوي</Badge>
              </div>
              <p className="text-gray-500 text-xs mb-3">يتم المراجعة والتأكيد من قبل الإدارة</p>
              <div className="grid grid-cols-2 gap-2">
                {BANK_METHODS.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => { setSelectedMethod(method.id); setSuccess(false); setError(""); }}
                    className={`p-3 rounded-lg border transition-all text-right ${
                      selectedMethod === method.id
                        ? `${method.bgColor} ${method.borderColor} ring-1 ring-offset-0`
                        : "bg-[#0A0F1C] border-[#374151] hover:border-gray-500"
                    }`}
                  >
                    <span className={`text-lg font-bold ${method.color}`}>{method.icon}</span>
                    <p className="text-xs text-white mt-1">{method.name}</p>
                  </button>
                ))}
              </div>
            </Card>
          </div>

          {/* Right: Deposit Form */}
          <div className="space-y-4">
            {/* Pool Wallet (for crypto) */}
            {isCryptoMethod && poolWallet && (
              <Card className="bg-[#1F2937] border-emerald-500/30 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm font-bold text-emerald-400">عنوان محفظة الحوض</span>
                </div>
                <div className="flex items-center gap-2 bg-[#0A0F1C] rounded-lg p-3 border border-[#374151]">
                  <code className="text-xs text-gray-300 flex-1 break-all font-mono">{poolWallet}</code>
                  <Button size="sm" variant="ghost" onClick={copyAddress} className="shrink-0">
                    {copied ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4 text-gray-400" />}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  أرسل {selectedMethodInfo?.currency} إلى هذا العنوان - سيتم التأكيد تلقائياً
                </p>
              </Card>
            )}

            {isCryptoMethod && !poolWallet && apiError && (
              <Card className="bg-[#1F2937] border-red-500/30 p-4">
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span>تعذر جلب عنوان المحفظة - تأكد من تشغيل البوت</span>
                </div>
              </Card>
            )}

            {/* Amount Input */}
            <Card className="bg-[#1F2937] border-[#374151] p-4">
              <h3 className="font-bold mb-3">تفاصيل الإيداع</h3>

              {selectedMethod ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-2 bg-[#0A0F1C] rounded-lg border border-[#374151]">
                    <span className={`text-lg font-bold ${selectedMethodInfo?.color}`}>
                      {selectedMethodInfo?.icon}
                    </span>
                    <span className="text-sm">{selectedMethodInfo?.name}</span>
                    <Badge className="mr-auto bg-[#374151] text-gray-300 text-[10px]">
                      {isCryptoMethod ? "تلقائي" : "يدوي"}
                    </Badge>
                  </div>

                  <div>
                    <label className="text-sm text-gray-400 block mb-1">المبلغ ({selectedMethodInfo?.currency})</label>
                    <Input
                      type="number"
                      min="1"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="أدخل المبلغ"
                      className="bg-[#0A0F1C] border-[#374151] text-white"
                    />
                  </div>

                  {!isCryptoMethod && (
                    <div>
                      <label className="text-sm text-gray-400 block mb-1">معلومات الحساب / رقم المرسل</label>
                      <Input
                        value={accountInfo}
                        onChange={(e) => setAccountInfo(e.target.value)}
                        placeholder="رقم الحساب أو البريد الإلكتروني"
                        className="bg-[#0A0F1C] border-[#374151] text-white"
                      />
                    </div>
                  )}

                  {error && (
                    <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 p-2 rounded-lg border border-red-500/30">
                      <AlertCircle className="h-4 w-4" />
                      {error}
                    </div>
                  )}

                  {success && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center">
                      <CheckCircle2 className="h-6 w-6 text-green-400 mx-auto mb-2" />
                      <p className="text-green-400 font-bold text-sm">تم إرسال طلب الإيداع بنجاح</p>
                      {routeInfo && <p className="text-gray-400 text-xs mt-1">{routeInfo}</p>}
                    </div>
                  )}

                  <Button
                    onClick={handleSubmit}
                    disabled={loading || !amount}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3"
                  >
                    {loading ? (
                      <><Loader2 className="h-4 w-4 animate-spin ml-2" /> جاري الإرسال...</>
                    ) : (
                      <><ArrowUpFromLine className="h-4 w-4 ml-2" /> تأكيد الإيداع</>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Wallet className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>اختر طريقة الدفع من القائمة</p>
                </div>
              )}
            </Card>

            {/* Recent Deposits */}
            <Card className="bg-[#1F2937] border-[#374151] p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm">آخر الإيداعات</h3>
                <Button size="sm" variant="ghost" onClick={fetchDeposits} disabled={loadingDeposits}>
                  <RefreshCw className={`h-3 w-3 ${loadingDeposits ? "animate-spin" : ""}`} />
                </Button>
              </div>

              {fetchError && (
                <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 p-2 rounded-lg border border-red-500/30 mb-2">
                  <AlertCircle className="h-3 w-3" />
                  {fetchError}
                </div>
              )}

              {deposits.length === 0 && !fetchError ? (
                <p className="text-gray-500 text-sm text-center py-4">لا توجد إيداعات بعد</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {deposits.slice(0, 5).map((dep) => (
                    <div key={dep.id} className="flex items-center justify-between p-2 bg-[#0A0F1C] rounded-lg border border-[#374151]">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3 text-gray-500" />
                        <span className="text-xs text-gray-300">
                          {dep.amount} {dep.currency}
                        </span>
                      </div>
                      {getStatusBadge(dep.status)}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
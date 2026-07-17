import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Settings,
  Plus,
  Save,
  Trash2,
  RefreshCw,
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  Clock,
  XCircle,
  Search,
  Filter,
  Users,
  LogOut,
  Wallet,
  CreditCard,
  AlertTriangle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// ═══════════════════════════════════════
// Auth helpers
// ═══════════════════════════════════════
const AUTH_KEY = "admin_authenticated";
const CREDENTIALS_KEY = "admin_credentials";

interface AdminCredentials {
  email: string;
  password: string;
}

function getCredentials(): AdminCredentials {
  try {
    const stored = localStorage.getItem(CREDENTIALS_KEY);
    if (stored) return JSON.parse(stored);
  } catch (_e) { /* ignore parse errors */ }
  return { email: "admin@ttb.exchange", password: "admin123" };
}

export function isAdminLoggedIn(): boolean {
  return localStorage.getItem(AUTH_KEY) === "true";
}

export function adminLogout(): void {
  localStorage.removeItem(AUTH_KEY);
}

// ═══════════════════════════════════════
// Data persistence (localStorage)
// ═══════════════════════════════════════
const PAIRS_KEY = "ttb_currency_pairs";

interface CurrencyPair {
  id: string;
  base_currency: string;
  quote_currency: string;
  pair_name: string;
  is_active: boolean;
}

interface TransactionRecord {
  id: string;
  amount: number;
  currency: string;
  payment_method: string;
  wallet_address: string;
  status: string;
  notes: string;
  created_at: string;
}

function loadData<T>(key: string, fallback: T[]): T[] {
  try {
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored);
  } catch (_e) { /* ignore parse errors */ }
  return fallback;
}

function saveData<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}



// مزامنة أزواج العملات تلقائياً مع البوت على Render
const BOT_API_URL = import.meta.env.VITE_BOT_API_URL || "https://tbb-jchj.onrender.com";

async function syncPairsToBot(pairs: CurrencyPair[]) {
  try {
    const pairsData = pairs
      .filter((p) => p.is_active)
      .map((p) => ({
        id: p.id,
        base_currency: p.base_currency,
        quote_currency: p.quote_currency,
        pair_name: p.pair_name,
      }));

    await fetch(`${BOT_API_URL}/api/bot/pairs`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pairs: pairsData }),
    });
    console.log(`✅ تم مزامنة ${pairsData.length} زوج مع البوت`);
  } catch (err) {
    console.error("⚠️ خطأ في مزامنة الأزواج مع البوت:", err);
  }
}

// ═══════════════════════════════════════
// Payment methods map
// ═══════════════════════════════════════
const PAYMENT_METHODS_MAP: Record<string, { name: string; icon: string }> = {
  paypal: { name: "PayPal", icon: "💳" },
  payeer: { name: "Payeer", icon: "💰" },
  perfect_money: { name: "Perfect Money", icon: "💵" },
  webmoney: { name: "WebMoney", icon: "🌐" },
  skrill: { name: "Skrill", icon: "💜" },
  neteller: { name: "Neteller", icon: "💚" },
  advcash: { name: "AdvCash", icon: "🔷" },
  usdt_trc20: { name: "USDT (TRC20)", icon: "🟢" },
  usdt_erc20: { name: "USDT (ERC20)", icon: "🔵" },
  btc: { name: "Bitcoin", icon: "🟠" },
  eth: { name: "Ethereum", icon: "🔮" },
  binance_pay: { name: "Binance Pay", icon: "🟡" },
  stripe: { name: "Stripe", icon: "💎" },
  redotpay: { name: "RedotPay", icon: "🔴" },
  western_union: { name: "Western Union", icon: "🌍" },
  wise: { name: "Wise", icon: "🍀" },
  zelle: { name: "Zelle", icon: "⚡" },
  payoneer: { name: "Payoneer", icon: "🔶" },
  barid_mob: { name: "بريدي موب", icon: "📱" },
  bank_transfer: { name: "تحويل بنكي", icon: "🏦" },
  trx: { name: "Tron (TRX)", icon: "🔴" },
  ttb_token: { name: "TTB Token", icon: "🪙" },
};

const STATUS_OPTIONS = [
  { value: "all", label: "الكل" },
  { value: "pending", label: "معلق" },
  { value: "completed", label: "مكتمل" },
  { value: "rejected", label: "مرفوض" },
];

const statusConfig: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
  pending: {
    color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    label: "معلق",
    icon: <Clock className="h-3 w-3" />,
  },
  completed: {
    color: "bg-green-500/20 text-green-400 border-green-500/30",
    label: "مكتمل",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  confirmed: {
    color: "bg-green-500/20 text-green-400 border-green-500/30",
    label: "مؤكد",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  success: {
    color: "bg-green-500/20 text-green-400 border-green-500/30",
    label: "مكتمل",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  rejected: {
    color: "bg-red-500/20 text-red-400 border-red-500/30",
    label: "مرفوض",
    icon: <XCircle className="h-3 w-3" />,
  },
  failed: {
    color: "bg-red-500/20 text-red-400 border-red-500/30",
    label: "فشل",
    icon: <XCircle className="h-3 w-3" />,
  },
};

// ═══════════════════════════════════════
// Transaction Manager Component (Real API)
// ═══════════════════════════════════════
function TransactionManager({
  type,
}: {
  type: "withdrawal" | "deposit";
}) {
  const [records, setRecords] = useState<TransactionRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fetchLoading, setFetchLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");

  const isWithdrawal = type === "withdrawal";
  const icon = isWithdrawal ? (
    <ArrowDownToLine className="h-5 w-5 text-green-400" />
  ) : (
    <ArrowUpFromLine className="h-5 w-5 text-blue-400" />
  );

  const apiEndpoint = isWithdrawal
    ? `${BOT_API_URL}/api/withdrawals?limit=50`
    : `${BOT_API_URL}/api/deposits?limit=50`;

  const fetchRecords = async () => {
    setFetchLoading(true);
    setFetchError("");
    try {
      const res = await fetch(apiEndpoint, {
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) {
        const data = await res.json();
        const items = data.data?.items || [];
        // Map API response to TransactionRecord format
        const mapped: TransactionRecord[] = items.map((item: any) => ({
          id: item.id,
          amount: item.amount || 0,
          currency: item.currency || "USD",
          payment_method: item.payment_method || "",
          wallet_address: item.destination_address || item.from_address || item.notes || "",
          status: item.status || "pending",
          notes: item.notes || "",
          created_at: item.created_at || "",
        }));
        setRecords(mapped);
      } else {
        setFetchError("تعذر جلب البيانات من الخادم");
      }
    } catch {
      setFetchError("تعذر الاتصال بالخادم - تأكد من تشغيل البوت");
    }
    setFetchLoading(false);
  };

  const handleStatusChange = async (recordId: string, newStatus: string) => {
    const endpoint = isWithdrawal
      ? `${BOT_API_URL}/api/withdrawals/${recordId}`
      : `${BOT_API_URL}/api/deposits/${recordId}`;

    try {
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        const statusLabel = newStatus === "confirmed" || newStatus === "success"
          ? "مكتمل"
          : newStatus === "rejected"
          ? "مرفوض"
          : "معلق";
        toast.success(`تم تحديث الحالة إلى "${statusLabel}"`);
        fetchRecords();
      } else {
        toast.error("فشل تحديث حالة الطلب");
      }
    } catch {
      toast.error("تعذر الاتصال بالخادم");
    }
  };

  useEffect(() => {
    fetchRecords();
    const interval = setInterval(fetchRecords, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredRecords = records.filter((r) => {
    const matchesStatus = statusFilter === "all" ||
      r.status === statusFilter ||
      (statusFilter === "completed" && (r.status === "confirmed" || r.status === "success"));
    const methodInfo = PAYMENT_METHODS_MAP[r.payment_method];
    const methodName = methodInfo?.name || r.payment_method;
    const matchesSearch =
      !searchTerm ||
      methodName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.wallet_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(r.amount).includes(searchTerm);
    return matchesStatus && matchesSearch;
  });

  const pendingCount = records.filter((r) => r.status === "pending").length;
  const completedCount = records.filter((r) => r.status === "completed" || r.status === "success" || r.status === "confirmed").length;
  const totalAmount = records
    .filter((r) => r.status === "completed" || r.status === "success" || r.status === "confirmed")
    .reduce((sum, r) => sum + (r.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-[#1F2937] border-[#374151] p-4">
          <p className="text-gray-400 text-xs">إجمالي الطلبات</p>
          <p className="text-2xl font-bold text-white">{records.length}</p>
        </Card>
        <Card className="bg-yellow-500/10 border-yellow-500/30 p-4">
          <p className="text-yellow-400 text-xs">معلق</p>
          <p className="text-2xl font-bold text-yellow-400">{pendingCount}</p>
        </Card>
        <Card className="bg-green-500/10 border-green-500/30 p-4">
          <p className="text-green-400 text-xs">مكتمل</p>
          <p className="text-2xl font-bold text-green-400">{completedCount}</p>
        </Card>
        <Card className="bg-[#1F2937] border-[#374151] p-4">
          <p className="text-gray-400 text-xs">إجمالي المبالغ المكتملة</p>
          <p className="text-2xl font-bold text-amber-400 font-mono">
            ${totalAmount.toFixed(2)}
          </p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-[#1F2937] border-[#374151] p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث بالطريقة أو العنوان أو المبلغ..."
              className="bg-[#111827] border-[#374151] text-white pr-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 bg-[#111827] border-[#374151] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1F2937] border-[#374151]">
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-white">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            onClick={fetchRecords}
            disabled={fetchLoading}
            className="border-[#374151] text-gray-300 hover:text-white hover:bg-[#374151]"
          >
            <RefreshCw className={`h-4 w-4 ml-1 ${fetchLoading ? "animate-spin" : ""}`} />
            تحديث
          </Button>
        </div>
      </Card>

      {/* Error State */}
      {fetchError && (
        <Card className="bg-red-500/10 border-red-500/30 p-4">
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <AlertTriangle className="h-4 w-4" />
            <span>{fetchError}</span>
          </div>
        </Card>
      )}

      {/* Records List */}
      {filteredRecords.length === 0 && !fetchError ? (
        <Card className="bg-[#1F2937] border-[#374151] p-12 text-center">
          {icon}
          <p className="text-gray-400 mt-3">لا توجد طلبات</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredRecords.map((record) => {
            const status = statusConfig[record.status] || statusConfig.pending;
            const methodInfo = PAYMENT_METHODS_MAP[record.payment_method];
            return (
              <Card key={record.id} className="bg-[#1F2937] border-[#374151] p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Method & Amount */}
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 bg-[#111827] rounded-lg flex items-center justify-center text-xl">
                      {methodInfo?.icon || "💳"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold font-mono">
                          {record.amount} {record.currency}
                        </p>
                        <Badge className={status.color}>
                          <span className="flex items-center gap-1">
                            {status.icon}
                            {status.label}
                          </span>
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-400">
                        {methodInfo?.name || record.payment_method}
                      </p>
                      {record.wallet_address && (
                        <p className="text-xs text-gray-500 font-mono truncate mt-1">
                          {record.wallet_address}
                        </p>
                      )}
                      <p className="text-xs text-gray-600 mt-1">
                        {record.created_at
                          ? new Date(record.created_at).toLocaleString("ar-SA")
                          : "-"}
                      </p>
                    </div>
                  </div>

                  {/* Status Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {record.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleStatusChange(record.id, isWithdrawal ? "success" : "confirmed")}
                          className="bg-green-600 hover:bg-green-700 text-white text-xs"
                        >
                          <CheckCircle2 className="h-3 w-3 ml-1" />
                          قبول
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusChange(record.id, "rejected")}
                          className="border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs"
                        >
                          <XCircle className="h-3 w-3 ml-1" />
                          رفض
                        </Button>
                      </>
                    )}
                    {(record.status === "completed" || record.status === "confirmed" || record.status === "success" || record.status === "rejected" || record.status === "failed") && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusChange(record.id, "pending")}
                        className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 text-xs"
                      >
                        إعادة للمعلق
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// Pool Wallet Section (محفظة الحوض)
// ═══════════════════════════════════════
function PoolWalletSection() {
  const [walletData, setWalletData] = useState<{
    wallet_address: string;
    network: string;
    balances: { trx: number; usdt: number };
    last_checked: string;
    warning?: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchWalletData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BOT_API_URL}/api/pool-wallet`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setWalletData(json.data);
        }
      }
    } catch (err) {
      console.error("Failed to fetch pool wallet:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
    const interval = setInterval(fetchWalletData, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading && !walletData) {
    return (
      <Card className="bg-[#1F2937] border-[#374151]">
        <CardContent className="p-6 text-center text-gray-400">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
          جاري تحميل بيانات محفظة الحوض...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-[#1F2937] border-[#374151]">
        <CardHeader>
          <CardTitle className="text-teal-400 flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            محفظة الحوض (Pool Wallet)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {walletData?.warning && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-300 text-sm">
              ⚠️ {walletData.warning}
            </div>
          )}

          {/* Wallet Address */}
          <div className="bg-[#0A0F1C] border border-[#374151] rounded-lg p-4">
            <Label className="text-gray-400 text-sm">عنوان المحفظة (العام فقط)</Label>
            <div className="flex items-center gap-2 mt-2">
              <code className="text-amber-400 font-mono text-sm bg-[#1a1a2e] px-3 py-2 rounded flex-1 break-all">
                {walletData?.wallet_address || "غير متوفر"}
              </code>
              <Button
                size="sm"
                variant="outline"
                className="border-[#374151] text-gray-300 hover:bg-[#374151]"
                onClick={() => {
                  if (walletData?.wallet_address) {
                    navigator.clipboard.writeText(walletData.wallet_address);
                    toast.success("تم نسخ العنوان");
                  }
                }}
              >
                نسخ
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              🔒 المفتاح الخاص محفوظ بأمان في متغيرات البيئة على السيرفر - لا يتم عرضه أبداً
            </p>
          </div>

          {/* Balances */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#0A0F1C] border border-[#374151] rounded-lg p-4">
              <Label className="text-gray-400 text-sm">رصيد TRX</Label>
              <p className="text-2xl font-bold text-white mt-1">
                {walletData?.balances?.trx?.toFixed(6) ?? "0.00"} <span className="text-sm text-gray-400">TRX</span>
              </p>
            </div>
            <div className="bg-[#0A0F1C] border border-[#374151] rounded-lg p-4">
              <Label className="text-gray-400 text-sm">رصيد USDT (TRC-20)</Label>
              <p className="text-2xl font-bold text-green-400 mt-1">
                {walletData?.balances?.usdt?.toFixed(2) ?? "0.00"} <span className="text-sm text-gray-400">USDT</span>
              </p>
            </div>
          </div>

          {/* Network Info & Last Checked */}
          <div className="bg-[#0A0F1C] border border-[#374151] rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-gray-400 text-sm">الشبكة</Label>
                <p className="text-white mt-1">{walletData?.network || "TRON (TRC-20)"}</p>
                {walletData?.last_checked && (
                  <p className="text-xs text-gray-500 mt-1">
                    آخر تحديث: {new Date(walletData.last_checked).toLocaleString("ar-DZ")}
                  </p>
                )}
              </div>
              <a
                href={`https://tronscan.org/#/address/${walletData?.wallet_address || ""}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-400 hover:text-teal-300 text-sm underline"
              >
                عرض على TronScan ↗
              </a>
            </div>
          </div>

          {/* Security Notice */}
          <div className="bg-teal-900/20 border border-teal-700/50 rounded-lg p-4">
            <h4 className="text-teal-400 font-semibold mb-2">🔐 ملاحظات أمنية</h4>
            <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside">
              <li>المفتاح الخاص محفوظ في متغيرات البيئة (Environment Variables) على السيرفر</li>
              <li>لا يتم إرسال المفتاح الخاص عبر أي API أو عرضه في الواجهة</li>
              <li>جميع العمليات تتم على السيرفر مباشرة بدون كشف البيانات الحساسة</li>
              <li>يتم تحديث الأرصدة تلقائياً كل 30 ثانية</li>
            </ul>
          </div>

          {/* Refresh Button */}
          <Button
            onClick={fetchWalletData}
            disabled={loading}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin ml-2" />
            ) : (
              <RefreshCw className="h-4 w-4 ml-2" />
            )}
            تحديث الأرصدة
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════
// Pending Badge Component (for tab indicator)
// ═══════════════════════════════════════
// Crypto method IDs to exclude from bank requests
const CRYPTO_METHOD_IDS = ["usdt_trc20", "trx", "btc", "eth", "usdt_erc20", "binance_pay"];

function PendingBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        // Try bank-requests endpoint first
        const res = await fetch(`${BOT_API_URL}/api/bank-requests?limit=50`, {
          signal: AbortSignal.timeout(10000),
        });
        if (res.ok) {
          const data = await res.json();
          const items = data.data?.items || [];
          setCount(items.filter((r: any) => r.status === "pending").length);
          return;
        }
      } catch { /* fallback below */ }

      // Fallback: count pending from deposits + withdrawals (non-crypto only)
      try {
        let pendingCount = 0;
        const [dRes, wRes] = await Promise.allSettled([
          fetch(`${BOT_API_URL}/api/deposits?limit=50`, { signal: AbortSignal.timeout(10000) }),
          fetch(`${BOT_API_URL}/api/withdrawals?limit=50`, { signal: AbortSignal.timeout(10000) }),
        ]);
        if (dRes.status === "fulfilled" && dRes.value.ok) {
          const dData = await dRes.value.json();
          const dItems = dData.data?.items || [];
          pendingCount += dItems.filter((r: any) => r.status === "pending" && !CRYPTO_METHOD_IDS.includes(r.payment_method)).length;
        }
        if (wRes.status === "fulfilled" && wRes.value.ok) {
          const wData = await wRes.value.json();
          const wItems = wData.data?.items || [];
          pendingCount += wItems.filter((r: any) => r.status === "pending" && !CRYPTO_METHOD_IDS.includes(r.payment_method)).length;
        }
        setCount(pendingCount);
      } catch { /* ignore */ }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 15000);
    return () => clearInterval(interval);
  }, []);

  if (count === 0) return null;

  return (
    <span className="absolute -top-1 -right-1 h-5 min-w-[20px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
      {count > 99 ? "99+" : count}
    </span>
  );
}

// ═══════════════════════════════════════
// Main Admin Page
// ═══════════════════════════════════════
export default function AdminPage() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(true);

  // System config state
  const [targetSpread, setTargetSpread] = useState<number>(50.0);
  const [adminGasFee, setAdminGasFee] = useState<number>(1.0);
  const [actualEnergyCost, setActualEnergyCost] = useState<number>(0.5);
  const [savingConfig, setSavingConfig] = useState(false);

  // Pairs state
  const [pairs, setPairs] = useState<CurrencyPair[]>([]);
  const [newBase, setNewBase] = useState("");
  const [newQuote, setNewQuote] = useState("");

  useEffect(() => {
    const loggedIn = isAdminLoggedIn();
    setIsAuthenticated(loggedIn);
    if (loggedIn) {
      loadAllData();
    }
    setLoading(false);
  }, []);

  const loadAllData = () => {
    const storedPairs = loadData<CurrencyPair>(PAIRS_KEY, []);
    setPairs(storedPairs);

    // Load system config from localStorage
    try {
      const storedSysConfig = localStorage.getItem("system_config");
      if (storedSysConfig) {
        const cfg = JSON.parse(storedSysConfig);
        setTargetSpread(cfg.target_spread ?? 50.0);
        setAdminGasFee(cfg.admin_gas_fee ?? 1.0);
        setActualEnergyCost(cfg.actual_energy_cost ?? 0.5);
      }
    } catch { /* ignore */ }

    // Also fetch from bot API
    fetchSystemConfig();
  };

  const fetchSystemConfig = async () => {
    try {
      const res = await fetch(`${BOT_API_URL}/api/config`);
      if (res.ok) {
        const result = await res.json();
        if (result?.success && result?.data) {
          setTargetSpread(result.data.target_spread ?? 50.0);
          setAdminGasFee(result.data.admin_gas_fee ?? 1.0);
          setActualEnergyCost(result.data.actual_energy_cost ?? 0.5);
          localStorage.setItem("system_config", JSON.stringify(result.data));
        }
      }
    } catch { /* ignore */ }
  };

  const handleSaveSystemConfig = async () => {
    setSavingConfig(true);
    const configData = {
      target_spread: targetSpread,
      admin_gas_fee: adminGasFee,
      actual_energy_cost: actualEnergyCost,
    };
    localStorage.setItem("system_config", JSON.stringify(configData));
    try {
      const res = await fetch(`${BOT_API_URL}/api/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configData),
      });
      if (res.ok) {
        toast.success("تم حفظ إعدادات النظام ومزامنتها مع البوت ✅");
      } else {
        toast.warning("تم الحفظ محلياً لكن فشلت المزامنة مع البوت");
      }
    } catch {
      toast.warning("تم الحفظ محلياً - تعذر الاتصال بالبوت");
    }
    setSavingConfig(false);
  };

  const handleLogin = () => {
    const creds = getCredentials();
    if (loginEmail === creds.email && loginPassword === creds.password) {
      localStorage.setItem(AUTH_KEY, "true");
      setIsAuthenticated(true);
      setLoginError("");
      loadAllData();
    } else {
      setLoginError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
    }
  };

  const handleLogout = () => {
    adminLogout();
    setIsAuthenticated(false);
    navigate("/");
  };

  // ═══════════════════════════════════════
  // Pairs Management
  // ═══════════════════════════════════════
  const handleAddPair = () => {
    if (!newBase.trim() || !newQuote.trim() || newBase.trim().toUpperCase() === newQuote.trim().toUpperCase()) {
      toast.error("يرجى إدخال عملتين مختلفتين");
      return;
    }
    const base = newBase.trim().toUpperCase();
    const quote = newQuote.trim().toUpperCase();
    const pairName = `${base}/${quote}`;

    // Check for duplicate
    if (pairs.some((p) => p.pair_name === pairName)) {
      toast.error("هذا الزوج موجود بالفعل");
      return;
    }

    const newPair: CurrencyPair = {
      id: `pair_${Date.now()}`,
      base_currency: base,
      quote_currency: quote,
      pair_name: pairName,
      is_active: true,
    };

    const updatedPairs = [...pairs, newPair];
    setPairs(updatedPairs);
    saveData(PAIRS_KEY, updatedPairs);
    syncPairsToBot(updatedPairs);

    setNewBase("");
    setNewQuote("");
    toast.success(`تم إضافة الزوج ${pairName} بنجاح!`);
  };

  const handleDeletePair = (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الزوج؟")) return;
    const updatedPairs = pairs.filter((p) => p.id !== id);
    setPairs(updatedPairs);
    saveData(PAIRS_KEY, updatedPairs);
    syncPairsToBot(updatedPairs);

    toast.success("تم حذف الزوج بنجاح");
  };

  const handleTogglePair = (id: string) => {
    const updatedPairs = pairs.map((p) =>
      p.id === id ? { ...p, is_active: !p.is_active } : p
    );
    setPairs(updatedPairs);
    saveData(PAIRS_KEY, updatedPairs);
    syncPairsToBot(updatedPairs);
  };

  // ═══════════════════════════════════════
  // Login Screen
  // ═══════════════════════════════════════
  if (!isAuthenticated && !loading) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] text-white" dir="rtl">
        <Header />
        <div className="max-w-md mx-auto px-4 py-20">
          <Card className="bg-[#1F2937] border-[#374151] p-8">
            <div className="text-center mb-6">
              <Settings className="h-16 w-16 text-amber-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold">لوحة التحكم</h2>
              <p className="text-gray-400 mt-2">يرجى تسجيل الدخول للوصول إلى لوحة التحكم</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-gray-300">البريد الإلكتروني</Label>
                <Input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="admin@ttb.exchange"
                  className="bg-[#111827] border-[#374151] text-white"
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">كلمة المرور</Label>
                <Input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-[#111827] border-[#374151] text-white"
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
              </div>
              {loginError && (
                <p className="text-red-400 text-sm text-center">{loginError}</p>
              )}
              <Button
                onClick={handleLogin}
                className="bg-amber-500 hover:bg-amber-600 text-black font-bold w-full"
              >
                تسجيل الدخول
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // Main Admin Dashboard
  // ═══════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#0A0F1C] text-white" dir="rtl">
      <Header />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">لوحة التحكم</h1>
            <p className="text-gray-400 text-sm mt-1">
              إدارة أزواج العملات وطلبات السحب والإيداع وإعدادات النظام
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => navigate("/sub-admins")}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
            >
              <Users className="h-4 w-4 ml-2" />
              المدراء الفرعيين
            </Button>
            <Button
              variant="outline"
              onClick={loadAllData}
              className="border-[#374151] text-gray-300 hover:text-white hover:bg-[#1F2937]"
            >
              <RefreshCw className="h-4 w-4 ml-2" />
              تحديث
            </Button>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="border-red-500/30 text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              <LogOut className="h-4 w-4 ml-2" />
              خروج
            </Button>
          </div>
        </div>

        <Tabs defaultValue="pairs" className="space-y-6">
          <TabsList className="bg-[#1F2937] border border-[#374151]">
            <TabsTrigger
              value="pairs"
              className="data-[state=active]:bg-amber-500 data-[state=active]:text-black"
            >
              أزواج العملات
            </TabsTrigger>
            <TabsTrigger
              value="withdrawals"
              className="data-[state=active]:bg-green-600 data-[state=active]:text-white"
            >
              <ArrowDownToLine className="h-4 w-4 ml-1" />
              طلبات السحب
            </TabsTrigger>
            <TabsTrigger
              value="deposits"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              <ArrowUpFromLine className="h-4 w-4 ml-1" />
              طلبات الإيداع
            </TabsTrigger>
            <TabsTrigger
              value="system_config"
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
            >
              <Settings className="h-4 w-4 ml-1" />
              إعدادات النظام
            </TabsTrigger>
            <TabsTrigger
              value="pool_wallet"
              className="data-[state=active]:bg-teal-600 data-[state=active]:text-white"
            >
              <Wallet className="h-4 w-4 ml-1" />
              محفظة الحوض
            </TabsTrigger>
            <TabsTrigger
              value="bank_requests"
              className="data-[state=active]:bg-orange-600 data-[state=active]:text-white relative"
            >
              <CreditCard className="h-4 w-4 ml-1" />
              طلبات البنوك
              <PendingBadge />
            </TabsTrigger>
          </TabsList>

          {/* ═══════════════════════════════════════ */}
          {/* Pairs Tab */}
          {/* ═══════════════════════════════════════ */}
          <TabsContent value="pairs" className="space-y-6">
            <Card className="bg-[#1F2937] border-[#374151] p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Plus className="h-5 w-5 text-amber-400" />
                إضافة زوج جديد
              </h3>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <Label className="text-gray-400 text-sm">العملة الأساسية</Label>
                  <Input
                    value={newBase}
                    onChange={(e) => setNewBase(e.target.value)}
                    placeholder="مثال: XAU, USD, TRX"
                    className="bg-[#111827] border-[#374151] text-white mt-1"
                    onKeyDown={(e) => e.key === "Enter" && handleAddPair()}
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-gray-400 text-sm">عملة التسعير</Label>
                  <Input
                    value={newQuote}
                    onChange={(e) => setNewQuote(e.target.value)}
                    placeholder="مثال: USD, EUR, USDT"
                    className="bg-[#111827] border-[#374151] text-white mt-1"
                    onKeyDown={(e) => e.key === "Enter" && handleAddPair()}
                  />
                </div>
                <Button
                  onClick={handleAddPair}
                  className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
                >
                  <Plus className="h-4 w-4 ml-1" />
                  إضافة
                </Button>
              </div>
            </Card>

            {pairs.length === 0 ? (
              <Card className="bg-[#1F2937] border-[#374151] p-12 text-center">
                <p className="text-gray-400">لا توجد أزواج عملات. أضف زوجاً جديداً للبدء.</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {pairs.map((pair) => (
                  <Card key={pair.id} className="bg-[#1F2937] border-[#374151]">
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                          <span className="text-amber-400 font-bold text-sm">
                            {pair.base_currency.slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <p className="font-bold">{pair.pair_name}</p>
                          <p className="text-xs text-gray-400">
                            {pair.base_currency} / {pair.quote_currency}
                          </p>
                        </div>
                        <Badge
                          className={
                            pair.is_active
                              ? "bg-green-500/20 text-green-400 border-green-500/30 cursor-pointer"
                              : "bg-red-500/20 text-red-400 border-red-500/30 cursor-pointer"
                          }
                          onClick={() => handleTogglePair(pair.id)}
                        >
                          {pair.is_active ? "نشط ✓" : "معطل ✗"}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeletePair(pair.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ═══════════════════════════════════════ */}
          {/* Withdrawals Tab */}
          {/* ═══════════════════════════════════════ */}
          <TabsContent value="withdrawals">
            <TransactionManager type="withdrawal" />
          </TabsContent>

          {/* ═══════════════════════════════════════ */}
          {/* Deposits Tab */}
          {/* ═══════════════════════════════════════ */}
          <TabsContent value="deposits">
            <TransactionManager type="deposit" />
          </TabsContent>

          {/* ═══════════════════════════════════════ */}
          {/* System Config Tab */}
          {/* ═══════════════════════════════════════ */}
          <TabsContent value="system_config" className="space-y-6">
            <Card className="bg-[#1F2937] border-[#374151]">
              <CardHeader>
                <CardTitle className="text-amber-400 flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  إعدادات حساب الأرباح والسيولة
                </CardTitle>
                <p className="text-gray-400 text-sm">
                  هذه الإعدادات تتحكم في حساب الأرباح الصافية وتكاليف الطاقة. يتم مزامنتها مع البوت.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Target Spread */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">
                    فارق السعر المستهدف الصافي ($)
                  </label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={targetSpread}
                      onChange={(e) => setTargetSpread(parseFloat(e.target.value) || 0)}
                      className="bg-[#0A0F1C] border-[#374151] text-white max-w-[200px]"
                    />
                    <span className="text-gray-400 text-sm">$ USD</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    المبلغ الصافي الذي يتم قشطه كربح من فارق السعر لكل حركة
                  </p>
                </div>

                {/* Admin Gas Fee */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">
                    فارق الغاز ($)
                  </label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={adminGasFee}
                      onChange={(e) => setAdminGasFee(parseFloat(e.target.value) || 0)}
                      className="bg-[#0A0F1C] border-[#374151] text-white max-w-[200px]"
                    />
                    <span className="text-gray-400 text-sm">$ USD</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    المبلغ المحسوب كرسوم غاز على العميل (يُخصم منه تكلفة الطاقة الفعلية = ربح الغاز)
                  </p>
                </div>

                {/* Actual Energy Cost */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">
                    تكلفة استئجار الطاقة الفعلية ($)
                  </label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={actualEnergyCost}
                      onChange={(e) => setActualEnergyCost(parseFloat(e.target.value) || 0)}
                      className="bg-[#0A0F1C] border-[#374151] text-white max-w-[200px]"
                    />
                    <span className="text-gray-400 text-sm">$ USD</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    التكلفة الحقيقية لاستئجار الطاقة عبر الـ API. الفرق بينها وبين فارق الغاز = ربح الغاز الصافي
                  </p>
                </div>

                {/* Profit Formula Explanation */}
                <div className="bg-[#0A0F1C] border border-[#374151] rounded-lg p-4 space-y-2">
                  <h4 className="text-amber-400 font-medium text-sm">📊 معادلة حساب الربح:</h4>
                  <div className="text-xs text-gray-300 space-y-1 font-mono" dir="ltr">
                    <p>gas_profit = admin_gas_fee - actual_energy_cost</p>
                    <p>total_pure_profit = target_spread + gas_profit</p>
                    <p>liquidity = incoming_amount - (target_spread + admin_gas_fee)</p>
                  </div>
                  <div className="border-t border-[#374151] pt-2 mt-2">
                    <p className="text-xs text-gray-400">
                      مثال: تحويل 1000$ | فارق السعر = {targetSpread}$ | فارق الغاز = {adminGasFee}$ | تكلفة الطاقة = {actualEnergyCost}$
                    </p>
                    <div className="text-sm mt-2 space-y-1">
                      <p className="text-cyan-400">
                        ربح الغاز = {adminGasFee}$ - {actualEnergyCost}$ = {(adminGasFee - actualEnergyCost).toFixed(2)}$
                      </p>
                      <p className="text-green-400 font-bold">
                        إجمالي الربح الصافي = {targetSpread}$ + {(adminGasFee - actualEnergyCost).toFixed(2)}$ = {(targetSpread + (adminGasFee - actualEnergyCost)).toFixed(2)}$
                      </p>
                      <p className="text-blue-400">
                        السيولة المتبقية = 1000$ - ({targetSpread}$ + {adminGasFee}$) = {(1000 - (targetSpread + adminGasFee)).toFixed(2)}$
                      </p>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <Button
                  onClick={handleSaveSystemConfig}
                  disabled={savingConfig}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {savingConfig ? "جاري الحفظ..." : "💾 حفظ ومزامنة مع البوت"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pool Wallet Tab */}
          <TabsContent value="pool_wallet" className="space-y-6">
            <PoolWalletSection />
          </TabsContent>

          {/* Bank Requests Tab */}
          <TabsContent value="bank_requests" className="space-y-6">
            <BankRequestsSection />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// Bank Requests Section Component
// ═══════════════════════════════════════

function BankRequestsSection() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [gasGuard, setGasGuard] = useState<any>(null);
  const [lastSeenCount, setLastSeenCount] = useState(0);
  const [fetchError, setFetchError] = useState("");
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    fetchRequests();
    fetchGasGuard();

    // Polling every 15 seconds for new requests
    const pollInterval = setInterval(() => {
      fetchRequests(true); // silent fetch (no loading spinner)
      fetchGasGuard();
    }, 15000);

    return () => clearInterval(pollInterval);
  }, []);

  async function fetchRequests(silent = false) {
    if (!silent) setLoading(true);
    setFetchError("");
    try {
      // Try bank-requests endpoint first
      const res = await fetch(`${BOT_API_URL}/api/bank-requests?limit=50`, {
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) {
        const data = await res.json();
        const items = data.data?.items || [];
        const pendingNow = items.filter((r: any) => r.status === "pending").length;

        // Notify if new pending requests arrived
        if (silent && pendingNow > lastSeenCount && lastSeenCount >= 0) {
          const diff = pendingNow - lastSeenCount;
          toast.info(`📬 وصل ${diff} طلب${diff > 1 ? "ات" : ""} بنكي${diff > 1 ? "ة" : ""} جديد${diff > 1 ? "ة" : ""}`, {
            duration: 5000,
          });
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("TTB Exchange - طلبات جديدة", {
              body: `لديك ${diff} طلب${diff > 1 ? "ات" : ""} بنكي${diff > 1 ? "ة" : ""} جديد${diff > 1 ? "ة" : ""}`,
              icon: "/favicon.ico",
            });
          }
        }

        setLastSeenCount(pendingNow);
        setRequests(items);
        setUsingFallback(false);
        if (!silent) setLoading(false);
        return;
      }
    } catch { /* fallback below */ }

    // Fallback: fetch from deposits + withdrawals and filter non-crypto
    try {
      setUsingFallback(true);
      const combined: any[] = [];
      const [dRes, wRes] = await Promise.allSettled([
        fetch(`${BOT_API_URL}/api/deposits?limit=50`, { signal: AbortSignal.timeout(15000) }),
        fetch(`${BOT_API_URL}/api/withdrawals?limit=50`, { signal: AbortSignal.timeout(15000) }),
      ]);
      if (dRes.status === "fulfilled" && dRes.value.ok) {
        const dData = await dRes.value.json();
        const dItems = (dData.data?.items || [])
          .filter((r: any) => !CRYPTO_METHOD_IDS.includes(r.payment_method))
          .map((r: any) => ({ ...r, type: "deposit" }));
        combined.push(...dItems);
      }
      if (wRes.status === "fulfilled" && wRes.value.ok) {
        const wData = await wRes.value.json();
        const wItems = (wData.data?.items || [])
          .filter((r: any) => !CRYPTO_METHOD_IDS.includes(r.payment_method))
          .map((r: any) => ({ ...r, type: "withdraw" }));
        combined.push(...wItems);
      }
      // Sort by created_at descending
      combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const pendingNow = combined.filter((r: any) => r.status === "pending").length;
      if (silent && pendingNow > lastSeenCount && lastSeenCount >= 0) {
        const diff = pendingNow - lastSeenCount;
        toast.info(`📬 وصل ${diff} طلب${diff > 1 ? "ات" : ""} بنكي${diff > 1 ? "ة" : ""} جديد${diff > 1 ? "ة" : ""}`, {
          duration: 5000,
        });
      }
      setLastSeenCount(pendingNow);
      setRequests(combined);

      if (combined.length === 0 && dRes.status === "rejected" && wRes.status === "rejected") {
        setFetchError("تعذر الاتصال بالخادم - تأكد من تشغيل البوت");
      }
    } catch {
      setFetchError("تعذر الاتصال بالخادم - تأكد من تشغيل البوت");
    }
    if (!silent) setLoading(false);
  }

  async function fetchGasGuard() {
    try {
      const res = await fetch(`${BOT_API_URL}/api/gas-guard`, {
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        const data = await res.json();
        setGasGuard(data.data);
      }
    } catch {
      // ignore
    }
  }

  async function handleAction(id: string, action: "approved" | "rejected") {
    const req = requests.find((r) => r.id === id);
    try {
      const res = await fetch(`${BOT_API_URL}/api/bank-requests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action, processed_by: "admin" }),
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        const typeLabel = req?.type === "deposit" ? "إيداع" : "سحب";
        const amountLabel = req ? `${req.amount} ${req.currency}` : "";
        if (action === "approved") {
          toast.success(`✅ تمت الموافقة على طلب ${typeLabel} ${amountLabel}`, {
            duration: 4000,
          });
        } else {
          toast.error(`❌ تم رفض طلب ${typeLabel} ${amountLabel}`, {
            duration: 4000,
          });
        }
        fetchRequests();
      } else {
        toast.error("فشل تحديث حالة الطلب");
      }
    } catch {
      toast.error("فشل الاتصال بالخادم");
    }
  }

  return (
    <div className="space-y-4">
      {/* Gas Guard Alert */}
      {gasGuard && !gasGuard.safe && (
        <Card className="bg-red-500/10 border-red-500/30 p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-red-400" />
            <div>
              <p className="font-bold text-red-400">تنبيه: رصيد الغاز منخفض!</p>
              <p className="text-sm text-gray-400">
                رصيد TRX: {gasGuard.trx_balance?.toFixed(2)} TRX (الحد الأدنى: {gasGuard.min_required} TRX)
              </p>
              <p className="text-xs text-red-300 mt-1">البوت متوقف مؤقتاً - يرجى إعادة تعبئة محفظة الغاز</p>
            </div>
          </div>
        </Card>
      )}

      <Card className="bg-[#1F2937] border-[#374151] p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-orange-400" />
            <h3 className="text-lg font-bold">طلبات البنوك والمحافظ الإلكترونية</h3>
            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
              {requests.filter((r) => r.status === "pending").length} معلق
            </Badge>
          </div>
          <Button size="sm" variant="outline" onClick={fetchRequests} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Error / Fallback notices */}
        {fetchError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span>{fetchError}</span>
          </div>
        )}
        {usingFallback && !fetchError && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-yellow-400 text-sm">
            ⚠️ يتم عرض البيانات من واجهة الإيداعات/السحوبات (endpoint البنوك غير متاح حالياً)
          </div>
        )}

        {requests.length === 0 && !fetchError ? (
          <div className="text-center py-8 text-gray-500">
            <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>لا توجد طلبات بنكية معلقة</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {requests.map((req) => (
              <div
                key={req.id}
                className={`p-4 rounded-lg border ${
                  req.status === "pending"
                    ? "bg-[#0A0F1C] border-yellow-500/30"
                    : req.status === "approved"
                    ? "bg-green-500/5 border-green-500/20"
                    : "bg-red-500/5 border-red-500/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {req.type === "deposit" ? (
                      <ArrowUpFromLine className="h-4 w-4 text-blue-400" />
                    ) : (
                      <ArrowDownToLine className="h-4 w-4 text-green-400" />
                    )}
                    <div>
                      <p className="font-bold text-sm">
                        {req.type === "deposit" ? "إيداع" : "سحب"}: {req.amount} {req.currency}
                      </p>
                      <p className="text-xs text-gray-500">
                        عبر: {req.payment_method} | {new Date(req.created_at).toLocaleString("ar")}
                      </p>
                      {req.account_info && (
                        <p className="text-xs text-gray-400 mt-1">الحساب: {req.account_info}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {req.status === "pending" ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleAction(req.id, "approved")}
                          className="bg-green-600 hover:bg-green-700 text-white text-xs px-3"
                        >
                          <CheckCircle2 className="h-3 w-3 ml-1" />
                          موافقة
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleAction(req.id, "rejected")}
                          className="bg-red-600 hover:bg-red-700 text-white text-xs px-3"
                        >
                          <XCircle className="h-3 w-3 ml-1" />
                          رفض
                        </Button>
                      </>
                    ) : (
                      <Badge
                        className={
                          req.status === "approved"
                            ? "bg-green-500/20 text-green-400 border-green-500/30"
                            : "bg-red-500/20 text-red-400 border-red-500/30"
                        }
                      >
                        {req.status === "approved" ? "تمت الموافقة" : "مرفوض"}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
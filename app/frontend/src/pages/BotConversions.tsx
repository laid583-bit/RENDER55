import { useState, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Bot,
  RefreshCw,
  ArrowRightLeft,
  Clock,
  TrendingUp,
  Activity,
  Zap,
  CheckCircle2,
  XCircle,
  Settings,
  Shield,
  Hash,
  Search,
} from "lucide-react";
import { isAdminLoggedIn } from "./Admin";



// عنوان خادم API البوت
const BOT_API_URL = import.meta.env.VITE_BOT_API_URL || "https://tbb-jchj.onrender.com";

// أسعار الصرف
const RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 1.08,
  GBP: 1.27,
  DZD: 0.0074,
  TRX: 0.24,
  TTB: 0.00019,
  USDT: 1.0,
  BTC: 67000,
  ETH: 3500,
};

interface BotConversion {
  id: number;
  txid: string;
  from_currency: string;
  to_currency: string;
  amount: number;
  exchange_rate: number | null;
  converted_amount: number | null;
  fee_amount: number | null;
  fee_percentage: number | null;
  net_amount: number | null;
  timestamp: string;
  bot_name: string;
  source: string;
  status: "pending" | "completed" | "rejected";
  processed_at: string | null;
  mode: "auto" | "manual" | null;
  notes: string;
}

interface FeeSetting {
  id: number;
  pair_id: number;
  fee_amount: number;
  fee_percentage: number;
  fee_fixed: number;
  fee_currency: string;
  deposit_currency: string;
}

interface CurrencyPair {
  id: number;
  base_currency: string;
  quote_currency: string;
  pair_name: string;
}

interface BotSettings {
  reverse_conversion: boolean;
  no_repeat_same_pair: boolean;
  execution_order: string;
  cycle_interval: number;
  min_amount: number;
  max_amount: number;
}

export default function BotConversions() {
  const [conversions, setConversions] = useState<BotConversion[]>([]);
  const [loading, setLoading] = useState(true);
  const [botOnline, setBotOnline] = useState(false);
  const [autoMode, setAutoMode] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);
  const [fees, setFees] = useState<FeeSetting[]>([]);
  const [pairs, setPairs] = useState<CurrencyPair[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTxid, setSearchTxid] = useState("");
  const [botSettings, setBotSettings] = useState<BotSettings>({
    reverse_conversion: true,
    no_repeat_same_pair: true,
    execution_order: "sequential",
    cycle_interval: 5,
    min_amount: 10,
    max_amount: 1000,
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    rejected: 0,
    totalVolume: 0,
    totalFees: 0,
  });

  const isAdmin = isAdminLoggedIn();

  // جلب إعدادات الرسوم من localStorage (نفس مصدر لوحة الإدارة)
  const fetchFeeSettings = useCallback(() => {
    try {
      const storedPairs = localStorage.getItem("ttb_currency_pairs");
      if (storedPairs) {
        setPairs(JSON.parse(storedPairs));
      }

      const storedFees = localStorage.getItem("ttb_fee_settings");
      if (storedFees) {
        setFees(JSON.parse(storedFees));
      }
    } catch (err) {
      console.error("Error fetching fee settings:", err);
    }
  }, []);

  // جلب إعدادات البوت
  async function fetchBotSettings() {
    try {
      const response = await fetch(`${BOT_API_URL}/api/bot/settings`);
      if (response.ok) {
        const result = await response.json();
        if (result?.data) {
          setBotSettings(result.data);
        }
      }
    } catch {
      // تجاهل
    }
  }

  // حفظ إعدادات البوت
  async function saveBotSettings() {
    setSavingSettings(true);
    try {
      const response = await fetch(`${BOT_API_URL}/api/bot/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: botSettings }),
      });
      if (response.ok) {
        toast.success("تم حفظ إعدادات البوت بنجاح");
      } else {
        toast.error("خطأ في حفظ الإعدادات");
      }
    } catch {
      toast.error("خطأ في الاتصال بالخادم");
    }
    setSavingSettings(false);
  }

  // مزامنة أزواج العملات مع البوت
  async function syncPairsToBot() {
    try {
      const pairsData = pairs.map((p) => ({
        id: p.id,
        base_currency: p.base_currency,
        quote_currency: p.quote_currency,
        pair_name: p.pair_name,
      }));

      const response = await fetch(`${BOT_API_URL}/api/bot/pairs`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairs: pairsData }),
      });

      if (response.ok) {
        toast.success(`تم مزامنة ${pairsData.length} زوج عملات مع البوت`);
      } else {
        toast.error("خطأ في مزامنة الأزواج");
      }
    } catch {
      toast.error("خطأ في الاتصال بالخادم");
    }
  }

  // حساب الرسوم
  function calculateFees(fromCurrency: string, toCurrency: string, amount: number) {
    const pair = pairs.find(
      (p) =>
        (p.base_currency === fromCurrency && p.quote_currency === toCurrency) ||
        (p.base_currency === toCurrency && p.quote_currency === fromCurrency)
    );

    let feeFixed = 2.0;
    let feePercentage = 0;

    if (pair) {
      const feeSetting = fees.find((f) => f.pair_id === pair.id);
      if (feeSetting) {
        feeFixed = feeSetting.fee_fixed || feeSetting.fee_amount || 2.0;
        feePercentage = feeSetting.fee_percentage || 0;
      }
    }

    const fromRate = RATES[fromCurrency] || 1;
    const toRate = RATES[toCurrency] || 1;
    const exchangeRate = fromRate / toRate;
    const convertedAmount = amount * exchangeRate;

    const percentageFee = (convertedAmount * feePercentage) / 100;
    const totalFee = feeFixed + percentageFee;
    const netAmount = Math.max(convertedAmount - totalFee, 0);

    return {
      exchange_rate: parseFloat(exchangeRate.toFixed(6)),
      converted_amount: parseFloat(convertedAmount.toFixed(4)),
      fee_amount: parseFloat(totalFee.toFixed(4)),
      fee_percentage: feePercentage,
      net_amount: parseFloat(netAmount.toFixed(4)),
    };
  }

  // معالجة تحويل (تنفيذ من الموقع)
  async function processConversion(conv: BotConversion, mode: "auto" | "manual") {
    setProcessing(conv.id);
    try {
      const feeData = calculateFees(conv.from_currency, conv.to_currency, conv.amount);

      const response = await fetch(`${BOT_API_URL}/api/bot/conversions/${conv.id}/process`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...feeData, mode }),
      });

      if (response.ok) {
        toast.success(
          `✅ تم تنفيذ التحويل: ${conv.amount} ${conv.from_currency} → ${feeData.net_amount} ${conv.to_currency} (رسوم: ${feeData.fee_amount})`
        );
        await fetchConversions();
      } else {
        toast.error("خطأ في تنفيذ التحويل");
      }
    } catch {
      toast.error("خطأ في الاتصال بالخادم");
    }
    setProcessing(null);
  }

  // رفض تحويل
  async function rejectConversion(conv: BotConversion) {
    setProcessing(conv.id);
    try {
      const response = await fetch(`${BOT_API_URL}/api/bot/conversions/${conv.id}/reject`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "مرفوض من الإدارة" }),
      });

      if (response.ok) {
        toast.success("تم رفض طلب التحويل");
        await fetchConversions();
      } else {
        toast.error("خطأ في رفض التحويل");
      }
    } catch {
      toast.error("خطأ في الاتصال بالخادم");
    }
    setProcessing(null);
  }

  // معالجة جميع المعلقة
  async function processAllPending() {
    const pending = conversions.filter((c) => c.status === "pending");
    if (pending.length === 0) {
      toast.info("لا توجد طلبات معلقة");
      return;
    }

    for (const conv of pending) {
      await processConversion(conv, "auto");
    }
  }

  // جلب التحويلات
  async function fetchConversions() {
    setLoading(true);
    try {
      const url = statusFilter === "all"
        ? `${BOT_API_URL}/api/bot/conversions?limit=100`
        : `${BOT_API_URL}/api/bot/conversions?limit=100&status=${statusFilter}`;

      const response = await fetch(url);

      if (response.ok) {
        const result = await response.json();
        setBotOnline(true);
        if (result?.data?.items) {
          setConversions(result.data.items);
        }
      } else {
        setBotOnline(false);
      }

      const statsRes = await fetch(`${BOT_API_URL}/api/bot/stats`);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData?.data) {
          setStats(statsData.data);
        }
      }
    } catch {
      setBotOnline(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchFeeSettings();
    fetchConversions();
    fetchBotSettings();
    const interval = setInterval(fetchConversions, 10000);
    return () => clearInterval(interval);
  }, [fetchFeeSettings, statusFilter]);

  // المحول الآلي
  useEffect(() => {
    if (autoMode && conversions.length > 0 && fees.length > 0) {
      const pending = conversions.filter((c) => c.status === "pending");
      if (pending.length > 0) {
        processAllPending();
      }
    }
  }, [autoMode, conversions.length, fees.length]);

  function formatTime(timestamp: string) {
    if (!timestamp) return "—";
    return new Date(timestamp).toLocaleString("ar-DZ", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  function getCurrencyColor(currency: string) {
    const colors: Record<string, string> = {
      USD: "text-green-400",
      EUR: "text-blue-400",
      GBP: "text-purple-400",
      DZD: "text-red-400",
      TRX: "text-rose-400",
      TTB: "text-amber-400",
      USDT: "text-emerald-400",
      BTC: "text-orange-400",
      ETH: "text-indigo-400",
    };
    return colors[currency] || "text-gray-400";
  }

  function getStatusBadge(status: string, mode: string | null) {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-500/10 text-green-400 border-green-500/30 text-xs">
            مكتمل ({mode === "auto" ? "آلي" : "يدوي"})
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-500/10 text-red-400 border-red-500/30 text-xs">
            مرفوض
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/30 text-xs">
            قيد المعالجة
          </Badge>
        );
    }
  }

  // فلترة بـ TXID
  const filteredConversions = searchTxid
    ? conversions.filter((c) => c.txid?.toLowerCase().includes(searchTxid.toLowerCase()))
    : conversions;

  return (
    <div className="min-h-screen bg-[#0A0F1C] text-white" dir="rtl">
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* العنوان */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
              <Bot className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">نظام التحويلات</h1>
              <p className="text-gray-400 text-sm">
                البوت يرسل الطلبات - الموقع ينفذ التحويلات داخل المحافظ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {botOnline ? (
              <Badge className="bg-green-500/10 text-green-400 border-green-500/30">
                <Shield className="w-3 h-3 ml-1" />
                متصل
              </Badge>
            ) : (
              <Badge className="bg-red-500/10 text-red-400 border-red-500/30">
                غير متصل
              </Badge>
            )}
            <Button
              onClick={fetchConversions}
              variant="outline"
              className="border-gray-700 hover:bg-gray-800"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ml-2 ${loading ? "animate-spin" : ""}`} />
              تحديث
            </Button>
          </div>
        </div>

        <Tabs defaultValue="conversions" className="space-y-6">
          <TabsList className="bg-[#1F2937] border border-[#374151]">
            <TabsTrigger
              value="conversions"
              className="data-[state=active]:bg-amber-500 data-[state=active]:text-black"
            >
              <ArrowRightLeft className="h-4 w-4 ml-1" />
              التحويلات
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger
                value="settings"
                className="data-[state=active]:bg-amber-500 data-[state=active]:text-black"
              >
                <Settings className="h-4 w-4 ml-1" />
                إعدادات البوت
              </TabsTrigger>
            )}
          </TabsList>

          {/* تبويب التحويلات */}
          <TabsContent value="conversions" className="space-y-6">
            {/* وضع المعالجة */}
            {isAdmin && (
              <Card className="bg-gradient-to-r from-[#1F2937] to-[#1a2540] border-amber-500/30 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Settings className="w-5 h-5 text-amber-400" />
                    <div>
                      <h3 className="font-bold text-amber-400">وضع تنفيذ التحويلات</h3>
                      <p className="text-gray-400 text-sm mt-1">
                        {autoMode
                          ? "آلي: الموقع ينفذ التحويلات تلقائياً عند استقبال الطلبات"
                          : "يدوي: الأدمن يوافق على كل تحويل قبل التنفيذ"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Label htmlFor="auto-mode" className="text-sm text-gray-300">
                      {autoMode ? "آلي ⚡" : "يدوي 🖐️"}
                    </Label>
                    <Switch
                      id="auto-mode"
                      checked={autoMode}
                      onCheckedChange={setAutoMode}
                      className="data-[state=checked]:bg-amber-500"
                    />
                  </div>
                </div>

                {!autoMode && (
                  <div className="mt-4 flex items-center gap-3">
                    <Button
                      onClick={processAllPending}
                      className="bg-green-600 hover:bg-green-700 text-white font-bold"
                      disabled={conversions.filter((c) => c.status === "pending").length === 0}
                    >
                      <CheckCircle2 className="w-4 h-4 ml-2" />
                      تنفيذ جميع المعلقة ({conversions.filter((c) => c.status === "pending").length})
                    </Button>
                  </div>
                )}
              </Card>
            )}

            {/* الإحصائيات */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card className="bg-[#1F2937] border-gray-700 p-4">
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-gray-400 text-xs">إجمالي</p>
                    <p className="text-xl font-bold text-white">{stats.total}</p>
                  </div>
                </div>
              </Card>

              <Card className="bg-[#1F2937] border-yellow-500/30 p-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-yellow-400" />
                  <div>
                    <p className="text-yellow-400 text-xs">قيد المعالجة</p>
                    <p className="text-xl font-bold text-yellow-400">{stats.pending}</p>
                  </div>
                </div>
              </Card>

              <Card className="bg-[#1F2937] border-green-500/30 p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="text-green-400 text-xs">مكتمل</p>
                    <p className="text-xl font-bold text-green-400">{stats.completed}</p>
                  </div>
                </div>
              </Card>

              <Card className="bg-[#1F2937] border-gray-700 p-4">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="text-gray-400 text-xs">حجم التحويلات</p>
                    <p className="text-xl font-bold text-white">
                      ${stats.totalVolume.toFixed(2)}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="bg-[#1F2937] border-gray-700 p-4">
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-amber-400" />
                  <div>
                    <p className="text-gray-400 text-xs">الرسوم المحصلة</p>
                    <p className="text-xl font-bold text-amber-400">
                      ${stats.totalFees.toFixed(2)}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* فلاتر */}
            <Card className="bg-[#1F2937] border-[#374151] p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    value={searchTxid}
                    onChange={(e) => setSearchTxid(e.target.value)}
                    placeholder="بحث بـ TXID..."
                    className="bg-[#111827] border-[#374151] text-white pr-10 font-mono"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40 bg-[#111827] border-[#374151] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1F2937] border-[#374151]">
                    <SelectItem value="all" className="text-white">الكل</SelectItem>
                    <SelectItem value="pending" className="text-white">قيد المعالجة</SelectItem>
                    <SelectItem value="completed" className="text-white">مكتمل</SelectItem>
                    <SelectItem value="rejected" className="text-white">مرفوض</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Card>

            {/* جدول التحويلات */}
            <Card className="bg-[#1F2937] border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-700">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-amber-400" />
                  سجل التحويلات ({filteredConversions.length})
                </h2>
              </div>

              {loading && conversions.length === 0 ? (
                <div className="p-12 text-center">
                  <RefreshCw className="w-8 h-8 text-gray-500 animate-spin mx-auto mb-3" />
                  <p className="text-gray-400">جاري التحميل...</p>
                </div>
              ) : filteredConversions.length === 0 ? (
                <div className="p-12 text-center">
                  <Bot className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 text-lg mb-2">لا توجد طلبات تحويل</p>
                  <p className="text-gray-500 text-sm">
                    ستظهر الطلبات هنا عندما يبدأ البوت بالعمل
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#0A0F1C]/50">
                      <tr className="text-gray-400 text-sm">
                        <th className="text-right p-3">TXID</th>
                        <th className="text-right p-3">الزوج</th>
                        <th className="text-right p-3">المبلغ</th>
                        <th className="text-right p-3">الناتج</th>
                        <th className="text-right p-3">الرسوم</th>
                        <th className="text-right p-3">الصافي</th>
                        <th className="text-right p-3">الوقت</th>
                        <th className="text-right p-3">الحالة</th>
                        {isAdmin && !autoMode && <th className="text-right p-3">إجراء</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredConversions.map((conv) => (
                        <tr
                          key={conv.id}
                          className="border-t border-gray-700/50 hover:bg-[#0A0F1C]/30 transition-colors"
                        >
                          <td className="p-3">
                            <div className="flex items-center gap-1">
                              <Hash className="w-3 h-3 text-gray-500" />
                              <span className="font-mono text-xs text-gray-300">
                                {conv.txid?.slice(0, 12) || "—"}
                              </span>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1">
                              <span className={`font-medium ${getCurrencyColor(conv.from_currency)}`}>
                                {conv.from_currency}
                              </span>
                              <ArrowRightLeft className="w-3 h-3 text-gray-500" />
                              <span className={`font-medium ${getCurrencyColor(conv.to_currency)}`}>
                                {conv.to_currency}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 font-mono text-sm">
                            {conv.amount?.toFixed(2)}
                          </td>
                          <td className="p-3 font-mono text-sm">
                            {conv.converted_amount != null
                              ? conv.converted_amount.toFixed(4)
                              : "—"}
                          </td>
                          <td className="p-3 font-mono text-sm text-red-400">
                            {conv.fee_amount != null
                              ? `$${conv.fee_amount.toFixed(2)}`
                              : "—"}
                          </td>
                          <td className="p-3 font-mono text-sm text-green-400">
                            {conv.net_amount != null
                              ? conv.net_amount.toFixed(4)
                              : "—"}
                          </td>
                          <td className="p-3 text-xs text-gray-400">
                            {formatTime(conv.timestamp)}
                          </td>
                          <td className="p-3">
                            {getStatusBadge(conv.status, conv.mode)}
                          </td>
                          {isAdmin && !autoMode && (
                            <td className="p-3">
                              {conv.status === "pending" && (
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="sm"
                                    onClick={() => processConversion(conv, "manual")}
                                    disabled={processing === conv.id}
                                    className="bg-green-600 hover:bg-green-700 text-white text-xs h-7 px-2"
                                  >
                                    {processing === conv.id ? (
                                      <RefreshCw className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <CheckCircle2 className="h-3 w-3" />
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => rejectConversion(conv)}
                                    disabled={processing === conv.id}
                                    className="border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs h-7 px-2"
                                  >
                                    <XCircle className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* تبويب إعدادات البوت */}
          {isAdmin && (
            <TabsContent value="settings" className="space-y-6">
              <Card className="bg-[#1F2937] border-[#374151] p-6">
                <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-amber-400" />
                  إعدادات دورة التحويل
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* دورة التحويل */}
                  <div className="space-y-2">
                    <Label className="text-gray-300">دورة التحويل (ثوانٍ)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={botSettings.cycle_interval}
                      onChange={(e) =>
                        setBotSettings({ ...botSettings, cycle_interval: parseInt(e.target.value) || 5 })
                      }
                      className="bg-[#111827] border-[#374151] text-white font-mono"
                    />
                    <p className="text-gray-500 text-xs">الفاصل الزمني بين كل طلب تحويل</p>
                  </div>

                  {/* نطاق المبالغ */}
                  <div className="space-y-2">
                    <Label className="text-gray-300">نطاق المبالغ</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        value={botSettings.min_amount}
                        onChange={(e) =>
                          setBotSettings({ ...botSettings, min_amount: parseFloat(e.target.value) || 10 })
                        }
                        className="bg-[#111827] border-[#374151] text-white font-mono"
                        placeholder="الحد الأدنى"
                      />
                      <span className="text-gray-500">—</span>
                      <Input
                        type="number"
                        min="1"
                        value={botSettings.max_amount}
                        onChange={(e) =>
                          setBotSettings({ ...botSettings, max_amount: parseFloat(e.target.value) || 1000 })
                        }
                        className="bg-[#111827] border-[#374151] text-white font-mono"
                        placeholder="الحد الأقصى"
                      />
                    </div>
                  </div>

                  {/* ترتيب التنفيذ */}
                  <div className="space-y-2">
                    <Label className="text-gray-300">ترتيب التنفيذ</Label>
                    <Select
                      value={botSettings.execution_order}
                      onValueChange={(v) => setBotSettings({ ...botSettings, execution_order: v })}
                    >
                      <SelectTrigger className="bg-[#111827] border-[#374151] text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1F2937] border-[#374151]">
                        <SelectItem value="sequential" className="text-white">تسلسلي</SelectItem>
                        <SelectItem value="random" className="text-white">عشوائي</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* التحويل العكسي */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-gray-300">التحويل العكسي</Label>
                      <Switch
                        checked={botSettings.reverse_conversion}
                        onCheckedChange={(v) => setBotSettings({ ...botSettings, reverse_conversion: v })}
                        className="data-[state=checked]:bg-amber-500"
                      />
                    </div>
                    <p className="text-gray-500 text-xs">
                      دعم التحويل في الاتجاهين (مثل TRX ⇄ USDT)
                    </p>
                  </div>

                  {/* عدم تكرار نفس الزوج */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-gray-300">عدم تكرار نفس الزوج</Label>
                      <Switch
                        checked={botSettings.no_repeat_same_pair}
                        onCheckedChange={(v) => setBotSettings({ ...botSettings, no_repeat_same_pair: v })}
                        className="data-[state=checked]:bg-amber-500"
                      />
                    </div>
                    <p className="text-gray-500 text-xs">
                      لا يتم تكرار نفس الزوج في دورتين متتاليتين
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-8 pt-6 border-t border-[#374151]">
                  <Button
                    onClick={saveBotSettings}
                    disabled={savingSettings}
                    className="bg-amber-500 hover:bg-amber-600 text-black font-bold"
                  >
                    {savingSettings ? (
                      <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
                    ) : (
                      <Settings className="h-4 w-4 ml-2" />
                    )}
                    حفظ الإعدادات
                  </Button>
                  <Button
                    onClick={syncPairsToBot}
                    variant="outline"
                    className="border-[#374151] text-gray-300 hover:text-white hover:bg-[#374151]"
                  >
                    <RefreshCw className="h-4 w-4 ml-2" />
                    مزامنة الأزواج مع البوت
                  </Button>
                </div>
              </Card>

              {/* معلومات الأمان */}
              <Card className="bg-[#1F2937] border-green-500/30 p-6">
                <h3 className="font-bold text-green-400 mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  الأمان
                </h3>
                <div className="space-y-3 text-sm text-gray-300">
                  <p>🔒 الاتصال بين البوت والموقع مؤمن بـ API Key</p>
                  <p>🚫 البوت لا يحتفظ بالمفاتيح الخاصة ولا ينفذ التحويل بنفسه</p>
                  <p>✅ الموقع هو الوحيد الذي ينفذ التحويلات داخل المحافظ</p>
                  <p>📝 جميع العمليات محفوظة مع رقم العملية (TXID) وسجلات كاملة</p>
                  <p>👁️ يمكن للمستخدم متابعة حالة طلبه (قيد المعالجة / مكتمل / مرفوض)</p>
                </div>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
}
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  DollarSign,
  ArrowUpDown,
  RefreshCw,
  Wallet,
  ArrowRight,
  BarChart3,
} from "lucide-react";
import { isAdminLoggedIn } from "./Admin";

const BOT_API_URL = import.meta.env.VITE_BOT_API_URL || "https://tbb-jchj.onrender.com";

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
  status: string;
  mode: string | null;
  timestamp: string;
  processed_at: string | null;
  // Dynamic profit fields
  target_spread_applied: number | null;
  admin_gas_fee_applied: number | null;
  gas_profit: number | null;
  total_pure_profit: number | null;
  liquidity_amount: number | null;
  actual_energy_cost: number | null;
}

interface ProfitSummary {
  totalProfit: number;
  totalFees: number;
  totalConversions: number;
  totalVolume: number;
  profitByCurrency: Record<string, number>;
  recentProfits: { date: string; profit: number; count: number }[];
}

export default function ProfitsPage() {
  const [conversions, setConversions] = useState<BotConversion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<ProfitSummary>({
    totalProfit: 0,
    totalFees: 0,
    totalConversions: 0,
    totalVolume: 0,
    profitByCurrency: {},
    recentProfits: [],
  });

  const isAdmin = isAdminLoggedIn();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      // Fetch completed conversions from bot API
      const [conversionsRes, statsRes] = await Promise.all([
        fetch(`${BOT_API_URL}/api/bot/conversions?status=completed&limit=100`),
        fetch(`${BOT_API_URL}/api/bot/stats`),
      ]);

      let completedItems: BotConversion[] = [];
      let statsData: any = null;

      if (conversionsRes.ok) {
        const result = await conversionsRes.json();
        if (result?.success && result?.data?.items) {
          completedItems = result.data.items;
        }
      }

      if (statsRes.ok) {
        const result = await statsRes.json();
        if (result?.success && result?.data) {
          statsData = result.data;
        }
      }

      setConversions(completedItems);
      calculateSummary(completedItems, statsData);
    } catch (err) {
      console.error("Error fetching profits data:", err);
    }
    setLoading(false);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }

  function calculateSummary(items: BotConversion[], statsData: any) {
    let totalFees = 0;
    let totalVolume = 0;
    const profitByCurrency: Record<string, number> = {};
    const dailyProfits: Record<string, { profit: number; count: number }> = {};

    items.forEach((conv) => {
      // Use total_pure_profit (dynamic) if available, fallback to fee_amount
      const profit = conv.total_pure_profit ?? conv.fee_amount ?? 0;
      totalFees += profit;
      totalVolume += conv.amount || 0;

      // Group profits by target currency
      const curr = conv.to_currency || "USD";
      profitByCurrency[curr] = (profitByCurrency[curr] || 0) + profit;

      // Daily profits
      const date = conv.processed_at
        ? new Date(conv.processed_at).toLocaleDateString("ar-SA")
        : conv.timestamp
        ? new Date(conv.timestamp).toLocaleDateString("ar-SA")
        : "غير محدد";
      if (!dailyProfits[date]) {
        dailyProfits[date] = { profit: 0, count: 0 };
      }
      dailyProfits[date].profit += profit;
      dailyProfits[date].count += 1;
    });

    const recentProfits = Object.entries(dailyProfits)
      .map(([date, data]) => ({ date, profit: data.profit, count: data.count }))
      .slice(0, 7);

    // Use stats from API if available (more accurate)
    const finalTotalFees = statsData?.totalFees ?? totalFees;
    const finalTotalVolume = statsData?.totalVolume ?? totalVolume;
    const finalTotalConversions = statsData?.completed ?? items.length;

    setSummary({
      totalProfit: finalTotalFees,
      totalFees: finalTotalFees,
      totalConversions: finalTotalConversions,
      totalVolume: finalTotalVolume,
      profitByCurrency,
      recentProfits,
    });
  }

  if (!isAdmin && !loading) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] text-white" dir="rtl">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <BarChart3 className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">تتبع الأرباح</h2>
          <p className="text-gray-400 mb-6">يرجى تسجيل الدخول كمسؤول لعرض الأرباح</p>
          <Link to="/">
            <Button className="bg-amber-500 hover:bg-amber-600 text-black font-bold">
              تسجيل الدخول
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] text-white" dir="rtl">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <RefreshCw className="h-10 w-10 text-amber-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-400">جاري تحميل بيانات الأرباح...</p>
        </div>
      </div>
    );
  }

  // Find max profit for bar chart scaling
  const maxProfit = Math.max(
    ...summary.recentProfits.map((p) => p.profit),
    1
  );

  return (
    <div className="min-h-screen bg-[#0A0F1C] text-white" dir="rtl">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">لوحة الأرباح</h1>
            <p className="text-gray-400 text-sm mt-1">
              ملخص أرباحك من عمليات التحويل عبر البوت
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={handleRefresh}
              variant="outline"
              className="border-[#374151] text-gray-300 hover:bg-[#374151]"
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ml-2 ${refreshing ? "animate-spin" : ""}`} />
              تحديث
            </Button>
            <Link to="/withdraw">
              <Button className="bg-green-600 hover:bg-green-700 text-white font-bold">
                <Wallet className="h-4 w-4 ml-2" />
                سحب الأرباح
              </Button>
            </Link>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-[#1F2937] border-[#374151] p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <p className="text-gray-400 text-xs">إجمالي الأرباح</p>
                <p className="text-2xl font-bold text-green-400 font-mono">
                  ${summary.totalProfit.toFixed(2)}
                </p>
              </div>
            </div>
          </Card>

          <Card className="bg-[#1F2937] border-[#374151] p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-amber-400" />
              </div>
              <div>
                <p className="text-gray-400 text-xs">إجمالي الرسوم المحصلة</p>
                <p className="text-2xl font-bold text-amber-400 font-mono">
                  ${summary.totalFees.toFixed(2)}
                </p>
              </div>
            </div>
          </Card>

          <Card className="bg-[#1F2937] border-[#374151] p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <ArrowUpDown className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <p className="text-gray-400 text-xs">عدد التحويلات المكتملة</p>
                <p className="text-2xl font-bold text-blue-400 font-mono">
                  {summary.totalConversions}
                </p>
              </div>
            </div>
          </Card>

          <Card className="bg-[#1F2937] border-[#374151] p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <p className="text-gray-400 text-xs">إجمالي حجم التداول</p>
                <p className="text-2xl font-bold text-purple-400 font-mono">
                  ${summary.totalVolume.toFixed(2)}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Profit Chart */}
          <div className="lg:col-span-2">
            <Card className="bg-[#1F2937] border-[#374151] p-6">
              <h2 className="font-bold text-lg mb-6 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-amber-400" />
                الأرباح اليومية
              </h2>
              {summary.recentProfits.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <TrendingUp className="h-10 w-10 mx-auto mb-3 text-gray-600" />
                  <p>لا توجد أرباح بعد</p>
                  <p className="text-sm mt-1">
                    سيتم عرض الأرباح بعد اكتمال تحويلات البوت
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {summary.recentProfits.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-4">
                      <span className="text-gray-400 text-xs w-28 text-left font-mono">
                        {item.date}
                      </span>
                      <div className="flex-1 bg-[#111827] rounded-full h-8 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-amber-500 to-amber-600 h-full rounded-full flex items-center justify-end px-3 transition-all duration-500"
                          style={{
                            width: `${Math.max(
                              (item.profit / maxProfit) * 100,
                              10
                            )}%`,
                          }}
                        >
                          <span className="text-xs font-bold text-black">
                            ${item.profit.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <span className="text-gray-500 text-xs w-16 text-center">
                        {item.count} تحويل
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Recent Completed Conversions */}
            <Card className="bg-[#1F2937] border-[#374151] p-6 mt-6">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                <ArrowUpDown className="h-5 w-5 text-blue-400" />
                آخر التحويلات المكتملة ({conversions.length})
              </h2>
              {conversions.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <ArrowUpDown className="h-10 w-10 mx-auto mb-3 text-gray-600" />
                  <p>لا توجد تحويلات مكتملة بعد</p>
                  <p className="text-sm mt-1">ستظهر هنا بعد معالجة طلبات البوت</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {conversions.slice(0, 20).map((conv) => (
                    <div
                      key={conv.id}
                      className="bg-[#111827] rounded-xl p-4 border border-[#374151]"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                            <ArrowUpDown className="h-4 w-4 text-blue-400" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm">
                              {conv.from_currency} → {conv.to_currency}
                            </p>
                            <p className="text-xs text-gray-400">
                              {conv.amount?.toFixed(2)} {conv.from_currency} → {conv.converted_amount?.toFixed(4) || "—"} {conv.to_currency}
                            </p>
                            <p className="text-xs text-gray-500 font-mono">
                              {conv.txid}
                            </p>
                          </div>
                        </div>
                        <div className="text-left">
                          <p className="text-green-400 font-mono font-bold text-sm">
                            +${(conv.total_pure_profit || conv.fee_amount || 0).toFixed(2)}
                          </p>
                          <Badge className="text-[10px] bg-green-500/10 text-green-400 border-green-500/30">
                            {conv.mode === "auto" ? "آلي" : "يدوي"}
                          </Badge>
                          <p className="text-xs text-gray-500 mt-1">
                            {conv.processed_at
                              ? new Date(conv.processed_at).toLocaleDateString("ar-SA")
                              : conv.timestamp
                              ? new Date(conv.timestamp).toLocaleDateString("ar-SA")
                              : "-"}
                          </p>
                        </div>
                      </div>
                      {/* Profit Breakdown */}
                      {conv.target_spread_applied != null && (
                        <div className="mt-2 pt-2 border-t border-[#374151] grid grid-cols-3 gap-2 text-xs">
                          <div className="text-center">
                            <p className="text-gray-500">هامش الربح</p>
                            <p className="text-amber-400 font-mono font-bold">
                              {conv.target_spread_applied} نقطة
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-gray-500">ربح الغاز</p>
                            <p className="text-green-400 font-mono font-bold">
                              ${(conv.gas_profit || 0).toFixed(2)}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-gray-500">السيولة</p>
                            <p className="text-blue-400 font-mono font-bold">
                              ${(conv.liquidity_amount || 0).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Profit by Currency */}
          <div>
            <Card className="bg-[#1F2937] border-[#374151] p-6">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-400" />
                الأرباح حسب العملة
              </h2>
              {Object.keys(summary.profitByCurrency).length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <DollarSign className="h-10 w-10 mx-auto mb-3 text-gray-600" />
                  <p className="text-sm">لا توجد أرباح بعد</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(summary.profitByCurrency)
                    .sort(([, a], [, b]) => b - a)
                    .map(([currency, profit]) => (
                      <div
                        key={currency}
                        className="flex items-center justify-between bg-[#111827] rounded-xl p-4 border border-[#374151]"
                      >
                        <div className="flex items-center gap-3">
                          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                            {currency}
                          </Badge>
                        </div>
                        <p className="font-mono font-bold text-green-400">
                          ${profit.toFixed(2)}
                        </p>
                      </div>
                    ))}
                </div>
              )}
            </Card>

            {/* Stats Card */}
            <Card className="bg-[#1F2937] border-[#374151] p-6 mt-6">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-400" />
                إحصائيات
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">متوسط الربح / تحويل</span>
                  <span className="font-mono font-bold text-green-400">
                    ${summary.totalConversions > 0
                      ? (summary.totalProfit / summary.totalConversions).toFixed(2)
                      : "0.00"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">متوسط حجم التحويل</span>
                  <span className="font-mono font-bold text-blue-400">
                    ${summary.totalConversions > 0
                      ? (summary.totalVolume / summary.totalConversions).toFixed(2)
                      : "0.00"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">نسبة الربح من الحجم</span>
                  <span className="font-mono font-bold text-amber-400">
                    {summary.totalVolume > 0
                      ? ((summary.totalProfit / summary.totalVolume) * 100).toFixed(2)
                      : "0.00"}%
                  </span>
                </div>
              </div>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-[#1F2937] border-[#374151] p-6 mt-6">
              <h2 className="font-bold text-lg mb-4">إجراءات سريعة</h2>
              <div className="space-y-3">
                <Link to="/bot-conversions" className="block">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold justify-between">
                    إدارة تحويلات البوت
                    <ArrowRight className="h-4 w-4 rotate-180" />
                  </Button>
                </Link>
                <Link to="/withdraw" className="block">
                  <Button className="w-full bg-green-600 hover:bg-green-700 text-white font-bold justify-between">
                    سحب الأرباح
                    <ArrowRight className="h-4 w-4 rotate-180" />
                  </Button>
                </Link>
                <Link to="/converter" className="block">
                  <Button
                    variant="outline"
                    className="w-full border-amber-500/50 text-amber-400 hover:bg-amber-500/10 font-bold justify-between"
                  >
                    تحويل عملات
                    <ArrowRight className="h-4 w-4 rotate-180" />
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
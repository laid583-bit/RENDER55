import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createClient } from "@metagptx/web-sdk";
import Header from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowUpDown,
  RefreshCw,
  Wallet,
  ArrowRight,
  BarChart3,
} from "lucide-react";

const client = createClient();

interface ConversionRecord {
  id: number;
  from_currency: string;
  to_currency: string;
  from_amount: number;
  to_amount: number;
  exchange_rate: number;
  fee_amount: number;
  fee_currency: string;
  status: string;
  created_at: string;
}

interface ProfitSummary {
  totalProfit: number;
  totalFees: number;
  totalConversions: number;
  profitByCurrency: Record<string, number>;
  recentProfits: { date: string; profit: number }[];
}

export default function ProfitsPage() {
  const [user, setUser] = useState<any>(null);
  const [conversions, setConversions] = useState<ConversionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ProfitSummary>({
    totalProfit: 0,
    totalFees: 0,
    totalConversions: 0,
    profitByCurrency: {},
    recentProfits: [],
  });

  useEffect(() => {
    const init = async () => {
      try {
        const res = await client.auth.me();
        if (res?.data) {
          setUser(res.data);
          await fetchConversions();
        }
      } catch {
        setUser(null);
      }
      setLoading(false);
    };
    init();
  }, []);

  const fetchConversions = async () => {
    try {
      const response = await client.entities.conversions.query({
        query: { status: "completed" },
        sort: "-created_at",
        limit: 100,
      });
      if (response?.data?.items) {
        const items = response.data.items;
        setConversions(items);
        calculateSummary(items);
      }
    } catch (err) {
      console.error("Error fetching conversions:", err);
    }
  };

  const calculateSummary = (items: ConversionRecord[]) => {
    let totalFees = 0;
    const profitByCurrency: Record<string, number> = {};
    const dailyProfits: Record<string, number> = {};

    items.forEach((conv) => {
      const fee = conv.fee_amount || 0;
      totalFees += fee;

      const curr = conv.fee_currency || "USD";
      profitByCurrency[curr] = (profitByCurrency[curr] || 0) + fee;

      const date = conv.created_at
        ? new Date(conv.created_at).toLocaleDateString("ar-SA")
        : "غير محدد";
      dailyProfits[date] = (dailyProfits[date] || 0) + fee;
    });

    const recentProfits = Object.entries(dailyProfits)
      .map(([date, profit]) => ({ date, profit }))
      .slice(0, 7);

    setSummary({
      totalProfit: totalFees,
      totalFees,
      totalConversions: items.length,
      profitByCurrency,
      recentProfits,
    });
  };

  if (!user && !loading) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] text-white" dir="rtl">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <BarChart3 className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">تتبع الأرباح</h2>
          <p className="text-gray-400 mb-6">يرجى تسجيل الدخول لعرض الأرباح</p>
          <Button
            onClick={() => client.auth.toLogin()}
            className="bg-amber-500 hover:bg-amber-600 text-black font-bold"
          >
            تسجيل الدخول
          </Button>
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
              ملخص أرباحك من عمليات التحويل
            </p>
          </div>
          <Link to="/withdraw">
            <Button className="bg-green-600 hover:bg-green-700 text-white font-bold">
              <Wallet className="h-4 w-4 ml-2" />
              سحب الأرباح
            </Button>
          </Link>
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
                <p className="text-gray-400 text-xs">عدد التحويلات</p>
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
                <p className="text-gray-400 text-xs">متوسط الربح / تحويل</p>
                <p className="text-2xl font-bold text-purple-400 font-mono">
                  $
                  {summary.totalConversions > 0
                    ? (
                        summary.totalProfit / summary.totalConversions
                      ).toFixed(2)
                    : "0.00"}
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
                    ابدأ بإجراء تحويلات لتحقيق الأرباح
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {summary.recentProfits.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-4">
                      <span className="text-gray-400 text-xs w-24 text-left font-mono">
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
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Recent Conversions */}
            <Card className="bg-[#1F2937] border-[#374151] p-6 mt-6">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                <ArrowUpDown className="h-5 w-5 text-blue-400" />
                آخر التحويلات
              </h2>
              {conversions.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p>لا توجد تحويلات بعد</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {conversions.slice(0, 20).map((conv) => (
                    <div
                      key={conv.id}
                      className="flex items-center justify-between bg-[#111827] rounded-xl p-3 border border-[#374151]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                          <ArrowUpDown className="h-4 w-4 text-blue-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">
                            {conv.from_currency} → {conv.to_currency}
                          </p>
                          <p className="text-xs text-gray-400">
                            {conv.from_amount.toFixed(2)} →{" "}
                            {conv.to_amount.toFixed(4)}
                          </p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="text-green-400 font-mono font-bold text-sm">
                          +${(conv.fee_amount || 0).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {conv.created_at
                            ? new Date(conv.created_at).toLocaleDateString(
                                "ar-SA"
                              )
                            : "-"}
                        </p>
                      </div>
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
                  {Object.entries(summary.profitByCurrency).map(
                    ([currency, profit]) => (
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
                    )
                  )}
                </div>
              )}
            </Card>

            {/* Quick Actions */}
            <Card className="bg-[#1F2937] border-[#374151] p-6 mt-6">
              <h2 className="font-bold text-lg mb-4">إجراءات سريعة</h2>
              <div className="space-y-3">
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
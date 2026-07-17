import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createClient } from "@metagptx/web-sdk";
import Header from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ArrowRight,
  Shield,
  Zap,
  Globe,
  Wallet,
} from "lucide-react";

const client = createClient();

interface RateItem {
  pair_id: number;
  pair_name: string;
  base_currency: string;
  quote_currency: string;
  mid_rate: number;
  buy_price: number;
  sell_price: number;
  spread: number;
  is_live: boolean;
}

const CURRENCY_FLAGS: Record<string, string> = {
  XAU: "🥇",
  USD: "🇺🇸",
  EUR: "🇪🇺",
  GBP: "🇬🇧",
  JPY: "🇯🇵",
  NZD: "🇳🇿",
  BTC: "₿",
};

// All electronic banks with logos
const PAYMENT_GATEWAYS = [
  {
    name: "PayPal",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/PayPal.svg/124px-PayPal.svg.png",
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
  {
    name: "Payeer",
    logo: "https://payeer.com/bitrix/templates/developer/img/logo.svg",
    color: "bg-teal-500/20 text-teal-400 border-teal-500/30",
  },
  {
    name: "Perfect Money",
    logo: "https://perfectmoney.com/img/logo-perfectmoney.svg",
    color: "bg-red-500/20 text-red-400 border-red-500/30",
  },
  {
    name: "USDT",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Tether_Logo.svg/128px-Tether_Logo.svg.png",
    color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  },
  {
    name: "WebMoney",
    logo: "https://www.webmoney.ru/img/wmlogo_blue.svg",
    color: "bg-blue-600/20 text-blue-300 border-blue-600/30",
  },
  {
    name: "Skrill",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Skrill_logo.svg/200px-Skrill_logo.svg.png",
    color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  },
  {
    name: "Neteller",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Neteller_logo.svg/200px-Neteller_logo.svg.png",
    color: "bg-green-500/20 text-green-400 border-green-500/30",
  },
  {
    name: "Bitcoin",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Bitcoin.svg/128px-Bitcoin.svg.png",
    color: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  },
  {
    name: "Ethereum",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Ethereum_logo_2014.svg/128px-Ethereum_logo_2014.svg.png",
    color: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  },
  {
    name: "Binance Pay",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Binance_Logo.svg/128px-Binance_Logo.svg.png",
    color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  },
  {
    name: "Stripe",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Stripe_Logo%2C_revised_2016.svg/200px-Stripe_Logo%2C_revised_2016.svg.png",
    color: "bg-purple-600/20 text-purple-300 border-purple-600/30",
  },
  {
    name: "Western Union",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/Western_Union_Logo_2019.svg/200px-Western_Union_Logo_2019.svg.png",
    color: "bg-yellow-600/20 text-yellow-300 border-yellow-600/30",
  },
  {
    name: "AdvCash",
    logo: "https://advcash.com/assets/img/logo.svg",
    color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  },
  {
    name: "RedotPay",
    logo: "",
    color: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  },
  {
    name: "حوالة بنكية",
    logo: "",
    color:
      "bg-emerald-600/20 text-emerald-300 border-emerald-600/30",
  },
];

export default function HomePage() {
  const [rates, setRates] = useState<RateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState("");

  const fetchRates = async () => {
    setLoading(true);
    try {
      const response = await client.apiCall.invoke({
        url: "/api/v1/rates/live",
        method: "GET",
        data: {},
      });
      if (response?.data?.rates) {
        setRates(response.data.rates);
        setLastUpdate(new Date().toLocaleTimeString("ar-SA"));
      }
    } catch (error) {
      console.error("Error fetching rates:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
    const interval = setInterval(fetchRates, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatPrice = (price: number, pair: string) => {
    if (pair.includes("BTC")) return price.toFixed(8);
    if (pair.includes("JPY")) return price.toFixed(3);
    if (pair.includes("XAU")) return price.toFixed(2);
    return price.toFixed(5);
  };

  return (
    <div className="min-h-screen bg-[#0A0F1C] text-white" dir="rtl">
      <Header />

      {/* Hero Section */}
      <section
        className="relative overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(10,15,28,0.7), rgba(10,15,28,0.95)), url(https://mgx-backend-cdn.metadl.com/generate/images/944362/2026-03-23/2b2fa977-4aa8-4389-9b0d-35004b620c24.png)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute top-20 right-20 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-10 left-10 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 relative z-10">
          <div className="text-center space-y-6">
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-sm px-4 py-1">
              ⚡ موقع شخصي - أسعار حية من السوق العالمي
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight">
              <span className="bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 bg-clip-text text-transparent">
                TTB Exchange
              </span>
              <br />
              <span className="text-2xl md:text-3xl text-gray-300 font-normal mt-2 block">
                منصة تحويل العملات الشخصية
              </span>
            </h1>
            <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">
              أسعار صرف حية مع رسوم ثابتة ومحول آلي متقدم (Expert) - تحويل فوري
              بين العملات العالمية والذهب والبيتكوين
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/converter">
                <Button className="bg-amber-500 hover:bg-amber-600 text-black font-bold px-8 py-3 text-lg shadow-lg shadow-amber-500/20 transition-all hover:shadow-amber-500/40">
                  ابدأ التحويل{" "}
                  <ArrowRight className="mr-2 h-5 w-5 rotate-180" />
                </Button>
              </Link>
              <Link to="/converter?mode=expert">
                <Button
                  variant="outline"
                  className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10 font-bold px-8 py-3 text-lg"
                >
                  <Zap className="ml-2 h-5 w-5" />
                  المحول الآلي Expert
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto mt-8">
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-400">
                  {rates.length || 8}+
                </p>
                <p className="text-xs text-gray-500">أزواج العملات</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-400">
                  {PAYMENT_GATEWAYS.length}
                </p>
                <p className="text-xs text-gray-500">بنك إلكتروني</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-400">24/7</p>
                <p className="text-xs text-gray-500">خدمة مستمرة</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Rates Ticker */}
      {rates.length > 0 && (
        <div className="bg-[#111827] border-y border-[#374151] overflow-hidden">
          <div className="animate-marquee whitespace-nowrap py-3 flex gap-8 items-center">
            {[...rates, ...rates].map((rate, idx) => (
              <div
                key={idx}
                className="inline-flex items-center gap-2 text-sm"
              >
                <span className="text-lg">
                  {CURRENCY_FLAGS[rate.base_currency] || "💰"}
                </span>
                <span className="text-gray-400">{rate.pair_name}</span>
                <span className="text-white font-mono font-semibold">
                  {formatPrice(rate.mid_rate, rate.pair_name)}
                </span>
                <span
                  className={
                    rate.is_live
                      ? "text-green-400 text-xs"
                      : "text-yellow-400 text-xs"
                  }
                >
                  {rate.is_live ? "▲ حي" : "~ تقريبي"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rates Table */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold">أسعار العملات الحية</h2>
            <p className="text-gray-400 text-sm mt-1">
              {lastUpdate && `آخر تحديث: ${lastUpdate}`}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={fetchRates}
            disabled={loading}
            className="border-[#374151] text-gray-300 hover:text-white hover:bg-[#1F2937]"
          >
            <RefreshCw
              className={`h-4 w-4 ml-2 ${loading ? "animate-spin" : ""}`}
            />
            تحديث
          </Button>
        </div>

        <div className="grid gap-4">
          {/* Table Header */}
          <div className="hidden md:grid grid-cols-6 gap-4 px-6 py-3 text-sm text-gray-400 font-medium">
            <div>زوج العملات</div>
            <div className="text-center">سعر الشراء</div>
            <div className="text-center">سعر البيع</div>
            <div className="text-center">السعر الوسيط</div>
            <div className="text-center">الحالة</div>
            <div className="text-center">إجراء</div>
          </div>

          {loading && rates.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
              جاري تحميل الأسعار...
            </div>
          ) : (
            rates.map((rate) => (
              <Card
                key={rate.pair_id}
                className="bg-[#1F2937] border-[#374151] hover:border-amber-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/5"
              >
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4 p-4 md:px-6 items-center">
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-1 rtl:space-x-reverse">
                      <span className="text-2xl">
                        {CURRENCY_FLAGS[rate.base_currency] || "💰"}
                      </span>
                      <span className="text-2xl">
                        {CURRENCY_FLAGS[rate.quote_currency] || "💰"}
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-white">{rate.pair_name}</p>
                      <p className="text-xs text-gray-400">
                        {rate.base_currency}/{rate.quote_currency}
                      </p>
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="text-xs text-gray-400 md:hidden">شراء</p>
                    <p className="font-mono text-green-400 font-semibold">
                      {formatPrice(rate.buy_price, rate.pair_name)}
                    </p>
                  </div>

                  <div className="text-center">
                    <p className="text-xs text-gray-400 md:hidden">بيع</p>
                    <p className="font-mono text-red-400 font-semibold">
                      {formatPrice(rate.sell_price, rate.pair_name)}
                    </p>
                  </div>

                  <div className="text-center">
                    <p className="text-xs text-gray-400 md:hidden">وسيط</p>
                    <p className="font-mono text-white font-semibold">
                      {formatPrice(rate.mid_rate, rate.pair_name)}
                    </p>
                  </div>

                  <div className="text-center">
                    <Badge
                      className={
                        rate.is_live
                          ? "bg-green-500/20 text-green-400 border-green-500/30"
                          : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                      }
                    >
                      {rate.is_live ? "حي" : "تقريبي"}
                    </Badge>
                  </div>

                  <div className="text-center">
                    <Link
                      to={`/converter/${rate.base_currency}_${rate.quote_currency}`}
                    >
                      <Button
                        size="sm"
                        className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
                      >
                        <ArrowUpDown className="h-4 w-4 ml-1" />
                        تحويل
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </section>

      {/* Electronic Banks Section */}
      <section className="bg-[#111827] border-t border-[#374151]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Wallet className="h-6 w-6 text-amber-400" />
              <h2 className="text-2xl font-bold">البنوك الإلكترونية المدعومة</h2>
            </div>
            <p className="text-gray-400 text-sm">
              {PAYMENT_GATEWAYS.length} بنك وبوابة دفع إلكترونية - محافظ
              إلكترونية وعملات رقمية وبوابات دفع
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-5 gap-4">
            {PAYMENT_GATEWAYS.map((gw) => (
              <Card
                key={gw.name}
                className="bg-[#1F2937] border-[#374151] hover:border-amber-500/30 transition-all duration-300 p-4 text-center group hover:scale-105"
              >
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-white/5 to-white/10 flex items-center justify-center group-hover:from-white/10 group-hover:to-white/15 transition-all overflow-hidden">
                  {gw.logo ? (
                    <img
                      src={gw.logo}
                      alt={gw.name}
                      className="w-7 h-7 object-contain"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                        const parent = target.parentElement;
                        if (parent) {
                          const fallback = document.createElement("span");
                          fallback.className = "text-xl font-bold text-amber-400";
                          fallback.textContent = gw.name.charAt(0).toUpperCase();
                          parent.appendChild(fallback);
                        }
                      }}
                    />
                  ) : (
                    <span className="text-xl font-bold text-amber-400">
                      {gw.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <Badge className={`${gw.color} text-xs`}>{gw.name}</Badge>
              </Card>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link to="/banks">
              <Button
                variant="outline"
                className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
              >
                عرض جميع البنوك الإلكترونية
                <ArrowRight className="mr-2 h-4 w-4 rotate-180" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t border-[#374151]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-2xl font-bold text-center mb-12">
            لماذا TTB Exchange؟
          </h2>
          <div className="grid md:grid-cols-4 gap-6">
            <Card className="bg-[#1F2937] border-[#374151] p-6 text-center hover:border-amber-500/20 transition-all">
              <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-6 w-6 text-amber-400" />
              </div>
              <h3 className="font-bold text-lg mb-2">أسعار حية</h3>
              <p className="text-gray-400 text-sm">
                أسعار صرف محدثة من السوق العالمي مع دعم XAU و BTC
              </p>
            </Card>
            <Card className="bg-[#1F2937] border-[#374151] p-6 text-center hover:border-green-500/20 transition-all">
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <ArrowUpDown className="h-6 w-6 text-green-400" />
              </div>
              <h3 className="font-bold text-lg mb-2">رسوم ثابتة</h3>
              <p className="text-gray-400 text-sm">
                رسوم محددة وليست نسبة مئوية - شفافية كاملة
              </p>
            </Card>
            <Card className="bg-[#1F2937] border-[#374151] p-6 text-center hover:border-blue-500/20 transition-all">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Zap className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="font-bold text-lg mb-2">محول Expert</h3>
              <p className="text-gray-400 text-sm">
                محول آلي ثنائي الاتجاه مع تشغيل/إيقاف وخصم رسوم تلقائي
              </p>
            </Card>
            <Card className="bg-[#1F2937] border-[#374151] p-6 text-center hover:border-purple-500/20 transition-all">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Shield className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="font-bold text-lg mb-2">
                {PAYMENT_GATEWAYS.length} بنك إلكتروني
              </h3>
              <p className="text-gray-400 text-sm">
                PayPal, Skrill, USDT, Bitcoin, Binance Pay والمزيد
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-amber-500/10 via-amber-600/5 to-amber-500/10 border-t border-[#374151]">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <Globe className="h-12 w-12 text-amber-400 mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-4">ابدأ التحويل الآن</h2>
          <p className="text-gray-400 mb-8 max-w-lg mx-auto">
            حول عملاتك بأفضل الأسعار مع دعم كامل لجميع البنوك الإلكترونية
            والعملات الرقمية
          </p>
          <Link to="/converter">
            <Button className="bg-amber-500 hover:bg-amber-600 text-black font-bold px-10 py-3 text-lg shadow-lg shadow-amber-500/20">
              ابدأ الآن
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0A0F1C] border-t border-[#374151] py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
          <p>© 2026 TTB Exchange - موقع شخصي لتحويل العملات</p>
          <p className="mt-2 text-xs text-gray-600">
            أسعار الصرف مقدمة من Fixer.io | البيانات للأغراض المعلوماتية فقط
          </p>
        </div>
      </footer>
    </div>
  );
}
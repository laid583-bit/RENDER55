import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CreditCard,
  Globe,
  Shield,
  Zap,
  ArrowRightLeft,
  Wallet,
  ArrowUpFromLine,
  ArrowDownToLine,
} from "lucide-react";

const PAYMENT_CATEGORIES = [
  {
    title: "المحافظ الإلكترونية",
    icon: <Wallet className="h-5 w-5 text-blue-400" />,
    color: "border-blue-500/30",
    gateways: [
      { id: "paypal", name: "PayPal", icon: "P", color: "text-blue-400", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/30", desc: "الدفع الآمن عبر الإنترنت" },
      { id: "payeer", name: "Payeer", icon: "₽", color: "text-teal-400", bgColor: "bg-teal-500/10", borderColor: "border-teal-500/30", desc: "محفظة إلكترونية متعددة العملات" },
      { id: "perfect_money", name: "Perfect Money", icon: "PM", color: "text-red-400", bgColor: "bg-red-500/10", borderColor: "border-red-500/30", desc: "نظام دفع إلكتروني عالمي" },
      { id: "webmoney", name: "WebMoney", icon: "W", color: "text-blue-300", bgColor: "bg-blue-600/10", borderColor: "border-blue-600/30", desc: "نظام تسوية إلكترونية" },
      { id: "skrill", name: "Skrill", icon: "S", color: "text-purple-400", bgColor: "bg-purple-500/10", borderColor: "border-purple-500/30", desc: "تحويل أموال سريع وآمن" },
      { id: "neteller", name: "Neteller", icon: "N", color: "text-green-400", bgColor: "bg-green-500/10", borderColor: "border-green-500/30", desc: "محفظة إلكترونية للتحويلات" },
      { id: "advcash", name: "AdvCash", icon: "A", color: "text-indigo-400", bgColor: "bg-indigo-500/10", borderColor: "border-indigo-500/30", desc: "حلول دفع متقدمة" },
    ],
  },
  {
    title: "العملات الرقمية",
    icon: <Globe className="h-5 w-5 text-amber-400" />,
    color: "border-amber-500/30",
    gateways: [
      { id: "btc", name: "Bitcoin (BTC)", icon: "₿", color: "text-orange-400", bgColor: "bg-orange-500/10", borderColor: "border-orange-500/30", desc: "العملة الرقمية الأولى عالمياً" },
      { id: "eth", name: "Ethereum (ETH)", icon: "Ξ", color: "text-violet-400", bgColor: "bg-violet-500/10", borderColor: "border-violet-500/30", desc: "منصة العقود الذكية" },
      { id: "usdt_trc20", name: "USDT (TRC20)", icon: "₮", color: "text-emerald-400", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/30", desc: "عملة مستقرة - شبكة ترون" },
      { id: "usdt_erc20", name: "USDT (ERC20)", icon: "₮", color: "text-teal-400", bgColor: "bg-teal-500/10", borderColor: "border-teal-500/30", desc: "عملة مستقرة - شبكة إيثريوم" },
      { id: "binance_pay", name: "Binance Pay", icon: "◆", color: "text-yellow-400", bgColor: "bg-yellow-500/10", borderColor: "border-yellow-500/30", desc: "الدفع عبر بينانس" },
      { id: "trx", name: "Tron (TRX)", icon: "◈", color: "text-red-400", bgColor: "bg-red-500/10", borderColor: "border-red-500/30", desc: "محفظة ترون - شبكة TRX" },
      { id: "ttb_token", name: "TTB Token (TRC-20)", icon: "T", color: "text-sky-400", bgColor: "bg-sky-500/10", borderColor: "border-sky-500/30", desc: "توكن TTB على شبكة ترون" },
    ],
  },
  {
    title: "بوابات الدفع",
    icon: <CreditCard className="h-5 w-5 text-green-400" />,
    color: "border-green-500/30",
    gateways: [
      { id: "stripe", name: "Stripe (بطاقة)", icon: "💳", color: "text-indigo-400", bgColor: "bg-indigo-500/10", borderColor: "border-indigo-500/30", desc: "الدفع ببطاقة الائتمان" },
      { id: "redotpay", name: "RedotPay", icon: "R", color: "text-rose-400", bgColor: "bg-rose-500/10", borderColor: "border-rose-500/30", desc: "بطاقة كريبتو للدفع والسحب" },
      { id: "wise", name: "Wise", icon: "🌐", color: "text-green-400", bgColor: "bg-green-500/10", borderColor: "border-green-500/30", desc: "تحويل بنكي دولي بأقل رسوم" },
      { id: "western_union", name: "Western Union", icon: "WU", color: "text-yellow-400", bgColor: "bg-yellow-500/10", borderColor: "border-yellow-500/30", desc: "تحويل أموال دولي" },
      { id: "barid_mob", name: "بريدي موب", icon: "BM", color: "text-yellow-400", bgColor: "bg-yellow-500/10", borderColor: "border-yellow-500/30", desc: "الدفع عبر بريد الجزائر" },
      { id: "bank_transfer", name: "حوالة بنكية", icon: "🏦", color: "text-cyan-400", bgColor: "bg-cyan-500/10", borderColor: "border-cyan-500/30", desc: "تحويل بنكي مباشر" },
    ],
  },
];

const ALL_GATEWAYS = PAYMENT_CATEGORIES.flatMap((cat) => cat.gateways);

export default function BanksPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0A0F1C] text-white" dir="rtl">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#0A0F1C] to-[#111827]">
        <div className="absolute top-10 right-20 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
          <div className="text-center space-y-4">
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-sm px-4 py-1">
              {ALL_GATEWAYS.length} بنك وبوابة دفع إلكترونية
            </Badge>
            <h1 className="text-3xl md:text-4xl font-bold">
              <span className="bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
                البنوك الإلكترونية
              </span>
              <br />
              <span className="text-xl text-gray-300 font-normal mt-2 block">
                جميع طرق الدفع والتحويل المدعومة
              </span>
            </h1>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto mt-8">
            <div className="text-center bg-[#1F2937]/50 rounded-xl p-4 border border-[#374151]">
              <Wallet className="h-6 w-6 text-blue-400 mx-auto mb-2" />
              <p className="text-xl font-bold text-blue-400">7</p>
              <p className="text-xs text-gray-500">محفظة إلكترونية</p>
            </div>
            <div className="text-center bg-[#1F2937]/50 rounded-xl p-4 border border-[#374151]">
              <Globe className="h-6 w-6 text-amber-400 mx-auto mb-2" />
              <p className="text-xl font-bold text-amber-400">7</p>
              <p className="text-xs text-gray-500">عملة رقمية</p>
            </div>
            <div className="text-center bg-[#1F2937]/50 rounded-xl p-4 border border-[#374151]">
              <CreditCard className="h-6 w-6 text-green-400 mx-auto mb-2" />
              <p className="text-xl font-bold text-green-400">6</p>
              <p className="text-xs text-gray-500">بوابة دفع</p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <Button
              onClick={() => navigate("/deposit")}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-base font-bold"
            >
              <ArrowUpFromLine className="h-5 w-5 ml-2" />
              إيداع الأموال
            </Button>
            <Button
              onClick={() => navigate("/withdraw")}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-base font-bold"
            >
              <ArrowDownToLine className="h-5 w-5 ml-2" />
              سحب الأموال
            </Button>
          </div>
        </div>
      </section>

      {/* Payment Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        {PAYMENT_CATEGORIES.map((category) => (
          <div key={category.title}>
            <div className={`flex items-center gap-3 mb-6 pb-3 border-b ${category.color}`}>
              <div className="w-10 h-10 bg-[#1F2937] rounded-xl flex items-center justify-center border border-[#374151]">
                {category.icon}
              </div>
              <div>
                <h2 className="text-xl font-bold">{category.title}</h2>
                <p className="text-gray-400 text-sm">{category.gateways.length} خيار متاح</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {category.gateways.map((gw) => (
                <Card
                  key={gw.id}
                  className="bg-[#1F2937] border-[#374151] hover:border-amber-500/30 transition-all duration-300 group hover:shadow-lg overflow-hidden"
                >
                  <div className="p-5">
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`w-14 h-14 rounded-xl ${gw.bgColor} border ${gw.borderColor} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <span className={`text-2xl font-bold ${gw.color}`}>{gw.icon}</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-sm">{gw.name}</h3>
                        <p className="text-gray-500 text-xs">{gw.desc}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap mb-4">
                      <Badge className={`${gw.bgColor} ${gw.color} ${gw.borderColor} text-[10px]`}>
                        <Shield className="h-2.5 w-2.5 ml-1" />
                        آمن
                      </Badge>
                      <Badge className={`${gw.bgColor} ${gw.color} ${gw.borderColor} text-[10px]`}>
                        <Zap className="h-2.5 w-2.5 ml-1" />
                        سريع
                      </Badge>
                      <Badge className={`${gw.bgColor} ${gw.color} ${gw.borderColor} text-[10px]`}>
                        <ArrowRightLeft className="h-2.5 w-2.5 ml-1" />
                        إيداع/سحب
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => navigate("/deposit")}
                        size="sm"
                        className="flex-1 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30 text-xs"
                      >
                        <ArrowUpFromLine className="h-3 w-3 ml-1" />
                        إيداع
                      </Button>
                      <Button
                        onClick={() => navigate("/withdraw")}
                        size="sm"
                        className="flex-1 bg-green-600/20 hover:bg-green-600/40 text-green-400 border border-green-500/30 text-xs"
                      >
                        <ArrowDownToLine className="h-3 w-3 ml-1" />
                        سحب
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* Info Section */}
      <section className="bg-[#111827] border-t border-[#374151]">
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <Shield className="h-10 w-10 text-amber-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-3">أمان وموثوقية</h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            جميع البنوك الإلكترونية وبوابات الدفع المعروضة مدعومة بالكامل في منصة TTB Exchange.
            يتم التحويل بشكل فوري وآمن مع رسوم ثابتة وشفافة.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="bg-[#1F2937] rounded-xl p-4 border border-[#374151]">
              <p className="text-amber-400 font-bold text-lg">{ALL_GATEWAYS.length}+</p>
              <p className="text-gray-500 text-xs">طريقة دفع</p>
            </div>
            <div className="bg-[#1F2937] rounded-xl p-4 border border-[#374151]">
              <p className="text-green-400 font-bold text-lg">24/7</p>
              <p className="text-gray-500 text-xs">متاح دائماً</p>
            </div>
            <div className="bg-[#1F2937] rounded-xl p-4 border border-[#374151]">
              <p className="text-blue-400 font-bold text-lg">فوري</p>
              <p className="text-gray-500 text-xs">تحويل سريع</p>
            </div>
            <div className="bg-[#1F2937] rounded-xl p-4 border border-[#374151]">
              <p className="text-purple-400 font-bold text-lg">ثابتة</p>
              <p className="text-gray-500 text-xs">رسوم شفافة</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-[#0A0F1C] border-t border-[#374151] py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
          <p>&copy; 2026 TTB Exchange - موقع شخصي لتحويل العملات</p>
        </div>
      </footer>
    </div>
  );
}
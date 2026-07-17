import Header from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  Globe,
  Shield,
  Zap,
  ArrowRightLeft,
  Wallet,
  Send,
} from "lucide-react";

// All electronic banks & payment gateways with SVG logo icons
const PAYMENT_CATEGORIES = [
  {
    title: "المحافظ الإلكترونية",
    icon: <Wallet className="h-5 w-5 text-blue-400" />,
    color: "border-blue-500/30",
    gateways: [
      {
        id: "paypal",
        name: "PayPal",
        logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/PayPal.svg/124px-PayPal.svg.png",
        color: "from-blue-600 to-blue-800",
        textColor: "text-blue-400",
        bgColor: "bg-blue-500/10",
        borderColor: "border-blue-500/30",
        desc: "الدفع الآمن عبر الإنترنت",
      },
      {
        id: "payeer",
        name: "Payeer",
        logo: "https://payeer.com/bitrix/templates/developer/img/logo.svg",
        color: "from-teal-500 to-teal-700",
        textColor: "text-teal-400",
        bgColor: "bg-teal-500/10",
        borderColor: "border-teal-500/30",
        desc: "محفظة إلكترونية متعددة العملات",
      },
      {
        id: "perfect_money",
        name: "Perfect Money",
        logo: "https://perfectmoney.com/img/logo-perfectmoney.svg",
        color: "from-red-500 to-red-700",
        textColor: "text-red-400",
        bgColor: "bg-red-500/10",
        borderColor: "border-red-500/30",
        desc: "نظام دفع إلكتروني عالمي",
      },
      {
        id: "webmoney",
        name: "WebMoney",
        logo: "https://www.webmoney.ru/img/wmlogo_blue.svg",
        color: "from-blue-700 to-blue-900",
        textColor: "text-blue-300",
        bgColor: "bg-blue-600/10",
        borderColor: "border-blue-600/30",
        desc: "نظام تسوية إلكترونية",
      },
      {
        id: "skrill",
        name: "Skrill",
        logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Skrill_logo.svg/200px-Skrill_logo.svg.png",
        color: "from-purple-600 to-purple-800",
        textColor: "text-purple-400",
        bgColor: "bg-purple-500/10",
        borderColor: "border-purple-500/30",
        desc: "تحويل أموال سريع وآمن",
      },
      {
        id: "neteller",
        name: "Neteller",
        logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Neteller_logo.svg/200px-Neteller_logo.svg.png",
        color: "from-green-600 to-green-800",
        textColor: "text-green-400",
        bgColor: "bg-green-500/10",
        borderColor: "border-green-500/30",
        desc: "محفظة إلكترونية للتحويلات",
      },
      {
        id: "advcash",
        name: "AdvCash",
        logo: "https://advcash.com/assets/img/logo.svg",
        color: "from-indigo-500 to-indigo-700",
        textColor: "text-indigo-400",
        bgColor: "bg-indigo-500/10",
        borderColor: "border-indigo-500/30",
        desc: "حلول دفع متقدمة",
      },
    ],
  },
  {
    title: "العملات الرقمية",
    icon: <Globe className="h-5 w-5 text-amber-400" />,
    color: "border-amber-500/30",
    gateways: [
      {
        id: "btc",
        name: "Bitcoin (BTC)",
        logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Bitcoin.svg/128px-Bitcoin.svg.png",
        color: "from-orange-500 to-orange-700",
        textColor: "text-orange-400",
        bgColor: "bg-orange-500/10",
        borderColor: "border-orange-500/30",
        desc: "العملة الرقمية الأولى عالمياً",
      },
      {
        id: "eth",
        name: "Ethereum (ETH)",
        logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Ethereum_logo_2014.svg/128px-Ethereum_logo_2014.svg.png",
        color: "from-violet-500 to-violet-700",
        textColor: "text-violet-400",
        bgColor: "bg-violet-500/10",
        borderColor: "border-violet-500/30",
        desc: "منصة العقود الذكية",
      },
      {
        id: "usdt_trc20",
        name: "USDT (TRC20)",
        logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Tether_Logo.svg/128px-Tether_Logo.svg.png",
        color: "from-emerald-500 to-emerald-700",
        textColor: "text-emerald-400",
        bgColor: "bg-emerald-500/10",
        borderColor: "border-emerald-500/30",
        desc: "عملة مستقرة - شبكة ترون",
      },
      {
        id: "usdt_erc20",
        name: "USDT (ERC20)",
        logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Tether_Logo.svg/128px-Tether_Logo.svg.png",
        color: "from-teal-500 to-teal-700",
        textColor: "text-teal-400",
        bgColor: "bg-teal-500/10",
        borderColor: "border-teal-500/30",
        desc: "عملة مستقرة - شبكة إيثريوم",
      },
      {
        id: "binance_pay",
        name: "Binance Pay",
        logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Binance_Logo.svg/128px-Binance_Logo.svg.png",
        color: "from-yellow-500 to-yellow-700",
        textColor: "text-yellow-400",
        bgColor: "bg-yellow-500/10",
        borderColor: "border-yellow-500/30",
        desc: "الدفع عبر بينانس",
      },
    ],
  },
  {
    title: "بوابات الدفع",
    icon: <CreditCard className="h-5 w-5 text-green-400" />,
    color: "border-green-500/30",
    gateways: [
      {
        id: "stripe",
        name: "Stripe",
        logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Stripe_Logo%2C_revised_2016.svg/200px-Stripe_Logo%2C_revised_2016.svg.png",
        color: "from-purple-500 to-purple-700",
        textColor: "text-purple-400",
        bgColor: "bg-purple-500/10",
        borderColor: "border-purple-500/30",
        desc: "بوابة دفع احترافية",
      },
      {
        id: "redotpay",
        name: "RedotPay",
        logo: "",
        color: "from-rose-500 to-rose-700",
        textColor: "text-rose-400",
        bgColor: "bg-rose-500/10",
        borderColor: "border-rose-500/30",
        desc: "بطاقة كريبتو للدفع",
      },
      {
        id: "western_union",
        name: "Western Union",
        logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/Western_Union_Logo_2019.svg/200px-Western_Union_Logo_2019.svg.png",
        color: "from-yellow-600 to-yellow-800",
        textColor: "text-yellow-400",
        bgColor: "bg-yellow-500/10",
        borderColor: "border-yellow-500/30",
        desc: "تحويل أموال دولي",
      },
      {
        id: "bank_transfer",
        name: "حوالة بنكية",
        logo: "",
        color: "from-cyan-500 to-cyan-700",
        textColor: "text-cyan-400",
        bgColor: "bg-cyan-500/10",
        borderColor: "border-cyan-500/30",
        desc: "تحويل بنكي مباشر",
      },
    ],
  },
  {
    title: "تحويلات بنكية ومالية",
    icon: <ArrowRightLeft className="h-5 w-5 text-lime-400" />,
    color: "border-lime-500/30",
    gateways: [
      {
        id: "wise",
        name: "Wise",
        logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Wise_logo.svg/200px-Wise_logo.svg.png",
        color: "from-lime-500 to-lime-700",
        textColor: "text-lime-400",
        bgColor: "bg-lime-500/10",
        borderColor: "border-lime-500/30",
        desc: "تحويل أموال دولي بأقل رسوم",
      },
      {
        id: "zelle",
        name: "Zelle",
        logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Zelle_logo.svg/200px-Zelle_logo.svg.png",
        color: "from-purple-500 to-purple-700",
        textColor: "text-purple-300",
        bgColor: "bg-purple-600/10",
        borderColor: "border-purple-600/30",
        desc: "تحويل فوري بين البنوك الأمريكية",
      },
      {
        id: "payoneer",
        name: "Payoneer",
        logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Payoneer_logo.svg/200px-Payoneer_logo.svg.png",
        color: "from-orange-500 to-orange-700",
        textColor: "text-orange-300",
        bgColor: "bg-orange-600/10",
        borderColor: "border-orange-600/30",
        desc: "منصة دفع عالمية للشركات والأفراد",
      },
      {
        id: "baridimob",
        name: "بريدي موب",
        logo: "",
        color: "from-yellow-500 to-green-600",
        textColor: "text-yellow-300",
        bgColor: "bg-yellow-500/10",
        borderColor: "border-yellow-500/30",
        desc: "خدمة الدفع الإلكتروني - بريد الجزائر",
      },
    ],
  },
];

// Flatten all gateways for the total count
const ALL_GATEWAYS = PAYMENT_CATEGORIES.flatMap((cat) => cat.gateways);

export default function BanksPage() {
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
              🏦 {ALL_GATEWAYS.length} بنك وبوابة دفع إلكترونية
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
          <div className="grid grid-cols-4 gap-4 max-w-2xl mx-auto mt-8">
            <div className="text-center bg-[#1F2937]/50 rounded-xl p-4 border border-[#374151]">
              <Wallet className="h-6 w-6 text-blue-400 mx-auto mb-2" />
              <p className="text-xl font-bold text-blue-400">7</p>
              <p className="text-xs text-gray-500">محفظة إلكترونية</p>
            </div>
            <div className="text-center bg-[#1F2937]/50 rounded-xl p-4 border border-[#374151]">
              <Globe className="h-6 w-6 text-amber-400 mx-auto mb-2" />
              <p className="text-xl font-bold text-amber-400">5</p>
              <p className="text-xs text-gray-500">عملة رقمية</p>
            </div>
            <div className="text-center bg-[#1F2937]/50 rounded-xl p-4 border border-[#374151]">
              <CreditCard className="h-6 w-6 text-green-400 mx-auto mb-2" />
              <p className="text-xl font-bold text-green-400">4</p>
              <p className="text-xs text-gray-500">بوابة دفع</p>
            </div>
            <div className="text-center bg-[#1F2937]/50 rounded-xl p-4 border border-[#374151]">
              <Send className="h-6 w-6 text-lime-400 mx-auto mb-2" />
              <p className="text-xl font-bold text-lime-400">4</p>
              <p className="text-xs text-gray-500">تحويلات مالية</p>
            </div>
          </div>
        </div>
      </section>

      {/* Payment Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        {PAYMENT_CATEGORIES.map((category) => (
          <div key={category.title}>
            {/* Category Header */}
            <div
              className={`flex items-center gap-3 mb-6 pb-3 border-b ${category.color}`}
            >
              <div className="w-10 h-10 bg-[#1F2937] rounded-xl flex items-center justify-center border border-[#374151]">
                {category.icon}
              </div>
              <div>
                <h2 className="text-xl font-bold">{category.title}</h2>
                <p className="text-gray-400 text-sm">
                  {category.gateways.length} خيار متاح
                </p>
              </div>
            </div>

            {/* Gateways Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {category.gateways.map((gw) => (
                <Card
                  key={gw.id}
                  className={`bg-[#1F2937] border-[#374151] hover:${gw.borderColor} transition-all duration-300 group hover:shadow-lg overflow-hidden`}
                >
                  {/* Gradient top bar */}
                  <div
                    className={`h-1.5 bg-gradient-to-r ${gw.color} w-full`}
                  />

                  <div className="p-5">
                    {/* Logo */}
                    <div className="flex items-center gap-4 mb-4">
                      <div
                        className={`w-14 h-14 rounded-xl ${gw.bgColor} border ${gw.borderColor} flex items-center justify-center overflow-hidden group-hover:scale-110 transition-transform`}
                      >
                        {gw.logo ? (
                          <img
                            src={gw.logo}
                            alt={gw.name}
                            className="w-8 h-8 object-contain"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                              const parent = target.parentElement;
                              if (parent) {
                                const fallback = document.createElement("span");
                                fallback.className = `text-2xl font-bold ${gw.textColor}`;
                                fallback.textContent = gw.name
                                  .charAt(0)
                                  .toUpperCase();
                                parent.appendChild(fallback);
                              }
                            }}
                          />
                        ) : (
                          <span
                            className={`text-2xl font-bold ${gw.textColor}`}
                          >
                            {gw.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-sm">
                          {gw.name}
                        </h3>
                        <p className="text-gray-500 text-xs">{gw.desc}</p>
                      </div>
                    </div>

                    {/* Features */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        className={`${gw.bgColor} ${gw.textColor} ${gw.borderColor} text-[10px]`}
                      >
                        <Shield className="h-2.5 w-2.5 ml-1" />
                        آمن
                      </Badge>
                      <Badge
                        className={`${gw.bgColor} ${gw.textColor} ${gw.borderColor} text-[10px]`}
                      >
                        <Zap className="h-2.5 w-2.5 ml-1" />
                        سريع
                      </Badge>
                      <Badge
                        className={`${gw.bgColor} ${gw.textColor} ${gw.borderColor} text-[10px]`}
                      >
                        <ArrowRightLeft className="h-2.5 w-2.5 ml-1" />
                        إيداع/سحب
                      </Badge>
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
            جميع البنوك الإلكترونية وبوابات الدفع المعروضة مدعومة بالكامل في
            منصة TTB Exchange. يتم التحويل بشكل فوري وآمن مع رسوم ثابتة وشفافة.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="bg-[#1F2937] rounded-xl p-4 border border-[#374151]">
              <p className="text-amber-400 font-bold text-lg">
                {ALL_GATEWAYS.length}+
              </p>
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
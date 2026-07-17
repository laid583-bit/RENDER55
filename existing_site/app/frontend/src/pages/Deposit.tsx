import { useState, useEffect } from "react";
import { createClient } from "@metagptx/web-sdk";
import Header from "@/components/Header";
import { Card } from "@/components/ui/card";
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
import { toast } from "sonner";
import {
  Wallet,
  ArrowUpFromLine,
  Shield,
  RefreshCw,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Building2,
  CreditCard,
  Globe,
  Bitcoin,
  Send,
} from "lucide-react";

const client = createClient();

interface DepositRecord {
  id: number;
  amount: number;
  currency: string;
  payment_method: string;
  wallet_address: string;
  status: string;
  notes: string;
  created_at: string;
}

const PAYMENT_METHODS = [
  // المحافظ الإلكترونية
  {
    id: "paypal",
    name: "PayPal",
    category: "wallets",
    icon: "💳",
    placeholder: "بريد PayPal الإلكتروني",
    textColor: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
  },
  {
    id: "payeer",
    name: "Payeer",
    category: "wallets",
    icon: "💰",
    placeholder: "رقم حساب Payeer",
    textColor: "text-teal-400",
    bgColor: "bg-teal-500/10",
    borderColor: "border-teal-500/30",
  },
  {
    id: "perfect_money",
    name: "Perfect Money",
    category: "wallets",
    icon: "💵",
    placeholder: "رقم حساب Perfect Money",
    textColor: "text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
  },
  {
    id: "webmoney",
    name: "WebMoney",
    category: "wallets",
    icon: "🌐",
    placeholder: "رقم محفظة WebMoney",
    textColor: "text-blue-300",
    bgColor: "bg-blue-600/10",
    borderColor: "border-blue-600/30",
  },
  {
    id: "skrill",
    name: "Skrill",
    category: "wallets",
    icon: "💜",
    placeholder: "بريد Skrill الإلكتروني",
    textColor: "text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30",
  },
  {
    id: "neteller",
    name: "Neteller",
    category: "wallets",
    icon: "💚",
    placeholder: "بريد Neteller الإلكتروني",
    textColor: "text-green-400",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
  },
  {
    id: "advcash",
    name: "AdvCash",
    category: "wallets",
    icon: "🔷",
    placeholder: "بريد AdvCash الإلكتروني",
    textColor: "text-indigo-400",
    bgColor: "bg-indigo-500/10",
    borderColor: "border-indigo-500/30",
  },
  // العملات الرقمية
  {
    id: "usdt_trc20",
    name: "USDT (TRC20)",
    category: "crypto",
    icon: "🟢",
    placeholder: "عنوان محفظة USDT TRC20",
    textColor: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
  },
  {
    id: "usdt_erc20",
    name: "USDT (ERC20)",
    category: "crypto",
    icon: "🔵",
    placeholder: "عنوان محفظة USDT ERC20",
    textColor: "text-teal-400",
    bgColor: "bg-teal-500/10",
    borderColor: "border-teal-500/30",
  },
  {
    id: "btc",
    name: "Bitcoin (BTC)",
    category: "crypto",
    icon: "🟠",
    placeholder: "عنوان محفظة Bitcoin",
    textColor: "text-orange-400",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30",
  },
  {
    id: "eth",
    name: "Ethereum (ETH)",
    category: "crypto",
    icon: "🔮",
    placeholder: "عنوان محفظة Ethereum",
    textColor: "text-violet-400",
    bgColor: "bg-violet-500/10",
    borderColor: "border-violet-500/30",
  },
  {
    id: "binance_pay",
    name: "Binance Pay",
    category: "crypto",
    icon: "🟡",
    placeholder: "Binance Pay ID أو البريد الإلكتروني",
    textColor: "text-yellow-400",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/30",
  },
  // بوابات الدفع
  {
    id: "stripe",
    name: "Stripe",
    category: "gateways",
    icon: "💎",
    placeholder: "البريد الإلكتروني المرتبط بحساب Stripe",
    textColor: "text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30",
  },
  {
    id: "redotpay",
    name: "RedotPay",
    category: "gateways",
    icon: "🔴",
    placeholder: "رقم حساب RedotPay",
    textColor: "text-rose-400",
    bgColor: "bg-rose-500/10",
    borderColor: "border-rose-500/30",
  },
  {
    id: "western_union",
    name: "Western Union",
    category: "gateways",
    icon: "🌍",
    placeholder: "الاسم الكامل كما في الهوية",
    textColor: "text-yellow-400",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/30",
  },
  // تحويلات بنكية ومالية
  {
    id: "wise",
    name: "Wise",
    category: "transfers",
    icon: "🍀",
    placeholder: "البريد الإلكتروني المرتبط بحساب Wise",
    textColor: "text-lime-400",
    bgColor: "bg-lime-500/10",
    borderColor: "border-lime-500/30",
  },
  {
    id: "zelle",
    name: "Zelle",
    category: "transfers",
    icon: "⚡",
    placeholder: "البريد الإلكتروني أو رقم الهاتف المرتبط بـ Zelle",
    textColor: "text-purple-300",
    bgColor: "bg-purple-600/10",
    borderColor: "border-purple-600/30",
  },
  {
    id: "payoneer",
    name: "Payoneer",
    category: "transfers",
    icon: "🔶",
    placeholder: "البريد الإلكتروني المرتبط بحساب Payoneer",
    textColor: "text-orange-300",
    bgColor: "bg-orange-600/10",
    borderColor: "border-orange-600/30",
  },
  {
    id: "bank_transfer",
    name: "تحويل بنكي",
    category: "transfers",
    icon: "🏦",
    placeholder: "bank_transfer",
    textColor: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/30",
  },
  {
    id: "baridimob",
    name: "بريدي موب",
    category: "transfers",
    icon: "📱",
    placeholder: "رقم حساب بريدي موب (CCP)",
    textColor: "text-yellow-300",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/30",
  },
];

const CATEGORIES = [
  {
    id: "all",
    label: "الكل",
    icon: <Globe className="h-3.5 w-3.5" />,
    count: PAYMENT_METHODS.length,
  },
  {
    id: "wallets",
    label: "محافظ إلكترونية",
    icon: <Wallet className="h-3.5 w-3.5" />,
    count: PAYMENT_METHODS.filter((m) => m.category === "wallets").length,
  },
  {
    id: "crypto",
    label: "عملات رقمية",
    icon: <Bitcoin className="h-3.5 w-3.5" />,
    count: PAYMENT_METHODS.filter((m) => m.category === "crypto").length,
  },
  {
    id: "gateways",
    label: "بوابات دفع",
    icon: <CreditCard className="h-3.5 w-3.5" />,
    count: PAYMENT_METHODS.filter((m) => m.category === "gateways").length,
  },
  {
    id: "transfers",
    label: "تحويلات بنكية",
    icon: <Send className="h-3.5 w-3.5" />,
    count: PAYMENT_METHODS.filter((m) => m.category === "transfers").length,
  },
];

export default function DepositPage() {
  const [user, setUser] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [selectedMethod, setSelectedMethod] = useState("paypal");
  const [walletAddress, setWalletAddress] = useState("");
  const [bankName, setBankName] = useState("");
  const [iban, setIban] = useState("");
  const [swiftCode, setSwiftCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [deposits, setDeposits] = useState<DepositRecord[]>([]);
  const [loadingDeposits, setLoadingDeposits] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");

  useEffect(() => {
    const init = async () => {
      try {
        const res = await client.auth.me();
        if (res?.data) {
          setUser(res.data);
          await fetchDeposits();
        }
      } catch {
        setUser(null);
      }
      setLoadingDeposits(false);
    };
    init();
  }, []);

  const fetchDeposits = async () => {
    try {
      const response = await client.entities.deposits.query({
        query: {},
        sort: "-created_at",
        limit: 20,
      });
      if (response?.data?.items) {
        setDeposits(response.data.items);
      }
    } catch (err) {
      console.error("Error fetching deposits:", err);
    }
  };

  const isBankTransfer = selectedMethod === "bank_transfer";

  const handleDeposit = async () => {
    if (!user) {
      await client.auth.toLogin();
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("يرجى إدخال مبلغ صالح");
      return;
    }

    if (isBankTransfer) {
      if (!bankName.trim()) {
        toast.error("يرجى إدخال اسم البنك");
        return;
      }
      if (!iban.trim()) {
        toast.error("يرجى إدخال رقم IBAN");
        return;
      }
      if (!swiftCode.trim()) {
        toast.error("يرجى إدخال رمز SWIFT");
        return;
      }
    } else {
      if (!walletAddress.trim()) {
        toast.error("يرجى إدخال عنوان المحفظة أو الحساب");
        return;
      }
    }

    setLoading(true);
    try {
      const addressData = isBankTransfer
        ? `بنك: ${bankName.trim()} | IBAN: ${iban.trim()} | SWIFT: ${swiftCode.trim()}`
        : walletAddress.trim();

      await client.entities.deposits.create({
        data: {
          amount: parseFloat(amount),
          currency,
          payment_method: selectedMethod,
          wallet_address: addressData,
          status: "pending",
          notes: "",
          created_at: new Date().toISOString(),
        },
      });

      toast.success("تم إرسال طلب الإيداع بنجاح! سيتم معالجته قريباً.");
      setAmount("");
      setWalletAddress("");
      setBankName("");
      setIban("");
      setSwiftCode("");
      await fetchDeposits();
    } catch (err) {
      console.error("Error creating deposit:", err);
      toast.error("حدث خطأ أثناء إنشاء طلب الإيداع");
    } finally {
      setLoading(false);
    }
  };

  const selectedMethodData = PAYMENT_METHODS.find(
    (m) => m.id === selectedMethod
  );

  const filteredMethods =
    activeCategory === "all"
      ? PAYMENT_METHODS
      : PAYMENT_METHODS.filter((m) => m.category === activeCategory);

  const statusConfig: Record<
    string,
    { color: string; label: string; icon: React.ReactNode }
  > = {
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
    rejected: {
      color: "bg-red-500/20 text-red-400 border-red-500/30",
      label: "مرفوض",
      icon: <XCircle className="h-3 w-3" />,
    },
  };

  if (!user && !loadingDeposits) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] text-white" dir="rtl">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <ArrowUpFromLine className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">إيداع الأموال</h2>
          <p className="text-gray-400 mb-6">يرجى تسجيل الدخول لإيداع الأموال</p>
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

  return (
    <div className="min-h-screen bg-[#0A0F1C] text-white" dir="rtl">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex items-center gap-3 mb-2">
          <ArrowUpFromLine className="h-7 w-7 text-blue-400" />
          <h1 className="text-2xl font-bold">إيداع الأموال</h1>
        </div>
        <p className="text-gray-400 text-sm mb-8">
          أودع أموالك عبر أي بنك إلكتروني أو محفظة رقمية أو حساب بنكي —{" "}
          <span className="text-amber-400 font-semibold">
            {PAYMENT_METHODS.length} طريقة إيداع متاحة
          </span>
        </p>

        {/* Payment Methods Selection - Full Width */}
        <Card className="bg-[#1F2937] border-[#374151] p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-5 w-5 text-blue-400" />
            <h2 className="font-bold text-lg">اختر طريقة الإيداع</h2>
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 mr-auto">
              {PAYMENT_METHODS.length} طريقة
            </Badge>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 mb-6">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  activeCategory === cat.id
                    ? "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                    : "bg-[#111827] text-gray-400 border border-[#374151] hover:border-[#4B5563]"
                }`}
              >
                {cat.icon}
                {cat.label}
                <span className="text-[10px] opacity-70">({cat.count})</span>
              </button>
            ))}
          </div>

          {/* Methods Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {filteredMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => {
                  setSelectedMethod(method.id);
                  setWalletAddress("");
                  setBankName("");
                  setIban("");
                  setSwiftCode("");
                }}
                className={`relative p-3 rounded-xl border-2 transition-all text-center hover:scale-[1.02] ${
                  selectedMethod === method.id
                    ? "border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10"
                    : "border-[#374151] bg-[#111827] hover:border-[#4B5563]"
                }`}
              >
                <div className="text-2xl mb-1.5">{method.icon}</div>
                <p className="text-xs font-medium text-white leading-tight">
                  {method.name}
                </p>
                {selectedMethod === method.id && (
                  <CheckCircle2 className="absolute top-1.5 left-1.5 h-4 w-4 text-blue-400" />
                )}
              </button>
            ))}
          </div>
        </Card>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Deposit Form */}
          <div className="lg:col-span-2">
            <Card className="bg-[#1F2937] border-[#374151] p-6">
              <div className="flex items-center gap-2 mb-6">
                <ArrowUpFromLine className="h-5 w-5 text-amber-400" />
                <h2 className="font-bold text-lg">طلب إيداع جديد</h2>
                {selectedMethodData && (
                  <Badge
                    className={`${selectedMethodData.bgColor} ${selectedMethodData.textColor} ${selectedMethodData.borderColor} mr-auto`}
                  >
                    <span className="ml-1">{selectedMethodData.icon}</span>
                    {selectedMethodData.name}
                  </Badge>
                )}
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-400">المبلغ</Label>
                    <Input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="أدخل المبلغ"
                      min="1"
                      className="bg-[#111827] border-[#374151] text-white text-lg font-mono mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400">العملة</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger className="bg-[#111827] border-[#374151] text-white mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1F2937] border-[#374151]">
                        <SelectItem value="USD" className="text-white">
                          🇺🇸 دولار أمريكي (USD)
                        </SelectItem>
                        <SelectItem value="EUR" className="text-white">
                          🇪🇺 يورو (EUR)
                        </SelectItem>
                        <SelectItem value="GBP" className="text-white">
                          🇬🇧 جنيه إسترليني (GBP)
                        </SelectItem>
                        <SelectItem value="DZD" className="text-white">
                          🇩🇿 دينار جزائري (DZD)
                        </SelectItem>
                        <SelectItem value="USDT" className="text-white">
                          💲 تيثر (USDT)
                        </SelectItem>
                        <SelectItem value="BTC" className="text-white">
                          ₿ بيتكوين (BTC)
                        </SelectItem>
                        <SelectItem value="ETH" className="text-white">
                          ⟠ إيثيريوم (ETH)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Bank Transfer Fields */}
                {isBankTransfer ? (
                  <div className="space-y-4 bg-cyan-500/5 rounded-xl p-4 border border-cyan-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="h-5 w-5 text-cyan-400" />
                      <span className="text-cyan-400 font-semibold text-sm">
                        بيانات التحويل البنكي
                      </span>
                    </div>
                    <div>
                      <Label className="text-gray-400">اسم البنك</Label>
                      <Input
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="مثال: البنك الأهلي، Chase Bank"
                        className="bg-[#111827] border-[#374151] text-white mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-400">رقم IBAN</Label>
                      <Input
                        type="text"
                        value={iban}
                        onChange={(e) => setIban(e.target.value)}
                        placeholder="مثال: SA0380000000608010167519"
                        className="bg-[#111827] border-[#374151] text-white mt-1 font-mono text-sm"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-400">رمز SWIFT / BIC</Label>
                      <Input
                        type="text"
                        value={swiftCode}
                        onChange={(e) => setSwiftCode(e.target.value)}
                        placeholder="مثال: NCBKSAJE"
                        className="bg-[#111827] border-[#374151] text-white mt-1 font-mono text-sm"
                        dir="ltr"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <Label className="text-gray-400">
                      {selectedMethodData?.placeholder ||
                        "عنوان المحفظة أو الحساب"}
                    </Label>
                    <Input
                      type="text"
                      value={walletAddress}
                      onChange={(e) => setWalletAddress(e.target.value)}
                      placeholder={
                        selectedMethodData?.placeholder ||
                        "أدخل عنوان المحفظة أو الحساب"
                      }
                      className="bg-[#111827] border-[#374151] text-white mt-1 font-mono text-sm"
                    />
                  </div>
                )}

                {/* Info notice */}
                <div className="flex items-center gap-2 text-blue-400 text-sm bg-blue-500/10 rounded-lg p-3 border border-blue-500/20">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  سيتم مراجعة طلب الإيداع وتأكيده من قبل المسؤول
                </div>

                <Button
                  onClick={handleDeposit}
                  disabled={
                    loading ||
                    !amount ||
                    parseFloat(amount) <= 0 ||
                    (isBankTransfer
                      ? !bankName.trim() || !iban.trim() || !swiftCode.trim()
                      : !walletAddress.trim())
                  }
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" /> جاري
                      المعالجة...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <ArrowUpFromLine className="h-4 w-4" />
                      إيداع {amount || "0"} {currency} عبر{" "}
                      {selectedMethodData?.name || ""}
                    </span>
                  )}
                </Button>
              </div>
            </Card>
          </div>

          {/* Deposit History */}
          <div>
            <h2 className="font-bold text-lg mb-4">سجل الإيداعات</h2>
            {deposits.length === 0 ? (
              <Card className="bg-[#1F2937] border-[#374151] p-8 text-center">
                <ArrowUpFromLine className="h-10 w-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">لا توجد إيداعات سابقة</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {deposits.map((dep) => {
                  const status =
                    statusConfig[dep.status] || statusConfig.pending;
                  const methodData = PAYMENT_METHODS.find(
                    (m) => m.id === dep.payment_method
                  );
                  return (
                    <Card
                      key={dep.id}
                      className="bg-[#1F2937] border-[#374151] p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-8 h-8 rounded-lg ${
                              methodData?.bgColor || "bg-gray-500/10"
                            } flex items-center justify-center`}
                          >
                            <span className="text-base">
                              {methodData?.icon || "💳"}
                            </span>
                          </div>
                          <div>
                            <p className="font-mono font-bold text-sm">
                              {dep.amount} {dep.currency}
                            </p>
                            <p className="text-xs text-gray-400">
                              {methodData?.name || dep.payment_method}
                            </p>
                          </div>
                        </div>
                        <Badge className={status.color}>
                          <span className="flex items-center gap-1">
                            {status.icon}
                            {status.label}
                          </span>
                        </Badge>
                      </div>
                      {dep.wallet_address && (
                        <p className="text-xs text-gray-500 font-mono truncate">
                          {dep.wallet_address}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {dep.created_at
                          ? new Date(dep.created_at).toLocaleDateString("ar-SA")
                          : "-"}
                      </p>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
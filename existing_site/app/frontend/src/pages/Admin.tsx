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
} from "lucide-react";

const client = createClient();

interface CurrencyPair {
  id: number;
  base_currency: string;
  quote_currency: string;
  pair_name: string;
  is_active: boolean;
}

interface FeeSetting {
  id: number;
  pair_id: number;
  fee_amount: number;
  fee_percentage: number;
  fee_currency: string;
  deposit_currency: string;
}

interface TransactionRecord {
  id: number;
  amount: number;
  currency: string;
  payment_method: string;
  wallet_address: string;
  status: string;
  notes: string;
  created_at: string;
}

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
  bank_transfer: { name: "تحويل بنكي", icon: "🏦" },
  baridimob: { name: "بريدي موب", icon: "📱" },
};

const STATUS_OPTIONS = [
  { value: "all", label: "الكل" },
  { value: "pending", label: "معلق" },
  { value: "completed", label: "مكتمل" },
  { value: "rejected", label: "مرفوض" },
];

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

function TransactionManager({
  type,
  entityName,
}: {
  type: "withdrawal" | "deposit";
  entityName: "withdrawals" | "deposits";
}) {
  const [records, setRecords] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const isWithdrawal = type === "withdrawal";
  const title = isWithdrawal ? "طلبات السحب" : "طلبات الإيداع";
  const icon = isWithdrawal ? (
    <ArrowDownToLine className="h-5 w-5 text-green-400" />
  ) : (
    <ArrowUpFromLine className="h-5 w-5 text-blue-400" />
  );

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const entity =
        entityName === "withdrawals"
          ? client.entities.withdrawals
          : client.entities.deposits;
      const response = await entity.queryAll({
        query: {},
        sort: "-created_at",
        limit: 100,
      });
      if (response?.data?.items) {
        setRecords(response.data.items);
      }
    } catch (err) {
      console.error(`Error fetching ${entityName}:`, err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleStatusChange = async (
    recordId: number,
    newStatus: string
  ) => {
    setUpdatingId(recordId);
    try {
      const entity =
        entityName === "withdrawals"
          ? client.entities.withdrawals
          : client.entities.deposits;
      await entity.update({
        id: String(recordId),
        data: { status: newStatus },
      });
      toast.success(
        `تم تحديث الحالة إلى "${statusConfig[newStatus]?.label || newStatus}"`
      );
      await fetchRecords();
    } catch (err) {
      console.error("Error updating status:", err);
      toast.error("حدث خطأ أثناء تحديث الحالة");
    }
    setUpdatingId(null);
  };

  const filteredRecords = records.filter((r) => {
    const matchesStatus =
      statusFilter === "all" || r.status === statusFilter;
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
  const completedCount = records.filter(
    (r) => r.status === "completed"
  ).length;
  const rejectedCount = records.filter(
    (r) => r.status === "rejected"
  ).length;
  const totalAmount = records
    .filter((r) => r.status === "completed")
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
          <p className="text-gray-400 text-xs">
            إجمالي المبالغ المكتملة
          </p>
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
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    className="text-white"
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            onClick={fetchRecords}
            className="border-[#374151] text-gray-300 hover:text-white hover:bg-[#374151]"
          >
            <RefreshCw className="h-4 w-4 ml-1" />
            تحديث
          </Button>
        </div>
      </Card>

      {/* Records List */}
      {loading ? (
        <div className="text-center py-12">
          <RefreshCw className="h-8 w-8 text-gray-600 mx-auto animate-spin" />
          <p className="text-gray-400 mt-3">جاري التحميل...</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <Card className="bg-[#1F2937] border-[#374151] p-12 text-center">
          {icon}
          <p className="text-gray-400 mt-3">لا توجد طلبات</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredRecords.map((record) => {
            const status =
              statusConfig[record.status] || statusConfig.pending;
            const methodInfo = PAYMENT_METHODS_MAP[record.payment_method];
            return (
              <Card
                key={record.id}
                className="bg-[#1F2937] border-[#374151] p-4"
              >
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
                          onClick={() =>
                            handleStatusChange(record.id, "completed")
                          }
                          disabled={updatingId === record.id}
                          className="bg-green-600 hover:bg-green-700 text-white text-xs"
                        >
                          {updatingId === record.id ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3 w-3 ml-1" />
                          )}
                          قبول
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleStatusChange(record.id, "rejected")
                          }
                          disabled={updatingId === record.id}
                          className="border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs"
                        >
                          {updatingId === record.id ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <XCircle className="h-3 w-3 ml-1" />
                          )}
                          رفض
                        </Button>
                      </>
                    )}
                    {record.status === "completed" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleStatusChange(record.id, "pending")
                        }
                        disabled={updatingId === record.id}
                        className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 text-xs"
                      >
                        إعادة للمعلق
                      </Button>
                    )}
                    {record.status === "rejected" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleStatusChange(record.id, "pending")
                        }
                        disabled={updatingId === record.id}
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

export default function AdminPage() {
  const [user, setUser] = useState<any>(null);
  const [pairs, setPairs] = useState<CurrencyPair[]>([]);
  const [fees, setFees] = useState<FeeSetting[]>([]);
  const [loading, setLoading] = useState(true);

  // New pair form
  const [newBase, setNewBase] = useState("");
  const [newQuote, setNewQuote] = useState("");

  // Fee editing
  const [editingFees, setEditingFees] = useState<Record<number, number>>({});
  const [editingFeePercentage, setEditingFeePercentage] = useState<Record<number, number>>({});
  const [editingFeeAmount, setEditingFeeAmount] = useState<Record<number, number>>({});
  const [editingDepositCurrency, setEditingDepositCurrency] = useState<
    Record<number, string>
  >({});
  const [globalDepositCurrency, setGlobalDepositCurrency] = useState("USD");
  const [globalFeePercentage, setGlobalFeePercentage] = useState<number>(0.33);
  const [globalFeeAmount, setGlobalFeeAmount] = useState<number>(0);
  const [applyingGlobalFee, setApplyingGlobalFee] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await client.auth.me();
        if (res?.data) {
          setUser(res.data);
          await fetchData();
        }
      } catch {
        setUser(null);
      }
      setLoading(false);
    };
    init();
  }, []);

  const fetchData = async () => {
    try {
      const pairsRes = await client.entities.currency_pairs.query({
        query: {},
        limit: 100,
      });
      if (pairsRes?.data?.items) {
        setPairs(pairsRes.data.items);
      }

      const feesRes = await client.entities.fee_settings.query({
        query: {},
        limit: 100,
      });
      if (feesRes?.data?.items) {
        setFees(feesRes.data.items);
        const feeMap: Record<number, number> = {};
        const pctMap: Record<number, number> = {};
        const amtMap: Record<number, number> = {};
        const depMap: Record<number, string> = {};
        feesRes.data.items.forEach((f: FeeSetting) => {
          feeMap[f.pair_id] = f.fee_amount;
          pctMap[f.pair_id] = f.fee_percentage || 0;
          amtMap[f.pair_id] = f.fee_amount || 0;
          depMap[f.pair_id] = f.deposit_currency || "USD";
        });
        setEditingFees(feeMap);
        setEditingFeePercentage(pctMap);
        setEditingFeeAmount(amtMap);
        setEditingDepositCurrency(depMap);
        if (feesRes.data.items.length > 0) {
          setGlobalDepositCurrency(
            feesRes.data.items[0].deposit_currency || "USD"
          );
        }
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  const handleAddPair = async () => {
    if (!newBase || !newQuote || newBase === newQuote) return;
    try {
      await client.entities.currency_pairs.create({
        data: {
          base_currency: newBase.toUpperCase(),
          quote_currency: newQuote.toUpperCase(),
          pair_name: `${newBase.toUpperCase()}/${newQuote.toUpperCase()}`,
          is_active: true,
        },
      });
      setNewBase("");
      setNewQuote("");
      await fetchData();
    } catch (err) {
      console.error("Error adding pair:", err);
    }
  };

  const handleDeletePair = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذا الزوج؟")) return;
    try {
      await client.entities.currency_pairs.delete({ id: String(id) });
      await fetchData();
    } catch (err) {
      console.error("Error deleting pair:", err);
    }
  };

  const handleUpdateFee = async (pairId: number) => {
    const feePercentage = editingFeePercentage[pairId] ?? 0;
    const feeFixedAmount = editingFeeAmount[pairId] ?? 0;

    try {
      const existingFee = fees.find((f) => f.pair_id === pairId);
      if (existingFee) {
        await client.entities.fee_settings.update({
          id: String(existingFee.id),
          data: {
            fee_amount: feeFixedAmount,
            fee_percentage: feePercentage,
            deposit_currency: globalDepositCurrency,
            fee_currency: globalDepositCurrency,
          },
        });
      } else {
        await client.entities.fee_settings.create({
          data: {
            pair_id: pairId,
            fee_amount: feeFixedAmount,
            fee_percentage: feePercentage,
            fee_currency: globalDepositCurrency,
            deposit_currency: globalDepositCurrency,
          },
        });
      }
      await fetchData();
      toast.success("تم تحديث الرسوم بنجاح!");
    } catch (err) {
      console.error("Error updating fee:", err);
      toast.error("حدث خطأ أثناء تحديث الرسوم");
    }
  };

  const handleUpdateGlobalDepositCurrency = async (currency: string) => {
    setGlobalDepositCurrency(currency);
    try {
      for (const fee of fees) {
        await client.entities.fee_settings.update({
          id: String(fee.id),
          data: { deposit_currency: currency, fee_currency: currency },
        });
      }
      await fetchData();
      toast.success(`تم تحديث عملة الإيداع إلى ${currency} لجميع الأزواج`);
    } catch (err) {
      console.error("Error updating global deposit currency:", err);
      toast.error("حدث خطأ أثناء تحديث عملة الإيداع");
    }
  };

  const handleApplyGlobalFee = async () => {
    if (globalFeePercentage < 0 && globalFeeAmount < 0) return;
    setApplyingGlobalFee(true);
    try {
      for (const pair of pairs) {
        const existingFee = fees.find((f) => f.pair_id === pair.id);
        if (existingFee) {
          await client.entities.fee_settings.update({
            id: String(existingFee.id),
            data: {
              fee_amount: globalFeeAmount,
              fee_percentage: globalFeePercentage,
              deposit_currency: globalDepositCurrency,
              fee_currency: globalDepositCurrency,
            },
          });
        } else {
          await client.entities.fee_settings.create({
            data: {
              pair_id: pair.id,
              fee_amount: globalFeeAmount,
              fee_percentage: globalFeePercentage,
              fee_currency: globalDepositCurrency,
              deposit_currency: globalDepositCurrency,
            },
          });
        }
      }
      await fetchData();
      const parts = [];
      if (globalFeePercentage > 0) parts.push(`نسبة ${globalFeePercentage}%`);
      if (globalFeeAmount > 0) parts.push(`مبلغ ثابت ${globalFeeAmount} ${globalDepositCurrency}`);
      toast.success(`تم تطبيق ${parts.join(" + ") || "الرسوم"} على جميع الأزواج بنجاح!`);
    } catch (err) {
      console.error("Error applying global fee:", err);
      toast.error("حدث خطأ أثناء تطبيق الرسوم الموحدة");
    }
    setApplyingGlobalFee(false);
  };

  if (!user && !loading) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] text-white" dir="rtl">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <Settings className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">لوحة التحكم</h2>
          <p className="text-gray-400 mb-6">
            يرجى تسجيل الدخول للوصول إلى لوحة التحكم
          </p>
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

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">لوحة التحكم</h1>
            <p className="text-gray-400 text-sm mt-1">
              إدارة أزواج العملات والرسوم وطلبات السحب والإيداع
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => window.location.href = "/admin/sub-admins"}
              className="border-purple-500/30 text-purple-300 hover:text-white hover:bg-purple-600/20"
            >
              <Settings className="h-4 w-4 ml-2" />
              المسؤولين الفرعيين
            </Button>
            <Button
              variant="outline"
              onClick={fetchData}
              className="border-[#374151] text-gray-300 hover:text-white hover:bg-[#1F2937]"
            >
              <RefreshCw className="h-4 w-4 ml-2" />
              تحديث
            </Button>
          </div>
        </div>

        <Tabs defaultValue="withdrawals" className="space-y-6">
          <TabsList className="bg-[#1F2937] border border-[#374151]">
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
              value="pairs"
              className="data-[state=active]:bg-amber-500 data-[state=active]:text-black"
            >
              أزواج العملات
            </TabsTrigger>
            <TabsTrigger
              value="fees"
              className="data-[state=active]:bg-amber-500 data-[state=active]:text-black"
            >
              إعدادات الرسوم
            </TabsTrigger>
          </TabsList>

          {/* Withdrawals Tab */}
          <TabsContent value="withdrawals">
            <TransactionManager type="withdrawal" entityName="withdrawals" />
          </TabsContent>

          {/* Deposits Tab */}
          <TabsContent value="deposits">
            <TransactionManager type="deposit" entityName="deposits" />
          </TabsContent>

          {/* Pairs Tab */}
          <TabsContent value="pairs" className="space-y-6">
            <Card className="bg-[#1F2937] border-[#374151] p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Plus className="h-5 w-5 text-amber-400" />
                إضافة زوج جديد
              </h3>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <Label className="text-gray-400 text-sm">
                    العملة الأساسية
                  </Label>
                  <Input
                    value={newBase}
                    onChange={(e) => setNewBase(e.target.value)}
                    placeholder="مثال: XAU"
                    className="bg-[#111827] border-[#374151] text-white mt-1"
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-gray-400 text-sm">عملة التسعير</Label>
                  <Input
                    value={newQuote}
                    onChange={(e) => setNewQuote(e.target.value)}
                    placeholder="مثال: USD"
                    className="bg-[#111827] border-[#374151] text-white mt-1"
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

            <div className="space-y-3">
              {pairs.map((pair) => (
                <Card
                  key={pair.id}
                  className="bg-[#1F2937] border-[#374151]"
                >
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
                            ? "bg-green-500/20 text-green-400 border-green-500/30"
                            : "bg-red-500/20 text-red-400 border-red-500/30"
                        }
                      >
                        {pair.is_active ? "نشط" : "معطل"}
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
          </TabsContent>

          {/* Fees Tab */}
          <TabsContent value="fees" className="space-y-3">
            <Card className="bg-[#1F2937] border-amber-500/30 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <h3 className="font-bold text-amber-400 flex items-center gap-2">
                    💰 عملة الإيداع للموقع
                  </h3>
                  <p className="text-gray-400 text-sm mt-1">
                    مبلغ الخصم على الرسوم يحول إلى عملة الإيداع للموقع سواء
                    كانت USD أو EUR
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Select
                    value={globalDepositCurrency}
                    onValueChange={handleUpdateGlobalDepositCurrency}
                  >
                    <SelectTrigger className="w-32 bg-[#111827] border-amber-500/30 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1F2937] border-[#374151]">
                      <SelectItem value="USD" className="text-white">
                        🇺🇸 USD
                      </SelectItem>
                      <SelectItem value="EUR" className="text-white">
                        🇪🇺 EUR
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                    {globalDepositCurrency}
                  </Badge>
                </div>
              </div>
            </Card>

            <Card className="bg-[#1F2937] border-[#374151] p-4">
              <div className="space-y-3">
                <p className="text-amber-400 text-sm font-semibold">
                  ⚡ نظام الرسوم المزدوج (نسبة مئوية + مبلغ ثابت)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-[#111827] rounded-lg p-3 border border-amber-500/20">
                    <p className="text-amber-400 text-xs font-bold mb-1">📊 النسبة المئوية (%)</p>
                    <p className="text-gray-400 text-xs">
                      يتم خصم نسبة من المبلغ المحول. مثال: نسبة 2% على 1000 = خصم 20.
                    </p>
                  </div>
                  <div className="bg-[#111827] rounded-lg p-3 border border-blue-500/20">
                    <p className="text-blue-400 text-xs font-bold mb-1">💵 المبلغ الثابت</p>
                    <p className="text-gray-400 text-xs">
                      يتم خصم مبلغ محدد بعملة الإيداع. مثال: مبلغ ثابت 5 USD يُخصم من كل عملية.
                    </p>
                  </div>
                </div>
                <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-2">
                  <p className="text-green-400 text-xs">
                    <strong>ملاحظة:</strong> إذا تم تحديد نسبة مئوية أكبر من 0، يتم استخدامها أولاً. إذا كانت النسبة = 0 ويوجد مبلغ ثابت، يتم استخدام المبلغ الثابت. يمكنك تخصيص إعدادات مختلفة لكل زوج عملات.
                  </p>
                </div>
              </div>
            </Card>

            {/* Global Default Fee Setting */}
            <Card className="bg-gradient-to-r from-[#1F2937] to-[#1a2540] border-amber-500/40 p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-amber-400" />
                  <h3 className="font-bold text-amber-400">
                    تعيين رسوم موحدة لجميع الأزواج
                  </h3>
                </div>
                <p className="text-gray-400 text-sm">
                  حدد نسبة مئوية و/أو مبلغ ثابت لتطبيقها على جميع أزواج العملات دفعة واحدة
                </p>

                {/* Percentage Section */}
                <div className="bg-[#111827] rounded-lg p-4 border border-amber-500/20">
                  <p className="text-amber-400 text-xs font-bold mb-3">📊 النسبة المئوية (%)</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {[0, 0.33, 0.5, 1, 1.5, 2, 3, 5].map((pct) => (
                      <Button
                        key={pct}
                        variant="outline"
                        size="sm"
                        onClick={() => setGlobalFeePercentage(pct)}
                        className={`font-mono font-bold transition-all ${
                          globalFeePercentage === pct
                            ? "bg-amber-500 text-black border-amber-500 hover:bg-amber-600"
                            : "border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
                        }`}
                      >
                        {pct === 0 ? "بدون" : `${pct}%`}
                      </Button>
                    ))}
                  </div>
                  <div className="relative max-w-[200px]">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={globalFeePercentage}
                      onChange={(e) =>
                        setGlobalFeePercentage(parseFloat(e.target.value) || 0)
                      }
                      placeholder="نسبة مخصصة"
                      className="bg-[#0D1117] border-amber-500/30 text-white font-mono pl-8 text-lg"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400 font-bold">%</span>
                  </div>
                </div>

                {/* Fixed Amount Section */}
                <div className="bg-[#111827] rounded-lg p-4 border border-blue-500/20">
                  <p className="text-blue-400 text-xs font-bold mb-3">💵 المبلغ الثابت ({globalDepositCurrency})</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {[0, 1, 2, 5, 10, 25, 50].map((amt) => (
                      <Button
                        key={amt}
                        variant="outline"
                        size="sm"
                        onClick={() => setGlobalFeeAmount(amt)}
                        className={`font-mono font-bold transition-all ${
                          globalFeeAmount === amt
                            ? "bg-blue-500 text-white border-blue-500 hover:bg-blue-600"
                            : "border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300"
                        }`}
                      >
                        {amt === 0 ? "بدون" : `${amt}`}
                      </Button>
                    ))}
                  </div>
                  <div className="relative max-w-[200px]">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={globalFeeAmount}
                      onChange={(e) =>
                        setGlobalFeeAmount(parseFloat(e.target.value) || 0)
                      }
                      placeholder="مبلغ مخصص"
                      className="bg-[#0D1117] border-blue-500/30 text-white font-mono pl-14 text-lg"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 font-bold text-sm">{globalDepositCurrency}</span>
                  </div>
                </div>

                {/* Summary + Apply */}
                <div className="flex items-center justify-between gap-3 bg-[#111827] rounded-lg p-3 border border-[#374151]">
                  <div className="flex items-center gap-3 flex-wrap">
                    {globalFeePercentage > 0 && (
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 font-mono">
                        نسبة: {globalFeePercentage}%
                      </Badge>
                    )}
                    {globalFeeAmount > 0 && (
                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 font-mono">
                        ثابت: {globalFeeAmount} {globalDepositCurrency}
                      </Badge>
                    )}
                    {globalFeePercentage === 0 && globalFeeAmount === 0 && (
                      <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">
                        بدون رسوم
                      </Badge>
                    )}
                  </div>
                  <Button
                    onClick={handleApplyGlobalFee}
                    disabled={applyingGlobalFee}
                    className="bg-amber-500 hover:bg-amber-600 text-black font-bold px-6"
                  >
                    {applyingGlobalFee ? (
                      <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 ml-2" />
                    )}
                    تطبيق على الكل
                  </Button>
                </div>
              </div>
            </Card>

            {/* Per-pair fee settings */}
            <div className="space-y-3">
              <p className="text-gray-400 text-sm font-semibold px-1">
                📋 إعدادات الرسوم لكل زوج (يمكنك تخصيص نسبة ومبلغ ثابت مختلف لكل زوج)
              </p>
              {pairs.map((pair) => {
                const fee = fees.find((f) => f.pair_id === pair.id);
                const currentPct = fee?.fee_percentage || 0;
                const currentFixedAmt = fee?.fee_amount || 0;
                const PRESET_PERCENTAGES = [0, 0.5, 1, 2, 3, 5];
                const PRESET_AMOUNTS = [0, 1, 5, 10, 25];
                return (
                  <Card
                    key={pair.id}
                    className="bg-[#1F2937] border-[#374151]"
                  >
                    <div className="p-4">
                      <div className="flex flex-col gap-3">
                        {/* Pair Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                              <span className="text-amber-400 font-bold text-sm">
                                {pair.base_currency.slice(0, 2)}
                              </span>
                            </div>
                            <div>
                              <p className="font-bold text-white">{pair.pair_name}</p>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <p className="text-xs text-gray-400">
                                  النسبة:{" "}
                                  {currentPct > 0 ? (
                                    <span className="text-amber-400 font-mono font-bold">{currentPct}%</span>
                                  ) : (
                                    <span className="text-gray-500">0</span>
                                  )}
                                </p>
                                <span className="text-gray-600">|</span>
                                <p className="text-xs text-gray-400">
                                  ثابت:{" "}
                                  {currentFixedAmt > 0 ? (
                                    <span className="text-blue-400 font-mono font-bold">{currentFixedAmt} {globalDepositCurrency}</span>
                                  ) : (
                                    <span className="text-gray-500">0</span>
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {currentPct > 0 && (
                              <Badge className={`font-mono text-xs ${
                                currentPct >= 3
                                  ? "bg-red-500/20 text-red-400 border-red-500/30"
                                  : currentPct >= 1
                                  ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                                  : "bg-green-500/20 text-green-400 border-green-500/30"
                              }`}>
                                {currentPct}%
                              </Badge>
                            )}
                            {currentFixedAmt > 0 && (
                              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 font-mono text-xs">
                                {currentFixedAmt} {globalDepositCurrency}
                              </Badge>
                            )}
                            {currentPct === 0 && currentFixedAmt === 0 && (
                              <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs">
                                بدون رسوم
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Percentage Row */}
                        <div className="bg-[#111827] rounded-lg p-3 border border-amber-500/10">
                          <p className="text-amber-400 text-xs font-bold mb-2">📊 النسبة المئوية</p>
                          <div className="flex flex-wrap items-center gap-2">
                            {PRESET_PERCENTAGES.map((pct) => (
                              <Button
                                key={pct}
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingFeePercentage((prev) => ({
                                    ...prev,
                                    [pair.id]: pct,
                                  }));
                                }}
                                className={`text-xs font-mono h-7 px-2 transition-all ${
                                  editingFeePercentage[pair.id] === pct
                                    ? "bg-amber-500 text-black border-amber-500"
                                    : "border-[#374151] text-gray-300 hover:border-amber-500/50 hover:text-amber-400"
                                }`}
                              >
                                {pct === 0 ? "بدون" : `${pct}%`}
                              </Button>
                            ))}
                            <div className="relative">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={editingFeePercentage[pair.id] ?? ""}
                                onChange={(e) =>
                                  setEditingFeePercentage((prev) => ({
                                    ...prev,
                                    [pair.id]: parseFloat(e.target.value) || 0,
                                  }))
                                }
                                placeholder="مخصص"
                                className="w-24 h-7 bg-[#0D1117] border-amber-500/30 text-white font-mono text-xs pl-6"
                              />
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-amber-400 font-bold text-xs">%</span>
                            </div>
                          </div>
                        </div>

                        {/* Fixed Amount Row */}
                        <div className="bg-[#111827] rounded-lg p-3 border border-blue-500/10">
                          <p className="text-blue-400 text-xs font-bold mb-2">💵 المبلغ الثابت ({globalDepositCurrency})</p>
                          <div className="flex flex-wrap items-center gap-2">
                            {PRESET_AMOUNTS.map((amt) => (
                              <Button
                                key={amt}
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingFeeAmount((prev) => ({
                                    ...prev,
                                    [pair.id]: amt,
                                  }));
                                }}
                                className={`text-xs font-mono h-7 px-2 transition-all ${
                                  editingFeeAmount[pair.id] === amt
                                    ? "bg-blue-500 text-white border-blue-500"
                                    : "border-[#374151] text-gray-300 hover:border-blue-500/50 hover:text-blue-400"
                                }`}
                              >
                                {amt === 0 ? "بدون" : `${amt}`}
                              </Button>
                            ))}
                            <div className="relative">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={editingFeeAmount[pair.id] ?? ""}
                                onChange={(e) =>
                                  setEditingFeeAmount((prev) => ({
                                    ...prev,
                                    [pair.id]: parseFloat(e.target.value) || 0,
                                  }))
                                }
                                placeholder="مخصص"
                                className="w-28 h-7 bg-[#0D1117] border-blue-500/30 text-white font-mono text-xs pl-10"
                              />
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-blue-400 font-bold text-[10px]">{globalDepositCurrency}</span>
                            </div>
                          </div>
                        </div>

                        {/* Save Button */}
                        <div className="flex items-center justify-end">
                          <Button
                            onClick={() => handleUpdateFee(pair.id)}
                            size="sm"
                            className="bg-amber-500 hover:bg-amber-600 text-black font-bold h-8 px-4 text-xs"
                          >
                            <Save className="h-3 w-3 ml-1" />
                            حفظ الرسوم
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
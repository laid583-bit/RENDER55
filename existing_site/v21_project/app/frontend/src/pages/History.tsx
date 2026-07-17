import { useState, useEffect, useCallback } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  History,
  Download,
  Filter,
  ArrowLeft,
  Calendar,
  RefreshCw,
  FileSpreadsheet,
  Search,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";

const client = createClient();

const CURRENCIES = [
  "USD", "EUR", "GBP", "JPY", "NZD",
  "XAU", "XAG", "OIL", "XCU",
  "BTC", "ETH", "DOGE", "SOL", "SHIB", "PEPE", "NEAR",
  "TSLA", "NVDA", "IXIC",
];

const CURRENCY_FLAGS: Record<string, string> = {
  USD: "🇺🇸", EUR: "🇪🇺", GBP: "🇬🇧", JPY: "🇯🇵", NZD: "🇳🇿",
  XAU: "🥇", XAG: "🥈", OIL: "🛢️", XCU: "🔶",
  BTC: "₿", ETH: "⟠", DOGE: "🐕", SOL: "◎", SHIB: "🐕‍🦺", PEPE: "🐸", NEAR: "Ⓝ",
  TSLA: "🚗", NVDA: "💻", IXIC: "📈",
};

interface ConversionRecord {
  id: number;
  from_currency: string;
  to_currency: string;
  from_amount: number;
  to_amount: number;
  exchange_rate: number;
  fee_amount: number;
  fee_percentage: number;
  fee_currency: string;
  status: string;
  created_at: string;
}

const PAGE_SIZE = 15;

const formatNumber = (num: number, currency: string) => {
  if (["BTC", "SHIB", "PEPE"].includes(currency)) return num.toFixed(8);
  if (["XAU", "XAG", "ETH"].includes(currency)) return num.toFixed(4);
  if (currency === "JPY") return num.toFixed(3);
  return num.toFixed(2);
};

const formatRate = (num: number) => {
  if (num === 0) return "0";
  if (num < 0.01) return num.toFixed(8);
  if (num < 1) return num.toFixed(6);
  if (num > 1000) return num.toFixed(2);
  return num.toFixed(5);
};

export default function HistoryPage() {
  const [user, setUser] = useState<any>(null);
  const [records, setRecords] = useState<ConversionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);

  // Filters
  const [filterPair, setFilterPair] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await client.auth.me();
        if (res?.data) setUser(res.data);
      } catch {
        setUser(null);
      }
    };
    checkAuth();
  }, []);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const query: Record<string, any> = {};
      if (filterPair !== "all") {
        const [from, to] = filterPair.split("/");
        query.from_currency = from;
        query.to_currency = to;
      }

      const res = await client.entities.conversions.query({
        query,
        sort: "-created_at",
        limit: PAGE_SIZE,
        skip: page * PAGE_SIZE,
      });

      if (res?.data?.items) {
        let items = res.data.items as ConversionRecord[];

        // Client-side date filtering
        if (filterDateFrom) {
          const fromDate = new Date(filterDateFrom);
          items = items.filter((r) => new Date(r.created_at) >= fromDate);
        }
        if (filterDateTo) {
          const toDate = new Date(filterDateTo);
          toDate.setHours(23, 59, 59, 999);
          items = items.filter((r) => new Date(r.created_at) <= toDate);
        }

        // Client-side search
        if (filterSearch) {
          const search = filterSearch.toLowerCase();
          items = items.filter(
            (r) =>
              r.from_currency.toLowerCase().includes(search) ||
              r.to_currency.toLowerCase().includes(search) ||
              String(r.from_amount).includes(search) ||
              String(r.to_amount).includes(search)
          );
        }

        setRecords(items);
        setTotalCount(res.data.total || items.length);
      }
    } catch (err) {
      console.error("Error fetching conversions:", err);
    } finally {
      setLoading(false);
    }
  }, [filterPair, filterDateFrom, filterDateTo, filterSearch, page]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Get unique pairs from records for filter dropdown
  const getUniquePairs = () => {
    const pairs = new Set<string>();
    CURRENCIES.forEach((from) => {
      CURRENCIES.forEach((to) => {
        if (from !== to) pairs.add(`${from}/${to}`);
      });
    });
    return Array.from(pairs).slice(0, 50); // Limit for performance
  };

  // Common pairs for quick filter
  const commonPairs = [
    "USD/EUR", "USD/GBP", "XAU/USD", "BTC/USD",
    "ETH/USD", "TSLA/USD", "NVDA/USD", "EUR/GBP",
  ];

  const handleExportCSV = () => {
    if (records.length === 0) return;

    const headers = [
      "رقم", "من", "إلى", "المبلغ المصدر", "المبلغ الناتج",
      "سعر الصرف", "نسبة الرسوم %", "مبلغ الرسوم", "عملة الرسوم", "الحالة", "التاريخ",
    ];

    const csvRows = [
      headers.join(","),
      ...records.map((r) =>
        [
          r.id,
          r.from_currency,
          r.to_currency,
          r.from_amount,
          r.to_amount,
          r.exchange_rate,
          r.fee_percentage || 0,
          r.fee_amount || 0,
          r.fee_currency || "",
          r.status || "completed",
          r.created_at ? new Date(r.created_at).toLocaleString("ar-SA") : "",
        ].join(",")
      ),
    ];

    const csvContent = "\uFEFF" + csvRows.join("\n"); // BOM for Arabic support
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `conversions_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    if (records.length === 0) return;
    const jsonContent = JSON.stringify(records, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `conversions_${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleString("ar-SA", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  // Summary stats
  const totalVolume = records.reduce((sum, r) => sum + (r.from_amount || 0), 0);
  const totalFees = records.reduce((sum, r) => sum + (r.fee_amount || 0), 0);

  return (
    <div className="min-h-screen bg-[#0A0F1C] text-white" dir="rtl">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center">
              <History className="h-6 w-6 text-amber-400" />
            </div>
            <h1 className="text-3xl font-bold">سجل التحويلات</h1>
          </div>
          <p className="text-gray-400">
            عرض جميع التحويلات السابقة مع إمكانية الفلترة والتصدير
          </p>
        </div>

        {!user ? (
          <Card className="bg-[#1F2937]/90 border-[#374151] p-8 text-center max-w-md mx-auto">
            <History className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">تسجيل الدخول مطلوب</h2>
            <p className="text-gray-400 mb-4">
              يرجى تسجيل الدخول لعرض سجل التحويلات الخاص بك
            </p>
            <Button
              onClick={() => client.auth.toLogin()}
              className="bg-amber-500 hover:bg-amber-600 text-black font-bold"
            >
              تسجيل الدخول
            </Button>
          </Card>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <Card className="bg-[#1F2937]/90 border-[#374151] p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">إجمالي التحويلات</p>
                <p className="text-2xl font-bold font-mono text-amber-400">
                  {totalCount}
                </p>
              </Card>
              <Card className="bg-[#1F2937]/90 border-[#374151] p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">حجم التداول (هذه الصفحة)</p>
                <p className="text-2xl font-bold font-mono text-green-400">
                  {totalVolume.toFixed(2)}
                </p>
              </Card>
              <Card className="bg-[#1F2937]/90 border-[#374151] p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">إجمالي الرسوم (هذه الصفحة)</p>
                <p className="text-2xl font-bold font-mono text-red-400">
                  {totalFees.toFixed(4)}
                </p>
              </Card>
            </div>

            {/* Filters */}
            <Card className="bg-[#1F2937]/90 border-[#374151] p-4 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="h-5 w-5 text-amber-400" />
                <span className="text-white font-semibold">فلترة وبحث</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                {/* Pair Filter */}
                <div className="space-y-1">
                  <Label className="text-gray-400 text-xs">زوج العملات</Label>
                  <Select value={filterPair} onValueChange={(v) => { setFilterPair(v); setPage(0); }}>
                    <SelectTrigger className="bg-[#111827] border-[#374151] text-white">
                      <SelectValue placeholder="جميع الأزواج" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1F2937] border-[#374151] max-h-80">
                      <SelectItem value="all" className="text-white hover:bg-[#374151]">
                        جميع الأزواج
                      </SelectItem>
                      {commonPairs.map((pair) => {
                        const [from, to] = pair.split("/");
                        return (
                          <SelectItem key={pair} value={pair} className="text-white hover:bg-[#374151]">
                            <span className="flex items-center gap-2">
                              {CURRENCY_FLAGS[from]} {from} / {CURRENCY_FLAGS[to]} {to}
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date From */}
                <div className="space-y-1">
                  <Label className="text-gray-400 text-xs flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> من تاريخ
                  </Label>
                  <Input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => { setFilterDateFrom(e.target.value); setPage(0); }}
                    className="bg-[#111827] border-[#374151] text-white"
                  />
                </div>

                {/* Date To */}
                <div className="space-y-1">
                  <Label className="text-gray-400 text-xs flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> إلى تاريخ
                  </Label>
                  <Input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => { setFilterDateTo(e.target.value); setPage(0); }}
                    className="bg-[#111827] border-[#374151] text-white"
                  />
                </div>

                {/* Search */}
                <div className="space-y-1">
                  <Label className="text-gray-400 text-xs flex items-center gap-1">
                    <Search className="h-3 w-3" /> بحث
                  </Label>
                  <Input
                    type="text"
                    placeholder="بحث بالعملة أو المبلغ..."
                    value={filterSearch}
                    onChange={(e) => { setFilterSearch(e.target.value); setPage(0); }}
                    className="bg-[#111827] border-[#374151] text-white"
                  />
                </div>
              </div>

              {/* Quick Pair Filters */}
              <div className="flex flex-wrap gap-2 mb-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setFilterPair("all"); setPage(0); }}
                  className={`text-xs h-7 ${filterPair === "all" ? "bg-amber-500/20 text-amber-400" : "text-gray-400 hover:text-white"}`}
                >
                  الكل
                </Button>
                {commonPairs.map((pair) => (
                  <Button
                    key={pair}
                    variant="ghost"
                    size="sm"
                    onClick={() => { setFilterPair(pair); setPage(0); }}
                    className={`text-xs h-7 ${filterPair === pair ? "bg-amber-500/20 text-amber-400" : "text-gray-400 hover:text-white"}`}
                  >
                    {CURRENCY_FLAGS[pair.split("/")[0]]} {pair}
                  </Button>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={fetchRecords}
                  variant="outline"
                  size="sm"
                  className="border-[#374151] text-gray-300 hover:text-white hover:bg-[#374151]"
                >
                  <RefreshCw className="h-4 w-4 ml-1" />
                  تحديث
                </Button>
                <Button
                  onClick={() => {
                    setFilterPair("all");
                    setFilterDateFrom("");
                    setFilterDateTo("");
                    setFilterSearch("");
                    setPage(0);
                  }}
                  variant="outline"
                  size="sm"
                  className="border-[#374151] text-gray-300 hover:text-white hover:bg-[#374151]"
                >
                  مسح الفلاتر
                </Button>
                <div className="mr-auto flex gap-2">
                  <Button
                    onClick={handleExportCSV}
                    disabled={records.length === 0}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white font-bold"
                  >
                    <Download className="h-4 w-4 ml-1" />
                    تصدير CSV
                  </Button>
                  <Button
                    onClick={handleExportJSON}
                    disabled={records.length === 0}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                  >
                    <FileSpreadsheet className="h-4 w-4 ml-1" />
                    تصدير JSON
                  </Button>
                </div>
              </div>
            </Card>

            {/* Table */}
            <Card className="bg-[#1F2937]/90 border-[#374151] overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <RefreshCw className="h-8 w-8 text-amber-400 animate-spin" />
                  <span className="text-gray-400 mr-3">جاري التحميل...</span>
                </div>
              ) : records.length === 0 ? (
                <div className="text-center py-16">
                  <History className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg">لا توجد تحويلات</p>
                  <p className="text-gray-500 text-sm mt-2">
                    قم بإجراء تحويلات من صفحة المحول لتظهر هنا
                  </p>
                  <Button
                    onClick={() => window.location.href = "/converter"}
                    className="mt-4 bg-amber-500 hover:bg-amber-600 text-black font-bold"
                  >
                    <ArrowLeft className="h-4 w-4 ml-1" />
                    الذهاب للمحول
                  </Button>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-[#374151] hover:bg-transparent">
                          <TableHead className="text-amber-400 text-right">#</TableHead>
                          <TableHead className="text-amber-400 text-right">الزوج</TableHead>
                          <TableHead className="text-amber-400 text-right">المبلغ المصدر</TableHead>
                          <TableHead className="text-amber-400 text-right">المبلغ الناتج</TableHead>
                          <TableHead className="text-amber-400 text-right">سعر الصرف</TableHead>
                          <TableHead className="text-amber-400 text-right">الرسوم</TableHead>
                          <TableHead className="text-amber-400 text-right">الحالة</TableHead>
                          <TableHead className="text-amber-400 text-right">التاريخ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {records.map((record, idx) => (
                          <TableRow
                            key={record.id || idx}
                            className="border-[#374151] hover:bg-[#111827]/50 transition-colors"
                          >
                            <TableCell className="text-gray-500 font-mono text-sm">
                              {page * PAGE_SIZE + idx + 1}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{CURRENCY_FLAGS[record.from_currency] || "💰"}</span>
                                <span className="font-bold text-white text-sm">{record.from_currency}</span>
                                <ArrowLeft className="h-3 w-3 text-amber-400" />
                                <span className="text-lg">{CURRENCY_FLAGS[record.to_currency] || "💰"}</span>
                                <span className="font-bold text-white text-sm">{record.to_currency}</span>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-white">
                              {formatNumber(record.from_amount, record.from_currency)} {record.from_currency}
                            </TableCell>
                            <TableCell className="font-mono text-green-400">
                              {formatNumber(record.to_amount, record.to_currency)} {record.to_currency}
                            </TableCell>
                            <TableCell className="font-mono text-gray-300 text-sm">
                              {formatRate(record.exchange_rate)}
                            </TableCell>
                            <TableCell>
                              {record.fee_amount > 0 ? (
                                <div className="space-y-0.5">
                                  {record.fee_percentage > 0 && (
                                    <span className="font-mono text-amber-400 text-sm font-bold block">
                                      {record.fee_percentage}%
                                    </span>
                                  )}
                                  <span className="font-mono text-amber-400/70 text-xs block">
                                    {record.fee_amount.toFixed(4)} {record.fee_currency || ""}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-500 text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  record.status === "completed"
                                    ? "bg-green-500/20 text-green-400 border-green-500/30"
                                    : record.status === "pending"
                                      ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                                      : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                                }
                              >
                                {record.status === "completed" ? "مكتمل" : record.status === "pending" ? "معلق" : record.status || "مكتمل"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-gray-400 text-sm whitespace-nowrap">
                              {formatDate(record.created_at)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between p-4 border-t border-[#374151]">
                      <div className="text-gray-400 text-sm">
                        صفحة {page + 1} من {totalPages} ({totalCount} تحويل)
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(Math.max(0, page - 1))}
                          disabled={page === 0}
                          className="border-[#374151] text-gray-300 hover:text-white hover:bg-[#374151]"
                        >
                          <ChevronRight className="h-4 w-4" />
                          السابق
                        </Button>
                        <div className="flex gap-1">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            const pageNum = Math.max(0, Math.min(page - 2, totalPages - 5)) + i;
                            if (pageNum >= totalPages) return null;
                            return (
                              <Button
                                key={pageNum}
                                variant="ghost"
                                size="sm"
                                onClick={() => setPage(pageNum)}
                                className={`w-8 h-8 p-0 ${
                                  page === pageNum
                                    ? "bg-amber-500/20 text-amber-400"
                                    : "text-gray-400 hover:text-white"
                                }`}
                              >
                                {pageNum + 1}
                              </Button>
                            );
                          })}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                          disabled={page >= totalPages - 1}
                          className="border-[#374151] text-gray-300 hover:text-white hover:bg-[#374151]"
                        >
                          التالي
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
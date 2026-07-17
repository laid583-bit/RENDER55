import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
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
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Calculator,
  AlertCircle,
  CheckCircle2,
  Zap,
  Play,
  Square,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Equal,
  SkipForward,
  Bell,
  BellRing,
  Trash2,
  BarChart3,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const client = createClient();

const CURRENCIES = [
  // العملات التقليدية
  "USD", "EUR", "GBP", "JPY", "NZD", "DZD",
  // المعادن والسلع
  "XAU", "XAG", "OIL", "XCU",
  // العملات الرقمية
  "USDT", "BTC", "ETH", "DOGE", "SOL", "SHIB", "PEPE", "NEAR",
  // الأسهم
  "TSLA", "NVDA", "IXIC",
];

const CURRENCY_NAMES: Record<string, string> = {
  USD: "دولار أمريكي (USD)",
  EUR: "يورو (EUR)",
  GBP: "جنيه إسترليني (GBP)",
  JPY: "ين ياباني (JPY)",
  NZD: "دولار نيوزيلندي (NZD)",
  DZD: "دينار جزائري (DZD)",
  XAU: "ذهب (XAU)",
  XAG: "فضة (XAG)",
  OIL: "نفط (OIL)",
  XCU: "نحاس (XCU)",
  USDT: "تيثر (USDT)",
  BTC: "بيتكوين (BTC)",
  ETH: "إيثيريوم (ETH)",
  DOGE: "دوجكوين (DOGE)",
  SOL: "سولانا (SOL)",
  SHIB: "شيبا إينو (SHIB)",
  PEPE: "بيبي (PEPE)",
  NEAR: "نير بروتوكول (NEAR)",
  TSLA: "سهم تسلا (TESLA)",
  NVDA: "سهم إنفيديا (NVIDIA)",
  IXIC: "مؤشر ناسداك (NASDAQ)",
};

const CURRENCY_FLAGS: Record<string, string> = {
  USD: "🇺🇸",
  EUR: "🇪🇺",
  GBP: "🇬🇧",
  JPY: "🇯🇵",
  NZD: "🇳🇿",
  DZD: "🇩🇿",
  XAU: "🥇",
  XAG: "🥈",
  OIL: "🛢️",
  XCU: "🔶",
  USDT: "💲",
  BTC: "₿",
  ETH: "⟠",
  DOGE: "🐕",
  SOL: "◎",
  SHIB: "🐕‍🦺",
  PEPE: "🐸",
  NEAR: "Ⓝ",
  TSLA: "🚗",
  NVDA: "💻",
  IXIC: "📈",
};

// Currency categories for grouped display
const CURRENCY_CATEGORIES = [
  { label: "العملات التقليدية", currencies: ["USD", "EUR", "GBP", "JPY", "NZD", "DZD"] },
  { label: "المعادن والسلع", currencies: ["XAU", "XAG", "OIL", "XCU"] },
  { label: "العملات الرقمية", currencies: ["USDT", "BTC", "ETH", "DOGE", "SOL", "SHIB", "PEPE", "NEAR"] },
  { label: "الأسهم والمؤشرات", currencies: ["TSLA", "NVDA", "IXIC"] },
];

const TIMEFRAMES = [
  { value: "1m", label: "1 دقيقة" },
  { value: "5m", label: "5 دقائق" },
  { value: "15m", label: "15 دقيقة" },
  { value: "30m", label: "30 دقيقة" },
  { value: "1h", label: "1 ساعة" },
  { value: "4h", label: "4 ساعات" },
];

interface ConvertResult {
  from_currency: string;
  to_currency: string;
  amount: number;
  exchange_rate: number;
  converted_amount: number;
  fee_amount: number;
  fee_percentage: number;
  fee_fixed_amount: number;
  net_amount: number;
  is_live: boolean;
}

interface RateInfo {
  buy_price: number;
  sell_price: number;
  mid_rate: number;
  spread: number;
  is_live: boolean;
}

interface ExpertResultEntry {
  result: ConvertResult;
  executed: boolean;
  priceDirection: "up" | "down" | "flat" | "first";
  conversionDirection: "forward" | "reverse" | "none";
  previousRate: number;
  currentRate: number;
  timestamp: string;
  risingCurrency: string;
}

interface PriceAlert {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  targetPrice: number;
  direction: "above" | "below";
  active: boolean;
  createdAt: string;
}

interface DepositAlert {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  depositAmount: number;
  active: boolean;
  autoConvert: boolean;
  createdAt: string;
}

interface PercentAlert {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  percentThreshold: number;
  baselineRate: number;
  active: boolean;
  createdAt: string;
}

interface ChartDataPoint {
  time: string;
  buy: number;
  sell: number;
  mid: number;
}

// Helper: format fee/amount based on currency
const formatFee = (num: number, currency: string) => {
  if (["BTC", "SHIB", "PEPE"].includes(currency)) return num.toFixed(8);
  if (["XAU", "XAG", "ETH"].includes(currency)) return num.toFixed(4);
  if (currency === "JPY") return num.toFixed(3);
  return num.toFixed(2);
};

// Generate simulated 24h chart data based on current rate
function generateChartData(
  midRate: number,
  buyPrice: number,
  sellPrice: number,
  timeframe: string
): ChartDataPoint[] {
  const points: ChartDataPoint[] = [];
  let count = 24;
  let stepMinutes = 60;

  switch (timeframe) {
    case "1m":
      count = 60;
      stepMinutes = 1;
      break;
    case "5m":
      count = 60;
      stepMinutes = 5;
      break;
    case "15m":
      count = 48;
      stepMinutes = 15;
      break;
    case "30m":
      count = 48;
      stepMinutes = 30;
      break;
    case "1h":
      count = 24;
      stepMinutes = 60;
      break;
    case "4h":
      count = 24;
      stepMinutes = 240;
      break;
  }

  const now = new Date();
  const spread = buyPrice - sellPrice;
  const volatility = midRate * 0.002; // 0.2% volatility

  let currentMid = midRate - volatility * 2; // Start slightly lower

  for (let i = 0; i < count; i++) {
    const time = new Date(
      now.getTime() - (count - i) * stepMinutes * 60 * 1000
    );
    const timeStr = `${time.getHours().toString().padStart(2, "0")}:${time.getMinutes().toString().padStart(2, "0")}`;

    // Random walk towards current price
    const progress = i / count;
    const target = midRate;
    const noise = (Math.random() - 0.5) * volatility;
    currentMid = currentMid + (target - currentMid) * 0.1 + noise;

    // Ensure we end near the actual current rate
    if (i === count - 1) {
      currentMid = midRate;
    }

    const halfSpread = spread / 2;
    points.push({
      time: timeStr,
      mid: parseFloat(currentMid.toFixed(6)),
      buy: parseFloat((currentMid + halfSpread).toFixed(6)),
      sell: parseFloat((currentMid - halfSpread).toFixed(6)),
    });
  }

  return points;
}

const ALERTS_STORAGE_KEY = "ttb_price_alerts";
const DEPOSIT_ALERTS_STORAGE_KEY = "ttb_deposit_alerts";
const PERCENT_ALERTS_STORAGE_KEY = "ttb_percent_alerts";
const WATCHLIST_STORAGE_KEY = "ttb_watchlist";

interface WatchlistItem {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  label: string;
}

function loadWatchlist(): WatchlistItem[] {
  try {
    const stored = localStorage.getItem(WATCHLIST_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    /* empty */
  }
  return [];
}

function saveWatchlist(items: WatchlistItem[]) {
  localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(items));
}

function loadAlerts(): PriceAlert[] {
  try {
    const stored = localStorage.getItem(ALERTS_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    /* empty */
  }
  return [];
}

function saveAlerts(alerts: PriceAlert[]) {
  localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts));
}

function loadDepositAlerts(): DepositAlert[] {
  try {
    const stored = localStorage.getItem(DEPOSIT_ALERTS_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    /* empty */
  }
  return [];
}

function saveDepositAlerts(alerts: DepositAlert[]) {
  localStorage.setItem(DEPOSIT_ALERTS_STORAGE_KEY, JSON.stringify(alerts));
}

function loadPercentAlerts(): PercentAlert[] {
  try {
    const stored = localStorage.getItem(PERCENT_ALERTS_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    /* empty */
  }
  return [];
}

function savePercentAlerts(alerts: PercentAlert[]) {
  localStorage.setItem(PERCENT_ALERTS_STORAGE_KEY, JSON.stringify(alerts));
}

export default function ConverterPage() {
  const { pair } = useParams();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [fromCurrency, setFromCurrency] = useState("USD");
  const [toCurrency, setToCurrency] = useState("EUR");
  const [amount, setAmount] = useState("");
  const [result, setResult] = useState<ConvertResult | null>(null);
  const [resultNetInUsd, setResultNetInUsd] = useState<string | null>(null);
  const [resultNetInXau, setResultNetInXau] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("manual");
  const [selectedTimeframe, setSelectedTimeframe] = useState("1h");
  const [depositCurrency, setDepositCurrency] = useState("USD");

  // Rate info for buy/sell display
  const [rateInfo, setRateInfo] = useState<RateInfo | null>(null);
  const [, setRateLoading] = useState(false);

  // Equivalent value display
  const [equivalentForward, setEquivalentForward] = useState<string | null>(
    null
  );
  const [equivalentReverse, setEquivalentReverse] = useState<string | null>(
    null
  );

  // Expert mode state
  const [expertRunning, setExpertRunning] = useState(false);
  const [expertEntries, setExpertEntries] = useState<ExpertResultEntry[]>([]);
  const [expertExecutedCount, setExpertExecutedCount] = useState(0);
  const [expertSkippedCount, setExpertSkippedCount] = useState(0);
  const [expertFeeByCurrency, setExpertFeeByCurrency] = useState<Record<string, number>>({});
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previousRateRef = useRef<number | null>(null);

  // Price alerts state
  const [alerts, setAlerts] = useState<PriceAlert[]>(loadAlerts);
  const [alertTargetPrice, setAlertTargetPrice] = useState("");
  const [alertDirection, setAlertDirection] = useState<"above" | "below">(
    "above"
  );
  const alertCheckedRef = useRef<Set<string>>(new Set());

  // Deposit parity alerts state
  const [depositAlerts, setDepositAlerts] = useState<DepositAlert[]>(loadDepositAlerts);
  const [depositAlertAmount, setDepositAlertAmount] = useState("");
  const [depositAlertAutoConvert, setDepositAlertAutoConvert] = useState(false);
  const depositAlertCheckedRef = useRef<Set<string>>(new Set());

  // Percentage alerts state (both currencies rising)
  const [percentAlerts, setPercentAlerts] = useState<PercentAlert[]>(loadPercentAlerts);
  const [percentAlertThreshold, setPercentAlertThreshold] = useState("");
  const percentAlertCheckedRef = useRef<Set<string>>(new Set());

  // Watchlist state
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(loadWatchlist);
  const [watchlistRates, setWatchlistRates] = useState<Record<string, { mid: number; buy: number; sell: number; is_live: boolean }>>({});
  const [watchlistAddFrom, setWatchlistAddFrom] = useState("XAU");
  const [watchlistAddTo, setWatchlistAddTo] = useState("USD");

  // Persistent Expert task state
  const [expertTaskId, setExpertTaskId] = useState<number | null>(null);
  const [loadingExpertTask, setLoadingExpertTask] = useState(false);

  // Ref to hold the latest handleExpertTick so we can call it from useEffect
  const expertTickRef = useRef<() => void>(() => {});

  // Load persisted expert task on mount
  useEffect(() => {
    const loadExpertTask = async () => {
      try {
        const res = await client.entities.expert_tasks.query({
          query: { status: "active" },
          sort: "-created_at",
          limit: 1,
        });
        if (res?.data?.items?.length > 0) {
          const task = res.data.items[0];
          setExpertTaskId(task.id);
          setFromCurrency(task.from_currency);
          setToCurrency(task.to_currency);
          setAmount(String(task.amount));
          setExpertExecutedCount(task.executed_count || 0);
          setExpertSkippedCount(task.skipped_count || 0);
          if (task.total_fees) {
            try {
              setExpertFeeByCurrency(JSON.parse(task.total_fees));
            } catch { /* empty */ }
          }
          if (task.last_rate) {
            previousRateRef.current = task.last_rate;
          }
          // Mark as resumed - the interval will be started by a separate effect
          setExpertRunning(true);
          setActiveTab("expert");
        }
      } catch {
        // Not logged in or no tasks
      }
    };
    loadExpertTask();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start/stop expert interval based on expertRunning state
  useEffect(() => {
    if (expertRunning && !intervalRef.current) {
      // Use a small delay to ensure expertTickRef is populated
      const startTimeout = setTimeout(() => {
        expertTickRef.current();
        intervalRef.current = setInterval(() => {
          expertTickRef.current();
        }, 10000);
      }, 500);
      return () => clearTimeout(startTimeout);
    }
    if (!expertRunning && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expertRunning]);

  // Parse pair from URL params
  useEffect(() => {
    if (pair) {
      const parts = pair.split("_");
      if (parts.length === 2) {
        const [base, quote] = parts;
        if (CURRENCIES.includes(base)) setFromCurrency(base);
        if (CURRENCIES.includes(quote)) setToCurrency(quote);
      }
    } else {
      const pairParam = searchParams.get("pair");
      if (pairParam) {
        const [base, quote] = pairParam.split("_");
        if (base && CURRENCIES.includes(base)) setFromCurrency(base);
        if (quote && CURRENCIES.includes(quote)) setToCurrency(quote);
      }
    }
    const mode = searchParams.get("mode");
    if (mode === "expert") setActiveTab("expert");
  }, [pair, searchParams]);

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

  // Fetch rate info for buy/sell prices
  const fetchRateInfo = useCallback(async () => {
    if (fromCurrency === toCurrency) return;
    setRateLoading(true);
    try {
      const response = await client.apiCall.invoke({
        url: "/api/v1/rates/live",
        method: "GET",
        data: {},
      });
      if (response?.data?.rates) {
        const rates = response.data.rates;
        const matchingRate = rates.find(
          (r: any) =>
            r.base_currency === fromCurrency && r.quote_currency === toCurrency
        );
        if (matchingRate) {
          setRateInfo({
            buy_price: matchingRate.buy_price,
            sell_price: matchingRate.sell_price,
            mid_rate: matchingRate.mid_rate,
            spread: matchingRate.spread,
            is_live: matchingRate.is_live,
          });
        } else {
          const reverseRate = rates.find(
            (r: any) =>
              r.base_currency === toCurrency &&
              r.quote_currency === fromCurrency
          );
          if (reverseRate) {
            setRateInfo({
              buy_price:
                reverseRate.sell_price > 0 ? 1 / reverseRate.sell_price : 0,
              sell_price:
                reverseRate.buy_price > 0 ? 1 / reverseRate.buy_price : 0,
              mid_rate:
                reverseRate.mid_rate > 0 ? 1 / reverseRate.mid_rate : 0,
              spread: reverseRate.spread,
              is_live: reverseRate.is_live,
            });
          } else {
            // No DB pair found - use convert API to generate rate info
            try {
              const convertRes = await client.apiCall.invoke({
                url: "/api/v1/rates/convert",
                method: "POST",
                data: {
                  from_currency: fromCurrency,
                  to_currency: toCurrency,
                  amount: 1,
                },
              });
              if (convertRes?.data) {
                const rate = convertRes.data.exchange_rate;
                const spread = 0.001;
                setRateInfo({
                  buy_price: rate * (1 + spread),
                  sell_price: rate * (1 - spread),
                  mid_rate: rate,
                  spread: spread,
                  is_live: convertRes.data.is_live,
                });
              } else {
                setRateInfo(null);
              }
            } catch {
              setRateInfo(null);
            }
          }
        }
      }
    } catch (err) {
      console.error("Error fetching rate info:", err);
    } finally {
      setRateLoading(false);
    }
  }, [fromCurrency, toCurrency]);

  useEffect(() => {
    fetchRateInfo();
    const interval = setInterval(fetchRateInfo, 30000);
    return () => clearInterval(interval);
  }, [fetchRateInfo]);

  // Fetch deposit currency setting from fee_settings
  useEffect(() => {
    const fetchDepositCurrency = async () => {
      try {
        const feesRes = await client.entities.fee_settings.query({
          query: {},
          limit: 1,
        });
        if (feesRes?.data?.items?.[0]?.deposit_currency) {
          setDepositCurrency(feesRes.data.items[0].deposit_currency);
        }
      } catch {
        // Default USD
      }
    };
    fetchDepositCurrency();
  }, []);

  // Fetch watchlist rates
  useEffect(() => {
    if (watchlist.length === 0) return;
    const fetchWatchlistRates = async () => {
      try {
        const response = await client.apiCall.invoke({
          url: "/api/v1/rates/live",
          method: "GET",
          data: {},
        });
        if (response?.data?.rates) {
          const rates = response.data.rates;
          const newRates: Record<string, { mid: number; buy: number; sell: number; is_live: boolean }> = {};
          watchlist.forEach((item) => {
            const match = rates.find(
              (r: any) => r.base_currency === item.fromCurrency && r.quote_currency === item.toCurrency
            );
            if (match) {
              newRates[item.id] = { mid: match.mid_rate, buy: match.buy_price, sell: match.sell_price, is_live: match.is_live };
            } else {
              const reverse = rates.find(
                (r: any) => r.base_currency === item.toCurrency && r.quote_currency === item.fromCurrency
              );
              if (reverse && reverse.mid_rate > 0) {
                newRates[item.id] = {
                  mid: 1 / reverse.mid_rate,
                  buy: reverse.sell_price > 0 ? 1 / reverse.sell_price : 0,
                  sell: reverse.buy_price > 0 ? 1 / reverse.buy_price : 0,
                  is_live: reverse.is_live,
                };
              }
            }
          });
          setWatchlistRates(newRates);
        }
      } catch {
        // ignore
      }
    };
    fetchWatchlistRates();
    const interval = setInterval(fetchWatchlistRates, 30000);
    return () => clearInterval(interval);
  }, [watchlist]);

  const handleAddToWatchlist = () => {
    if (watchlistAddFrom === watchlistAddTo) return;
    const exists = watchlist.some(
      (w) => w.fromCurrency === watchlistAddFrom && w.toCurrency === watchlistAddTo
    );
    if (exists) return;
    const newItem: WatchlistItem = {
      id: Date.now().toString(),
      fromCurrency: watchlistAddFrom,
      toCurrency: watchlistAddTo,
      label: `${watchlistAddFrom}/${watchlistAddTo}`,
    };
    const updated = [...watchlist, newItem];
    setWatchlist(updated);
    saveWatchlist(updated);
  };

  const handleRemoveFromWatchlist = (id: string) => {
    const updated = watchlist.filter((w) => w.id !== id);
    setWatchlist(updated);
    saveWatchlist(updated);
    const newRates = { ...watchlistRates };
    delete newRates[id];
    setWatchlistRates(newRates);
  };

  const handleWatchlistQuickConvert = (item: WatchlistItem) => {
    setFromCurrency(item.fromCurrency);
    setToCurrency(item.toCurrency);
    setResult(null);
    setActiveTab("manual");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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

  const doConvert = useCallback(
    async (isExpert = false): Promise<ConvertResult | null> => {
      if (!amount || parseFloat(amount) <= 0) {
        if (!isExpert) setError("يرجى إدخال مبلغ صحيح");
        return null;
      }
      if (fromCurrency === toCurrency) {
        if (!isExpert) setError("يرجى اختيار عملات مختلفة");
        return null;
      }

      try {
        const response = await client.apiCall.invoke({
          url: "/api/v1/rates/convert",
          method: "POST",
          data: {
            from_currency: fromCurrency,
            to_currency: toCurrency,
            amount: parseFloat(amount),
          },
        });
        if (response?.data) {
          return response.data as ConvertResult;
        }
      } catch (err) {
        console.error(err);
        if (!isExpert)
          setError("حدث خطأ أثناء التحويل. يرجى المحاولة مرة أخرى.");
      }
      return null;
    },
    [amount, fromCurrency, toCurrency]
  );

  const doConvertDirection = useCallback(
    async (
      from: string,
      to: string,
      amt: number
    ): Promise<ConvertResult | null> => {
      if (amt <= 0 || from === to) return null;
      try {
        const response = await client.apiCall.invoke({
          url: "/api/v1/rates/convert",
          method: "POST",
          data: {
            from_currency: from,
            to_currency: to,
            amount: amt,
          },
        });
        if (response?.data) {
          return response.data as ConvertResult;
        }
      } catch (err) {
        console.error(err);
      }
      return null;
    },
    []
  );

  // Check price alerts when rateInfo changes
  useEffect(() => {
    if (!rateInfo) return;
    const currentMid = rateInfo.mid_rate;

    alerts.forEach((alert) => {
      if (!alert.active) return;
      if (alert.fromCurrency !== fromCurrency || alert.toCurrency !== toCurrency)
        return;
      if (alertCheckedRef.current.has(alert.id)) return;

      let triggered = false;
      if (alert.direction === "above" && currentMid >= alert.targetPrice) {
        triggered = true;
      } else if (
        alert.direction === "below" &&
        currentMid <= alert.targetPrice
      ) {
        triggered = true;
      }

      if (triggered) {
        alertCheckedRef.current.add(alert.id);
        toast({
          title: `🔔 تنبيه سعر ${fromCurrency}/${toCurrency}`,
          description: `السعر وصل ${alert.direction === "above" ? "فوق" : "تحت"} ${alert.targetPrice} - السعر الحالي: ${formatRate(currentMid)}`,
        });
        // Deactivate the alert
        setAlerts((prev) => {
          const updated = prev.map((a) =>
            a.id === alert.id ? { ...a, active: false } : a
          );
          saveAlerts(updated);
          return updated;
        });
      }
    });
  }, [rateInfo, alerts, fromCurrency, toCurrency, toast]);

  // Check deposit parity alerts when rateInfo changes
  useEffect(() => {
    if (!rateInfo || rateInfo.mid_rate === 0) return;

    depositAlerts.forEach((da) => {
      if (!da.active) return;
      if (da.fromCurrency !== fromCurrency || da.toCurrency !== toCurrency) return;
      if (depositAlertCheckedRef.current.has(da.id)) return;

      const convertedEstimate = da.depositAmount * rateInfo.sell_price;
      const isParityReached = convertedEstimate >= da.depositAmount;

      if (isParityReached) {
        depositAlertCheckedRef.current.add(da.id);
        toast({
          title: `💰 تنبيه سعر الإيداع ${fromCurrency}/${toCurrency}`,
          description: `تحقق شرط التساوي! ${da.depositAmount} ${fromCurrency} ≈ ${formatFee(convertedEstimate, toCurrency)} ${toCurrency}${da.autoConvert ? " - جاري التحويل التلقائي..." : ""}`,
        });

        if (da.autoConvert) {
          doConvertDirection(fromCurrency, toCurrency, da.depositAmount).then((res) => {
            if (res) {
              toast({
                title: "✅ تم التحويل التلقائي",
                description: `${formatFee(da.depositAmount, fromCurrency)} ${fromCurrency} → ${formatFee(res.net_amount, toCurrency)} ${toCurrency}`,
              });
            }
          });
        }

        setDepositAlerts((prev) => {
          const updated = prev.map((a) =>
            a.id === da.id ? { ...a, active: false } : a
          );
          saveDepositAlerts(updated);
          return updated;
        });
      }
    });
  }, [rateInfo, depositAlerts, fromCurrency, toCurrency, toast, doConvertDirection]);

  // Check percentage alerts when rateInfo changes
  useEffect(() => {
    if (!rateInfo || rateInfo.mid_rate === 0) return;
    const currentMid = rateInfo.mid_rate;

    percentAlerts.forEach((pa) => {
      if (!pa.active) return;
      if (pa.fromCurrency !== fromCurrency || pa.toCurrency !== toCurrency) return;
      if (percentAlertCheckedRef.current.has(pa.id)) return;

      const changePercent = ((currentMid - pa.baselineRate) / pa.baselineRate) * 100;
      const absChange = Math.abs(changePercent);

      if (absChange >= pa.percentThreshold) {
        percentAlertCheckedRef.current.add(pa.id);
        const direction = changePercent > 0 ? "صعود" : "هبوط";
        const risingCurrency = changePercent > 0 ? fromCurrency : toCurrency;
        toast({
          title: `📊 تنبيه نسبة مئوية ${fromCurrency}/${toCurrency}`,
          description: `${CURRENCY_FLAGS[risingCurrency]} ${risingCurrency} ${direction} بنسبة ${absChange.toFixed(2)}% (الحد: ${pa.percentThreshold}%) - السعر: ${formatRate(pa.baselineRate)} → ${formatRate(currentMid)}`,
        });
        setPercentAlerts((prev) => {
          const updated = prev.map((a) =>
            a.id === pa.id ? { ...a, active: false } : a
          );
          savePercentAlerts(updated);
          return updated;
        });
      }
    });
  }, [rateInfo, percentAlerts, fromCurrency, toCurrency, toast]);

  // Compute equivalent values when rateInfo or amount changes
  useEffect(() => {
    if (!rateInfo || rateInfo.mid_rate === 0) {
      setEquivalentForward(null);
      setEquivalentReverse(null);
      return;
    }
    const sellRate = rateInfo.sell_price;
    const buyRate = rateInfo.buy_price;
    const reverseRate = buyRate > 0 ? 1 / buyRate : 0;

    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      const fwd = formatNumber(sellRate, toCurrency);
      const rev = formatNumber(reverseRate, fromCurrency);
      setEquivalentForward(`1 ${fromCurrency} = ${fwd} ${toCurrency} (بيع)`);
      setEquivalentReverse(
        `1 ${toCurrency} = ${rev} ${fromCurrency} (شراء)`
      );
    } else {
      const fwd = formatNumber(amt * sellRate, toCurrency);
      const rev = formatNumber(amt * reverseRate, fromCurrency);
      setEquivalentForward(
        `${amt} ${fromCurrency} = ${fwd} ${toCurrency} (بيع)`
      );
      setEquivalentReverse(
        `${amt} ${toCurrency} = ${rev} ${fromCurrency} (شراء)`
      );
    }
  }, [rateInfo, amount, fromCurrency, toCurrency]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Generate chart data - use fallback rates if rateInfo not available
  const chartData = useMemo(() => {
    const mid = rateInfo?.mid_rate ?? 0;
    const buy = rateInfo?.buy_price ?? 0;
    const sell = rateInfo?.sell_price ?? 0;
    if (mid === 0) {
      return generateChartData(1.0, 1.001, 0.999, selectedTimeframe);
    }
    return generateChartData(mid, buy, sell, selectedTimeframe);
  }, [rateInfo, selectedTimeframe]);

  // Auto-save conversion to database
  const autoSaveConversion = useCallback(async (res: ConvertResult) => {
    if (!user) return;
    try {
      await client.entities.conversions.create({
        data: {
          pair_id: 1,
          from_currency: res.from_currency,
          to_currency: res.to_currency,
          from_amount: res.amount,
          to_amount: res.net_amount,
          exchange_rate: res.exchange_rate,
          fee_amount: res.fee_amount,
          fee_percentage: res.fee_percentage || 0,
          fee_currency: depositCurrency,
          status: "completed",
        },
      });
    } catch (err) {
      console.error("Auto-save conversion error:", err);
    }
  }, [user, depositCurrency]);

  const handleConvert = async () => {
    setError("");
    setLoading(true);
    setResultNetInUsd(null);
    setResultNetInXau(null);
    const res = await doConvert(false);
    if (res) {
      setResult(res);
      // Auto-save to database
      autoSaveConversion(res);
      // After forward conversion (Part1→Part2): convert net_amount to USD
      if (res.net_amount > 0 && res.to_currency !== "USD") {
        const usdRes = await doConvertDirection(res.to_currency, "USD", res.net_amount);
        if (usdRes) {
          setResultNetInUsd(`${formatNumber(usdRes.net_amount, "USD")} USD`);
        }
      } else if (res.to_currency === "USD") {
        setResultNetInUsd(`${formatNumber(res.net_amount, "USD")} USD`);
      }
    }
    setLoading(false);
  };

  const handleReverseConversion = async () => {
    if (!result) return;
    const receivedAmount = result.converted_amount;
    const oldFrom = fromCurrency;
    const oldTo = toCurrency;
    setFromCurrency(oldTo);
    setToCurrency(oldFrom);
    setAmount(formatNumber(receivedAmount, oldTo));
    setResult(null);
    setResultNetInUsd(null);
    setResultNetInXau(null);

    // Perform the reverse conversion automatically
    setLoading(true);
    const reverseRes = await doConvertDirection(oldTo, oldFrom, receivedAmount);
    if (reverseRes) {
      setResult(reverseRes);
      // Auto-save reverse conversion
      autoSaveConversion(reverseRes);
      // After reverse conversion (Part2→Part1): convert net_amount to XAU (gold)
      if (reverseRes.net_amount > 0 && reverseRes.to_currency !== "XAU") {
        const xauRes = await doConvertDirection(reverseRes.to_currency, "XAU", reverseRes.net_amount);
        if (xauRes) {
          setResultNetInXau(`${formatNumber(xauRes.net_amount, "XAU")} XAU`);
        }
      } else if (reverseRes.to_currency === "XAU") {
        setResultNetInXau(`${formatNumber(reverseRes.net_amount, "XAU")} XAU`);
      }
    }
    setLoading(false);
  };

  // Save expert task state to database periodically
  const saveExpertTaskToDb = useCallback(async (
    taskId: number | null,
    executedCount: number,
    skippedCount: number,
    feeByCurrency: Record<string, number>,
    lastRate: number,
    status: string = "active",
  ) => {
    try {
      if (taskId) {
        await client.entities.expert_tasks.update({
          id: String(taskId),
          data: {
            executed_count: executedCount,
            skipped_count: skippedCount,
            total_fees: JSON.stringify(feeByCurrency),
            last_rate: lastRate,
            status,
            updated_at: new Date().toISOString(),
          },
        });
      }
    } catch (err) {
      console.error("Error saving expert task:", err);
    }
  }, []);

  const handleExpertTick = useCallback(async () => {
    const forwardRes = await doConvert(true);
    if (!forwardRes) return;

    const currentRate = forwardRes.exchange_rate;
    const prevRate = previousRateRef.current;
    const now = new Date().toLocaleTimeString("ar-SA");
    const amt = parseFloat(amount) || 0;

    let direction: "up" | "down" | "flat" | "first" = "first";
    let executed = false;
    let convDir: "forward" | "reverse" | "none" = "none";
    let rising = "";
    let finalResult = forwardRes;

    if (prevRate === null) {
      direction = "first";
      executed = false;
      convDir = "none";
      rising = "";
    } else if (currentRate > prevRate) {
      direction = "up";
      executed = true;
      convDir = "forward";
      rising = fromCurrency;
      finalResult = forwardRes;
    } else if (currentRate < prevRate) {
      direction = "down";
      rising = toCurrency;
      const reverseRes = await doConvertDirection(
        toCurrency,
        fromCurrency,
        amt
      );
      if (reverseRes) {
        executed = true;
        convDir = "reverse";
        finalResult = reverseRes;
      } else {
        executed = false;
        convDir = "none";
      }
    } else {
      direction = "flat";
      executed = false;
      convDir = "none";
      rising = "";
    }

    const entry: ExpertResultEntry = {
      result: finalResult,
      executed,
      priceDirection: direction,
      conversionDirection: convDir,
      previousRate: prevRate ?? 0,
      currentRate,
      timestamp: now,
      risingCurrency: rising,
    };

    setExpertEntries((prev) => [entry, ...prev].slice(0, 30));

    if (executed) {
      setExpertExecutedCount((c) => c + 1);
      setExpertFeeByCurrency((prev) => ({
        ...prev,
        [finalResult.to_currency]:
          (prev[finalResult.to_currency] || 0) + finalResult.fee_amount,
      }));
    } else {
      setExpertSkippedCount((c) => c + 1);
    }

    previousRateRef.current = currentRate;

    // Save state to database every tick for persistence
    if (expertTaskId) {
      // We read the latest counts from the state updater pattern
      setExpertExecutedCount((c) => {
        setExpertSkippedCount((s) => {
          setExpertFeeByCurrency((f) => {
            saveExpertTaskToDb(expertTaskId, c, s, f, currentRate, "active");
            return f;
          });
          return s;
        });
        return c;
      });
    }

    // Check deposit parity alerts during Expert mode
    depositAlerts.forEach((da) => {
      if (!da.active) return;
      if (da.fromCurrency !== fromCurrency || da.toCurrency !== toCurrency) return;
      if (depositAlertCheckedRef.current.has(da.id)) return;

      const convertedEstimate = da.depositAmount * currentRate;
      if (convertedEstimate >= da.depositAmount) {
        depositAlertCheckedRef.current.add(da.id);
        toast({
          title: `💰 تنبيه إيداع Expert: ${fromCurrency}/${toCurrency}`,
          description: `تحقق شرط التساوي! ${da.depositAmount} ${fromCurrency} ≈ ${formatFee(convertedEstimate, toCurrency)} ${toCurrency}`,
        });

        if (da.autoConvert) {
          doConvertDirection(fromCurrency, toCurrency, da.depositAmount).then((res) => {
            if (res) {
              const autoEntry: ExpertResultEntry = {
                result: res,
                executed: true,
                priceDirection: "up",
                conversionDirection: "forward",
                previousRate: prevRate ?? 0,
                currentRate,
                timestamp: now,
                risingCurrency: fromCurrency,
              };
              setExpertEntries((prev) => [autoEntry, ...prev].slice(0, 30));
              setExpertExecutedCount((c) => c + 1);
              setExpertFeeByCurrency((prev) => ({
                ...prev,
                [res.to_currency]: (prev[res.to_currency] || 0) + res.fee_amount,
              }));
            }
          });
        }

        setDepositAlerts((prev) => {
          const updated = prev.map((a) =>
            a.id === da.id ? { ...a, active: false } : a
          );
          saveDepositAlerts(updated);
          return updated;
        });
      }
    });
  }, [doConvert, doConvertDirection, amount, fromCurrency, toCurrency, depositAlerts, toast, expertTaskId, saveExpertTaskToDb]);

  // Keep the ref in sync with the latest handleExpertTick
  useEffect(() => {
    expertTickRef.current = handleExpertTick;
  }, [handleExpertTick]);

  const handleStartExpert = async () => {
    if (!amount || parseFloat(amount) <= 0 || fromCurrency === toCurrency) {
      setError("يرجى إدخال مبلغ صحيح واختيار عملات مختلفة");
      return;
    }
    setError("");
    setLoadingExpertTask(true);
    setExpertEntries([]);
    setExpertExecutedCount(0);
    setExpertSkippedCount(0);
    setExpertFeeByCurrency({});
    previousRateRef.current = null;

    // Save task to database for persistence
    try {
      const now = new Date().toISOString();
      const res = await client.entities.expert_tasks.create({
        data: {
          from_currency: fromCurrency,
          to_currency: toCurrency,
          amount: parseFloat(amount),
          status: "active",
          executed_count: 0,
          skipped_count: 0,
          total_fees: "{}",
          last_rate: 0,
          created_at: now,
          updated_at: now,
        },
      });
      if (res?.data?.id) {
        setExpertTaskId(res.data.id);
      }
    } catch (err) {
      console.error("Error creating expert task:", err);
    }

    setLoadingExpertTask(false);
    setExpertRunning(true);
    // The interval is managed by the expertRunning useEffect
  };

  const handleStopExpert = async () => {
    setExpertRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Mark task as paused in database
    if (expertTaskId) {
      await saveExpertTaskToDb(
        expertTaskId,
        expertExecutedCount,
        expertSkippedCount,
        expertFeeByCurrency,
        previousRateRef.current ?? 0,
        "paused",
      );
    }

    previousRateRef.current = null;
    setExpertTaskId(null);
  };

  const handleSaveConversion = async () => {
    if (!result) return;

    try {
      await client.entities.conversions.create({
        data: {
          pair_id: 1,
          from_currency: result.from_currency,
          to_currency: result.to_currency,
          from_amount: result.amount,
          to_amount: result.net_amount,
          exchange_rate: result.exchange_rate,
          fee_amount: result.fee_amount,
          fee_currency: depositCurrency,
          status: "completed",
        },
      });
      alert("تم حفظ التحويل بنجاح!");
    } catch (err) {
      console.error("Error saving conversion:", err);
    }
  };

  // Price alert handlers
  const handleAddAlert = () => {
    const target = parseFloat(alertTargetPrice);
    if (!target || target <= 0) return;

    const newAlert: PriceAlert = {
      id: Date.now().toString(),
      fromCurrency,
      toCurrency,
      targetPrice: target,
      direction: alertDirection,
      active: true,
      createdAt: new Date().toLocaleString("ar-SA"),
    };

    const updated = [...alerts, newAlert];
    setAlerts(updated);
    saveAlerts(updated);
    setAlertTargetPrice("");
    toast({
      title: "✅ تم إضافة التنبيه",
      description: `سيتم إشعارك عند وصول ${fromCurrency}/${toCurrency} ${alertDirection === "above" ? "فوق" : "تحت"} ${target}`,
    });
  };

  const handleDeleteAlert = (id: string) => {
    const updated = alerts.filter((a) => a.id !== id);
    setAlerts(updated);
    saveAlerts(updated);
    alertCheckedRef.current.delete(id);
  };

  // Deposit alert handlers
  const handleAddDepositAlert = () => {
    const amt = parseFloat(depositAlertAmount);
    if (!amt || amt <= 0) return;

    const newAlert: DepositAlert = {
      id: Date.now().toString(),
      fromCurrency,
      toCurrency,
      depositAmount: amt,
      active: true,
      autoConvert: depositAlertAutoConvert,
      createdAt: new Date().toLocaleString("ar-SA"),
    };

    const updated = [...depositAlerts, newAlert];
    setDepositAlerts(updated);
    saveDepositAlerts(updated);
    setDepositAlertAmount("");
    toast({
      title: "✅ تم إضافة تنبيه الإيداع",
      description: `سيتم إشعارك عندما ${amt} ${fromCurrency} = ${amt} ${toCurrency}${depositAlertAutoConvert ? " مع تحويل تلقائي" : ""}`,
    });
  };

  const handleDeleteDepositAlert = (id: string) => {
    const updated = depositAlerts.filter((a) => a.id !== id);
    setDepositAlerts(updated);
    saveDepositAlerts(updated);
    depositAlertCheckedRef.current.delete(id);
  };

  // Percentage alert handlers
  const handleAddPercentAlert = () => {
    const threshold = parseFloat(percentAlertThreshold);
    if (!threshold || threshold <= 0) return;
    if (!rateInfo || rateInfo.mid_rate === 0) {
      toast({
        title: "⚠️ خطأ",
        description: "لا يمكن إضافة التنبيه - لم يتم تحميل السعر الحالي بعد",
      });
      return;
    }

    const newAlert: PercentAlert = {
      id: Date.now().toString(),
      fromCurrency,
      toCurrency,
      percentThreshold: threshold,
      baselineRate: rateInfo.mid_rate,
      active: true,
      createdAt: new Date().toLocaleString("ar-SA"),
    };

    const updated = [...percentAlerts, newAlert];
    setPercentAlerts(updated);
    savePercentAlerts(updated);
    setPercentAlertThreshold("");
    toast({
      title: "✅ تم إضافة تنبيه النسبة المئوية",
      description: `سيتم إشعارك عند تغير سعر ${fromCurrency}/${toCurrency} بنسبة ${threshold}% (صعوداً أو هبوطاً) - السعر الأساسي: ${formatRate(rateInfo.mid_rate)}`,
    });
  };

  const handleDeletePercentAlert = (id: string) => {
    const updated = percentAlerts.filter((a) => a.id !== id);
    setPercentAlerts(updated);
    savePercentAlerts(updated);
    percentAlertCheckedRef.current.delete(id);
  };

  // Watchlist Section
  const renderWatchlist = () => {
    return (
      <Card className="bg-[#111827]/80 border-[#374151] p-4 max-w-5xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-purple-400" />
          <span className="text-white font-semibold">
            قائمة المراقبة ({watchlist.length} زوج)
          </span>
          <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
            متعدد الأزواج
          </Badge>
        </div>

        {/* Add to Watchlist Form */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <Select value={watchlistAddFrom} onValueChange={setWatchlistAddFrom}>
            <SelectTrigger className="bg-[#1F2937] border-[#374151] text-white flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1F2937] border-[#374151] max-h-80">
              {CURRENCY_CATEGORIES.map((cat) => (
                <div key={cat.label}>
                  <div className="px-2 py-1.5 text-xs font-semibold text-amber-400/70 border-b border-[#374151]/50">
                    {cat.label}
                  </div>
                  {cat.currencies.map((c) => (
                    <SelectItem key={c} value={c} className="text-white hover:bg-[#374151]">
                      <span className="flex items-center gap-2">
                        <span>{CURRENCY_FLAGS[c]}</span>
                        {c}
                      </span>
                    </SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center justify-center">
            <ArrowRightLeft className="h-5 w-5 text-gray-500" />
          </div>
          <Select value={watchlistAddTo} onValueChange={setWatchlistAddTo}>
            <SelectTrigger className="bg-[#1F2937] border-[#374151] text-white flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1F2937] border-[#374151] max-h-80">
              {CURRENCY_CATEGORIES.map((cat) => (
                <div key={cat.label}>
                  <div className="px-2 py-1.5 text-xs font-semibold text-amber-400/70 border-b border-[#374151]/50">
                    {cat.label}
                  </div>
                  {cat.currencies.map((c) => (
                    <SelectItem key={c} value={c} className="text-white hover:bg-[#374151]">
                      <span className="flex items-center gap-2">
                        <span>{CURRENCY_FLAGS[c]}</span>
                        {c}
                      </span>
                    </SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleAddToWatchlist}
            disabled={watchlistAddFrom === watchlistAddTo}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold whitespace-nowrap"
          >
            + إضافة زوج
          </Button>
        </div>

        {/* Watchlist Items */}
        {watchlist.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {watchlist.map((item) => {
              const rate = watchlistRates[item.id];
              const isActive = fromCurrency === item.fromCurrency && toCurrency === item.toCurrency;
              return (
                <div
                  key={item.id}
                  className={`bg-[#1F2937] rounded-lg p-3 border transition-all cursor-pointer hover:border-purple-500/50 ${
                    isActive ? "border-amber-500/50 ring-1 ring-amber-500/20" : "border-[#374151]"
                  }`}
                  onClick={() => handleWatchlistQuickConvert(item)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{CURRENCY_FLAGS[item.fromCurrency]}</span>
                      <span className="font-bold text-white text-sm">{item.fromCurrency}</span>
                      <ArrowLeft className="h-3 w-3 text-amber-400" />
                      <span className="text-lg">{CURRENCY_FLAGS[item.toCurrency]}</span>
                      <span className="font-bold text-white text-sm">{item.toCurrency}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFromWatchlist(item.id);
                      }}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-6 w-6 p-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  {rate ? (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">الوسيط</span>
                        <span className="font-mono text-white">{formatRate(rate.mid)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-green-400">شراء</span>
                        <span className="font-mono text-green-400">{formatRate(rate.buy)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-red-400">بيع</span>
                        <span className="font-mono text-red-400">{formatRate(rate.sell)}</span>
                      </div>
                      <Badge className={`text-[10px] mt-1 ${rate.is_live ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"}`}>
                        {rate.is_live ? "🟢 حي" : "🟡 تقريبي"}
                      </Badge>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-xs text-center py-2">جاري التحميل...</p>
                  )}
                  {isActive && (
                    <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px] mt-2 w-full justify-center">
                      ◀ الزوج النشط حالياً
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500 text-sm">
            <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-30" />
            أضف أزواج عملات لمراقبتها والتبديل السريع بينها
          </div>
        )}
      </Card>
    );
  };

  // Equivalent value display section
  const renderEquivalentValues = () => {
    if (!equivalentForward && !equivalentReverse) return null;
    return (
      <Card className="bg-[#111827]/80 border-blue-500/20 p-4 max-w-5xl mx-auto">
        <div className="flex items-center gap-2 mb-3">
          <Equal className="h-4 w-4 text-blue-400" />
          <span className="text-blue-400 font-semibold text-sm">
            كم يساوي بالمبلغ المودع والعكس
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {equivalentForward && (
            <div className="bg-[#1F2937] rounded-lg p-3 flex items-center gap-3">
              <span className="text-xl">{CURRENCY_FLAGS[fromCurrency]}</span>
              <div>
                <p className="text-xs text-gray-400">تحويل</p>
                <p className="font-mono text-green-400 font-semibold text-sm">
                  {equivalentForward}
                </p>
              </div>
              <ArrowLeft className="h-4 w-4 text-amber-400 mr-auto" />
              <span className="text-xl">{CURRENCY_FLAGS[toCurrency]}</span>
            </div>
          )}
          {equivalentReverse && (
            <div className="bg-[#1F2937] rounded-lg p-3 flex items-center gap-3">
              <span className="text-xl">{CURRENCY_FLAGS[toCurrency]}</span>
              <div>
                <p className="text-xs text-gray-400">العكس</p>
                <p className="font-mono text-amber-400 font-semibold text-sm">
                  {equivalentReverse}
                </p>
              </div>
              <ArrowLeft className="h-4 w-4 text-green-400 mr-auto" />
              <span className="text-xl">{CURRENCY_FLAGS[fromCurrency]}</span>
            </div>
          )}
        </div>
      </Card>
    );
  };

  // Price Chart Section
  const renderPriceChart = () => {
    if (chartData.length === 0) return null;

    return (
      <Card className="bg-[#111827]/80 border-[#374151] p-4 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-amber-400" />
            <span className="text-white font-semibold">
              رسم بياني {fromCurrency}/{toCurrency}
            </span>
            <Badge
              className={
                rateInfo?.is_live
                  ? "bg-green-500/20 text-green-400 border-green-500/30"
                  : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
              }
            >
              {rateInfo?.is_live ? "حي" : "تقريبي"}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            {TIMEFRAMES.map((tf) => (
              <Button
                key={tf.value}
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTimeframe(tf.value)}
                className={`text-xs px-2 py-1 h-6 ${
                  selectedTimeframe === tf.value
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : "text-gray-500 hover:text-white hover:bg-white/5"
                }`}
              >
                {tf.label}
              </Button>
            ))}
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="time"
                stroke="#6B7280"
                fontSize={10}
                tickLine={false}
              />
              <YAxis
                stroke="#6B7280"
                fontSize={10}
                tickLine={false}
                domain={["auto", "auto"]}
                tickFormatter={(v) => formatRate(v)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1F2937",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "12px",
                }}
                labelStyle={{ color: "#9CA3AF" }}
                formatter={(value: number, name: string) => {
                  const label =
                    name === "buy"
                      ? "شراء"
                      : name === "sell"
                        ? "بيع"
                        : "وسيط";
                  return [formatRate(value), label];
                }}
              />
              <Legend
                formatter={(value) =>
                  value === "buy"
                    ? "سعر الشراء"
                    : value === "sell"
                      ? "سعر البيع"
                      : "السعر الوسيط"
                }
              />
              <Line
                type="monotone"
                dataKey="buy"
                stroke="#22C55E"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="sell"
                stroke="#EF4444"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="mid"
                stroke="#F59E0B"
                strokeWidth={1}
                strokeDasharray="5 5"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    );
  };

  // Price Alerts Section
  const renderPriceAlerts = () => {
    const pairAlerts = alerts.filter(
      (a) => a.fromCurrency === fromCurrency && a.toCurrency === toCurrency
    );

    return (
      <Card className="bg-[#111827]/80 border-[#374151] p-4 max-w-5xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <BellRing className="h-5 w-5 text-amber-400" />
          <span className="text-white font-semibold">
            تنبيهات الأسعار {fromCurrency}/{toCurrency}
          </span>
        </div>

        {/* Add Alert Form */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1">
            <Input
              type="number"
              placeholder={`السعر المستهدف (${formatRate(rateInfo?.mid_rate ?? 0)})`}
              value={alertTargetPrice}
              onChange={(e) => setAlertTargetPrice(e.target.value)}
              className="bg-[#1F2937] border-[#374151] text-white font-mono"
            />
          </div>
          <Select
            value={alertDirection}
            onValueChange={(v) => setAlertDirection(v as "above" | "below")}
          >
            <SelectTrigger className="bg-[#1F2937] border-[#374151] text-white w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1F2937] border-[#374151]">
              <SelectItem
                value="above"
                className="text-white hover:bg-[#374151]"
              >
                فوق ↑
              </SelectItem>
              <SelectItem
                value="below"
                className="text-white hover:bg-[#374151]"
              >
                تحت ↓
              </SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={handleAddAlert}
            disabled={!alertTargetPrice || parseFloat(alertTargetPrice) <= 0}
            className="bg-amber-500 hover:bg-amber-600 text-black font-bold"
          >
            <Bell className="h-4 w-4 ml-1" />
            إضافة تنبيه
          </Button>
        </div>

        {/* Active Alerts List */}
        {pairAlerts.length > 0 ? (
          <div className="space-y-2">
            {pairAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  alert.active
                    ? "bg-[#1F2937] border-amber-500/20"
                    : "bg-[#1F2937]/50 border-[#374151] opacity-60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      alert.active
                        ? "bg-amber-500/20"
                        : "bg-gray-500/20"
                    }`}
                  >
                    {alert.active ? (
                      <Bell className="h-4 w-4 text-amber-400" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-white font-mono">
                      {alert.direction === "above" ? "فوق ↑" : "تحت ↓"}{" "}
                      {formatRate(alert.targetPrice)}
                    </p>
                    <p className="text-xs text-gray-500">{alert.createdAt}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    className={
                      alert.active
                        ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                        : "bg-green-500/20 text-green-400 border-green-500/30"
                    }
                  >
                    {alert.active ? "نشط" : "تم التنبيه"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteAlert(alert.id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 w-8 p-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500 text-sm">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
            لا توجد تنبيهات لهذا الزوج. أضف تنبيهاً ليتم إشعارك عند وصول السعر
            للمستوى المحدد.
          </div>
        )}
      </Card>
    );
  };

  // Deposit Parity Alerts Section
  const renderDepositAlerts = () => {
    const pairDepositAlerts = depositAlerts.filter(
      (a) => a.fromCurrency === fromCurrency && a.toCurrency === toCurrency
    );

    return (
      <Card className="bg-[#111827]/80 border-[#374151] p-4 max-w-5xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <Equal className="h-5 w-5 text-green-400" />
          <span className="text-white font-semibold">
            تنبيه سعر الإيداع (التساوي) {fromCurrency}/{toCurrency}
          </span>
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
            جديد
          </Badge>
        </div>

        {/* Explanation */}
        <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3 mb-4">
          <p className="text-gray-400 text-xs">
            <strong className="text-green-400">كيف يعمل:</strong> يتم التنبيه عندما يصل السعر لنقطة التساوي.
            مثال: عند إدخال 110، سيتم التنبيه عندما 110 {fromCurrency} = 110 {toCurrency} أو أكثر.
            {" "}يمكنك تفعيل التحويل التلقائي ليتم التحويل فوراً عند تحقق الشرط.
          </p>
        </div>

        {/* Add Deposit Alert Form */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1">
            <Input
              type="number"
              placeholder={`المبلغ (مثال: 110 ${fromCurrency} = 110 ${toCurrency})`}
              value={depositAlertAmount}
              onChange={(e) => setDepositAlertAmount(e.target.value)}
              className="bg-[#1F2937] border-[#374151] text-white font-mono"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setDepositAlertAutoConvert(!depositAlertAutoConvert)}
            className={`w-auto whitespace-nowrap border-[#374151] ${
              depositAlertAutoConvert
                ? "bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30"
                : "bg-transparent text-gray-400 hover:bg-[#1F2937] hover:text-white"
            }`}
          >
            <Zap className="h-4 w-4 ml-1" />
            {depositAlertAutoConvert ? "تحويل تلقائي ✓" : "تحويل تلقائي"}
          </Button>
          <Button
            onClick={handleAddDepositAlert}
            disabled={!depositAlertAmount || parseFloat(depositAlertAmount) <= 0}
            className="bg-green-600 hover:bg-green-700 text-white font-bold"
          >
            <Equal className="h-4 w-4 ml-1" />
            إضافة تنبيه
          </Button>
        </div>

        {/* Current Parity Status */}
        {rateInfo && amount && parseFloat(amount) > 0 && (
          <div className="bg-[#1F2937] rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">الحالة الحالية:</span>
              <div className="text-left">
                <span className="font-mono text-white text-sm">
                  {amount} {fromCurrency} = {formatFee(parseFloat(amount) * rateInfo.sell_price, toCurrency)} {toCurrency}
                </span>
                {parseFloat(amount) * rateInfo.sell_price >= parseFloat(amount) ? (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30 mr-2 text-xs">
                    ✓ متحقق
                  </Badge>
                ) : (
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30 mr-2 text-xs">
                    ✗ لم يتحقق بعد
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Active Deposit Alerts List */}
        {pairDepositAlerts.length > 0 ? (
          <div className="space-y-2">
            {pairDepositAlerts.map((da) => (
              <div
                key={da.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  da.active
                    ? "bg-[#1F2937] border-green-500/20"
                    : "bg-[#1F2937]/50 border-[#374151] opacity-60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      da.active ? "bg-green-500/20" : "bg-gray-500/20"
                    }`}
                  >
                    {da.active ? (
                      <Equal className="h-4 w-4 text-green-400" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-white font-mono">
                      {da.depositAmount} {da.fromCurrency} = {da.depositAmount} {da.toCurrency}
                    </p>
                    <p className="text-xs text-gray-500">
                      {da.createdAt}
                      {da.autoConvert && (
                        <span className="text-green-400 mr-2">
                          {" "}⚡ تحويل تلقائي
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    className={
                      da.active
                        ? "bg-green-500/20 text-green-400 border-green-500/30"
                        : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                    }
                  >
                    {da.active ? "نشط" : "تم التنبيه"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteDepositAlert(da.id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 w-8 p-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500 text-sm">
            <Equal className="h-8 w-8 mx-auto mb-2 opacity-30" />
            لا توجد تنبيهات إيداع. أضف تنبيهاً ليتم إشعارك عند تحقق شرط التساوي بين العملتين.
          </div>
        )}
      </Card>
    );
  };

  // Percentage Alerts Section (both currencies rising by %)
  const renderPercentAlerts = () => {
    const pairPercentAlerts = percentAlerts.filter(
      (a) => a.fromCurrency === fromCurrency && a.toCurrency === toCurrency
    );

    // Calculate current % change for active alerts
    const currentMid = rateInfo?.mid_rate ?? 0;

    return (
      <Card className="bg-[#111827]/80 border-[#374151] p-4 max-w-5xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-cyan-400" />
          <span className="text-white font-semibold">
            تنبيه صعود العملتين بالنسبة المئوية {fromCurrency}/{toCurrency}
          </span>
          <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-xs">
            نسبة %
          </Badge>
        </div>

        {/* Explanation */}
        <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-3 mb-4">
          <p className="text-gray-400 text-xs">
            <strong className="text-cyan-400">كيف يعمل:</strong> يتم تسجيل السعر الحالي كسعر أساسي عند إضافة التنبيه.
            عندما يتغير السعر بالنسبة المحددة (صعوداً = {CURRENCY_FLAGS[fromCurrency]} {fromCurrency} يصعد، هبوطاً = {CURRENCY_FLAGS[toCurrency]} {toCurrency} يصعد)، يتم إشعارك فوراً.
            <br />
            <strong className="text-green-400">مثال:</strong> إذا أدخلت 2%، سيتم التنبيه عند صعود أي من العملتين بنسبة 2% أو أكثر مقارنة بالسعر الأساسي.
          </p>
        </div>

        {/* Add Percent Alert Form */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1 relative">
            <Input
              type="number"
              placeholder="النسبة المئوية (مثال: 1.5 أو 2)"
              value={percentAlertThreshold}
              onChange={(e) => setPercentAlertThreshold(e.target.value)}
              className="bg-[#1F2937] border-[#374151] text-white font-mono pl-8"
              step="0.1"
              min="0.01"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400 font-bold text-sm">%</span>
          </div>
          <Button
            onClick={handleAddPercentAlert}
            disabled={!percentAlertThreshold || parseFloat(percentAlertThreshold) <= 0 || !rateInfo}
            className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold"
          >
            <TrendingUp className="h-4 w-4 ml-1" />
            إضافة تنبيه نسبة
          </Button>
        </div>

        {/* Current Rate Info */}
        {rateInfo && (
          <div className="bg-[#1F2937] rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">السعر الحالي (الوسيط):</span>
              <span className="font-mono text-white font-semibold">
                {formatRate(rateInfo.mid_rate)}
              </span>
            </div>
          </div>
        )}

        {/* Active Percent Alerts List */}
        {pairPercentAlerts.length > 0 ? (
          <div className="space-y-2">
            {pairPercentAlerts.map((pa) => {
              const changePercent = currentMid > 0 && pa.baselineRate > 0
                ? ((currentMid - pa.baselineRate) / pa.baselineRate) * 100
                : 0;
              const absChange = Math.abs(changePercent);
              const progressPercent = pa.percentThreshold > 0
                ? Math.min((absChange / pa.percentThreshold) * 100, 100)
                : 0;
              const isRising = changePercent > 0;

              return (
                <div
                  key={pa.id}
                  className={`p-3 rounded-lg border ${
                    pa.active
                      ? "bg-[#1F2937] border-cyan-500/20"
                      : "bg-[#1F2937]/50 border-[#374151] opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          pa.active ? "bg-cyan-500/20" : "bg-gray-500/20"
                        }`}
                      >
                        {pa.active ? (
                          <TrendingUp className="h-4 w-4 text-cyan-400" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-green-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-white font-mono">
                          تغير ≥ {pa.percentThreshold}%
                        </p>
                        <p className="text-xs text-gray-500">
                          السعر الأساسي: {formatRate(pa.baselineRate)} • {pa.createdAt}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        className={
                          pa.active
                            ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                            : "bg-green-500/20 text-green-400 border-green-500/30"
                        }
                      >
                        {pa.active ? "نشط" : "تم التنبيه"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeletePercentAlert(pa.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Progress bar showing how close to threshold */}
                  {pa.active && currentMid > 0 && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-500">
                          التغير الحالي: {isRising ? "+" : ""}{changePercent.toFixed(3)}%
                          {isRising
                            ? ` (${CURRENCY_FLAGS[fromCurrency]} ${fromCurrency} صاعد)`
                            : changePercent < 0
                              ? ` (${CURRENCY_FLAGS[toCurrency]} ${toCurrency} صاعد)`
                              : " (ثابت)"}
                        </span>
                        <span className="text-cyan-400 font-mono">
                          {absChange.toFixed(3)}% / {pa.percentThreshold}%
                        </span>
                      </div>
                      <div className="w-full bg-[#111827] rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isRising
                              ? "bg-gradient-to-r from-green-500 to-green-400"
                              : changePercent < 0
                                ? "bg-gradient-to-r from-blue-500 to-blue-400"
                                : "bg-gray-600"
                          }`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500 text-sm">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-30" />
            لا توجد تنبيهات نسبة مئوية. أضف تنبيهاً ليتم إشعارك عند صعود أي من العملتين بالنسبة المحددة.
          </div>
        )}
      </Card>
    );
  };

  // PART/1 - Source Currency Panel
  const renderPart1 = () => (
    <Card className="bg-[#1F2937]/90 backdrop-blur border-[#374151] p-6 flex flex-col h-full">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#374151]">
        <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center text-2xl">
          {CURRENCY_FLAGS[fromCurrency] || "💰"}
        </div>
        <div>
          <h3 className="font-bold text-lg text-white">PART/1</h3>
          <p className="text-gray-400 text-sm">العملة المصدر</p>
        </div>
        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 mr-auto">
          {fromCurrency}
        </Badge>
      </div>

      <div className="space-y-4 flex-1">
        <div className="space-y-2">
          <Label className="text-gray-300">من العملة</Label>
          <Select
            value={fromCurrency}
            onValueChange={(v) => {
              setFromCurrency(v);
              setResult(null);
            }}
          >
            <SelectTrigger className="bg-[#111827] border-[#374151] text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1F2937] border-[#374151] max-h-80">
              {CURRENCY_CATEGORIES.map((cat) => (
                <div key={cat.label}>
                  <div className="px-2 py-1.5 text-xs font-semibold text-amber-400/70 border-b border-[#374151]/50">
                    {cat.label}
                  </div>
                  {cat.currencies.map((c) => (
                    <SelectItem
                      key={c}
                      value={c}
                      className="text-white hover:bg-[#374151]"
                    >
                      <span className="flex items-center gap-2">
                        <span>{CURRENCY_FLAGS[c]}</span>
                        {CURRENCY_NAMES[c]}
                      </span>
                    </SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-gray-300">المبلغ</Label>
          <Input
            type="number"
            placeholder="أدخل المبلغ"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setResult(null);
            }}
            className="bg-[#111827] border-[#374151] text-white text-xl font-mono h-14"
          />
        </div>

        {rateInfo && (
          <div className="bg-[#111827] rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-green-400" />
                سعر الشراء
              </span>
              <span className="font-mono text-green-400 font-semibold">
                {formatRate(rateInfo.buy_price)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm flex items-center gap-1">
                <TrendingDown className="h-3 w-3 text-red-400" />
                سعر البيع
              </span>
              <span className="font-mono text-red-400 font-semibold">
                {formatRate(rateInfo.sell_price)}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-[#374151] pt-2">
              <span className="text-gray-400 text-sm">السبريد</span>
              <span className="font-mono text-gray-300 text-sm">
                {rateInfo.spread.toFixed(6)}
              </span>
            </div>
            <Badge
              className={
                rateInfo.is_live
                  ? "bg-green-500/20 text-green-400 border-green-500/30"
                  : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
              }
            >
              {rateInfo.is_live ? "🟢 سعر حي" : "🟡 سعر تقريبي"}
            </Badge>
          </div>
        )}

        <Button
          onClick={handleConvert}
          disabled={loading || !amount}
          className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold py-3 text-lg h-14 mt-auto"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Calculator className="h-5 w-5 animate-spin" /> جاري الحساب...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              تحـــويل
              <ArrowLeft className="h-5 w-5" />
            </span>
          )}
        </Button>
      </div>
    </Card>
  );

  // PART/2 - Target Currency Panel
  const renderPart2 = () => (
    <Card className="bg-[#1F2937]/90 backdrop-blur border-[#374151] p-6 flex flex-col h-full">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#374151]">
        <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center text-2xl">
          {CURRENCY_FLAGS[toCurrency] || "💰"}
        </div>
        <div>
          <h3 className="font-bold text-lg text-white">PART/2</h3>
          <p className="text-gray-400 text-sm">العملة الهدف</p>
        </div>
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 mr-auto">
          {toCurrency}
        </Badge>
      </div>

      <div className="space-y-4 flex-1">
        <div className="space-y-2">
          <Label className="text-gray-300">إلى العملة</Label>
          <Select
            value={toCurrency}
            onValueChange={(v) => {
              setToCurrency(v);
              setResult(null);
            }}
          >
            <SelectTrigger className="bg-[#111827] border-[#374151] text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1F2937] border-[#374151] max-h-80">
              {CURRENCY_CATEGORIES.map((cat) => (
                <div key={cat.label}>
                  <div className="px-2 py-1.5 text-xs font-semibold text-amber-400/70 border-b border-[#374151]/50">
                    {cat.label}
                  </div>
                  {cat.currencies.map((c) => (
                    <SelectItem
                      key={c}
                      value={c}
                      className="text-white hover:bg-[#374151]"
                    >
                      <span className="flex items-center gap-2">
                        <span>{CURRENCY_FLAGS[c]}</span>
                        {CURRENCY_NAMES[c]}
                      </span>
                    </SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>
        </div>

        {result ? (
          <div className="bg-[#111827] rounded-xl p-5 space-y-4 border border-green-500/20 flex-1">
            <div className="flex items-center gap-2 text-green-400 mb-2">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-semibold">نتيجة التحويل</span>
            </div>

            <div className="text-center py-4">
              <p className="text-gray-400 text-sm mb-1">المبلغ قبل الخصم</p>
              <p className="text-xl font-bold font-mono text-gray-300">
                {formatNumber(result.converted_amount, result.to_currency)}{" "}
                {result.to_currency}
              </p>
              {result.fee_amount > 0 && (
                <p className="text-amber-400 text-sm mt-1">
                  - رسوم{result.fee_percentage > 0 ? ` (${result.fee_percentage}%)` : result.fee_fixed_amount > 0 ? " (مبلغ ثابت)" : ""}: {formatFee(result.fee_amount, result.to_currency)}{" "}
                  {result.to_currency}
                </p>
              )}
              <div className="mt-3 pt-3 border-t border-[#374151]">
                <p className="text-gray-400 text-sm mb-1">
                  المبلغ الصافي المستلم
                </p>
                <p className="text-3xl font-bold font-mono text-green-400">
                  {formatNumber(result.net_amount, result.to_currency)}
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  {CURRENCY_NAMES[result.to_currency]}
                </p>
              </div>

              {/* Show equivalent in USD (forward) or XAU (reverse) */}
              {resultNetInUsd && (
                <div className="mt-2 bg-blue-500/10 border border-blue-500/20 rounded-lg p-2 text-center">
                  <p className="text-xs text-blue-400">ما يعادله بالدولار</p>
                  <p className="font-mono text-blue-300 font-semibold text-sm">
                    🇺🇸 {resultNetInUsd}
                  </p>
                </div>
              )}
              {resultNetInXau && (
                <div className="mt-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2 text-center">
                  <p className="text-xs text-yellow-400">ما يعادله بالذهب</p>
                  <p className="font-mono text-yellow-300 font-semibold text-sm">
                    🥇 {resultNetInXau}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2 border-t border-[#374151] pt-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">سعر الصرف (بعد السبريد)</span>
                <span className="font-mono text-white">
                  1 {result.from_currency} = {formatRate(result.exchange_rate)}{" "}
                  {result.to_currency}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">الرسوم المخصومة</span>
                <span className="font-mono text-amber-400">
                  {result.fee_amount > 0
                    ? `${formatFee(result.fee_amount, result.to_currency)} ${result.to_currency}${result.fee_percentage > 0 ? ` (${result.fee_percentage}%)` : result.fee_fixed_amount > 0 ? " (مبلغ ثابت)" : ""}`
                    : "بدون رسوم"}
                </span>
              </div>
              <div className="flex justify-between text-sm text-xs text-gray-500">
                <span>عملة الإيداع</span>
                <span>{depositCurrency}</span>
              </div>
            </div>

            <Button
              onClick={handleReverseConversion}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold"
            >
              <ArrowRightLeft className="h-4 w-4 ml-2" />
              تحويل عكسي ({result.to_currency} → {result.from_currency})
            </Button>

            {user && (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 text-green-400 text-xs">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>تم حفظ التحويل تلقائياً في السجل</span>
                </div>
                <Button
                  onClick={() => window.location.href = "/history"}
                  variant="outline"
                  className="w-full border-amber-500/50 text-amber-400 hover:bg-amber-500/20"
                >
                  📋 عرض سجل التحويلات
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-[#111827] rounded-xl p-8 flex-1 flex flex-col items-center justify-center text-center border border-dashed border-[#374151]">
            <Calculator className="h-12 w-12 text-gray-600 mb-4" />
            <p className="text-gray-500 text-lg">نتيجة التحويل</p>
            <p className="text-gray-600 text-sm mt-2">
              أدخل المبلغ واضغط &quot;تحويل&quot; لعرض النتيجة
            </p>
          </div>
        )}
      </div>
    </Card>
  );

  const renderArrow = () => (
    <div className="hidden md:flex flex-col items-center justify-center gap-2 px-2">
      <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center border-2 border-amber-500/40">
        <ArrowLeft className="h-8 w-8 text-amber-400" />
      </div>
      <p className="text-amber-400 text-xs font-semibold">تحويل</p>
      <div className="w-px h-8 bg-amber-500/30" />
      <div
        className="w-12 h-12 bg-[#1F2937] rounded-full flex items-center justify-center border border-[#374151] cursor-pointer hover:border-amber-500/50 transition-colors"
        onClick={() => {
          setFromCurrency(toCurrency);
          setToCurrency(fromCurrency);
          setResult(null);
        }}
      >
        <RefreshCw className="h-5 w-5 text-gray-400" />
      </div>
      <p className="text-gray-500 text-xs">عكس</p>
    </div>
  );

  const renderMobileArrow = () => (
    <div className="flex md:hidden items-center justify-center gap-3 py-3">
      <div className="h-px flex-1 bg-[#374151]" />
      <div
        className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center border border-amber-500/40 cursor-pointer"
        onClick={() => {
          setFromCurrency(toCurrency);
          setToCurrency(fromCurrency);
          setResult(null);
        }}
      >
        <ArrowLeft className="h-5 w-5 text-amber-400 rotate-90" />
      </div>
      <span className="text-amber-400 text-sm font-semibold">تحويل</span>
      <div className="h-px flex-1 bg-[#374151]" />
    </div>
  );

  // Direction badge for expert entries
  const getDirectionBadge = (entry: ExpertResultEntry) => {
    if (entry.priceDirection === "first") {
      return (
        <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">
          📊 قراءة أولى
        </Badge>
      );
    }
    if (entry.priceDirection === "up" && entry.executed) {
      return (
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
          <TrendingUp className="h-3 w-3 ml-1" />
          {CURRENCY_FLAGS[entry.risingCurrency]} {entry.risingCurrency} صاعد ✓
          تم التحويل
        </Badge>
      );
    }
    if (entry.priceDirection === "down" && entry.executed) {
      return (
        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
          <TrendingUp className="h-3 w-3 ml-1" />
          {CURRENCY_FLAGS[entry.risingCurrency]} {entry.risingCurrency} صاعد ✓
          تحويل عكسي
        </Badge>
      );
    }
    if (entry.priceDirection === "flat") {
      return (
        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
          <SkipForward className="h-3 w-3 ml-1" />
          ثابت ✗ تم التخطي
        </Badge>
      );
    }
    return (
      <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
        <TrendingDown className="h-3 w-3 ml-1" />
        هابط ✗ خطأ في التحويل العكسي
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-[#0A0F1C] text-white" dir="rtl">
      <Header />

      <div
        className="relative"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(10,15,28,0.85), rgba(10,15,28,0.98)), url(https://mgx-backend-cdn.metadl.com/generate/images/944362/2026-03-23/de4920ee-be3f-4282-867d-bba767183ed8.png)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold mb-2">
              محول العملات{" "}
              {pair && (
                <span className="text-amber-400">
                  {fromCurrency}/{toCurrency}
                </span>
              )}
            </h1>
            <p className="text-gray-400">
              تحويل فوري بين العملات والأسهم بأسعار السوق العالمي مع رسوم نسبية
            </p>
          </div>

          {/* Watchlist - Multi-pair monitoring */}
          <div className="mb-6">{renderWatchlist()}</div>

          {/* Equivalent Value Display */}
          <div className="mb-6">{renderEquivalentValues()}</div>

          {/* Price Chart */}
          <div className="mb-6">{renderPriceChart()}</div>

          {/* Price Alerts */}
          <div className="mb-6">{renderPriceAlerts()}</div>

          {/* Deposit Parity Alerts */}
          <div className="mb-6">{renderDepositAlerts()}</div>

          {/* Percentage Alerts - Both Currencies Rising */}
          <div className="mb-6">{renderPercentAlerts()}</div>

          {/* Tabs: Manual vs Expert */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-6"
          >
            <TabsList className="bg-[#1F2937] border border-[#374151] w-full max-w-md mx-auto grid grid-cols-2">
              <TabsTrigger
                value="manual"
                className="data-[state=active]:bg-amber-500 data-[state=active]:text-black"
              >
                <Calculator className="h-4 w-4 ml-2" />
                المحول اليدوي
              </TabsTrigger>
              <TabsTrigger
                value="expert"
                className="data-[state=active]:bg-amber-500 data-[state=active]:text-black"
              >
                <Zap className="h-4 w-4 ml-2" />
                المحول الآلي Expert
              </TabsTrigger>
            </TabsList>

            {/* Manual Converter */}
            <TabsContent value="manual">
              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 p-3 rounded-lg max-w-4xl mx-auto mb-4">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex flex-col md:flex-row items-stretch gap-0 max-w-5xl mx-auto">
                <div className="flex-1 min-w-0">{renderPart1()}</div>
                {renderArrow()}
                {renderMobileArrow()}
                <div className="flex-1 min-w-0">{renderPart2()}</div>
              </div>
            </TabsContent>

            {/* Expert Auto Converter - Bidirectional */}
            <TabsContent value="expert">
              <Card className="bg-[#1F2937]/90 backdrop-blur border-[#374151] p-6 md:p-8 max-w-5xl mx-auto">
                <div className="space-y-6">
                  {/* Expert Header */}
                  <div className="flex items-center gap-3 pb-4 border-b border-[#374151]">
                    <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
                      <Zap className="h-5 w-5 text-amber-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">
                        المحول الآلي Expert
                      </h3>
                      <p className="text-gray-400 text-sm">
                        يحول تلقائياً في كلا الاتجاهين عند صعود أي عملة مقابل
                        الأخرى مع خصم الرسوم
                      </p>
                    </div>
                    {expertRunning && (
                      <div className="flex items-center gap-2 mr-auto">
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 animate-pulse">
                          <RefreshCw className="h-3 w-3 ml-1 animate-spin" />
                          يعمل - يراقب السعر
                        </Badge>
                        {expertTaskId && (
                          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                            ☁️ محفوظ في السحابة
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Bidirectional Info */}
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <TrendingUp className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-blue-400 font-semibold text-sm">
                          آلية عمل Expert - ثنائي الاتجاه
                        </p>
                        <p className="text-gray-400 text-xs mt-1">
                          يقوم Expert بمراقبة السعر كل 10 ثوانٍ ويحول في{" "}
                          <strong className="text-green-400">
                            كلا الاتجاهين
                          </strong>
                          :
                          <br />• إذا صعد {CURRENCY_FLAGS[fromCurrency] || "💰"}{" "}
                          {fromCurrency} مقابل {toCurrency} → يحول{" "}
                          {fromCurrency}→{toCurrency}
                          <br />• إذا صعد {CURRENCY_FLAGS[toCurrency] || "💰"}{" "}
                          {toCurrency} مقابل {fromCurrency} → يحول{" "}
                          {toCurrency}→{fromCurrency}
                          <br />• إذا كان السعر ثابتاً → يتم التخطي
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Cloud Persistence Info */}
                  <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-lg mt-0.5">☁️</span>
                      <div>
                        <p className="text-purple-400 font-semibold text-sm">
                          يعمل حتى عند إيقاف الجهاز
                        </p>
                        <p className="text-gray-400 text-xs mt-1">
                          يتم حفظ مهمة Expert تلقائياً في السحابة. عند فتح الصفحة مجدداً،
                          سيتم استئناف المهمة من حيث توقفت مع الحفاظ على جميع البيانات
                          (عدد التحويلات، الرسوم، آخر سعر).
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Two Panel Layout for Expert */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left: Settings */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-gray-300">العملة الأولى</Label>
                        <Select
                          value={fromCurrency}
                          onValueChange={(v) => {
                            setFromCurrency(v);
                            setResult(null);
                          }}
                          disabled={expertRunning}
                        >
                          <SelectTrigger className="bg-[#111827] border-[#374151] text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1F2937] border-[#374151] max-h-80">
                            {CURRENCY_CATEGORIES.map((cat) => (
                              <div key={cat.label}>
                                <div className="px-2 py-1.5 text-xs font-semibold text-amber-400/70 border-b border-[#374151]/50">
                                  {cat.label}
                                </div>
                                {cat.currencies.map((c) => (
                                  <SelectItem
                                    key={c}
                                    value={c}
                                    className="text-white hover:bg-[#374151]"
                                  >
                                    <span className="flex items-center gap-2">
                                      <span>{CURRENCY_FLAGS[c]}</span>
                                      {CURRENCY_NAMES[c]}
                                    </span>
                                  </SelectItem>
                                ))}
                              </div>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-gray-300">العملة الثانية</Label>
                        <Select
                          value={toCurrency}
                          onValueChange={(v) => {
                            setToCurrency(v);
                            setResult(null);
                          }}
                          disabled={expertRunning}
                        >
                          <SelectTrigger className="bg-[#111827] border-[#374151] text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1F2937] border-[#374151] max-h-80">
                            {CURRENCY_CATEGORIES.map((cat) => (
                              <div key={cat.label}>
                                <div className="px-2 py-1.5 text-xs font-semibold text-amber-400/70 border-b border-[#374151]/50">
                                  {cat.label}
                                </div>
                                {cat.currencies.map((c) => (
                                  <SelectItem
                                    key={c}
                                    value={c}
                                    className="text-white hover:bg-[#374151]"
                                  >
                                    <span className="flex items-center gap-2">
                                      <span>{CURRENCY_FLAGS[c]}</span>
                                      {CURRENCY_NAMES[c]}
                                    </span>
                                  </SelectItem>
                                ))}
                              </div>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-gray-300">المبلغ</Label>
                        <Input
                          type="number"
                          placeholder="أدخل المبلغ"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          disabled={expertRunning}
                          className="bg-[#111827] border-[#374151] text-white text-lg font-mono"
                        />
                      </div>

                      {rateInfo && (
                        <div className="bg-[#111827] rounded-lg p-3 space-y-2">
                          <p className="text-xs text-gray-400 font-semibold">
                            معلومات العملة
                          </p>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400 flex items-center gap-1">
                              <TrendingUp className="h-3 w-3 text-green-400" />
                              شراء
                            </span>
                            <span className="font-mono text-green-400">
                              {formatRate(rateInfo.buy_price)}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400 flex items-center gap-1">
                              <TrendingDown className="h-3 w-3 text-red-400" />
                              بيع
                            </span>
                            <span className="font-mono text-red-400">
                              {formatRate(rateInfo.sell_price)}
                            </span>
                          </div>
                        </div>
                      )}

                      {equivalentForward && (
                        <div className="bg-[#111827] rounded-lg p-3">
                          <p className="text-xs text-blue-400 font-semibold mb-2 flex items-center gap-1">
                            <Equal className="h-3 w-3" />
                            كم يساوي بالمبلغ المودع والعكس
                          </p>
                          <p className="font-mono text-green-400 text-xs">
                            {equivalentForward}
                          </p>
                          <p className="font-mono text-amber-400 text-xs mt-1">
                            {equivalentReverse}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Right: Controls & Stats */}
                    <div className="space-y-4">
                      {error && (
                        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 p-3 rounded-lg">
                          <AlertCircle className="h-4 w-4" />
                          {error}
                        </div>
                      )}

                      <div className="flex gap-4">
                        {!expertRunning ? (
                          <Button
                            onClick={handleStartExpert}
                            disabled={!amount || parseFloat(amount) <= 0 || loadingExpertTask}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 text-lg h-14"
                          >
                            {loadingExpertTask ? (
                              <RefreshCw className="h-5 w-5 ml-2 animate-spin" />
                            ) : (
                              <Play className="h-5 w-5 ml-2" />
                            )}
                            {loadingExpertTask ? "جاري الحفظ..." : "تشغيل Expert"}
                          </Button>
                        ) : (
                          <Button
                            onClick={handleStopExpert}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 text-lg h-14"
                          >
                            <Square className="h-5 w-5 ml-2" />
                            إيقاف Expert
                          </Button>
                        )}
                      </div>

                      {(expertExecutedCount > 0 || expertSkippedCount > 0) && (
                        <div className="grid grid-cols-2 gap-3">
                          <Card className="bg-[#111827] border-green-500/20 p-3 text-center">
                            <p className="text-xs text-gray-400">
                              تحويلات منفذة (ثنائي الاتجاه)
                            </p>
                            <p className="text-xl font-bold font-mono text-green-400">
                              {expertExecutedCount}
                            </p>
                          </Card>
                          <Card className="bg-[#111827] border-red-500/20 p-3 text-center">
                            <p className="text-xs text-gray-400">
                              تم تخطيها (ثابت)
                            </p>
                            <p className="text-xl font-bold font-mono text-red-400">
                              {expertSkippedCount}
                            </p>
                          </Card>
                          <Card className="bg-[#111827] border-[#374151] p-3 text-center">
                            <p className="text-xs text-gray-400">آخر سعر</p>
                            <p className="text-xl font-bold font-mono text-white">
                              {expertEntries[0]
                                ? formatRate(
                                    expertEntries[0].result.exchange_rate
                                  )
                                : "-"}
                            </p>
                          </Card>
                          <Card className="bg-[#111827] border-[#374151] p-3 text-center">
                            <p className="text-xs text-gray-400">
                              إجمالي الرسوم
                            </p>
                            <div className="space-y-1">
                              {Object.keys(expertFeeByCurrency).length > 0 ? (
                                Object.entries(expertFeeByCurrency).map(
                                  ([cur, total]) => (
                                    <p
                                      key={cur}
                                      className="text-lg font-bold font-mono text-amber-400"
                                    >
                                      {formatFee(total, cur)} {cur}
                                    </p>
                                  )
                                )
                              ) : (
                                <p className="text-lg font-bold font-mono text-amber-400">
                                  0.00
                                </p>
                              )}
                            </div>
                          </Card>
                        </div>
                      )}

                      <div className="bg-[#111827] rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-400">
                          مبلغ الخصم على الرسوم يحول إلى عملة الإيداع للموقع
                        </p>
                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 mt-2">
                          عملة الإيداع: {depositCurrency}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Expert Results with Bidirectional Info */}
                  {expertEntries.length > 0 && (
                    <div className="space-y-3 border-t border-[#374151] pt-4">
                      <h4 className="font-semibold text-gray-300">
                        سجل المراقبة ({expertEntries.length})
                      </h4>
                      {expertEntries.map((entry, idx) => (
                        <div
                          key={idx}
                          className={`bg-[#111827] rounded-lg p-4 border ${
                            entry.executed
                              ? entry.conversionDirection === "reverse"
                                ? "border-blue-500/30"
                                : "border-green-500/30"
                              : entry.priceDirection === "first"
                                ? "border-gray-500/30"
                                : "border-yellow-500/20"
                          }`}
                        >
                          {/* Row 1: Timestamp + Direction Badge + Rate Change */}
                          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">
                                {entry.timestamp}
                              </span>
                              {getDirectionBadge(entry)}
                            </div>
                            {entry.priceDirection !== "first" && (
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-gray-500">
                                  سابق: {formatRate(entry.previousRate)}
                                </span>
                                <span
                                  className={
                                    entry.priceDirection === "up"
                                      ? "text-green-400"
                                      : entry.priceDirection === "down"
                                        ? "text-blue-400"
                                        : "text-yellow-400"
                                  }
                                >
                                  →
                                </span>
                                <span className="text-gray-300">
                                  حالي: {formatRate(entry.currentRate)}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Row 2: Conversion Direction */}
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-lg">
                              {CURRENCY_FLAGS[entry.result.from_currency]}
                            </span>
                            <span className="font-mono text-white text-sm">
                              {formatNumber(
                                entry.result.amount,
                                entry.result.from_currency
                              )}{" "}
                              {entry.result.from_currency}
                            </span>
                            <ArrowLeft className="h-4 w-4 text-amber-400" />
                            <span className="text-lg">
                              {CURRENCY_FLAGS[entry.result.to_currency]}
                            </span>
                            <span className="font-mono text-white text-sm">
                              {entry.result.to_currency}
                            </span>
                          </div>

                          {/* Row 3: Fee Breakdown - only for executed entries */}
                          {entry.executed && (
                            <div className="bg-[#0D1117] rounded-lg p-3 space-y-2 border border-[#1F2937]">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-400">المبلغ قبل الخصم</span>
                                <span className="font-mono text-gray-300">
                                  {formatFee(
                                    entry.result.converted_amount,
                                    entry.result.to_currency
                                  )}{" "}
                                  {entry.result.to_currency}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-amber-400">الرسوم المخصومة</span>
                                <span className="font-mono text-amber-400">
                                  {entry.result.fee_amount > 0
                                    ? `- ${formatFee(
                                        entry.result.fee_amount,
                                        entry.result.to_currency
                                      )} ${entry.result.to_currency}${entry.result.fee_percentage > 0 ? ` (${entry.result.fee_percentage}%)` : ""}`
                                    : "بدون رسوم"}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-sm border-t border-[#374151] pt-2">
                                <span className="text-green-400 font-semibold">المبلغ الصافي</span>
                                <span className="font-mono text-green-400 font-bold text-base">
                                  {formatFee(
                                    entry.result.net_amount,
                                    entry.result.to_currency
                                  )}{" "}
                                  {entry.result.to_currency}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Row 3 alt: Not executed entries */}
                          {!entry.executed && (
                            <div className="text-center py-1">
                              <span className="text-gray-500 text-xs">
                                {entry.priceDirection === "first"
                                  ? "قراءة أولى - لم يتم التحويل"
                                  : "السعر ثابت - تم التخطي"}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
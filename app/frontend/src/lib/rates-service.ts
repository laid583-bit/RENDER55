/**
 * Frontend rates service - implements the same logic as the backend rates_service.py
 * Uses fallback rates for currency conversion when no backend is available.
 */

// Fallback mock rates (approximate market values)
const FALLBACK_RATES: Record<string, Record<string, number>> = {
  XAU: { USD: 3050.0, EUR: 2810.0, DZD: 411750.0 },
  XAG: { USD: 34.5, EUR: 31.8, DZD: 4657.5 },
  OIL: { USD: 78.5, EUR: 72.35, DZD: 10597.5 },
  XCU: { USD: 4.25, EUR: 3.92, DZD: 573.75 },
  USD: {
    EUR: 0.92, GBP: 0.79, JPY: 149.5, NZD: 1.62,
    DZD: 135.0, USDT: 1.0,
    BTC: 0.000015, ETH: 0.00029, DOGE: 5.88,
    SOL: 0.0067, SHIB: 66666.67, PEPE: 100000.0,
    NEAR: 0.167, XAG: 0.029, OIL: 0.01274, XCU: 0.2353,
    TSLA: 0.00385, NVDA: 0.00833, IXIC: 0.0000588,
    "BSC-T": 0.001,
  },
  EUR: {
    USD: 1.085, GBP: 0.858, JPY: 162.2, NZD: 1.76,
    DZD: 146.75,
    BTC: 0.000016, ETH: 0.000315,
  },
  GBP: { USD: 1.265, EUR: 1.165, JPY: 189.1, NZD: 2.05, DZD: 170.78 },
  DZD: { USD: 0.00741, EUR: 0.00681, GBP: 0.00586 },
  USDT: { USD: 1.0, EUR: 0.92, GBP: 0.79, DZD: 135.0, BTC: 0.000015, ETH: 0.00029 },
  BTC: { USD: 67000.0, EUR: 61750.0, DZD: 9045000.0, USDT: 67000.0 },
  ETH: { USD: 3450.0, EUR: 3180.0, DZD: 465750.0, USDT: 3450.0 },
  DOGE: { USD: 0.17, EUR: 0.157, DZD: 22.95, USDT: 0.17 },
  SOL: { USD: 149.0, EUR: 137.35, DZD: 20115.0, USDT: 149.0 },
  SHIB: { USD: 0.000015, EUR: 0.0000138, DZD: 0.002025, USDT: 0.000015 },
  PEPE: { USD: 0.00001, EUR: 0.0000092, DZD: 0.00135, USDT: 0.00001 },
  NEAR: { USD: 5.98, EUR: 5.51, DZD: 807.3, USDT: 5.98 },
  TSLA: { USD: 260.0, EUR: 239.63, DZD: 35100.0 },
  NVDA: { USD: 120.0, EUR: 110.6, DZD: 16200.0 },
  IXIC: { USD: 17000.0, EUR: 15668.2, DZD: 2295000.0 },
  "BSC-T": { USD: 1000.0, EUR: 920.0, BTC: 0.0149, ETH: 0.29 },
  TRX: { USD: 0.125, EUR: 0.115, DZD: 16.875, USDT: 0.125, BTC: 0.00000187, ETH: 0.0000362 },
  TTB: { USD: 0.85, EUR: 0.783, DZD: 114.75, USDT: 0.85, TRX: 6.8, BTC: 0.0000127, ETH: 0.000246 },
};

const SPREAD = 0; // No spread
const DEFAULT_FEE_AMOUNT = 2.0; // $2 default fixed fee

function getFallbackRate(base: string, quote: string): number {
  // Direct rate
  if (FALLBACK_RATES[base] && FALLBACK_RATES[base][quote] !== undefined) {
    return FALLBACK_RATES[base][quote];
  }
  // Inverse rate
  if (FALLBACK_RATES[quote] && FALLBACK_RATES[quote][base] !== undefined) {
    return 1.0 / FALLBACK_RATES[quote][base];
  }
  // Cross through USD
  let baseToUsd: number | null = null;
  if (base === "USD") {
    baseToUsd = 1.0;
  } else if (FALLBACK_RATES[base] && FALLBACK_RATES[base]["USD"] !== undefined) {
    baseToUsd = FALLBACK_RATES[base]["USD"];
  } else if (FALLBACK_RATES["USD"] && FALLBACK_RATES["USD"][base] !== undefined) {
    baseToUsd = 1.0 / FALLBACK_RATES["USD"][base];
  }

  let usdToQuote: number | null = null;
  if (quote === "USD") {
    usdToQuote = 1.0;
  } else if (FALLBACK_RATES["USD"] && FALLBACK_RATES["USD"][quote] !== undefined) {
    usdToQuote = FALLBACK_RATES["USD"][quote];
  } else if (FALLBACK_RATES[quote] && FALLBACK_RATES[quote]["USD"] !== undefined) {
    usdToQuote = 1.0 / FALLBACK_RATES[quote]["USD"];
  }

  if (baseToUsd !== null && usdToQuote !== null) {
    return baseToUsd * usdToQuote;
  }

  // Last resort: try cross through EUR
  let baseToEur: number | null = null;
  if (base === "EUR") {
    baseToEur = 1.0;
  } else if (FALLBACK_RATES[base] && FALLBACK_RATES[base]["EUR"] !== undefined) {
    baseToEur = FALLBACK_RATES[base]["EUR"];
  } else if (FALLBACK_RATES["EUR"] && FALLBACK_RATES["EUR"][base] !== undefined) {
    baseToEur = 1.0 / FALLBACK_RATES["EUR"][base];
  }

  let eurToQuote: number | null = null;
  if (quote === "EUR") {
    eurToQuote = 1.0;
  } else if (FALLBACK_RATES["EUR"] && FALLBACK_RATES["EUR"][quote] !== undefined) {
    eurToQuote = FALLBACK_RATES["EUR"][quote];
  } else if (FALLBACK_RATES[quote] && FALLBACK_RATES[quote]["EUR"] !== undefined) {
    eurToQuote = 1.0 / FALLBACK_RATES[quote]["EUR"];
  }

  if (baseToEur !== null && eurToQuote !== null) {
    return baseToEur * eurToQuote;
  }

  return 1.0; // Fallback to 1:1 if no rate found
}

// Add small random variation to simulate live price movement
function addVariation(rate: number): number {
  const variation = (Math.random() - 0.5) * 0.0004; // ±0.02% variation
  return rate * (1 + variation);
}

export interface ConvertResult {
  from_currency: string;
  to_currency: string;
  amount: number;
  exchange_rate: number;
  converted_amount: number;
  fee_amount: number;
  fee_percentage: number;
  fee_fixed: number;
  net_amount: number;
  is_live: boolean;
}

export interface RateEntry {
  base_currency: string;
  quote_currency: string;
  mid_rate: number;
  buy_price: number;
  sell_price: number;
  spread: number;
  is_live: boolean;
}

/**
 * Get live rates for all supported pairs (simulated with fallback data)
 */
export function getLiveRates(pairs: Array<{ base_currency: string; quote_currency: string }>): RateEntry[] {
  return pairs.map(({ base_currency, quote_currency }) => {
    const midRate = addVariation(getFallbackRate(base_currency, quote_currency));
    const buyPrice = midRate * (1 + SPREAD);
    const sellPrice = midRate * (1 - SPREAD);

    return {
      base_currency,
      quote_currency,
      mid_rate: parseFloat(midRate.toFixed(8)),
      buy_price: parseFloat(buyPrice.toFixed(8)),
      sell_price: parseFloat(sellPrice.toFixed(8)),
      spread: SPREAD,
      is_live: false, // Frontend fallback is never truly "live"
    };
  });
}

/**
 * Get rate info for a specific pair
 */
export function getRateInfo(fromCurrency: string, toCurrency: string): RateEntry {
  const midRate = addVariation(getFallbackRate(fromCurrency, toCurrency));
  const buyPrice = midRate * (1 + SPREAD);
  const sellPrice = midRate * (1 - SPREAD);

  return {
    base_currency: fromCurrency,
    quote_currency: toCurrency,
    mid_rate: parseFloat(midRate.toFixed(8)),
    buy_price: parseFloat(buyPrice.toFixed(8)),
    sell_price: parseFloat(sellPrice.toFixed(8)),
    spread: SPREAD,
    is_live: false,
  };
}

/**
 * Convert currency with variable fee deduction (fixed + percentage)
 */
export function convert(
  fromCurrency: string,
  toCurrency: string,
  amount: number,
  feeFixed: number = DEFAULT_FEE_AMOUNT,
  feePercentage: number = 0,
): ConvertResult {
  const midRate = getFallbackRate(fromCurrency, toCurrency);
  // Use sell price (user is selling fromCurrency)
  const effectiveRate = midRate * (1 - SPREAD);
  const convertedAmount = amount * effectiveRate;

  // Calculate variable fee: fixed amount + percentage of converted amount
  const percentageFee = (feePercentage / 100) * convertedAmount;
  const totalFee = feeFixed + percentageFee;
  const netAmount = Math.max(0, convertedAmount - totalFee);

  return {
    from_currency: fromCurrency,
    to_currency: toCurrency,
    amount,
    exchange_rate: parseFloat(effectiveRate.toFixed(8)),
    converted_amount: parseFloat(convertedAmount.toFixed(8)),
    fee_amount: parseFloat(totalFee.toFixed(8)),
    fee_percentage: feePercentage,
    fee_fixed: feeFixed,
    net_amount: parseFloat(netAmount.toFixed(8)),
    is_live: false,
  };
}

/**
 * Get all supported currency pairs for rate display
 */
export function getAllPairs(): Array<{ base_currency: string; quote_currency: string }> {
  const currencies = [
    "USD", "EUR", "GBP", "JPY", "NZD",
    "XAU", "XAG", "OIL", "XCU",
    "USDT", "BTC", "ETH", "DOGE", "SOL", "SHIB", "PEPE", "NEAR", "BSC-T", "TRX", "TTB",
    "TSLA", "NVDA", "IXIC",
  ];

  const pairs: Array<{ base_currency: string; quote_currency: string }> = [];
  for (const base of currencies) {
    for (const quote of currencies) {
      if (base !== quote) {
        pairs.push({ base_currency: base, quote_currency: quote });
      }
    }
  }
  return pairs;
}
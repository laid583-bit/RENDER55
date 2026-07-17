/**
 * Converter API layer - tries backend first, falls back to local rates service.
 * This ensures the converter works regardless of backend availability.
 */
import { createClient } from "@metagptx/web-sdk";
import { convert, getRateInfo, getLiveRates, type ConvertResult, type RateEntry } from "./rates-service";

const client = createClient();

let backendAvailable: boolean | null = null;

async function checkBackend(): Promise<boolean> {
  if (backendAvailable !== null) return backendAvailable;
  try {
    const response = await client.apiCall.invoke({
      url: "/api/v1/rates/live",
      method: "GET",
      data: {},
    });
    backendAvailable = !!(response?.data?.rates);
    return backendAvailable;
  } catch {
    backendAvailable = false;
    return false;
  }
}

/**
 * Fetch rate info for a currency pair
 */
export async function fetchRateInfo(fromCurrency: string, toCurrency: string): Promise<RateEntry | null> {
  if (fromCurrency === toCurrency) return null;

  const hasBackend = await checkBackend();

  if (hasBackend) {
    try {
      const response = await client.apiCall.invoke({
        url: "/api/v1/rates/live",
        method: "GET",
        data: {},
      });
      if (response?.data?.rates) {
        const rates = response.data.rates;
        const matchingRate = rates.find(
          (r: any) => r.base_currency === fromCurrency && r.quote_currency === toCurrency
        );
        if (matchingRate) {
          return {
            base_currency: fromCurrency,
            quote_currency: toCurrency,
            buy_price: matchingRate.buy_price,
            sell_price: matchingRate.sell_price,
            mid_rate: matchingRate.mid_rate,
            spread: matchingRate.spread,
            is_live: matchingRate.is_live,
          };
        }
        const reverseRate = rates.find(
          (r: any) => r.base_currency === toCurrency && r.quote_currency === fromCurrency
        );
        if (reverseRate) {
          return {
            base_currency: fromCurrency,
            quote_currency: toCurrency,
            buy_price: reverseRate.sell_price > 0 ? 1 / reverseRate.sell_price : 0,
            sell_price: reverseRate.buy_price > 0 ? 1 / reverseRate.buy_price : 0,
            mid_rate: reverseRate.mid_rate > 0 ? 1 / reverseRate.mid_rate : 0,
            spread: reverseRate.spread,
            is_live: reverseRate.is_live,
          };
        }
      }
    } catch {
      // Fall through to local
    }
  }

  // Use local rates service
  return getRateInfo(fromCurrency, toCurrency);
}

/**
 * Convert currency with variable fees per currency pair
 */
export async function convertCurrency(
  fromCurrency: string,
  toCurrency: string,
  amount: number,
): Promise<ConvertResult | null> {
  if (amount <= 0 || fromCurrency === toCurrency) return null;

  const hasBackend = await checkBackend();

  if (hasBackend) {
    try {
      const response = await client.apiCall.invoke({
        url: "/api/v1/rates/convert",
        method: "POST",
        data: {
          from_currency: fromCurrency,
          to_currency: toCurrency,
          amount,
        },
      });
      if (response?.data) {
        return response.data as ConvertResult;
      }
    } catch {
      // Fall through to local
    }
  }

  // Get variable fee for this specific currency pair
  const feeInfo = await getVariableFee(fromCurrency, toCurrency);
  return convert(fromCurrency, toCurrency, amount, feeInfo.fee_fixed, feeInfo.fee_percentage);
}

/**
 * Fetch rates for multiple pairs (for watchlist)
 */
export async function fetchMultipleRates(
  pairs: Array<{ base_currency: string; quote_currency: string }>
): Promise<RateEntry[]> {
  const hasBackend = await checkBackend();

  if (hasBackend) {
    try {
      const response = await client.apiCall.invoke({
        url: "/api/v1/rates/live",
        method: "GET",
        data: {},
      });
      if (response?.data?.rates) {
        const rates = response.data.rates;
        return pairs.map(({ base_currency, quote_currency }) => {
          const match = rates.find(
            (r: any) => r.base_currency === base_currency && r.quote_currency === quote_currency
          );
          if (match) {
            return {
              base_currency,
              quote_currency,
              mid_rate: match.mid_rate,
              buy_price: match.buy_price,
              sell_price: match.sell_price,
              spread: match.spread,
              is_live: match.is_live,
            };
          }
          const reverse = rates.find(
            (r: any) => r.base_currency === quote_currency && r.quote_currency === base_currency
          );
          if (reverse && reverse.mid_rate > 0) {
            return {
              base_currency,
              quote_currency,
              mid_rate: 1 / reverse.mid_rate,
              buy_price: reverse.sell_price > 0 ? 1 / reverse.sell_price : 0,
              sell_price: reverse.buy_price > 0 ? 1 / reverse.buy_price : 0,
              spread: reverse.spread,
              is_live: reverse.is_live,
            };
          }
          // Fallback to local
          return getRateInfo(base_currency, quote_currency);
        });
      }
    } catch {
      // Fall through to local
    }
  }

  return getLiveRates(pairs);
}

/**
 * Save conversion to database (best effort - won't fail if no backend)
 */
export async function saveConversion(result: ConvertResult, depositCurrency: string): Promise<void> {
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
        fee_percentage: result.fee_percentage || 0,
        fee_currency: depositCurrency,
        status: "completed",
      },
    });
  } catch {
    // Silently fail - database not available
    console.warn("Could not save conversion to database");
  }
}

/**
 * Get fee settings (returns defaults if backend unavailable)
 */
export async function getFeeSettings(): Promise<{ deposit_currency: string; fee_percentage: number; fee_fixed: number }> {
  try {
    const feesRes = await client.entities.fee_settings.query({
      query: {},
      limit: 1,
    });
    if (feesRes?.data?.items?.[0]) {
      return {
        deposit_currency: feesRes.data.items[0].deposit_currency || "USD",
        fee_percentage: feesRes.data.items[0].fee_percentage || 0,
        fee_fixed: feesRes.data.items[0].fee_fixed || 2.0,
      };
    }
  } catch {
    // Backend not available
  }
  return { deposit_currency: "USD", fee_percentage: 0, fee_fixed: 2.0 };
}

/**
 * Get variable fee for a specific currency pair.
 * Looks up per-pair fee settings first, then falls back to global default.
 */
export async function getVariableFee(
  fromCurrency: string,
  toCurrency: string
): Promise<{ fee_fixed: number; fee_percentage: number; deposit_currency: string }> {
  try {
    // First try to find a matching pair in currency_pairs
    const pairsRes = await client.entities.currency_pairs.query({
      query: {},
      limit: 100,
    });

    if (pairsRes?.data?.items) {
      const matchingPair = pairsRes.data.items.find(
        (p: any) =>
          (p.base_currency === fromCurrency && p.quote_currency === toCurrency) ||
          (p.base_currency === toCurrency && p.quote_currency === fromCurrency)
      );

      if (matchingPair) {
        // Look up fee for this pair
        const feesRes = await client.entities.fee_settings.query({
          query: { pair_id: matchingPair.id },
          limit: 1,
        });

        if (feesRes?.data?.items?.[0]) {
          const fee = feesRes.data.items[0];
          return {
            fee_fixed: fee.fee_fixed || 0,
            fee_percentage: fee.fee_percentage || 0,
            deposit_currency: fee.deposit_currency || "USD",
          };
        }
      }
    }

    // Fall back to global fee settings
    const globalSettings = await getFeeSettings();
    return {
      fee_fixed: globalSettings.fee_fixed,
      fee_percentage: globalSettings.fee_percentage,
      deposit_currency: globalSettings.deposit_currency,
    };
  } catch {
    // Default fallback
    return { fee_fixed: 2.0, fee_percentage: 0, deposit_currency: "USD" };
  }
}

/**
 * Get all fee settings for display in admin/converter
 */
export async function getAllFeeSettings(): Promise<Array<{
  pair_id: number;
  base_currency: string;
  quote_currency: string;
  fee_fixed: number;
  fee_percentage: number;
  deposit_currency: string;
}>> {
  try {
    const pairsRes = await client.entities.currency_pairs.query({
      query: {},
      limit: 100,
    });
    const feesRes = await client.entities.fee_settings.query({
      query: {},
      limit: 100,
    });

    if (!pairsRes?.data?.items || !feesRes?.data?.items) return [];

    return pairsRes.data.items.map((pair: any) => {
      const fee = feesRes.data.items.find((f: any) => f.pair_id === pair.id);
      return {
        pair_id: pair.id,
        base_currency: pair.base_currency,
        quote_currency: pair.quote_currency,
        fee_fixed: fee?.fee_fixed || 0,
        fee_percentage: fee?.fee_percentage || 0,
        deposit_currency: fee?.deposit_currency || "USD",
      };
    });
  } catch {
    return [];
  }
}
// Currency utilities for international support
export interface CurrencyInfo {
  symbol: string;
  code: string;
  name: string;
}

// Comprehensive currency mapping by country
export const COUNTRY_CURRENCIES: Record<string, CurrencyInfo> = {
  // North America
  'United States': { symbol: '$', code: 'USD', name: 'US Dollar' },
  'Canada': { symbol: 'C$', code: 'CAD', name: 'Canadian Dollar' },
  'Mexico': { symbol: '$', code: 'MXN', name: 'Mexican Peso' },

  // Europe
  'Germany': { symbol: '€', code: 'EUR', name: 'Euro' },
  'France': { symbol: '€', code: 'EUR', name: 'Euro' },
  'Italy': { symbol: '€', code: 'EUR', name: 'Euro' },
  'Spain': { symbol: '€', code: 'EUR', name: 'Euro' },
  'Netherlands': { symbol: '€', code: 'EUR', name: 'Euro' },
  'Belgium': { symbol: '€', code: 'EUR', name: 'Euro' },
  'Austria': { symbol: '€', code: 'EUR', name: 'Euro' },
  'Portugal': { symbol: '€', code: 'EUR', name: 'Euro' },
  'Greece': { symbol: '€', code: 'EUR', name: 'Euro' },
  'Ireland': { symbol: '€', code: 'EUR', name: 'Euro' },
  'Finland': { symbol: '€', code: 'EUR', name: 'Euro' },
  'Luxembourg': { symbol: '€', code: 'EUR', name: 'Euro' },
  'United Kingdom': { symbol: '£', code: 'GBP', name: 'British Pound' },
  'Switzerland': { symbol: 'CHF', code: 'CHF', name: 'Swiss Franc' },
  'Norway': { symbol: 'kr', code: 'NOK', name: 'Norwegian Krone' },
  'Sweden': { symbol: 'kr', code: 'SEK', name: 'Swedish Krona' },
  'Denmark': { symbol: 'kr', code: 'DKK', name: 'Danish Krone' },
  'Poland': { symbol: 'zł', code: 'PLN', name: 'Polish Zloty' },
  'Czech Republic': { symbol: 'Kč', code: 'CZK', name: 'Czech Koruna' },
  'Hungary': { symbol: 'Ft', code: 'HUF', name: 'Hungarian Forint' },
  'Romania': { symbol: 'lei', code: 'RON', name: 'Romanian Leu' },
  'Bulgaria': { symbol: 'лв', code: 'BGN', name: 'Bulgarian Lev' },
  'Croatia': { symbol: '€', code: 'EUR', name: 'Euro' },

  // Asia Pacific
  'Japan': { symbol: '¥', code: 'JPY', name: 'Japanese Yen' },
  'China': { symbol: '¥', code: 'CNY', name: 'Chinese Yuan' },
  'Korea (South)': { symbol: '₩', code: 'KRW', name: 'South Korean Won' },
  'India': { symbol: '₹', code: 'INR', name: 'Indian Rupee' },
  'Australia': { symbol: 'A$', code: 'AUD', name: 'Australian Dollar' },
  'New Zealand': { symbol: 'NZ$', code: 'NZD', name: 'New Zealand Dollar' },
  'Singapore': { symbol: 'S$', code: 'SGD', name: 'Singapore Dollar' },
  'Hong Kong': { symbol: 'HK$', code: 'HKD', name: 'Hong Kong Dollar' },
  'Taiwan': { symbol: 'NT$', code: 'TWD', name: 'Taiwan Dollar' },
  'Thailand': { symbol: '฿', code: 'THB', name: 'Thai Baht' },
  'Malaysia': { symbol: 'RM', code: 'MYR', name: 'Malaysian Ringgit' },
  'Indonesia': { symbol: 'Rp', code: 'IDR', name: 'Indonesian Rupiah' },
  'Philippines': { symbol: '₱', code: 'PHP', name: 'Philippine Peso' },
  'Vietnam': { symbol: '₫', code: 'VND', name: 'Vietnamese Dong' },

  // Middle East & Africa
  'Israel': { symbol: '₪', code: 'ILS', name: 'Israeli Shekel' },
  'Saudi Arabia': { symbol: '﷼', code: 'SAR', name: 'Saudi Riyal' },
  'United Arab Emirates': { symbol: 'د.إ', code: 'AED', name: 'UAE Dirham' },
  'South Africa': { symbol: 'R', code: 'ZAR', name: 'South African Rand' },
  'Egypt': { symbol: '£', code: 'EGP', name: 'Egyptian Pound' },
  'Turkey': { symbol: '₺', code: 'TRY', name: 'Turkish Lira' },

  // South America
  'Brazil': { symbol: 'R$', code: 'BRL', name: 'Brazilian Real' },
  'Argentina': { symbol: '$', code: 'ARS', name: 'Argentine Peso' },
  'Chile': { symbol: '$', code: 'CLP', name: 'Chilean Peso' },
  'Colombia': { symbol: '$', code: 'COP', name: 'Colombian Peso' },
  'Peru': { symbol: 'S/', code: 'PEN', name: 'Peruvian Sol' },
  'Uruguay': { symbol: '$', code: 'UYU', name: 'Uruguayan Peso' },

  // Other regions
  'Russia': { symbol: '₽', code: 'RUB', name: 'Russian Ruble' },
  'Ukraine': { symbol: '₴', code: 'UAH', name: 'Ukrainian Hryvnia' },
};

// Default currency fallback
const DEFAULT_CURRENCY: CurrencyInfo = { symbol: '$', code: 'USD', name: 'US Dollar' };

/**
 * Get currency information for a given country
 */
export const getCurrencyForCountry = (country: string): CurrencyInfo => {
  return COUNTRY_CURRENCIES[country] || DEFAULT_CURRENCY;
};

/**
 * Format a price with the appropriate currency symbol
 */
export const formatPrice = (amount: number | null, country: string): string | null => {
  if (amount === null || amount === undefined) return null;
  
  const currency = getCurrencyForCountry(country);
  
  // Format based on currency type
  if (currency.code === 'JPY' || currency.code === 'KRW' || currency.code === 'VND') {
    // No decimal places for these currencies
    return `${currency.symbol}${Math.round(amount).toLocaleString()}`;
  } else {
    // Two decimal places for most currencies
    return `${currency.symbol}${amount.toFixed(2)}`;
  }
};

/**
 * Get currency symbol for a country
 */
export const getCurrencySymbol = (country: string): string => {
  return getCurrencyForCountry(country).symbol;
};

/**
 * Get currency code for a country
 */
export const getCurrencyCode = (country: string): string => {
  return getCurrencyForCountry(country).code;
};

/**
 * Parse user's country from address
 */
export const parseCountryFromAddress = (address: string | null): string => {
  if (!address) return 'United States'; // Default fallback
  
  try {
    const parsed = JSON.parse(address);
    if (typeof parsed === 'object' && parsed.country) {
      return parsed.country;
    }
  } catch {
    // If parsing fails, return default
  }
  
  return 'United States';
};
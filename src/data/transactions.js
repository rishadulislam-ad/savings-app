export const CATEGORIES = {
  eating_out:     { label: 'Eating Out',     icon: '🍔', color: '#FF6B6B', bg: '#FFF0F0' },
  groceries:      { label: 'Groceries',      icon: '🛒', color: '#10B981', bg: '#ECFDF5' },
  transport:      { label: 'Transport',      icon: '🚌', color: '#F59E0B', bg: '#FFFBEB' },
  entertainment:  { label: 'Entertainment',  icon: '🎬', color: '#8B5CF6', bg: '#F5F3FF' },
  health:         { label: 'Health',         icon: '💊', color: '#EC4899', bg: '#FDF2F8' },
  shopping:       { label: 'Shopping',       icon: '👜', color: '#06B6D4', bg: '#ECFEFF' },
  childcare:      { label: 'Childcare',      icon: '👶', color: '#0A6CFF', bg: '#EFF6FF' },
  salary:         { label: 'Salary',         icon: '💼', color: '#10B981', bg: '#ECFDF5' },
  freelance:      { label: 'Freelance',      icon: '💻', color: '#10B981', bg: '#ECFDF5' },
  savings:        { label: 'Savings',         icon: '🏦', color: '#10B981', bg: '#ECFDF5' },
  other:          { label: 'Other',          icon: '📦', color: '#6B7280', bg: '#F9FAFB' },
};

export const WALLETS = [
  { id: 'main',    label: 'Bank',     icon: '🏦', balance: 4280.50 },
  { id: 'savings', label: 'Savings',  icon: '💰', balance: 12400.00 },
  { id: 'cash',    label: 'Cash',     icon: '💵', balance: 340.00 },
];

export const CURRENCIES = [
  // Popular
  { code: 'USD', symbol: '$',   name: 'US Dollar',          flag: '🇺🇸', region: 'Popular' },
  { code: 'EUR', symbol: '€',   name: 'Euro',               flag: '🇪🇺', region: 'Popular' },
  { code: 'GBP', symbol: '£',   name: 'British Pound',      flag: '🇬🇧', region: 'Popular' },
  { code: 'JPY', symbol: '¥',   name: 'Japanese Yen',       flag: '🇯🇵', region: 'Popular' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar',    flag: '🇨🇦', region: 'Popular' },
  { code: 'AUD', symbol: 'A$',  name: 'Australian Dollar',  flag: '🇦🇺', region: 'Popular' },
  { code: 'CHF', symbol: 'Fr',  name: 'Swiss Franc',        flag: '🇨🇭', region: 'Popular' },
  { code: 'CNY', symbol: '¥',   name: 'Chinese Yuan',       flag: '🇨🇳', region: 'Popular' },
  // South Asia
  { code: 'BDT', symbol: '৳',   name: 'Bangladeshi Taka',   flag: '🇧🇩', region: 'South Asia' },
  { code: 'INR', symbol: '₹',   name: 'Indian Rupee',       flag: '🇮🇳', region: 'South Asia' },
  { code: 'PKR', symbol: '₨',   name: 'Pakistani Rupee',    flag: '🇵🇰', region: 'South Asia' },
  { code: 'LKR', symbol: 'Rs',  name: 'Sri Lankan Rupee',   flag: '🇱🇰', region: 'South Asia' },
  { code: 'NPR', symbol: 'Rs',  name: 'Nepalese Rupee',     flag: '🇳🇵', region: 'South Asia' },
  // Middle East
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham',         flag: '🇦🇪', region: 'Middle East' },
  { code: 'SAR', symbol: '﷼',   name: 'Saudi Riyal',        flag: '🇸🇦', region: 'Middle East' },
  { code: 'QAR', symbol: '﷼',   name: 'Qatari Riyal',       flag: '🇶🇦', region: 'Middle East' },
  { code: 'KWD', symbol: 'K.D', name: 'Kuwaiti Dinar',      flag: '🇰🇼', region: 'Middle East' },
  // Southeast Asia
  { code: 'SGD', symbol: 'S$',  name: 'Singapore Dollar',   flag: '🇸🇬', region: 'Southeast Asia' },
  { code: 'MYR', symbol: 'RM',  name: 'Malaysian Ringgit',  flag: '🇲🇾', region: 'Southeast Asia' },
  { code: 'THB', symbol: '฿',   name: 'Thai Baht',          flag: '🇹🇭', region: 'Southeast Asia' },
  { code: 'IDR', symbol: 'Rp',  name: 'Indonesian Rupiah',  flag: '🇮🇩', region: 'Southeast Asia' },
  { code: 'PHP', symbol: '₱',   name: 'Philippine Peso',    flag: '🇵🇭', region: 'Southeast Asia' },
  { code: 'VND', symbol: '₫',   name: 'Vietnamese Dong',    flag: '🇻🇳', region: 'Southeast Asia' },
  // East Asia
  { code: 'KRW', symbol: '₩',   name: 'South Korean Won',   flag: '🇰🇷', region: 'East Asia' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar',   flag: '🇭🇰', region: 'East Asia' },
  { code: 'TWD', symbol: 'NT$', name: 'Taiwan Dollar',      flag: '🇹🇼', region: 'East Asia' },
  // Americas
  { code: 'BRL', symbol: 'R$',  name: 'Brazilian Real',     flag: '🇧🇷', region: 'Americas' },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso',       flag: '🇲🇽', region: 'Americas' },
  { code: 'ARS', symbol: '$',   name: 'Argentine Peso',     flag: '🇦🇷', region: 'Americas' },
  { code: 'CLP', symbol: '$',   name: 'Chilean Peso',       flag: '🇨🇱', region: 'Americas' },
  // Europe
  { code: 'SEK', symbol: 'kr',  name: 'Swedish Krona',      flag: '🇸🇪', region: 'Europe' },
  { code: 'NOK', symbol: 'kr',  name: 'Norwegian Krone',    flag: '🇳🇴', region: 'Europe' },
  { code: 'DKK', symbol: 'kr',  name: 'Danish Krone',       flag: '🇩🇰', region: 'Europe' },
  { code: 'PLN', symbol: 'zł',  name: 'Polish Zloty',       flag: '🇵🇱', region: 'Europe' },
  { code: 'TRY', symbol: '₺',   name: 'Turkish Lira',       flag: '🇹🇷', region: 'Europe' },
  { code: 'RUB', symbol: '₽',   name: 'Russian Ruble',      flag: '🇷🇺', region: 'Europe' },
  // Africa
  { code: 'ZAR', symbol: 'R',   name: 'South African Rand', flag: '🇿🇦', region: 'Africa' },
  { code: 'NGN', symbol: '₦',   name: 'Nigerian Naira',     flag: '🇳🇬', region: 'Africa' },
  { code: 'EGP', symbol: '£',   name: 'Egyptian Pound',     flag: '🇪🇬', region: 'Africa' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling',    flag: '🇰🇪', region: 'Africa' },
];

export function formatCurrency(amount, currencyCode = 'USD', withSign = false) {
  if (amount === null || amount === undefined || !isFinite(amount) || isNaN(amount)) {
    const cur = CURRENCIES.find(c => c.code === currencyCode) || CURRENCIES[0];
    return `${cur.symbol}0`;
  }
  const cur = CURRENCIES.find(c => c.code === currencyCode) || CURRENCIES[0];
  const noDecimals = ['JPY', 'KRW', 'VND', 'IDR'].includes(currencyCode);
  const hasDecimals = !noDecimals && Math.abs(amount) % 1 !== 0;
  let formatted;
  try {
    formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: hasDecimals ? 2 : 0,
    }).format(Math.abs(amount));
    // If Intl outputs the ISO code instead of a symbol, replace with our custom symbol
    if (formatted.includes(currencyCode)) {
      formatted = formatted.replace(new RegExp(currencyCode + '\\s*'), cur.symbol);
    }
  } catch {
    const num = Math.abs(amount).toLocaleString('en-US', {
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: hasDecimals ? 2 : 0,
    });
    formatted = `${cur.symbol}${num}`;
  }
  if (!withSign) return formatted;
  return amount < 0 ? `- ${formatted}` : `+ ${formatted}`;
}

export function groupByCategory(transactions, allCats = CATEGORIES) {
  const map = {};
  transactions.filter(t => t.type === 'expense').forEach(t => {
    map[t.category] = (map[t.category] || 0) + t.amount;
  });
  return Object.entries(map)
    .map(([cat, total]) => ({ cat, total, ...(allCats[cat] || CATEGORIES.other) }))
    .sort((a, b) => b.total - a.total);
}

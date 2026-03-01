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
  other:          { label: 'Other',          icon: '📦', color: '#6B7280', bg: '#F9FAFB' },
};

export const WALLETS = [
  { id: 'main',    label: 'Main Account',  icon: '🏦', balance: 4280.50 },
  { id: 'savings', label: 'Savings',       icon: '🐷', balance: 12400.00 },
  { id: 'cash',    label: 'Cash',          icon: '💵', balance: 340.00 },
];

export const INITIAL_TRANSACTIONS = [
  { id: 1,  type: 'expense', amount: 22.55, category: 'eating_out',    title: 'Burger Palace',     date: '2026-03-02', wallet: 'main',    tags: ['lunch'] },
  { id: 2,  type: 'expense', amount: 22.55, category: 'eating_out',    title: 'Morning Coffee',    date: '2026-03-02', wallet: 'main',    tags: ['coffee'] },
  { id: 3,  type: 'expense', amount: 289.96,category: 'childcare',     title: 'Daycare Fee',       date: '2026-03-01', wallet: 'main',    tags: ['family'] },
  { id: 4,  type: 'expense', amount: 142.08,category: 'groceries',     title: 'Weekly Groceries',  date: '2026-03-01', wallet: 'main',    tags: ['food', 'weekly'] },
  { id: 5,  type: 'expense', amount: 25.35, category: 'transport',     title: 'Monthly Transit',   date: '2026-03-01', wallet: 'main',    tags: [] },
  { id: 6,  type: 'income',  amount: 3200,  category: 'salary',        title: 'March Salary',      date: '2026-03-01', wallet: 'main',    tags: ['work'] },
  { id: 7,  type: 'expense', amount: 18.99, category: 'entertainment', title: 'Netflix',           date: '2026-02-28', wallet: 'main',    tags: ['subscriptions'] },
  { id: 8,  type: 'expense', amount: 67.40, category: 'shopping',      title: 'ZARA',              date: '2026-02-27', wallet: 'main',    tags: ['clothes'] },
  { id: 9,  type: 'expense', amount: 45.00, category: 'health',        title: 'Gym Membership',    date: '2026-02-26', wallet: 'main',    tags: ['health'] },
  { id: 10, type: 'income',  amount: 850,   category: 'freelance',     title: 'Design Project',    date: '2026-02-25', wallet: 'main',    tags: ['work'] },
  { id: 11, type: 'expense', amount: 12.50, category: 'eating_out',    title: 'Sushi Bar',         date: '2026-02-24', wallet: 'cash',    tags: ['dinner'] },
  { id: 12, type: 'expense', amount: 89.99, category: 'groceries',     title: 'Whole Foods',       date: '2026-02-23', wallet: 'main',    tags: ['food'] },
];

export function formatCurrency(amount, withSign = false) {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 2,
  }).format(Math.abs(amount));
  if (!withSign) return formatted;
  return amount < 0 ? `- ${formatted}` : `+ ${formatted}`;
}

export function groupByCategory(transactions) {
  const map = {};
  transactions.filter(t => t.type === 'expense').forEach(t => {
    map[t.category] = (map[t.category] || 0) + t.amount;
  });
  return Object.entries(map)
    .map(([cat, total]) => ({ cat, total, ...CATEGORIES[cat] }))
    .sort((a, b) => b.total - a.total);
}

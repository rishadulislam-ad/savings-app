import { CATEGORIES, formatCurrency } from '../data/transactions';
import { useTheme } from '../context/ThemeContext';

export default function TransactionItem({ tx, onClick, customCategories }) {
  const { currency } = useTheme();
  const allCats = customCategories?.length
    ? { ...CATEGORIES, ...Object.fromEntries(customCategories.map(c => [c.id, c])) }
    : CATEGORIES;
  const cat = allCats[tx.category] || CATEGORIES.other;
  const date = new Date(tx.date);
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="tx-item" onClick={() => onClick && onClick(tx)}>
      <div className="tx-icon" style={{ background: cat.bg || `${cat.color}18` }}>
        <span style={{ fontSize: 20 }}>{cat.icon}</span>
      </div>
      <div className="tx-info">
        <div className="tx-name">{tx.title}</div>
        <div className="tx-meta">{cat.label} · {dateStr}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {tx.receipt && (
          <span style={{ fontSize: 12, opacity: 0.6 }} title="Has receipt">📷</span>
        )}
        <div className={`tx-amount ${tx.type}`}>
          {tx.type === 'expense' ? '−' : '+'}{formatCurrency(tx.amount, currency)}
        </div>
      </div>
    </div>
  );
}

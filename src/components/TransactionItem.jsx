import { CATEGORIES, formatCurrency } from '../data/transactions';

export default function TransactionItem({ tx, onClick }) {
  const cat = CATEGORIES[tx.category] || CATEGORIES.other;
  const date = new Date(tx.date);
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="tx-item" onClick={() => onClick && onClick(tx)}>
      <div className="tx-icon" style={{ background: cat.bg }}>
        <span style={{ fontSize: 20 }}>{cat.icon}</span>
      </div>
      <div className="tx-info">
        <div className="tx-name">{tx.title}</div>
        <div className="tx-meta">{cat.label} · {dateStr}</div>
      </div>
      <div className={`tx-amount ${tx.type}`}>
        {tx.type === 'expense' ? '−' : '+'}{formatCurrency(tx.amount)}
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import DonutChart from '../components/DonutChart';
import TransactionItem from '../components/TransactionItem';
import { CATEGORIES, WALLETS, formatCurrency, groupByCategory } from '../data/transactions';
import { useTheme } from '../context/ThemeContext';

const DATE_PERIODS = [
  { id: 'today', label: 'Today' },
  { id: 'week',  label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'all',   label: 'All Time' },
];

const VIEW_MODES = ['All', 'Expense', 'Income'];

const CARD_GRADIENTS = [
  'linear-gradient(135deg, #1A7FFF 0%, #0052CC 100%)',
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
];

function filterByPeriod(transactions, period) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  if (period === 'today') return transactions.filter(t => t.date === today);
  if (period === 'week') {
    const day = now.getDay();
    const mon = new Date(now);
    mon.setDate(now.getDate() - ((day + 6) % 7));
    const monStr = mon.toISOString().slice(0, 10);
    return transactions.filter(t => t.date >= monStr && t.date <= today);
  }
  if (period === 'month') {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    return transactions.filter(t => t.date >= firstDay && t.date <= today);
  }
  return transactions;
}

function groupIncomeByCategory(transactions) {
  const map = {};
  transactions.filter(t => t.type === 'income').forEach(t => {
    map[t.category] = (map[t.category] || 0) + t.amount;
  });
  return Object.entries(map)
    .map(([cat, total]) => ({ cat, total, ...CATEGORIES[cat] }))
    .sort((a, b) => b.total - a.total);
}

export default function HomeScreen({ transactions }) {
  const { currency } = useTheme();
  const [viewMode, setViewMode] = useState('All');
  const [datePeriod, setDatePeriod] = useState('month');

  const filtered = useMemo(() => filterByPeriod(transactions, datePeriod), [transactions, datePeriod]);

  const totalExpense = useMemo(
    () => filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    [filtered]
  );
  const totalIncome = useMemo(
    () => filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
    [filtered]
  );
  const netBalance = totalIncome - totalExpense;

  const totalWallets = WALLETS.reduce((s, w) => s + w.balance, 0);

  const expenseByCategory = useMemo(() => groupByCategory(filtered), [filtered]);
  const incomeByCategory  = useMemo(() => groupIncomeByCategory(filtered), [filtered]);

  const breakdownData = viewMode === 'Income' ? incomeByCategory : expenseByCategory;
  const breakdownTotal = viewMode === 'Income' ? totalIncome : totalExpense;
  const breakdownLabel = viewMode === 'Income' ? 'income' : 'spent';

  const donutData = breakdownData.slice(0, 4).map(c => ({
    value: c.total, color: c.color, label: c.label,
  }));

  const recent = useMemo(() => {
    let list = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));
    if (viewMode === 'Expense') list = list.filter(t => t.type === 'expense');
    if (viewMode === 'Income')  list = list.filter(t => t.type === 'income');
    return list.slice(0, 4);
  }, [filtered, viewMode]);

  const greetHour = new Date().getHours();
  const greet = greetHour < 12 ? 'Good Morning' : greetHour < 17 ? 'Good Afternoon' : 'Good Evening';
  const periodLabel = DATE_PERIODS.find(p => p.id === datePeriod)?.label;

  // Summary card values per mode
  const summaryConfig = {
    All:     { title: 'Total Balance',  amount: totalWallets + netBalance, color: '#fff' },
    Expense: { title: 'Total Spent',    amount: totalExpense,               color: '#FFB3B3' },
    Income:  { title: 'Total Income',   amount: totalIncome,                color: '#B3FFD9' },
  };
  const { title: summaryTitle, amount: summaryAmount, color: summaryColor } = summaryConfig[viewMode];

  const savingsPct = totalIncome > 0 ? Math.round((netBalance / totalIncome) * 100) : 0;

  return (
    <div className="screen-content" style={{ padding: '0 20px 20px' }}>

      {/* Header */}
      <div className="anim-fadeup" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 500 }}>Hi Alex 👋</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px', marginTop: 2 }}>
            {greet}
          </div>
        </div>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: 'linear-gradient(135deg, #667eea, #764ba2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, cursor: 'pointer', boxShadow: '0 2px 8px rgba(102,126,234,0.4)',
        }}>
          🧑‍💼
        </div>
      </div>

      {/* Date Period Chips */}
      <div className="anim-fadeup" style={{ display: 'flex', gap: 8, marginBottom: 14, animationDelay: '0.03s' }}>
        {DATE_PERIODS.map(p => (
          <button
            key={p.id}
            onClick={() => setDatePeriod(p.id)}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              border: `1.5px solid ${datePeriod === p.id ? 'var(--accent)' : 'var(--border)'}`,
              background: datePeriod === p.id ? 'var(--accent)' : 'transparent',
              color: datePeriod === p.id ? '#fff' : 'var(--text-secondary)',
              fontSize: 12, fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* 3-Segment Toggle + Summary Card */}
      <div
        className="summary-card anim-fadeup"
        style={{ animationDelay: '0.06s', marginBottom: 20, padding: 0, overflow: 'hidden' }}
      >
        {/* Segment Toggle */}
        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.18)' }}>
          {VIEW_MODES.map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                flex: 1,
                padding: '11px 0',
                background: viewMode === mode ? 'rgba(255,255,255,0.18)' : 'transparent',
                border: 'none',
                borderBottom: viewMode === mode ? '2px solid rgba(255,255,255,0.7)' : '2px solid transparent',
                color: viewMode === mode ? '#fff' : 'rgba(255,255,255,0.5)',
                fontSize: 13,
                fontWeight: viewMode === mode ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.18s',
                letterSpacing: '0.01em',
              }}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Card Content */}
        <div style={{ padding: '20px 22px 22px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
            {summaryTitle} · {periodLabel}
          </div>
          <div style={{ fontSize: 36, fontWeight: 800, color: summaryColor, letterSpacing: '-1.5px', margin: '6px 0 18px', lineHeight: 1 }}>
            {formatCurrency(Math.abs(summaryAmount), currency)}
          </div>

          {viewMode === 'All' && (
            <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.04em' }}>INCOME</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#B3FFD9', marginTop: 3 }}>
                  +{formatCurrency(totalIncome, currency)}
                </div>
              </div>
              <div style={{ width: 1, background: 'rgba(255,255,255,0.18)', alignSelf: 'stretch' }} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.04em' }}>SPENT</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#FFB3B3', marginTop: 3 }}>
                  −{formatCurrency(totalExpense, currency)}
                </div>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <span style={{
                  fontSize: 11, fontWeight: 700,
                  background: 'rgba(255,255,255,0.15)',
                  color: '#fff',
                  padding: '4px 10px', borderRadius: 20,
                }}>
                  {savingsPct >= 0 ? '↑' : '↓'} {Math.abs(savingsPct)}% saved
                </span>
              </div>
            </div>
          )}

          {viewMode === 'Expense' && (
            <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.04em' }}>TRANSACTIONS</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginTop: 3 }}>
                  {filtered.filter(t => t.type === 'expense').length} records
                </div>
              </div>
              <div style={{ width: 1, background: 'rgba(255,255,255,0.18)', alignSelf: 'stretch' }} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.04em' }}>TOP CATEGORY</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginTop: 3 }}>
                  {expenseByCategory[0] ? `${expenseByCategory[0].icon} ${expenseByCategory[0].label}` : '—'}
                </div>
              </div>
            </div>
          )}

          {viewMode === 'Income' && (
            <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.04em' }}>TRANSACTIONS</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginTop: 3 }}>
                  {filtered.filter(t => t.type === 'income').length} records
                </div>
              </div>
              <div style={{ width: 1, background: 'rgba(255,255,255,0.18)', alignSelf: 'stretch' }} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.04em' }}>TOP SOURCE</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginTop: 3 }}>
                  {incomeByCategory[0] ? `${incomeByCategory[0].icon} ${incomeByCategory[0].label}` : '—'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* My Cards */}
      <div className="anim-fadeup" style={{ marginBottom: 16, animationDelay: '0.12s' }}>
        <div className="section-header" style={{ marginBottom: 12 }}>
          <span className="section-title">My Cards</span>
          <button className="section-action">Manage</button>
        </div>
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 4 }}>
          {WALLETS.map((w, i) => (
            <div
              key={w.id}
              style={{
                flexShrink: 0,
                width: 185,
                background: CARD_GRADIENTS[i % CARD_GRADIENTS.length],
                borderRadius: 18,
                padding: '18px 18px 16px',
                color: '#fff',
                boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer',
              }}
            >
              {/* Decorative circles */}
              <div style={{
                position: 'absolute', right: -18, top: -18,
                width: 90, height: 90, borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)',
                pointerEvents: 'none',
              }} />
              <div style={{
                position: 'absolute', right: 12, bottom: -28,
                width: 70, height: 70, borderRadius: '50%',
                background: 'rgba(255,255,255,0.07)',
                pointerEvents: 'none',
              }} />
              <div style={{ fontSize: 22, marginBottom: 10 }}>{w.icon}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.65)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {w.label}
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px', marginTop: 5 }}>
                {formatCurrency(w.balance, currency)}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 10, letterSpacing: '0.2em' }}>
                •••• •••• {String(1234 + i * 1111).slice(-4)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Breakdown (donut + categories) */}
      {donutData.length > 0 && (
        <div className="card anim-fadeup" style={{ animationDelay: '0.18s', padding: '18px', marginBottom: 16 }}>
          <div className="section-header" style={{ marginBottom: 16 }}>
            <span className="section-title">
              {viewMode === 'Income' ? 'Income Breakdown' : 'Spending Breakdown'}
            </span>
            <button className="section-action">See All</button>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <DonutChart
              data={donutData}
              size={130}
              stroke={26}
              centerLabel={formatCurrency(breakdownTotal, currency)}
              centerSub={breakdownLabel}
            />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {breakdownData.slice(0, 4).map(c => (
                <div key={c.cat} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>{c.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {formatCurrency(c.total, currency)}
                      </span>
                    </div>
                    <div className="progress-bar-track" style={{ marginTop: 3, height: 4 }}>
                      <div className="progress-bar-fill" style={{
                        width: `${breakdownTotal > 0 ? (c.total / breakdownTotal) * 100 : 0}%`,
                        background: c.color,
                        height: 4,
                      }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="card anim-fadeup" style={{ animationDelay: '0.24s', padding: '18px' }}>
        <div className="section-header">
          <span className="section-title">Recent Transactions</span>
          <button className="section-action">See All</button>
        </div>
        {recent.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-tertiary)', fontSize: 13 }}>
            No transactions for this period
          </div>
        ) : (
          recent.map(tx => <TransactionItem key={tx.id} tx={tx} />)
        )}
      </div>
    </div>
  );
}

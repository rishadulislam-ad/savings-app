import { useEffect, useMemo, useState } from 'react';
import DonutChart from '../components/DonutChart';
import TransactionItem from '../components/TransactionItem';
import { CATEGORIES, formatCurrency, groupByCategory } from '../data/transactions';
import { useTheme } from '../context/ThemeContext';

const DATE_PERIODS = [
  { id: 'today', label: 'Today' },
  { id: 'week',  label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'all',   label: 'All Time' },
];

const VIEW_MODES = ['All', 'Expense', 'Income'];


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

function groupIncomeByCategory(transactions, allCats = CATEGORIES) {
  const map = {};
  transactions.filter(t => t.type === 'income').forEach(t => {
    map[t.category] = (map[t.category] || 0) + t.amount;
  });
  return Object.entries(map)
    .map(([cat, total]) => ({ cat, total, ...(allCats[cat] || CATEGORIES.other) }))
    .sort((a, b) => b.total - a.total);
}

export default function HomeScreen({ transactions, onEdit, onNavigate, datePeriod, onPeriodChange, currentUser, customCategories }) {
  const { currency } = useTheme();
  const [viewMode, setViewMode] = useState('All');
  const [selectedBar, setSelectedBar] = useState(null);

  // Merge built-in + custom categories
  const allCategories = useMemo(() => {
    if (!customCategories?.length) return CATEGORIES;
    return { ...CATEGORIES, ...Object.fromEntries(customCategories.map(c => [c.id, c])) };
  }, [customCategories]);

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


  const expenseByCategory = useMemo(() => groupByCategory(filtered, allCategories), [filtered, allCategories]);
  const incomeByCategory  = useMemo(() => groupIncomeByCategory(filtered, allCategories), [filtered, allCategories]);

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
    All:     { title: 'Net Balance',  amount: netBalance, color: '#fff' },
    Expense: { title: 'Total Spent',    amount: totalExpense,               color: '#fff' },
    Income:  { title: 'Total Income',   amount: totalIncome,                color: '#fff' },
  };
  const { title: summaryTitle, amount: summaryAmount, color: summaryColor } = summaryConfig[viewMode];

  const savingsPct = totalIncome > 0 ? Math.round((netBalance / totalIncome) * 100) : 0;

  // Reset selected bar when period or view changes
  useEffect(() => { setSelectedBar(null); }, [datePeriod, viewMode]);

  // Daily chart: spending (or income) per day over the selected period
  const dailyChartData = useMemo(() => {
    // Use local date string to avoid timezone issues
    const now = new Date();
    const localStr = d => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    const todayStr = localStr(now);

    let days = [];
    if (datePeriod === 'today') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        days.push(localStr(d));
      }
    } else if (datePeriod === 'week') {
      const offset = (now.getDay() + 6) % 7;
      for (let i = 0; i <= offset; i++) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset + i);
        days.push(localStr(d));
      }
    } else if (datePeriod === 'month') {
      const cur = new Date(now.getFullYear(), now.getMonth(), 1);
      while (localStr(cur) <= todayStr) {
        days.push(localStr(cur));
        cur.setDate(cur.getDate() + 1);
      }
    } else {
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        days.push(localStr(d));
      }
    }

    const txType = viewMode === 'Income' ? 'income' : 'expense';
    const relevant = filtered.filter(t => t.type === txType);
    return days.map(date => ({
      date,
      amount: relevant.filter(t => t.date === date).reduce((s, t) => s + t.amount, 0),
    }));
  }, [filtered, datePeriod, viewMode]);

  return (
    <div className="screen-content" style={{ padding: '48px 20px 20px' }}>

      {/* Header */}
      <div className="anim-fadeup" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 500 }}>Hi {currentUser?.name?.split(' ')[0] || 'there'} 👋</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px', marginTop: 2 }}>
            {greet}
          </div>
        </div>

        {/* Right side: Travel Tracker pill + avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Travel Tracker button */}
          <div
            onClick={() => onNavigate?.('travel')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 12px 7px 8px', borderRadius: 20,
              background: 'linear-gradient(135deg, #4facfe, #00f2fe)',
              cursor: 'pointer', boxShadow: '0 2px 10px rgba(79,172,254,0.4)',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span style={{ fontSize: 15 }}>✈️</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: '-0.1px' }}>Trips</span>
          </div>

          {/* Avatar */}
          <div onClick={() => onNavigate?.('profile')} style={{
            width: 44, height: 44, borderRadius: '50%',
            background: 'var(--surface2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, cursor: 'pointer',
            border: '2px solid rgba(102,126,234,0.3)',
          }}>
            {currentUser?.avatar || '🧑‍💼'}
          </div>
        </div>
      </div>

      {/* Date Period Chips */}
      <div className="anim-fadeup" style={{ display: 'flex', gap: 8, marginBottom: 14, animationDelay: '0.06s' }}>
        {DATE_PERIODS.map(p => (
          <button
            key={p.id}
            onClick={() => onPeriodChange(p.id)}
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
        style={{
          animationDelay: '0.12s', marginBottom: 20, padding: 0, overflow: 'hidden',
          background: viewMode === 'Expense'
            ? 'linear-gradient(145deg, #FF5C5C, #C0152A)'
            : viewMode === 'Income'
              ? 'linear-gradient(145deg, #1DB97A, #0A7A4E)'
              : undefined,
          transition: 'background 0.3s ease',
        }}
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
          {/* Main amount + savings badge on same line */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', margin: '6px 0 18px' }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: summaryColor, letterSpacing: '-1.5px', lineHeight: 1 }}>
              {formatCurrency(Math.abs(summaryAmount), currency)}
            </div>
            {viewMode === 'All' && totalIncome > 0 && (
              <span style={{
                fontSize: 11, fontWeight: 700, flexShrink: 0,
                background: savingsPct >= 0 ? 'rgba(179,255,217,0.2)' : 'rgba(255,179,179,0.2)',
                color: savingsPct >= 0 ? '#B3FFD9' : '#FFB3B3',
                padding: '4px 10px', borderRadius: 20,
                border: `1px solid ${savingsPct >= 0 ? 'rgba(179,255,217,0.3)' : 'rgba(255,179,179,0.3)'}`,
              }}>
                {savingsPct >= 0 ? '↑' : '↓'} {Math.abs(savingsPct)}% saved
              </span>
            )}
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


      {/* Breakdown (top total + bar rows) */}
      {breakdownData.length > 0 && (
        <div className="card anim-fadeup" style={{ animationDelay: '0.18s', padding: '20px', marginBottom: 16 }}>
          {/* Header */}
          <div className="section-header" style={{ marginBottom: 14 }}>
            <span className="section-title">
              {viewMode === 'Income' ? 'Income Breakdown' : 'Spending Breakdown'}
            </span>
            <button className="section-action" onClick={() => onNavigate && onNavigate('budgets')}>See All</button>
          </div>

          {/* Total pill */}
          <div style={{
            display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 18,
          }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Total {viewMode === 'Income' ? 'earned' : 'spent'}
            </span>
            <span style={{ fontSize: 22, fontWeight: 800, color: viewMode === 'Income' ? 'var(--success)' : 'var(--danger)', letterSpacing: '-0.5px' }}>
              {viewMode === 'Income' ? '+' : '−'}{formatCurrency(breakdownTotal, currency)}
            </span>
          </div>

          {/* Daily activity mini chart */}
          {(() => {
            const maxAmt = Math.max(...dailyChartData.map(d => d.amount), 1);
            const now = new Date();
            const pad = v => String(v).padStart(2, '0');
            const todayStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
            const isIncome = viewMode === 'Income';
            const accentColor = isIncome ? 'var(--success)' : 'var(--accent)';
            const accentRgb   = isIncome ? '16,185,129' : '10,108,255';
            const n = dailyChartData.length;
            const labelEvery = n <= 8 ? 1 : n <= 16 ? 2 : n <= 20 ? 3 : 5;
            const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            const fmtDate = date => `${MONTHS[parseInt(date.slice(5,7))-1]} ${parseInt(date.slice(8))}`;

            // Info row: show selected bar, fallback to peak
            const peakEntry = dailyChartData.reduce((a, b) => b.amount > a.amount ? b : a, { amount: 0, date: '' });
            const infoEntry = selectedBar !== null ? dailyChartData[selectedBar] : peakEntry;
            const infoLabel = infoEntry?.date ? (selectedBar !== null ? fmtDate(infoEntry.date) : `Peak · ${fmtDate(infoEntry.date)}`) : null;

            return (
              <div style={{ marginBottom: 20 }}>
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    Daily Activity
                  </span>
                  {infoEntry?.amount > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {infoLabel}
                      <span style={{ color: accentColor, marginLeft: 4, fontWeight: 700 }}>
                        {isIncome ? '+' : '−'}{formatCurrency(infoEntry.amount, currency)}
                      </span>
                    </span>
                  )}
                </div>

                {/* Bars */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: n > 20 ? 2 : 3, height: 56 }}>
                  {dailyChartData.map((d, i) => {
                    const barH = d.amount > 0 ? Math.max(Math.round((d.amount / maxAmt) * 42), 6) : 4;
                    const isPeak = d.amount === maxAmt && d.amount > 0;
                    const isSelected = selectedBar === i;
                    const isToday = d.date === todayStr;
                    const showLabel = i === 0 || i === n - 1 || isToday || i % labelEvery === 0;

                    // Bar color: selected/peak = solid accent, has data = medium opacity, empty = very subtle
                    const barBg = isSelected
                      ? accentColor
                      : isPeak && selectedBar === null
                        ? accentColor
                        : d.amount > 0
                          ? `rgba(${accentRgb},0.28)`
                          : 'var(--border)';
                    const barShadow = (isSelected || (isPeak && selectedBar === null)) && d.amount > 0
                      ? `0 2px 8px rgba(${accentRgb},0.45)`
                      : 'none';

                    return (
                      <div
                        key={d.date}
                        onClick={() => setSelectedBar(isSelected ? null : i)}
                        style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 4, cursor: d.amount > 0 ? 'pointer' : 'default' }}
                      >
                        {/* Selection dot above bar */}
                        <div style={{ width: 4, height: 4, borderRadius: '50%', background: isSelected ? accentColor : 'transparent', marginBottom: 1, flexShrink: 0 }} />
                        <div style={{
                          width: '100%', height: barH, borderRadius: 4,
                          background: barBg,
                          boxShadow: barShadow,
                          transition: 'height 0.4s cubic-bezier(0.25,0.46,0.45,0.94), background 0.2s, box-shadow 0.2s',
                          transform: isSelected ? 'scaleX(1.15)' : 'scaleX(1)',
                        }} />
                        {showLabel ? (
                          <span style={{ fontSize: 8.5, lineHeight: 1, color: isSelected ? accentColor : isToday ? accentColor : 'var(--text-tertiary)', fontWeight: isSelected || isToday ? 700 : 400, whiteSpace: 'nowrap' }}>
                            {parseInt(d.date.slice(8))}
                          </span>
                        ) : (
                          <span style={{ fontSize: 8.5, lineHeight: 1, opacity: 0 }}>·</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Divider */}
          <div style={{ height: 1, background: 'var(--border)', marginBottom: 16 }} />

          {/* Category rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {breakdownData.slice(0, 5).map((c, i) => {
              const pct = breakdownTotal > 0 ? (c.total / breakdownTotal) * 100 : 0;
              return (
                <div key={c.cat}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ width: 9, height: 9, borderRadius: '50%', background: c.color, flexShrink: 0, marginRight: 8 }} />
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{c.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: viewMode === 'Income' ? 'var(--success)' : 'var(--danger)' }}>
                      {viewMode === 'Income' ? '+' : '−'}{formatCurrency(c.total, currency)}
                    </span>
                  </div>
                  {/* Bar track */}
                  <div style={{ height: 5, borderRadius: 99, background: 'var(--bg-secondary)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${pct}%`,
                      borderRadius: 99,
                      background: c.color,
                      transition: 'width 0.6s cubic-bezier(0.25,0.46,0.45,0.94)',
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 3 }}>
                    <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-tertiary)' }}>{pct.toFixed(0)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="card anim-fadeup" style={{ animationDelay: '0.24s', padding: '18px' }}>
        <div className="section-header">
          <span className="section-title">Recent Transactions</span>
          <button className="section-action" onClick={() => onNavigate && onNavigate('transactions')}>See All</button>
        </div>
        {recent.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-tertiary)', fontSize: 13 }}>
            No transactions for this period
          </div>
        ) : (
          recent.map(tx => <TransactionItem key={tx.id} tx={tx} onClick={onEdit} customCategories={customCategories} />)
        )}
      </div>
    </div>
  );
}

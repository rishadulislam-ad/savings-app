import { useEffect, useMemo, useState } from 'react';
import DonutChart from '../components/DonutChart';
import TransactionItem from '../components/TransactionItem';
import { CATEGORIES, CURRENCIES, formatCurrency, groupByCategory } from '../data/transactions';
import { useTheme } from '../context/ThemeContext';
import { lightTap } from '../utils/haptics';
import AnimatedNumber from '../components/AnimatedNumber';
import { generateInsights } from '../utils/insightEngine';
import { localYMD } from '../utils/date';

const DATE_PERIODS = [
  { id: 'today', label: 'Today' },
  { id: 'week',  label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'all',   label: 'All Time' },
];

const VIEW_MODES = ['All', 'Expense', 'Income'];


function filterByPeriod(transactions, period) {
  const now = new Date();
  const localStr = d => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const today = localStr(now);

  if (period === 'today') return transactions.filter(t => t.date === today);
  if (period === 'week') {
    const day = now.getDay();
    const mon = new Date(now);
    mon.setDate(now.getDate() - ((day + 6) % 7));
    const monStr = localStr(mon);
    return transactions.filter(t => t.date >= monStr && t.date <= today);
  }
  if (period === 'month') {
    const firstDay = localStr(new Date(now.getFullYear(), now.getMonth(), 1));
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

export default function HomeScreen({ transactions, onEdit, onNavigate, onOpenMyFinance, datePeriod, onPeriodChange, currentUser, customCategories }) {
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

  const savingsPct = totalIncome > 0 ? Math.max(-100, Math.min(100, Math.round((netBalance / totalIncome) * 100))) : 0;

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
    <div className="screen-content safe-top" role="main" style={{ padding: '0 20px 20px' }}>

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
            onClick={() => { lightTap(); onNavigate?.('travel'); }}
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
          <div onClick={() => { lightTap(); onNavigate?.('profile'); }} role="button" aria-label="Profile" style={{
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
            onClick={() => { lightTap(); onPeriodChange(p.id); }}
            aria-label={`Filter by ${p.label}`}
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
        data-tour="balance-card"
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
              onClick={() => { lightTap(); setViewMode(mode); }}
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
            <div style={{ fontSize: 36, fontWeight: 800, color: '#fff', letterSpacing: '-1.5px', lineHeight: 1 }}>
              <AnimatedNumber value={Math.abs(summaryAmount)} prefix={`${viewMode === 'All' && summaryAmount < 0 ? '−' : ''}${(CURRENCIES.find(c => c.code === currency) || CURRENCIES[0]).symbol}`} />
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
                  <AnimatedNumber value={totalIncome} prefix={`+${(CURRENCIES.find(c => c.code === currency) || CURRENCIES[0]).symbol}`} />
                </div>
              </div>
              <div style={{ width: 1, background: 'rgba(255,255,255,0.18)', alignSelf: 'stretch' }} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.04em' }}>SPENT</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#FFB3B3', marginTop: 3 }}>
                  <AnimatedNumber value={totalExpense} prefix={`−${(CURRENCIES.find(c => c.code === currency) || CURRENCIES[0]).symbol}`} />
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


      {/* Smart Insights — small rotating tile. Insights are generated by
          src/utils/insightEngine.js (forecast, anomaly, recurring, streak,
          baseline-trend, summary). Whole card taps → opens My Finance. */}
      <SmartInsightWidget
        transactions={transactions}
        currency={currency}
        allCategories={allCategories}
        currentUser={currentUser}
        onOpenMyFinance={onOpenMyFinance}
      />

      {/* Breakdown — Donut + Legend */}
      {breakdownData.length > 0 && (() => {
        const isIncome = viewMode === 'Income';
        const donutSize = 110;
        const r = 44, cx = donutSize / 2, cy = donutSize / 2, strokeW = 10;
        const circ = 2 * Math.PI * r;
        let offset = 0;
        const donutSegments = breakdownData.map(c => {
          const pct = breakdownTotal > 0 ? (c.total / breakdownTotal) * 100 : 0;
          const dash = (pct / 100) * circ;
          const seg = { dash, gap: circ - dash, color: c.color, offset };
          offset += dash;
          return seg;
        });
        const fmtTotal = breakdownTotal >= 1000000
          ? `${(CURRENCIES.find(c => c.code === currency) || CURRENCIES[0]).symbol}${(breakdownTotal / 1000000).toFixed(2)}M`
          : formatCurrency(breakdownTotal, currency);

        return (
          <div data-tour="breakdown" className="card anim-fadeup" onClick={() => { lightTap(); onNavigate && onNavigate('budgets'); }} style={{ animationDelay: '0.18s', padding: '18px', marginBottom: 16, cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              {/* Donut */}
              <div style={{ position: 'relative', width: donutSize, height: donutSize, flexShrink: 0 }}>
                <svg width={donutSize} height={donutSize} viewBox={`0 0 ${donutSize} ${donutSize}`} style={{ transform: 'rotate(-90deg)' }}>
                  {donutSegments.map((seg, i) => (
                    <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color} strokeWidth={strokeW}
                      strokeDasharray={`${seg.dash} ${seg.gap}`} strokeDashoffset={-seg.offset} />
                  ))}
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-tertiary)', marginBottom: 2 }}>
                    {isIncome ? 'Earned' : 'Spent'}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace' }}>{fmtTotal}</div>
                </div>
              </div>

              {/* Legend */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7, maxHeight: 160, overflowY: 'auto', scrollbarWidth: 'none' }}>
                {breakdownData.map(c => {
                  const pct = breakdownTotal > 0 ? Math.round((c.total / breakdownTotal) * 100) : 0;
                  return (
                    <div key={c.cat} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'monospace', flexShrink: 0 }}>{formatCurrency(c.total, currency)}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', width: 28, textAlign: 'right', flexShrink: 0 }}>{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Upcoming Bills (from recurring transactions) */}
      {(() => {
        const recurring = transactions.filter(t => t.recurring);
        if (recurring.length === 0) return null;
        const today = new Date();
        const todayStr = localYMD(today);
        const upcoming = recurring.map(t => {
          const lastDate = new Date(t.date);
          let next = new Date(lastDate);
          // Find the next occurrence after today
          while (localYMD(next) <= todayStr) {
            if (t.recurFreq === 'weekly') next.setDate(next.getDate() + 7);
            else if (t.recurFreq === 'yearly') next.setFullYear(next.getFullYear() + 1);
            else next.setMonth(next.getMonth() + 1);
          }
          const nextStr = localYMD(next);
          const daysUntil = Math.ceil((next - today) / (1000 * 60 * 60 * 24));
          const cat = allCategories[t.category] || { label: t.category, icon: '📦', color: '#6B7280' };
          return { ...t, nextDate: nextStr, daysUntil, cat };
        }).sort((a, b) => a.daysUntil - b.daysUntil).slice(0, 5);

        return (
          <div className="card anim-fadeup" style={{ animationDelay: '0.18s', padding: '18px', marginBottom: 16 }}>
            <div className="section-header" style={{ marginBottom: 12 }}>
              <span className="section-title">Upcoming Bills</span>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500 }}>{recurring.length} recurring</span>
            </div>
            {upcoming.map((bill, i) => (
              <div key={bill.id + '_' + i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < upcoming.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: bill.cat.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                  {bill.cat.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bill.title}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 1 }}>
                    {bill.recurFreq} · {new Date(bill.nextDate).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: bill.type === 'income' ? 'var(--success)' : 'var(--danger)' }}>
                    {bill.type === 'income' ? '+' : '−'}{formatCurrency(bill.amount, currency)}
                  </div>
                  <div style={{
                    fontSize: 9, fontWeight: 700, marginTop: 2, padding: '1px 6px', borderRadius: 4,
                    background: bill.daysUntil <= 3 ? 'rgba(239,68,68,0.1)' : bill.daysUntil <= 7 ? 'rgba(245,158,11,0.1)' : 'var(--surface2)',
                    color: bill.daysUntil <= 3 ? 'var(--danger)' : bill.daysUntil <= 7 ? '#F59E0B' : 'var(--text-tertiary)',
                  }}>
                    {bill.daysUntil === 0 ? 'Today' : bill.daysUntil === 1 ? 'Tomorrow' : `In ${bill.daysUntil} days`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Income vs Expense Trend */}
      {(() => {
        // Build 6-month trend data
        const monthlyTrend = {};
        transactions.forEach(t => {
          const m = (t.date || '').slice(0, 7);
          if (!m) return;
          if (!monthlyTrend[m]) monthlyTrend[m] = { income: 0, expense: 0 };
          if (t.type === 'income') monthlyTrend[m].income += t.amount;
          else monthlyTrend[m].expense += t.amount;
        });
        const mKeys = Object.keys(monthlyTrend).sort().slice(-6);
        if (mKeys.length < 2) return null;
        const maxVal = Math.max(...mKeys.map(k => Math.max(monthlyTrend[k].income, monthlyTrend[k].expense)), 1);
        const chartH = 100;
        return (
          <div className="card anim-fadeup" style={{ animationDelay: '0.2s', padding: '18px', marginBottom: 16 }}>
            <div className="section-header" style={{ marginBottom: 14 }}>
              <span className="section-title">Income vs Expense</span>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500 }}>Last {mKeys.length} months</span>
            </div>
            {/* Line chart */}
            <svg viewBox={`0 0 ${(mKeys.length - 1) * 60 + 20} ${chartH + 20}`} style={{ width: '100%', height: chartH + 20, overflow: 'visible' }}>
              {/* Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map(p => (
                <line key={p} x1="10" y1={10 + (1 - p) * chartH} x2={(mKeys.length - 1) * 60 + 10} y2={10 + (1 - p) * chartH} stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3,3" />
              ))}
              {/* Income line */}
              <polyline
                fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                points={mKeys.map((k, i) => `${10 + i * 60},${10 + (1 - monthlyTrend[k].income / maxVal) * chartH}`).join(' ')}
              />
              {/* Expense line */}
              <polyline
                fill="none" stroke="var(--danger)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                points={mKeys.map((k, i) => `${10 + i * 60},${10 + (1 - monthlyTrend[k].expense / maxVal) * chartH}`).join(' ')}
              />
              {/* Income dots */}
              {mKeys.map((k, i) => (
                <circle key={'i' + k} cx={10 + i * 60} cy={10 + (1 - monthlyTrend[k].income / maxVal) * chartH} r="3.5" fill="var(--success)" />
              ))}
              {/* Expense dots */}
              {mKeys.map((k, i) => (
                <circle key={'e' + k} cx={10 + i * 60} cy={10 + (1 - monthlyTrend[k].expense / maxVal) * chartH} r="3.5" fill="var(--danger)" />
              ))}
              {/* Month labels */}
              {mKeys.map((k, i) => (
                <text key={'l' + k} x={10 + i * 60} y={chartH + 20} textAnchor="middle" fill="var(--text-tertiary)" fontSize="9" fontWeight="600">
                  {new Date(k + '-15').toLocaleString('en', { month: 'short' })}
                </text>
              ))}
            </svg>
            {/* Legend */}
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }} />
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Income</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)' }} />
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Expense</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Calendar Heatmap */}
      {(() => {
        const now = new Date();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
        const monthLabel = now.toLocaleString('en', { month: 'long', year: 'numeric' });
        const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        // Spending per day this month
        const daySpend = {};
        let maxDaySpend = 0;
        transactions.forEach(t => {
          if (t.type === 'expense' && (t.date || '').startsWith(currentMonthStr)) {
            const day = parseInt(t.date.slice(8, 10));
            daySpend[day] = (daySpend[day] || 0) + t.amount;
            if (daySpend[day] > maxDaySpend) maxDaySpend = daySpend[day];
          }
        });

        if (Object.keys(daySpend).length === 0) return null;

        const cells = [];
        // Empty cells for offset
        for (let i = 0; i < firstDay; i++) cells.push({ day: 0, amount: 0 });
        for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, amount: daySpend[d] || 0 });

        function getColor(amount) {
          if (amount === 0) return 'var(--surface2)';
          const intensity = maxDaySpend > 0 ? amount / maxDaySpend : 0;
          if (intensity < 0.25) return 'rgba(239,68,68,0.15)';
          if (intensity < 0.5) return 'rgba(239,68,68,0.3)';
          if (intensity < 0.75) return 'rgba(239,68,68,0.5)';
          return 'rgba(239,68,68,0.75)';
        }

        return (
          <div className="card anim-fadeup" style={{ animationDelay: '0.22s', padding: '18px', marginBottom: 16 }}>
            <div className="section-header" style={{ marginBottom: 12 }}>
              <span className="section-title">Spending Heatmap</span>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500 }}>{monthLabel}</span>
            </div>
            {/* Day labels */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <div key={i} style={{ textAlign: 'center', fontSize: 9, fontWeight: 600, color: 'var(--text-tertiary)' }}>{d}</div>
              ))}
            </div>
            {/* Calendar grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {cells.map((cell, i) => (
                <div key={i} style={{
                  aspectRatio: '1', borderRadius: 6,
                  background: cell.day === 0 ? 'transparent' : getColor(cell.amount),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 600,
                  color: cell.day === 0 ? 'transparent' : cell.amount > 0 ? '#fff' : 'var(--text-tertiary)',
                  position: 'relative',
                  border: cell.day === now.getDate() ? '1.5px solid var(--accent)' : '1.5px solid transparent',
                }}>
                  {cell.day > 0 && cell.day}
                </div>
              ))}
            </div>
            {/* Legend */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10 }}>
              <span style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>Less</span>
              {['var(--surface2)', 'rgba(239,68,68,0.15)', 'rgba(239,68,68,0.3)', 'rgba(239,68,68,0.5)', 'rgba(239,68,68,0.75)'].map((c, i) => (
                <div key={i} style={{ width: 12, height: 12, borderRadius: 3, background: c }} />
              ))}
              <span style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>More</span>
            </div>
          </div>
        );
      })()}


      {/* Recent Transactions */}
      <div className="card anim-fadeup" style={{ animationDelay: '0.24s', padding: '18px' }}>
        <div className="section-header">
          <span className="section-title">Recent Transactions</span>
          <button className="section-action" onClick={() => { lightTap(); onNavigate && onNavigate('transactions'); }}>See All</button>
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

/* ─────────────────────────────────────────────────────────────────────
   SmartInsightWidget — small Insights tile.

   Shows ONE rule-based insight at a time, picked from a priority list
   (alert > warning > note > positive). Auto-rotates every 5 seconds when
   there is more than one. Dot indicator at the bottom. Whole card taps
   to open the My Finance sheet (App.jsx -> ProfileScreen pendingSheet
   prop, which survives the tab-switch + remount that a window event
   would race against).
   ───────────────────────────────────────────────────────────────────── */
function SmartInsightWidget({ transactions, currency, allCategories, currentUser, onOpenMyFinance }) {
  // Show 2–3 insights per "slide". Up to PAGE_SIZE per page; if total is 4
  // we deliberately split 2+2 instead of 3+1 to avoid a sparse last page.
  const PAGE_SIZE = 3;
  const [pageIdx, setPageIdx] = useState(0);

  // Insight generation lives in src/utils/insightEngine.js — pure function
  // over (transactions, budgets, categories). The widget just consumes the
  // sorted result and paginates. Pull budgets straight from localStorage so
  // the per-category overspend/forecast rules can fire even on Home (where
  // we don't otherwise carry them in state).
  const insights = useMemo(() => {
    let budgets = {};
    try {
      if (currentUser?.uid) {
        const raw = localStorage.getItem(`coinova_budgets_${currentUser.uid}`);
        if (raw) budgets = JSON.parse(raw) || {};
      }
    } catch {}
    return generateInsights({ transactions, currency, allCategories, budgets });
  }, [transactions, currency, allCategories, currentUser]);

  // Chunk insights into pages of PAGE_SIZE. Special-case 4 total → 2+2
  // so we don't end up with a sparse 3+1 split.
  const pages = useMemo(() => {
    if (insights.length === 0) return [[]];
    if (insights.length === 4) return [insights.slice(0, 2), insights.slice(2, 4)];
    const out = [];
    for (let i = 0; i < insights.length; i += PAGE_SIZE) {
      out.push(insights.slice(i, i + PAGE_SIZE));
    }
    return out;
  }, [insights]);

  // Reset + auto-rotate the page every 6s when there's more than one page.
  useEffect(() => {
    setPageIdx(0);
    if (pages.length <= 1) return;
    const t = setInterval(() => setPageIdx(i => (i + 1) % pages.length), 6000);
    return () => clearInterval(t);
  }, [pages.length]);

  function handleOpen() {
    lightTap();
    if (onOpenMyFinance) onOpenMyFinance();
  }

  const currentPage = pages[pageIdx] || pages[0] || [];

  return (
    <div
      data-tour="insights"
      onClick={handleOpen}
      className="card anim-fadeup"
      role="button"
      aria-label="Open My Finance for full breakdown"
      style={{ animationDelay: '0.14s', padding: '14px 16px', marginBottom: 16, cursor: 'pointer' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span className="section-title" style={{ margin: 0 }}>Smart Insights</span>
        <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>Open →</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {currentPage.map((insight, i) => (
          <div
            key={`${pageIdx}-${i}`}
            style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}
          >
            <span style={{ fontSize: 16, lineHeight: 1.3, flexShrink: 0 }}>{insight.icon}</span>
            <span style={{ fontSize: 12.5, fontWeight: 500, color: insight.color, lineHeight: 1.4 }}>
              {insight.text}
            </span>
          </div>
        ))}
      </div>

      {pages.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 10 }}>
          {pages.map((_, i) => (
            <div key={i} style={{
              width: 5, height: 5, borderRadius: '50%',
              background: i === pageIdx ? 'var(--accent)' : 'var(--border)',
              transition: 'background 0.25s ease',
            }} />
          ))}
        </div>
      )}
    </div>
  );
}

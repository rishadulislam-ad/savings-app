import { useMemo } from 'react';
import DonutChart from '../components/DonutChart';
import TransactionItem from '../components/TransactionItem';
import { CATEGORIES, formatCurrency, groupByCategory } from '../data/transactions';

export default function HomeScreen({ transactions }) {
  const today = new Date().toISOString().slice(0, 10);

  const todayExpenses = useMemo(() =>
    transactions.filter(t => t.date === today && t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0),
  [transactions, today]);

  const monthExpenses = useMemo(() =>
    transactions.filter(t => t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0),
  [transactions]);

  const monthIncome = useMemo(() =>
    transactions.filter(t => t.type === 'income')
      .reduce((s, t) => s + t.amount, 0),
  [transactions]);

  const balance = monthIncome - monthExpenses;

  const byCategory = useMemo(() => groupByCategory(transactions), [transactions]);

  const donutData = byCategory.slice(0, 4).map(c => ({
    value: c.total,
    color: c.color,
    label: c.label,
  }));

  const recent = useMemo(() =>
    [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 4),
  [transactions]);

  const greetHour = new Date().getHours();
  const greet = greetHour < 12 ? 'Good Morning' : greetHour < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div className="screen-content" style={{ padding: '0 20px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}
        className="anim-fadeup">
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
          fontSize: 18, cursor: 'pointer', boxShadow: '0 2px 8px rgba(102,126,234,0.4)'
        }}>
          🧑‍💼
        </div>
      </div>

      {/* Balance Summary Card */}
      <div className="summary-card anim-fadeup" style={{ animationDelay: '0.05s', marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.65)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Total Balance
        </div>
        <div style={{ fontSize: 38, fontWeight: 800, color: '#fff', letterSpacing: '-1.5px', margin: '6px 0 16px', lineHeight: 1 }}>
          {formatCurrency(balance + 4280.50)}
        </div>
        <div style={{ display: 'flex', gap: 24, position: 'relative', zIndex: 1 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.04em' }}>INCOME</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginTop: 3 }}>{formatCurrency(monthIncome)}</div>
          </div>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.15)' }} />
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.04em' }}>SPENT</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginTop: 3 }}>{formatCurrency(monthExpenses)}</div>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <span className="badge" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 12 }}>
              ↓ 15% vs last mo
            </span>
          </div>
        </div>
      </div>

      {/* Daily Spending */}
      <div className="card anim-fadeup" style={{ animationDelay: '0.1s', padding: '16px 18px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Today's Spending
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-1px', marginTop: 4 }}>
              {formatCurrency(todayExpenses)}
            </div>
          </div>
          <span className={`badge ${todayExpenses < 50 ? 'badge-up' : 'badge-down'}`} style={{ fontSize: 12 }}>
            {todayExpenses < 50 ? '↓' : '↑'} {Math.round(Math.random() * 15 + 5)}%
          </span>
        </div>
        <div style={{ marginTop: 12 }}>
          <div className="progress-bar-track">
            <div className="progress-bar-fill" style={{
              width: `${Math.min((todayExpenses / 80) * 100, 100)}%`,
              background: todayExpenses > 60
                ? 'linear-gradient(90deg, #F59E0B, #EF4444)'
                : 'linear-gradient(90deg, #0A6CFF, #10B981)',
            }}/>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Daily budget</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>$80.00</span>
          </div>
        </div>
      </div>

      {/* Monthly Breakdown */}
      <div className="card anim-fadeup" style={{ animationDelay: '0.15s', padding: '18px', marginBottom: 16 }}>
        <div className="section-header" style={{ marginBottom: 16 }}>
          <span className="section-title">Monthly Breakdown</span>
          <button className="section-action">See All</button>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <DonutChart
            data={donutData}
            size={130}
            stroke={26}
            centerLabel={formatCurrency(monthExpenses)}
            centerSub="spent"
          />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {byCategory.slice(0, 4).map((c, i) => (
              <div key={c.cat} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>{c.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(c.total)}</span>
                  </div>
                  <div className="progress-bar-track" style={{ marginTop: 3, height: 4 }}>
                    <div className="progress-bar-fill" style={{
                      width: `${(c.total / monthExpenses) * 100}%`,
                      background: c.color,
                      height: 4,
                    }}/>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="anim-fadeup" style={{ animationDelay: '0.2s', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ fontSize: 24, marginBottom: 6 }}>💰</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Savings Rate</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--success)', marginTop: 4, letterSpacing: '-0.5px' }}>
            {Math.round(((monthIncome - monthExpenses) / monthIncome) * 100)}%
          </div>
        </div>
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ fontSize: 24, marginBottom: 6 }}>📈</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Avg / Day</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4, letterSpacing: '-0.5px' }}>
            {formatCurrency(monthExpenses / 28)}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="card anim-fadeup" style={{ animationDelay: '0.25s', padding: '18px' }}>
        <div className="section-header">
          <span className="section-title">Recent Transactions</span>
          <button className="section-action">See All</button>
        </div>
        {recent.map(tx => (
          <TransactionItem key={tx.id} tx={tx} />
        ))}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';

const TIPS = {
  budgets: {
    icon: '📊',
    title: 'Monthly Budgets',
    text: 'Set spending limits for each category. Use ← → arrows to navigate months. Budgets auto-copy from the previous month.',
  },
  savings: {
    icon: '🎯',
    title: 'Savings Goals',
    text: 'Create goals with targets and deadlines. Each deposit auto-creates an expense transaction to track your savings.',
  },
  transactions: {
    icon: '📋',
    title: 'Transaction History',
    text: 'Search, filter by date or type, and export to CSV. Tap any transaction to edit. Swipe between All, Expense, and Income views.',
  },
  cards: {
    icon: '💳',
    title: 'Secure Wallet',
    text: 'Your card numbers are encrypted on-device with AES-256. Face ID or PIN is required every time you view card details.',
  },
  travel: {
    icon: '✈️',
    title: 'Travel Tracker',
    text: 'Create trip books with local currency budgets. Track expenses by category and see remaining budget at a glance.',
  },
  finances: {
    icon: '🧠',
    title: 'AI Financial Health',
    text: 'Your Financial Health Score analyzes savings, budgets, spending consistency, and goal progress. AI insights give personalized advice.',
  },
  security: {
    icon: '🔐',
    title: 'App Security',
    text: 'Set up Face ID or a 4-digit PIN to protect the app. Both are required to view card details. Security can\'t be removed while cards are saved.',
  },
  converter: {
    icon: '💱',
    title: 'Currency Converter',
    text: 'Live exchange rates with offline caching. Convert between 150+ currencies instantly.',
  },
};

export default function FeatureTip({ tipId, currentUser }) {
  const key = currentUser ? `coinova_tip_${tipId}_${currentUser.uid}` : null;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!key) return;
    const seen = localStorage.getItem(key);
    if (!seen) {
      const timer = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(timer);
    }
  }, [key]);

  function dismiss() {
    setVisible(false);
    if (key) localStorage.setItem(key, '1');
  }

  if (!visible || !TIPS[tipId]) return null;

  const tip = TIPS[tipId];

  return (
    <div onClick={dismiss} style={{
      position: 'fixed', inset: 0, zIndex: 950,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, background: 'rgba(0,0,0,0.5)',
      animation: 'fadeIn 0.25s ease both',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 320, padding: 24, borderRadius: 20,
        background: 'var(--surface)', boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
        textAlign: 'center', animation: 'slideUp 0.3s cubic-bezier(0.32,0.72,0,1) both',
      }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>{tip.icon}</div>
        <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>{tip.title}</div>
        <div style={{ fontSize: 13, color: 'var(--text-tertiary)', lineHeight: 1.6, marginBottom: 20 }}>{tip.text}</div>
        <button onClick={dismiss} style={{
          width: '100%', padding: 14, borderRadius: 14, border: 'none',
          background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
        }}>Got It</button>
      </div>
    </div>
  );
}

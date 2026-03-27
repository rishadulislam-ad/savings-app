import { useState, useEffect } from 'react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';
import BottomNav from './components/BottomNav';
import HomeScreen from './screens/HomeScreen';
import AddTransactionScreen from './screens/AddTransactionScreen';
import TransactionsScreen from './screens/TransactionsScreen';
import BudgetsScreen from './screens/BudgetsScreen';
import ProfileScreen from './screens/ProfileScreen';
import AuthScreen from './screens/AuthScreen';
import TravelTrackerScreen from './screens/TravelTrackerScreen';

function AppInner() {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState('home');
  const [showAdd, setShowAdd] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [datePeriod, setDatePeriod] = useState('month');

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const s = localStorage.getItem('findo_session');
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  });

  const [transactions, setTransactions] = useState(() => {
    try {
      const s = localStorage.getItem('findo_session');
      if (!s) return [];
      const user = JSON.parse(s);
      const saved = localStorage.getItem(`findo_transactions_${user.email}`);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // Custom categories per user (array format — different key from BudgetsScreen's object format)
  const [customCategories, setCustomCategories] = useState(() => {
    try {
      const s = localStorage.getItem('findo_session');
      if (!s) return [];
      const user = JSON.parse(s);
      const saved = localStorage.getItem(`findo_user_cats_${user.email}`);
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  });

  // Custom tags per user
  const [customTags, setCustomTags] = useState(() => {
    try {
      const s = localStorage.getItem('findo_session');
      if (!s) return [];
      const user = JSON.parse(s);
      const saved = localStorage.getItem(`findo_user_tags_${user.email}`);
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  });

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`findo_transactions_${currentUser.email}`, JSON.stringify(transactions));
    }
  }, [transactions, currentUser]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`findo_user_cats_${currentUser.email}`, JSON.stringify(customCategories));
    }
  }, [customCategories, currentUser]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`findo_user_tags_${currentUser.email}`, JSON.stringify(customTags));
    }
  }, [customTags, currentUser]);

  // Auto-generate recurring transactions on load
  useEffect(() => {
    if (!currentUser || transactions.length === 0) return;
    const today = new Date().toISOString().slice(0, 10);
    const recurring = transactions.filter(t => t.recurring);
    const newTxs = [];

    recurring.forEach(t => {
      const lastDate = new Date(t.date);
      let nextDate = new Date(lastDate);

      if (t.recurFreq === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
      else if (t.recurFreq === 'yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);
      else nextDate.setMonth(nextDate.getMonth() + 1);

      const nextStr = nextDate.toISOString().slice(0, 10);

      // Check if we already have a transaction for this recurring item on or after the next date
      const alreadyExists = transactions.some(existing =>
        existing.title === t.title &&
        existing.category === t.category &&
        existing.amount === t.amount &&
        existing.date >= nextStr
      );

      if (!alreadyExists && nextStr <= today) {
        newTxs.push({
          ...t,
          id: crypto.randomUUID(),
          date: nextStr,
          recurring: true,
        });
      }
    });

    if (newTxs.length > 0) {
      setTransactions(prev => [...newTxs, ...prev]);
    }
  }, [currentUser]); // Only run on login/load

  function handleSave(tx) {
    if (editingTx) {
      setTransactions(prev => prev.map(t => t.id === editingTx.id ? { ...tx, id: editingTx.id } : t));
      setEditingTx(null);
    } else {
      setTransactions(prev => [{ ...tx, id: crypto.randomUUID() }, ...prev]);
    }
  }

  function handleUpdateUser(updates) {
    setCurrentUser(prev => {
      const updated = { ...prev, ...updates };
      localStorage.setItem('findo_session', JSON.stringify(updated));
      return updated;
    });
  }

  function handleAuth(user, userTransactions) {
    setCurrentUser(user);
    setTransactions(userTransactions);
    // Load custom data for this user (using separate keys from BudgetsScreen)
    try {
      const savedCats = localStorage.getItem(`findo_user_cats_${user.email}`);
      const parsedCats = savedCats ? JSON.parse(savedCats) : [];
      setCustomCategories(Array.isArray(parsedCats) ? parsedCats : []);
      const savedTags = localStorage.getItem(`findo_user_tags_${user.email}`);
      const parsedTags = savedTags ? JSON.parse(savedTags) : [];
      setCustomTags(Array.isArray(parsedTags) ? parsedTags : []);
    } catch {
      setCustomCategories([]);
      setCustomTags([]);
    }
    setActiveTab('home');
  }

  function handleLogout() {
    localStorage.removeItem('findo_session');
    setCurrentUser(null);
    setTransactions([]);
    setCustomCategories([]);
    setCustomTags([]);
    setActiveTab('home');
    setShowAdd(false);
    setEditingTx(null);
  }

  function handleEdit(tx) {
    setEditingTx(tx);
    setShowAdd(true);
  }

  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAmount, setQuickAmount] = useState('');
  const [quickCat, setQuickCat] = useState('eating_out');
  const QUICK_CATS = [
    { id: 'eating_out', icon: '🍔', label: 'Food' },
    { id: 'groceries', icon: '🛒', label: 'Groceries' },
    { id: 'transport', icon: '🚌', label: 'Transport' },
    { id: 'shopping', icon: '👜', label: 'Shopping' },
    { id: 'entertainment', icon: '🎬', label: 'Fun' },
    { id: 'health', icon: '💊', label: 'Health' },
  ];

  function handleQuickSave() {
    const amt = parseFloat(quickAmount);
    if (!amt || amt <= 0) return;
    handleSave({
      type: 'expense',
      amount: amt,
      title: QUICK_CATS.find(c => c.id === quickCat)?.label || 'Expense',
      category: quickCat,
      wallet: 'main',
      tags: [],
      note: '',
      date: new Date().toISOString().slice(0, 10),
    });
    setQuickAmount('');
    setQuickCat('eating_out');
    setShowQuickAdd(false);
  }

  const [deletedTx, setDeletedTx] = useState(null);
  const [undoTimer, setUndoTimer] = useState(null);

  function handleDelete(id) {
    const tx = transactions.find(t => t.id === id);
    setTransactions(prev => prev.filter(t => t.id !== id));
    handleCloseAdd();
    // Show undo toast
    if (tx) {
      if (undoTimer) clearTimeout(undoTimer);
      setDeletedTx(tx);
      const timer = setTimeout(() => setDeletedTx(null), 5000);
      setUndoTimer(timer);
    }
  }

  function handleUndo() {
    if (deletedTx) {
      setTransactions(prev => [deletedTx, ...prev]);
      setDeletedTx(null);
      if (undoTimer) clearTimeout(undoTimer);
    }
  }

  function handleCloseAdd() {
    setShowAdd(false);
    setEditingTx(null);
  }

  function addCustomCategory(cat) {
    setCustomCategories(prev => [...prev, cat]);
  }
  function deleteCustomCategory(id) {
    setCustomCategories(prev => prev.filter(c => c.id !== id));
  }
  function addCustomTag(tag) {
    const t = typeof tag === 'string' ? tag.trim() : '';
    if (t && !customTags.includes(t)) {
      setCustomTags(prev => [...prev, t]);
    }
  }
  function deleteCustomTag(tag) {
    setCustomTags(prev => prev.filter(t => t !== tag));
  }

  function renderScreen() {
    if (!currentUser) {
      return <AuthScreen onAuth={handleAuth} />;
    }
    if (showAdd) {
      return (
        <AddTransactionScreen
          onClose={handleCloseAdd}
          onSave={handleSave}
          onDelete={handleDelete}
          initialTx={editingTx}
          customCategories={customCategories}
          customTags={customTags}
          onAddCustomCategory={addCustomCategory}
          onAddCustomTag={addCustomTag}
        />
      );
    }
    switch (activeTab) {
      case 'home':
        return <HomeScreen transactions={transactions} onEdit={handleEdit} onNavigate={setActiveTab} datePeriod={datePeriod} onPeriodChange={setDatePeriod} currentUser={currentUser} customCategories={customCategories} />;
      case 'transactions':
        return <TransactionsScreen transactions={transactions} onEdit={handleEdit} onDelete={handleDelete} datePeriod={datePeriod} onPeriodChange={setDatePeriod} customCategories={customCategories} />;
      case 'budgets':
        return <BudgetsScreen transactions={transactions} datePeriod={datePeriod} onPeriodChange={setDatePeriod} currentUser={currentUser} />;
      case 'profile':
        return (
          <ProfileScreen
            transactions={transactions}
            currentUser={currentUser}
            onLogout={handleLogout}
            onNavigate={setActiveTab}
            onAddTransaction={handleSave}
            onUpdateUser={handleUpdateUser}
            customCategories={customCategories}
            customTags={customTags}
            onAddCustomCategory={addCustomCategory}
            onDeleteCustomCategory={deleteCustomCategory}
            onAddCustomTag={addCustomTag}
            onDeleteCustomTag={deleteCustomTag}
          />
        );
      case 'travel':
        return <TravelTrackerScreen currentUser={currentUser} onBack={() => setActiveTab('profile')} />;
      default:
        return <HomeScreen transactions={transactions} onEdit={handleEdit} onNavigate={setActiveTab} datePeriod={datePeriod} onPeriodChange={setDatePeriod} currentUser={currentUser} customCategories={customCategories} />;
    }
  }

  return (
    <div className={`phone-shell ${isDark ? 'dark' : ''}`} onKeyDown={(e) => { if (e.key === 'Escape') { if (showQuickAdd) setShowQuickAdd(false); else if (showAdd) handleCloseAdd(); } }}>
      <div className="screen">
<div key={showAdd ? 'add' : activeTab} className={showAdd ? 'screen-enter-up' : 'screen-enter'} style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {renderScreen()}
        </div>
        {currentUser && !showAdd && activeTab !== 'travel' && (
          <BottomNav
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onAdd={() => setShowAdd(true)}
            onQuickAdd={() => setShowQuickAdd(true)}
          />
        )}
      </div>

      {/* Quick Add Modal */}
      {showQuickAdd && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9998, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={() => setShowQuickAdd(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
          <div style={{
            position: 'relative', width: '100%', maxWidth: 420, padding: '24px 20px 32px', borderRadius: '24px 24px 0 0',
            background: 'var(--surface)', animation: 'slideUp 0.3s ease both',
          }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 16px' }} />
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16 }}>Quick Add Expense</div>

            {/* Amount */}
            <input
              type="number"
              value={quickAmount}
              onChange={e => setQuickAmount(e.target.value)}
              placeholder="0.00"
              autoFocus
              style={{
                width: '100%', padding: '14px 16px', borderRadius: 14, fontSize: 28, fontWeight: 800,
                background: 'var(--surface2)', border: '1.5px solid var(--border)', color: 'var(--text-primary)',
                textAlign: 'center', outline: 'none', boxSizing: 'border-box', marginBottom: 16,
              }}
            />

            {/* Quick categories */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
              {QUICK_CATS.map(c => (
                <div key={c.id} onClick={() => setQuickCat(c.id)} style={{
                  padding: '10px 8px', borderRadius: 12, textAlign: 'center', cursor: 'pointer',
                  background: quickCat === c.id ? 'var(--accent-light)' : 'var(--surface2)',
                  border: quickCat === c.id ? '1.5px solid var(--accent)' : '1.5px solid var(--border)',
                  transition: 'all 0.15s ease',
                }}>
                  <div style={{ fontSize: 20, marginBottom: 2 }}>{c.icon}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: quickCat === c.id ? 'var(--accent)' : 'var(--text-secondary)' }}>{c.label}</div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowQuickAdd(false)} style={{
                flex: 1, padding: 14, borderRadius: 14, background: 'var(--surface2)', border: '1px solid var(--border)',
                color: 'var(--text-secondary)', fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}>Cancel</button>
              <button onClick={handleQuickSave} style={{
                flex: 2, padding: 14, borderRadius: 14, background: 'var(--accent)', border: 'none',
                color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}>Add Expense</button>
            </div>

            <div style={{ textAlign: 'center', marginTop: 10, fontSize: 11, color: 'var(--text-tertiary)' }}>
              Swipe up on + button for full form
            </div>
          </div>
        </div>
      )}

      {/* Undo Delete Toast */}
      {deletedTx && (
        <div style={{
          position: 'fixed', bottom: 90, left: 0, right: 0,
          display: 'flex', justifyContent: 'center', zIndex: 9999,
          animation: 'fadeUp 0.3s ease both', pointerEvents: 'none',
        }}>
        <div style={{
          background: 'var(--text-primary)', color: 'var(--bg)', padding: '10px 16px',
          borderRadius: 14, display: 'flex', alignItems: 'center', gap: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          maxWidth: 'calc(100% - 40px)', pointerEvents: 'auto',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
          </svg>
          <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>Transaction deleted</span>
          <button onClick={handleUndo} style={{
            background: 'var(--accent)', color: '#fff', border: 'none', padding: '5px 14px',
            borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
          }}>Undo</button>
          <div onClick={() => setDeletedTx(null)} style={{ cursor: 'pointer', flexShrink: 0, padding: 2 }}>
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </div>
        </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AppInner />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

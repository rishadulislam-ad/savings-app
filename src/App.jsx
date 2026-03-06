import { useState, useEffect } from 'react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
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

  function handleSave(tx) {
    if (editingTx) {
      setTransactions(prev => prev.map(t => t.id === editingTx.id ? { ...tx, id: editingTx.id } : t));
      setEditingTx(null);
    } else {
      setTransactions(prev => [{ ...tx, id: Date.now() }, ...prev]);
    }
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

  function handleDelete(id) {
    setTransactions(prev => prev.filter(t => t.id !== id));
    handleCloseAdd();
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
        return <TransactionsScreen transactions={transactions} onEdit={handleEdit} datePeriod={datePeriod} onPeriodChange={setDatePeriod} customCategories={customCategories} />;
      case 'budgets':
        return <BudgetsScreen transactions={transactions} datePeriod={datePeriod} onPeriodChange={setDatePeriod} currentUser={currentUser} />;
      case 'profile':
        return (
          <ProfileScreen
            transactions={transactions}
            currentUser={currentUser}
            onLogout={handleLogout}
            onNavigate={setActiveTab}
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
    <div className={`phone-shell ${isDark ? 'dark' : ''}`}>
      <div className="screen">
<div key={showAdd ? 'add' : activeTab} className={showAdd ? 'screen-enter-up' : 'screen-enter'} style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {renderScreen()}
        </div>
        {currentUser && !showAdd && activeTab !== 'travel' && (
          <BottomNav
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onAdd={() => setShowAdd(true)}
          />
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}

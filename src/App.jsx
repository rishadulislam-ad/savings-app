import { useState, useEffect } from 'react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import BottomNav from './components/BottomNav';
import HomeScreen from './screens/HomeScreen';
import AddTransactionScreen from './screens/AddTransactionScreen';
import TransactionsScreen from './screens/TransactionsScreen';
import BudgetsScreen from './screens/BudgetsScreen';
import ProfileScreen from './screens/ProfileScreen';
import AuthScreen from './screens/AuthScreen';

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

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`findo_transactions_${currentUser.email}`, JSON.stringify(transactions));
    }
  }, [transactions, currentUser]);

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
    setActiveTab('home');
  }

  function handleLogout() {
    localStorage.removeItem('findo_session');
    setCurrentUser(null);
    setTransactions([]);
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
        />
      );
    }
    switch (activeTab) {
      case 'home':         return <HomeScreen transactions={transactions} onEdit={handleEdit} onNavigate={setActiveTab} datePeriod={datePeriod} onPeriodChange={setDatePeriod} currentUser={currentUser} />;
      case 'transactions': return <TransactionsScreen transactions={transactions} onEdit={handleEdit} datePeriod={datePeriod} onPeriodChange={setDatePeriod} />;
      case 'budgets':      return <BudgetsScreen transactions={transactions} datePeriod={datePeriod} onPeriodChange={setDatePeriod} />;
      case 'profile':      return <ProfileScreen transactions={transactions} currentUser={currentUser} onLogout={handleLogout} />;
      default:             return <HomeScreen transactions={transactions} onEdit={handleEdit} onNavigate={setActiveTab} datePeriod={datePeriod} onPeriodChange={setDatePeriod} currentUser={currentUser} />;
    }
  }

  return (
    <div className={`phone-shell ${isDark ? 'dark' : ''}`}>
      <div className="screen">
<div key={showAdd ? 'add' : activeTab} className="screen-enter" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {renderScreen()}
        </div>
        {currentUser && !showAdd && (
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

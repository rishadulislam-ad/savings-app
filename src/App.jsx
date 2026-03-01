import { useState } from 'react';
import StatusBar from './components/StatusBar';
import BottomNav from './components/BottomNav';
import HomeScreen from './screens/HomeScreen';
import AddTransactionScreen from './screens/AddTransactionScreen';
import TransactionsScreen from './screens/TransactionsScreen';
import BudgetsScreen from './screens/BudgetsScreen';
import ProfileScreen from './screens/ProfileScreen';
import { INITIAL_TRANSACTIONS } from './data/transactions';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [showAdd, setShowAdd] = useState(false);
  const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS);

  function handleSave(tx) {
    setTransactions(prev => [
      { ...tx, id: Date.now() },
      ...prev,
    ]);
  }

  function renderScreen() {
    if (showAdd) {
      return (
        <AddTransactionScreen
          onClose={() => setShowAdd(false)}
          onSave={handleSave}
        />
      );
    }
    switch (activeTab) {
      case 'home':         return <HomeScreen transactions={transactions} />;
      case 'transactions': return <TransactionsScreen transactions={transactions} />;
      case 'budgets':      return <BudgetsScreen transactions={transactions} />;
      case 'profile':      return <ProfileScreen transactions={transactions} />;
      default:             return <HomeScreen transactions={transactions} />;
    }
  }

  return (
    <div className="phone-shell">
      <div className="screen">
        <StatusBar />
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {renderScreen()}
        </div>
        {!showAdd && (
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

export const HELP_FAQS = [
  // Getting Started
  { q: 'How do I add a transaction?', a: 'Tap the + button at the bottom of the screen. Enter the amount, choose a category, and save. For a quicker option, tap the green lightning bolt icon for Quick Add.' },
  { q: 'How do recurring transactions work?', a: 'When adding a transaction, toggle "Recurring" on and choose a frequency (weekly, monthly, yearly). The app will auto-create the next occurrence when it\'s due.' },
  { q: 'How do I edit or delete a transaction?', a: 'Tap any transaction to open it. You can edit the details and save, or tap the Delete button to remove it. You\'ll see an undo option for a few seconds after deleting.' },
  { q: 'How do I sign in?', a: 'You can sign in with Google, Apple, or email & password. All three methods sync your data to the cloud. If you use the same email across methods, your accounts are automatically linked.' },

  // Home & Insights
  { q: 'What does the Insights section show?', a: 'Insights analyzes your spending patterns this month \u2014 savings rate, category trends vs last month, biggest expense, and overall spending changes. It updates automatically as you add transactions.' },
  { q: 'What does the spending breakdown donut chart show?', a: 'The donut chart shows your spending by category with percentages. Savings goal deposits also appear here since they are tracked as expenses.' },
  { q: 'What does the spending heatmap show?', a: 'The heatmap on the Home screen shows your daily spending intensity for the current month. Darker red = higher spending day.' },

  // AI Financial Dashboard
  { q: 'What is the Financial Health Score?', a: 'Go to Profile \u2192 My Finances. The score (0-100) measures your financial health across four areas: Savings Rate (how much you save vs earn), Budget Adherence (staying within budgets), Spending Consistency (steady spending vs binge days), and Goal Progress (active savings goals with deposits). It updates automatically each month.' },
  { q: 'What are AI Insights?', a: 'AI Insights in My Finances analyze your spending patterns and give personalized observations \u2014 like category spending spikes vs last month, weekend vs weekday habits, savings goal pace, and end-of-month spending predictions. All calculated locally from your data.' },

  // Budgets & Savings Goals
  { q: 'How do I set a budget?', a: 'Go to the Budgets tab and tap the pencil icon next to any category. Enter your budget amount for that month. You can set different budgets each month \u2014 use the \u2190 \u2192 arrows to navigate between months.' },
  { q: 'Are budgets monthly?', a: 'Yes. Each month has its own budget. When a new month starts, the previous month\'s budgets are automatically copied as a starting point. You can adjust them anytime.' },
  { q: 'How do savings goals work?', a: 'Go to the Budgets tab and tap "Savings Goals" at the top. Create a goal with a name, target amount, icon, color, and optional deadline. When you deposit money toward a goal, it automatically creates an expense transaction.' },
  { q: 'What are milestone badges?', a: 'As you save toward a goal, you\'ll see badges at 25%, 50%, 75%, and 100%. When you reach 100%, you can archive the goal to keep a record of your achievement.' },
  { q: 'Can I set a deadline for a savings goal?', a: 'Yes. When creating a goal, set a Target Date. The app will show how many days are left and calculate how much you need to save per month to reach your target on time.' },
  { q: 'How do I archive a completed goal?', a: 'When a goal reaches 100%, an "Archive Goal" button appears. Archived goals move to a "Completed" section at the bottom. You can restore or delete them anytime.' },

  // Cards & Wallet
  { q: 'How does the Wallet/Cards feature work?', a: 'Go to Profile \u2192 Cards. You must set up Face ID or a PIN before adding cards. Tap + to add a card. Cards sync across devices, but full card numbers and CVVs stay encrypted on the device where they were created.' },
  { q: 'Is my card data secure?', a: 'Full card numbers and CVVs are encrypted with AES-256-GCM and stored only on your device \u2014 they never sync to the cloud. Only the last 4 digits, name, expiry, and network sync. Face ID or PIN is required every time you tap a card to view details.' },
  { q: 'Why can\'t I remove my security while I have cards?', a: 'Security (Face ID or PIN) is mandatory while you have saved cards. To remove security, you must delete all your cards first. This protects your card data.' },

  // Currency & Travel
  { q: 'How do I change my currency?', a: 'Go to Profile \u2192 Currency and select your preferred currency. All amounts throughout the app will display in your chosen currency. The change syncs across all your devices.' },
  { q: 'How does the Currency Converter work?', a: 'Go to Profile \u2192 Currency Converter. It fetches live exchange rates. If you\'re offline, it uses cached rates from your last session.' },
  { q: 'How does the Travel Tracker work?', a: 'Tap the "Trips" button on the Home screen or go to Profile \u2192 Travel Tracker. Create a trip with destination, dates, and budget. Add expenses within the trip \u2014 they\'re tracked in the trip\'s local currency.' },
  { q: 'Can I edit a trip after creating it?', a: 'Yes. Open a trip and tap the pencil icon at the top right. You can change the trip name, budget, start date, and end date.' },

  // Data & Sync
  { q: 'Does my data sync across devices?', a: 'Yes. Sign in with the same account on multiple devices and your transactions, budgets, goals, cards (display info only), and settings sync automatically in real-time via Firebase.' },
  { q: 'Can I export my data?', a: 'Yes! Go to Transactions and tap "Export" for a CSV file. Or go to Profile \u2192 Your Data \u2192 Backup Data to export everything (transactions, budgets, cards, goals, trips, currency, categories, tags) as a JSON file.' },
  { q: 'How do I restore my data on a new device?', a: 'Go to Profile \u2192 Your Data \u2192 Restore Data and select your backup JSON file. It restores all your data including transactions, budgets, cards, goals, trips, currency, and custom categories.' },

  // Security
  { q: 'How do I lock the app with Face ID or PIN?', a: 'Go to Profile \u2192 Security. Toggle Face ID/Touch ID on, or set a 4-digit PIN. When enabled, you\'ll need to verify every time you open the app.' },
  { q: 'What if I forget my PIN?', a: 'On the lock screen, tap "Forgot PIN? Sign out" at the bottom. This signs you out and clears the lock. Sign back in to access your data \u2014 everything is safe in the cloud.' },
  { q: 'How do I change my password?', a: 'Go to Profile \u2192 Security \u2192 Change Password. Enter your current password, then set a new one. If you signed in with Google or Apple, your password is managed by that provider.' },
  { q: 'Is my data secure?', a: 'Yes. Authentication uses Firebase with industry-standard encryption. Firestore security rules ensure only you can access your data. Card secrets are encrypted with AES-256-GCM on-device. App Check protects against unauthorized access.' },

  // Account
  { q: 'How do I delete all my data?', a: 'Go to Profile, scroll to the bottom, and tap "Delete All Data & Reset". Type DELETE to confirm. This permanently removes all data from your device and the cloud, then signs you out.' },
  { q: 'How do I delete my account?', a: 'Go to Profile, scroll to the bottom, and tap "Delete My Account". This permanently deletes your Firebase account, all cloud data, and local data. For email users, you\'ll need to re-enter your password.' },
  { q: 'Where is the Privacy Policy?', a: 'You can find it on the sign-in screen (link at the bottom) or in Profile \u2192 Privacy Policy. It opens in your browser.' },

  // Categories & Tags
  { q: 'Can I create custom categories?', a: 'Yes! Go to Profile \u2192 Your Data \u2192 Categories & Tags. Tap "Add Category" with a custom name, emoji, and color. Custom categories appear everywhere \u2014 transactions, budgets, and home.' },
  { q: 'How do tags work?', a: 'Tags let you label transactions with keywords. Add custom tags in Profile \u2192 Your Data \u2192 Categories & Tags, and assign them when adding transactions.' },

  // Notifications
  { q: 'What notifications can I enable?', a: 'Go to Profile \u2192 Notifications. You can enable Budget Alerts (when spending hits 80%), Bill Reminders (3 days before recurring bills), Weekly Summary, and Savings Milestones (25%, 50%, 75%, 100% of goals).' },
];

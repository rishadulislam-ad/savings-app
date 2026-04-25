export const HELP_FAQS = [
  // Getting Started
  { q: 'How do I add a transaction?', a: 'Tap the + button at the bottom of the screen. Enter the amount, choose a category, and save. For a quicker option, tap the green lightning bolt icon for Quick Add.' },
  { q: 'How do recurring transactions work?', a: 'When adding a transaction, toggle "Recurring" on and choose a frequency (weekly, monthly, yearly). The app will auto-create the next occurrence when it\'s due.' },
  { q: 'How do I edit or delete a transaction?', a: 'Tap any transaction to open it. You can edit the details and save, or tap the Delete button to remove it. You\'ll see an undo option for a few seconds after deleting.' },
  { q: 'How do I delete multiple transactions at once?', a: 'In the Transactions tab, tap "Select" in the top right. Tap each transaction you want to remove, then tap the red Delete N button at the bottom. The whole batch can be undone from the toast that appears for a few seconds after.' },
  { q: 'How do I sign in?', a: 'You can sign in with Google, Apple, or email & password. All three methods sync your data to the cloud. If you use the same email across methods, your accounts are automatically linked.' },

  // Home & Insights
  { q: 'What does the Smart Insights widget show?', a: 'The Smart Insights widget on Home rotates through 2–3 insights at a time, picked by priority. It surfaces things like budget alerts (a category over its limit), forecasts ("on pace to spend $1,820 — $320 over budget"), anomalies (a single transaction much larger than your typical for that category), recurring subscription totals, week-over-week trends vs your trailing 90-day baseline, and logging streaks. Tap the widget to open My Finance for a full breakdown.' },
  { q: 'What does the spending breakdown donut chart show?', a: 'The donut chart shows your spending by category with percentages. Savings goal deposits also appear here since they are tracked as expenses.' },
  { q: 'What does the spending heatmap show?', a: 'The heatmap on the Home screen shows your daily spending intensity for the current month. Darker red = higher spending day.' },

  // AI Financial Dashboard
  { q: 'What is the Financial Health Score?', a: 'Go to Profile → My Finances. The score (0-100) measures your financial health across four areas: Savings Rate (how much you save vs earn), Budget Adherence (staying within budgets), Spending Consistency (steady spending vs binge days), and Goal Progress (active savings goals with deposits). It updates automatically each month.' },
  { q: 'What are AI Insights?', a: 'AI Insights in My Finances analyze your spending patterns and give personalized observations — like category spending spikes vs last month, weekend vs weekday habits, savings goal pace, and end-of-month spending predictions. All calculated locally from your data.' },

  // Budgets & Savings Goals
  { q: 'How do I set a budget?', a: 'Go to the Budgets tab and tap the pencil icon next to any category. Enter your budget amount for that month. You can set different budgets each month — use the ← → arrows to navigate between months.' },
  { q: 'Are budgets monthly?', a: 'Yes. Each month has its own budget. When a new month starts, the previous month\'s budgets are automatically copied as a starting point. You can adjust them anytime.' },
  { q: 'How do savings goals work?', a: 'Go to the Budgets tab and tap "Savings Goals" at the top. Create a goal with a name, target amount, icon, color, and optional deadline. When you deposit money toward a goal, it automatically creates an expense transaction.' },
  { q: 'What are milestone badges?', a: 'As you save toward a goal, you\'ll see badges at 25%, 50%, 75%, and 100%. When you reach 100%, you can archive the goal to keep a record of your achievement. If you have Savings Milestone notifications on, you also get a system notification when each threshold is crossed.' },
  { q: 'Can I set a deadline for a savings goal?', a: 'Yes. When creating a goal, set a Target Date. The app will show how many days are left and calculate how much you need to save per month to reach your target on time.' },
  { q: 'How do I archive a completed goal?', a: 'When a goal reaches 100%, an "Archive Goal" button appears. Archived goals move to a "Completed" section at the bottom. You can restore or delete them anytime.' },

  // Cards & Wallet
  { q: 'How does the Wallet/Cards feature work?', a: 'Go to Profile → Cards. You must set up Face ID or a PIN before adding cards. Tap + to add a card. Card metadata (last 4 digits, label, name, expiry, network) syncs across devices. Full card numbers and CVVs stay on the device where they were entered — they never sync.' },
  { q: 'Is my card data secure?', a: 'Full card numbers and CVVs are encrypted with AES-256-GCM on your device. The encryption key is stored in iOS Keychain or Android Keystore — the OS only releases it to this app. Even if someone extracted your phone\'s storage, the encrypted card data would be unreadable. Only the last 4 digits, name, expiry, and network sync to the cloud. Face ID or PIN is required every time you tap a card to view its full details.' },
  { q: 'Why is the clipboard cleared after copying my card?', a: 'When you tap Copy on a full card number or CVV, the value is wiped from the clipboard 30 seconds later (or immediately if you switch apps). This stops other apps with clipboard widgets from reading your card data later.' },
  { q: 'Why can\'t I remove my security while I have cards?', a: 'Security (Face ID or PIN) is mandatory while you have saved cards. To remove security, you must delete all your cards first. This protects your card data.' },
  { q: 'I added a card on one phone but I can\'t reveal it on my other phone. Why?', a: 'Card metadata (last 4, name, expiry, network) syncs across devices, but the encrypted full number and CVV stay only on the device where the card was created. This is intentional — those secrets never leave the device they were entered on. To reveal them on another device, you\'d need to re-enter the card on that device.' },

  // Currency & Travel
  { q: 'How do I change my currency?', a: 'Go to Profile → Currency and select your preferred currency. All amounts throughout the app will display in your chosen currency. The change syncs across all your devices.' },
  { q: 'How does the Currency Converter work?', a: 'Go to Profile → Currency Converter. It fetches live exchange rates from open.exchangerate-api.com. If you\'re offline, it uses cached rates from your last session.' },
  { q: 'How does the Travel Tracker work?', a: 'Tap the "Trips" button on the Home screen or go to Profile → Travel Tracker. Create a trip with destination, dates, and budget. Add expenses within the trip — they\'re tracked in the trip\'s local currency.' },
  { q: 'Can I edit a trip after creating it?', a: 'Yes. Open a trip and tap the pencil icon at the top right. You can change the trip name, budget, start date, and end date.' },

  // Data & Sync
  { q: 'Does my data sync across devices?', a: 'Yes. Sign in with the same account on multiple devices and your transactions, budgets, goals, cards (display info only), trips, and settings sync automatically in real-time via Firebase.' },
  { q: 'I made entries on my phone while offline. Will they sync when I reconnect?', a: 'Yes. The app uses atomic Firestore array operations under the hood, so entries you add while offline (or while another device is editing the same data) are merged into the cloud when you reconnect — nothing is silently overwritten. Same goes for deletes.' },
  { q: 'Can I export my data?', a: 'Yes! Go to Transactions and tap "Export" for a CSV file. Or go to Profile → Your Data → Backup Data to export everything (transactions, budgets, cards, goals, trips, currency, categories, tags) as a JSON file.' },
  { q: 'Can I encrypt my backup file?', a: 'Yes. When you tap Backup Data, the app asks if you want to set a password. If you enter one (6+ characters), the backup file is encrypted with AES-256-GCM (PBKDF2 with 200k iterations). Anyone with the file but not the password cannot read it. If you skip the prompt, the backup is plain JSON. IMPORTANT: there is no recovery — if you forget the password, the backup cannot be decrypted.' },
  { q: 'How do I restore my data on a new device?', a: 'Go to Profile → Your Data → Restore Data and select your backup file. If it\'s encrypted, you\'ll be prompted for the password. The restore replaces all your current data with the backup\'s contents.' },

  // Security
  { q: 'How do I lock the app with Face ID or PIN?', a: 'Go to Profile → Security. Toggle Face ID/Touch ID on, or set a 4-digit PIN. When enabled, you\'ll need to verify every time you open the app.' },
  { q: 'Where is my PIN stored?', a: 'The PIN is hashed with PBKDF2 (100k iterations + per-user random salt) and stored in iOS Keychain or Android Keystore — not in regular app storage. This means even if someone extracted your phone\'s storage, they couldn\'t brute-force your PIN.' },
  { q: 'What if I enter the wrong PIN too many times?', a: 'After 4 wrong attempts the app locks for 30 seconds, then 2 minutes, then 5 minutes, then 15 minutes for further failures. The lockout timer survives force-quit — closing and reopening the app does NOT reset the counter.' },
  { q: 'What if I forget my PIN?', a: 'On the lock screen, tap "Forgot PIN? Sign out" at the bottom. This signs you out and clears the lock. Sign back in to access your data — everything is safe in the cloud.' },
  { q: 'How do I change my password?', a: 'Go to Profile → Security → Change Password. Enter your current password, then set a new one. If you signed in with Google or Apple, your password is managed by that provider.' },
  { q: 'Is my data secure?', a: 'Authentication uses Firebase with industry-standard encryption. Firestore security rules restrict each user\'s document to that user only, with field allowlists and per-array size caps to block abuse. Card secrets are AES-256-GCM encrypted on-device with the key in iOS Keychain / Android Keystore. PIN material is also keystore-stored. App Check (Apple App Attest / Google Play Integrity) gates all backend access. Android only trusts system-installed certificate authorities — user-installed CAs cannot intercept traffic. Production builds strip console logs.' },

  // Notifications
  { q: 'What notifications can I enable?', a: 'Go to Profile → Notifications. You can enable: Budget Alerts (when spending hits your chosen threshold, default 80%), Bill Reminders (3 days before each recurring bill at 9am local), Weekly Summary (every Sunday at 6pm), and Savings Milestones (when a goal crosses 25%, 50%, 75%, 100%).' },
  { q: 'When are budget alerts triggered?', a: 'When your current-month spending in any budgeted category passes the threshold you set (default 80%). The alert fires within ~1 minute of the threshold being crossed. Once the category goes over 100%, you get an "Over budget" alert.' },
  { q: 'When are bill reminders sent?', a: 'For each recurring transaction, the app schedules a reminder 3 days before its next occurrence at 9am local time. So if a recurring bill\'s next occurrence is on the 15th, you\'ll get a reminder on the 12th at 9am.' },

  // Account
  { q: 'How do I delete all my data?', a: 'Go to Profile, scroll to the bottom, and tap "Delete All Data & Reset". Type DELETE to confirm. This permanently removes all data from your device and the cloud, plus the encryption keys in Keychain/Keystore and any scheduled notifications, then signs you out.' },
  { q: 'How do I delete my account?', a: 'Go to Profile, scroll to the bottom, and tap "Delete My Account". This permanently deletes your Firebase account, all cloud data, all local data, the encryption keys in Keychain/Keystore, and any scheduled notifications. For email users, you\'ll need to re-enter your password.' },
  { q: 'Where is the Privacy Policy?', a: 'You can find it on the sign-in screen (link at the bottom) or in Profile → Privacy Policy. It opens in your browser.' },

  // Categories & Tags
  { q: 'Can I create custom categories?', a: 'Yes! Go to Profile → Your Data → Categories & Tags. Tap "Add Category" with a custom name, emoji, and color. Custom categories appear everywhere — transactions, budgets, and home.' },
  { q: 'How do tags work?', a: 'Tags let you label transactions with keywords. Add custom tags in Profile → Your Data → Categories & Tags, and assign them when adding transactions.' },
];

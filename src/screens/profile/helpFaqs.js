export const HELP_FAQS = [
  // Getting Started
  { q: 'How do I add a transaction?', a: 'Tap the + button at the bottom of the screen. Enter the amount, choose a category, and save. For a quicker option, tap the green lightning bolt icon for Quick Add.' },
  { q: 'How do recurring transactions work?', a: 'When adding a transaction, toggle "Recurring" on and choose a frequency (weekly, monthly, yearly). The app will auto-create the next occurrence when it\'s due. Open any occurrence and tap "Stop Recurring" to halt the chain.' },
  { q: 'How do I delete multiple transactions at once?', a: 'In the Transactions tab, tap "Select" in the top right. Tap each transaction you want to remove, then tap the red Delete N button at the bottom. The whole batch can be undone from the toast that appears for a few seconds after.' },
  { q: 'How do I sign in?', a: 'You can sign in with Google, Apple, or email & password. All three methods sync your data to the cloud. If you use the same email across methods, your accounts are automatically linked.' },

  // Budgets & Savings Goals
  { q: 'How do I set a budget?', a: 'Go to the Budgets tab and tap the pencil icon next to any category. Enter your budget amount for that month. Each month has its own budget — when a new month starts, last month\'s budgets are copied as a starting point. Use the ← → arrows at the top to navigate between months.' },
  { q: 'How do savings goals work?', a: 'Go to the Budgets tab and tap "Savings Goals" at the top. Create a goal with a name, target amount, and optional deadline. When you deposit money toward a goal, the app automatically logs it as an expense transaction. Once you hit 100% you can archive the goal to keep a record.' },

  // Cards & Wallet
  { q: 'How does the Wallet/Cards feature work?', a: 'Go to Profile → Cards. You must set up Face ID or a PIN before adding cards. Tap + to add a card. Card metadata (last 4 digits, label, name, expiry, network) syncs across devices. Full card numbers and CVVs stay on the device where they were entered — they never sync.' },
  { q: 'Is my card data secure?', a: 'Full card numbers and CVVs are encrypted with AES-256-GCM on your device. The encryption key is stored in iOS Keychain or Android Keystore — the OS only releases it to this app. Even if someone extracted your phone\'s storage, the encrypted card data would be unreadable. Only the last 4 digits, name, expiry, and network sync to the cloud. Face ID or PIN is required every time you tap a card to view its full details. Copied card numbers and CVVs are also wiped from the clipboard 30 seconds later (or immediately if you switch apps).' },
  { q: 'I added a card on one phone but I can\'t reveal it on my other phone. Why?', a: 'Card metadata (last 4, name, expiry, network) syncs across devices, but the encrypted full number and CVV stay only on the device where the card was created. This is intentional — those secrets never leave the device they were entered on. To reveal them on another device, re-enter the card on that device.' },

  // Data & Sync
  { q: 'Does my data sync across devices?', a: 'Yes. Sign in with the same account on multiple devices and your transactions, budgets, goals, cards (display info only), trips, and settings sync automatically in real-time via Firebase.' },
  { q: 'I made entries on my phone while offline. Will they sync when I reconnect?', a: 'Yes. The app uses atomic Firestore array operations under the hood, so entries you add while offline (or while another device is editing the same data) are merged into the cloud when you reconnect — nothing is silently overwritten. Same goes for deletes.' },
  { q: 'Can I export, encrypt, or restore my data?', a: 'Yes to all three. Go to Transactions → Export for a CSV, or Profile → Your Data → Backup Data to export everything (transactions, budgets, cards, goals, trips, currency, categories, tags) as a JSON file. The backup prompt asks if you want to set a password — if you enter one (6+ characters), the file is encrypted with AES-256-GCM (PBKDF2, 200k iterations). To restore on a new device, go to Profile → Your Data → Restore Data and pick the file. IMPORTANT: there is no recovery for an encrypted backup — if you forget the password, the file cannot be decrypted.' },

  // Security
  { q: 'How do I lock the app with Face ID or PIN?', a: 'Go to Profile → Security. Toggle Face ID/Touch ID on, or set a 4-digit PIN. When enabled, you\'ll need to verify every time you open the app.' },
  { q: 'What if I forget my PIN?', a: 'On the lock screen, tap "Forgot PIN? Sign out" at the bottom. This signs you out and clears the lock. Sign back in to access your data — everything is safe in the cloud.' },

  // Notifications
  { q: 'What notifications can I enable?', a: 'Go to Profile → Notifications. You can enable: Budget Alerts (when current-month spending in a category crosses your threshold, default 80%), Bill Reminders (3 days before each recurring bill at 9am local), Weekly Summary (end of your week at 6pm — the day depends on your "Week starts on" setting), and Savings Milestones (when a goal crosses 25%, 50%, 75%, 100%).' },

  // Account
  { q: 'How do I delete my account or all my data?', a: '"Delete All Data & Reset" (Profile, near the bottom) wipes everything — local data, cloud data, encryption keys in Keychain/Keystore, and scheduled notifications — then signs you out. "Delete My Account" goes one step further and also deletes your Firebase account itself. Type DELETE to confirm. Email users will need to re-enter their password.' },

  // Customization
  { q: 'Can I create custom categories?', a: 'Yes! Go to Profile → Your Data → Categories & Tags. Tap "Add Category" with a custom name, emoji, and color. Custom categories appear everywhere — transactions, budgets, and home. Custom tags work the same way and can be attached to any transaction.' },
];

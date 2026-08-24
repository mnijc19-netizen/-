import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Navbar } from './components/Navbar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { SmartParserModal } from './components/SmartParserModal';
import { QuickTransactionModal } from './components/QuickTransactionModal';
import { SnapshotModal } from './components/SnapshotModal';
import { ImageOcrModal } from './components/ImageOcrModal';
import { IphoneShortcutModal } from './components/IphoneShortcutModal';

// Pages
import { Dashboard } from './pages/Dashboard';
import { AccountsPage } from './pages/AccountsPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { SmartParserPage } from './pages/SmartParserPage';
import { BudgetsPage } from './pages/BudgetsPage';
import { InvestmentsPage } from './pages/InvestmentsPage';
import { DebtsPage } from './pages/DebtsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { GoalsPage } from './pages/GoalsPage';
import { SettingsPage } from './pages/SettingsPage';

import { api } from './api/client';
import { checkAndHandleUrlAutoIngest } from './services/urlAutoIngest';
import { 
  Account, 
  Transaction, 
  Category, 
  Budget, 
  Investment, 
  Debt, 
  Goal, 
  DashboardAnalytics 
} from './types';
import { PageId } from './components/Sidebar';
import { CheckCircle2, Zap } from 'lucide-react';

export function App() {
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  // Modals
  const [smartParserOpen, setSmartParserOpen] = useState(false);
  const [quickTxOpen, setQuickTxOpen] = useState(false);
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const [imageOcrOpen, setImageOcrOpen] = useState(false);
  const [iphoneShortcutOpen, setIphoneShortcutOpen] = useState(false);

  // Auto Automation Toast
  const [autoToastMsg, setAutoToastMsg] = useState<string | null>(null);

  // Core Data States
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  // Sync dark mode class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Load all data
  const loadAllData = async () => {
    try {
      const [
        analyticsData,
        accountsData,
        transactionsData,
        categoriesData,
        budgetsData,
        investmentsData,
        debtsData,
        goalsData
      ] = await Promise.all([
        api.getDashboardAnalytics().catch(() => null),
        api.getAccounts().catch(() => []),
        api.getTransactions({ limit: 300 }).catch(() => []),
        api.getCategories().catch(() => []),
        api.getBudgets().catch(() => []),
        api.getInvestments().catch(() => []),
        api.getDebts().catch(() => []),
        api.getGoals().catch(() => [])
      ]);

      setAnalytics(analyticsData);
      setAccounts(accountsData);
      setTransactions(transactionsData);
      setCategories(categoriesData);
      setBudgets(budgetsData);
      setInvestments(investmentsData);
      setDebts(debtsData);
      setGoals(goalsData);
    } catch (e) {
      console.error('Data load error:', e);
    } finally {
      setLoading(false);
    }
  };

  // Check URL automation parameter on startup (iPhone Action Button / Shortcuts trigger)
  useEffect(() => {
    checkAndHandleUrlAutoIngest().then((res) => {
      if (res && res.triggered) {
        if (res.success) {
          setAutoToastMsg(res.message);
          confetti({ particleCount: 80, spread: 60, origin: { y: 0.2 } });
          setTimeout(() => setAutoToastMsg(null), 4000);
        } else {
          alert(res.message);
        }
      }
      loadAllData();
    });
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Mobile App Shell Wrapper */}
      <div className="w-full max-w-md mx-auto min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col shadow-2xl relative">
        {/* Top Automation Toast */}
        {autoToastMsg && (
          <div className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto p-4 rounded-2xl bg-emerald-600 text-white font-bold text-xs shadow-2xl flex items-center justify-between gap-2 animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span>{autoToastMsg}</span>
            </div>
            <button onClick={() => setAutoToastMsg(null)} className="text-white/80 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {/* Top Navbar */}
        <Navbar
          analytics={analytics}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode(prev => !prev)}
          onOpenSmartParser={() => setSmartParserOpen(true)}
          onOpenQuickTx={() => setQuickTxOpen(true)}
          onOpenSnapshot={() => setSnapshotOpen(true)}
          onOpenImageOcr={() => setImageOcrOpen(true)}
          onReload={loadAllData}
        />

        {/* Main Content Page */}
        <main className="flex-1 p-3.5 sm:p-4 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-80">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
          ) : (
            <>
              {currentPage === 'dashboard' && (
                <Dashboard
                  analytics={analytics}
                  accounts={accounts}
                  transactions={transactions}
                  onOpenSmartParser={() => setSmartParserOpen(true)}
                  onOpenQuickTx={() => setQuickTxOpen(true)}
                  onOpenSnapshot={() => setSnapshotOpen(true)}
                  onOpenImageOcr={() => setImageOcrOpen(true)}
                  onNavigateTo={(p) => {
                    if (p === 'iphone_shortcut') {
                      setIphoneShortcutOpen(true);
                    } else {
                      setCurrentPage(p);
                    }
                  }}
                />
              )}

              {currentPage === 'accounts' && (
                <AccountsPage
                  accounts={accounts}
                  onRefresh={loadAllData}
                  onOpenQuickTx={() => setQuickTxOpen(true)}
                />
              )}

              {currentPage === 'transactions' && (
                <TransactionsPage
                  transactions={transactions}
                  accounts={accounts}
                  categories={categories}
                  onRefresh={loadAllData}
                  onOpenQuickTx={() => setQuickTxOpen(true)}
                />
              )}

              {currentPage === 'parser' && (
                <SmartParserPage
                  accounts={accounts}
                  categories={categories}
                  onRefresh={loadAllData}
                />
              )}

              {currentPage === 'budgets' && (
                <BudgetsPage
                  budgets={budgets}
                  categories={categories}
                  onRefresh={loadAllData}
                />
              )}

              {currentPage === 'investments' && (
                <InvestmentsPage
                  investments={investments}
                  accounts={accounts}
                  onRefresh={loadAllData}
                />
              )}

              {currentPage === 'debts' && (
                <DebtsPage
                  debts={debts}
                  accounts={accounts}
                  onRefresh={loadAllData}
                />
              )}

              {currentPage === 'analytics' && (
                <AnalyticsPage
                  analytics={analytics}
                />
              )}

              {currentPage === 'goals' && (
                <GoalsPage
                  goals={goals}
                  onRefresh={loadAllData}
                />
              )}

              {currentPage === 'settings' && (
                <SettingsPage
                  accounts={accounts}
                  categories={categories}
                  onRefresh={loadAllData}
                />
              )}
            </>
          )}
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <MobileBottomNav
          currentPage={currentPage}
          onSelectPage={(p) => setCurrentPage(p)}
          onOpenSmartParser={() => setSmartParserOpen(true)}
          onOpenQuickTx={() => setQuickTxOpen(true)}
          onOpenSnapshot={() => setSnapshotOpen(true)}
          onOpenImageOcr={() => setImageOcrOpen(true)}
        />
      </div>

      {/* Global Modals */}
      <ImageOcrModal
        isOpen={imageOcrOpen}
        onClose={() => setImageOcrOpen(false)}
        onSuccess={loadAllData}
        accounts={accounts}
        categories={categories}
      />

      <SmartParserModal
        isOpen={smartParserOpen}
        onClose={() => setSmartParserOpen(false)}
        onSuccess={loadAllData}
        accounts={accounts}
        categories={categories}
      />

      <QuickTransactionModal
        isOpen={quickTxOpen}
        onClose={() => setQuickTxOpen(false)}
        onSuccess={loadAllData}
        accounts={accounts}
        categories={categories}
      />

      <SnapshotModal
        isOpen={snapshotOpen}
        onClose={() => setSnapshotOpen(false)}
        onSuccess={loadAllData}
        accounts={accounts}
      />

      <IphoneShortcutModal
        isOpen={iphoneShortcutOpen}
        onClose={() => setIphoneShortcutOpen(false)}
      />
    </div>
  );
}

export default App;

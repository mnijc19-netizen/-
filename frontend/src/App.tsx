import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Navbar } from './components/Navbar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { SmartParserModal } from './components/SmartParserModal';
import { QuickTransactionModal } from './components/QuickTransactionModal';
import { SnapshotModal } from './components/SnapshotModal';
import { ImageOcrModal } from './components/ImageOcrModal';
import { IphoneShortcutModal } from './components/IphoneShortcutModal';
import { AiHubModal } from './components/AiHubModal';

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
import { localStore } from './services/localStore';
import { checkAndHandleUrlAutoIngest, extractFromRawText } from './services/urlAutoIngest';
import { getBeijingDateTimeString } from './utils/dateUtils';
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
  const [liquidGlass, setLiquidGlass] = useState<boolean>(() => {
    return localStore.getLiquidGlass();
  });

  // Modals
  const [smartParserOpen, setSmartParserOpen] = useState(false);
  const [quickTxOpen, setQuickTxOpen] = useState(false);
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const [imageOcrOpen, setImageOcrOpen] = useState(false);
  const [iphoneShortcutOpen, setIphoneShortcutOpen] = useState(false);
  const [aiHubOpen, setAiHubOpen] = useState(false);

  // Auto Automation Toast
  const [autoToastMsg, setAutoToastMsg] = useState<string | null>(null);

  // Debug panel for URL auto-ingest diagnostics (visible on page)
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  // Clipboard overlay: shown when ?cb=1 and auto-read fails
  const [showClipboardOverlay, setShowClipboardOverlay] = useState(false);

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
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      if (metaThemeColor) metaThemeColor.setAttribute('content', '#0b0f19');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      if (metaThemeColor) metaThemeColor.setAttribute('content', '#f8fafc');
    }
  }, [darkMode]);

  // Sync liquid glass theme class
  useEffect(() => {
    if (liquidGlass) {
      document.documentElement.classList.add('liquid-glass-theme');
      document.body.classList.add('liquid-glass-theme');
    } else {
      document.documentElement.classList.remove('liquid-glass-theme');
      document.body.classList.remove('liquid-glass-theme');
    }
    localStore.saveLiquidGlass(liquidGlass);
  }, [liquidGlass]);

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
    // Capture the original URL before anything modifies it
    const originalHref = window.location.href;
    const originalSearch = window.location.search;

    const init = async () => {
      try {
        const res = await checkAndHandleUrlAutoIngest();

        if (res && res.triggered) {
          if (res.success) {
            setAutoToastMsg(res.message);
            setDebugInfo(null);
            confetti({ particleCount: 80, spread: 60, origin: { y: 0.2 } });
            setTimeout(() => setAutoToastMsg(null), 6000);
          } else if (res.showClipboardButton) {
            // Clipboard mode: need user gesture to read clipboard
            setShowClipboardOverlay(true);
          } else {
            setAutoToastMsg(res.message);
            setTimeout(() => setAutoToastMsg(null), 8000);
          }
        }
      } catch (e: any) {
        console.error(e);
      } finally {
        await loadAllData();
      }
    };
    init();

    // Re-check clipboard and data when switching back to app
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadAllData();
      }
    };
    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);
    return () => {
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, []);

  // Handle clipboard button tap (provides user gesture for clipboard API)
  const handleClipboardIngest = async () => {
    setShowClipboardOverlay(false);
    try {
      const clipText = await navigator.clipboard.readText();
      if (clipText && clipText.trim()) {
        const accounts = localStore.getAccounts();
        const categories = localStore.getCategories();
        const extracted = extractFromRawText(clipText, accounts);

        if (extracted.amount > 0) {
          const catObj = categories.find(c => c.name === extracted.category);
          const accountId = extracted.accountId || accounts[0]?.id || 'acc-1';

          await api.createTransaction({
            type: 'expense',
            amount: extracted.amount,
            account_id: accountId,
            category_id: catObj?.id,
            category_name: extracted.category,
            date: getBeijingDateTimeString(),
            merchant: extracted.merchant,
            note: '通过剪贴板一键记账',
            source: 'ios_shortcut'
          });

          setAutoToastMsg(`🎉 已自动记账：${extracted.merchant} ¥${extracted.amount.toFixed(2)}`);
          confetti({ particleCount: 80, spread: 60, origin: { y: 0.2 } });
          setTimeout(() => setAutoToastMsg(null), 6000);
          await loadAllData();
        } else {
          setAutoToastMsg('❌ 剪贴板中未识别到金额');
          setTimeout(() => setAutoToastMsg(null), 5000);
        }
      } else {
        setAutoToastMsg('❌ 剪贴板为空，请先截屏后再试');
        setTimeout(() => setAutoToastMsg(null), 5000);
      }
    } catch (e: any) {
      setAutoToastMsg('❌ 无法读取剪贴板，请在弹窗中点「粘贴」');
      setTimeout(() => setAutoToastMsg(null), 5000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* 🧪 Dynamic Floating Liquid Ambient Glow Orbs for iOS Liquid Glass Mode */}
      {liquidGlass && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div 
            className="absolute -top-12 -left-12 w-80 h-80 rounded-full bg-gradient-to-tr from-sky-400/20 via-indigo-400/18 to-blue-500/20 blur-3xl animate-pulse" 
            style={{ animationDuration: '8s' }} 
          />
          <div 
            className="absolute top-1/4 -right-16 w-88 h-88 rounded-full bg-gradient-to-bl from-purple-400/20 via-fuchsia-400/18 to-pink-400/18 blur-3xl animate-pulse" 
            style={{ animationDuration: '10s', animationDelay: '1.5s' }} 
          />
          <div 
            className="absolute top-2/3 -left-16 w-80 h-80 rounded-full bg-gradient-to-tr from-teal-400/18 via-emerald-400/18 to-sky-400/15 blur-3xl animate-pulse" 
            style={{ animationDuration: '9s', animationDelay: '3s' }} 
          />
          <div 
            className="absolute -bottom-16 right-1/4 w-80 h-80 rounded-full bg-gradient-to-tl from-amber-400/15 via-rose-400/15 to-orange-400/15 blur-3xl animate-pulse" 
            style={{ animationDuration: '11s', animationDelay: '4.5s' }} 
          />
        </div>
      )}

      {/* Mobile App Shell Wrapper */}
      <div className="w-full max-w-md mx-auto min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col shadow-2xl relative z-10">
        {/* Top Automation Toast (Safe from Dynamic Island) */}
        {autoToastMsg && (
          <div className="fixed top-[calc(env(safe-area-inset-top,48px)+0.75rem)] left-4 right-4 z-50 max-w-md mx-auto p-3.5 sm:p-4 rounded-2xl bg-emerald-600/95 dark:bg-emerald-600/95 backdrop-blur-md text-white font-bold text-xs shadow-2xl shadow-emerald-500/25 border border-emerald-400/30 flex items-center justify-between gap-2.5 animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-100" />
              <span className="truncate">{autoToastMsg}</span>
            </div>
            <button 
              type="button"
              onClick={() => setAutoToastMsg(null)} 
              className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition flex-shrink-0"
            >
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
          onOpenAiHub={() => setAiHubOpen(true)}
          onReload={loadAllData}
        />

        {/* Main Content Page */}
        <main className="flex-1 p-3.5 sm:p-4 pb-32">
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
                  onOpenAiHub={() => setAiHubOpen(true)}
                  onClipboardIngest={handleClipboardIngest}
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
                  liquidGlass={liquidGlass}
                  onToggleLiquidGlass={(val) => setLiquidGlass(val)}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Directly viewport-fixed with z-50) */}
      <MobileBottomNav
        currentPage={currentPage}
        onSelectPage={(p) => setCurrentPage(p)}
        onOpenSmartParser={() => setSmartParserOpen(true)}
        onOpenQuickTx={() => setQuickTxOpen(true)}
        onOpenSnapshot={() => setSnapshotOpen(true)}
        onOpenImageOcr={() => setImageOcrOpen(true)}
      />

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

      <AiHubModal
        isOpen={aiHubOpen}
        onClose={() => setAiHubOpen(false)}
        onSuccess={loadAllData}
        accounts={accounts}
        categories={categories}
        analytics={analytics}
        transactions={transactions}
      />
    </div>
  );
}

export default App;

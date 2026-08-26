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
import { AiChatAssistantModal } from './components/AiChatAssistantModal';
import { UniversalQuickAddModal } from './components/UniversalQuickAddModal';
import { BatchBalanceOcrModal } from './components/BatchBalanceOcrModal';
import { OnboardingGuideModal } from './components/OnboardingGuideModal';

// Pages
import { Dashboard } from './pages/Dashboard';
import { AccountsPage } from './pages/AccountsPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { SmartParserPage } from './pages/SmartParserPage';
import { BudgetsPage } from './pages/BudgetsPage';
import { MonthlyPlannerPage } from './pages/MonthlyPlannerPage';
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
import { CheckCircle2, Zap, Undo2, Sparkles } from 'lucide-react';

export function App() {
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('theme') === 'dark';
  });
  const [liquidGlass, setLiquidGlass] = useState<boolean>(() => {
    return localStore.getLiquidGlass();
  });
  const [privacyMode, setPrivacyMode] = useState<boolean>(() => {
    return localStorage.getItem('privacy_mode') !== 'false'; // Defaults to true (masked)
  });

  const handleTogglePrivacy = () => {
    setPrivacyMode(prev => {
      const next = !prev;
      localStorage.setItem('privacy_mode', String(next));
      return next;
    });
  };

  // Modals
  const [universalQuickAddOpen, setUniversalQuickAddOpen] = useState(false);
  const [smartParserOpen, setSmartParserOpen] = useState(false);
  const [quickTxOpen, setQuickTxOpen] = useState(false);
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const [imageOcrOpen, setImageOcrOpen] = useState(false);
  const [batchBalanceOcrOpen, setBatchBalanceOcrOpen] = useState(false);
  const [iphoneShortcutOpen, setIphoneShortcutOpen] = useState(false);
  const [aiHubOpen, setAiHubOpen] = useState(false);
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  // Auto Automation Toast
  const [autoToastMsg, setAutoToastMsg] = useState<string | null>(null);
  const [lastCreatedTxId, setLastCreatedTxId] = useState<string | null>(null);

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

      // Check recurring scheduled items
      api.executeRecurringRules().catch(() => {});
    } catch (e) {
      console.error('Data load error:', e);
    } finally {
      setLoading(false);
    }
  };

  // Check URL automation parameter on startup (iPhone Action Button / Shortcuts trigger)
  useEffect(() => {
    const init = async () => {
      try {
        const res = await checkAndHandleUrlAutoIngest();

        if (res && res.triggered) {
          if (res.success) {
            setAutoToastMsg(res.message);
            confetti({ particleCount: 80, spread: 60, origin: { y: 0.2 } });
            setTimeout(() => setAutoToastMsg(null), 6000);
          } else if (res.showClipboardButton) {
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

  const handleUndoLastTx = async () => {
    if (!lastCreatedTxId) return;
    try {
      await api.deleteTransaction(lastCreatedTxId);
      setLastCreatedTxId(null);
      setAutoToastMsg('🗑️ 已成功撤销该笔记账！');
      confetti({ particleCount: 40, spread: 40, origin: { y: 0.2 } });
      setTimeout(() => setAutoToastMsg(null), 3000);
      await loadAllData();
    } catch (e: any) {
      alert(`撤销失败: ${e.message}`);
    }
  };

  // Handle clipboard button tap (provides user gesture for clipboard API)
  const handleClipboardIngest = async () => {
    setShowClipboardOverlay(false);
    try {
      const clipText = await navigator.clipboard.readText();
      if (clipText && clipText.trim()) {
        const currentAccounts = localStore.getAccounts();
        const currentCategories = localStore.getCategories();
        const extracted = extractFromRawText(clipText, currentAccounts);

        if (extracted.amount > 0) {
          const catObj = currentCategories.find(c => c.name === extracted.category);
          const accountId = extracted.accountId || currentAccounts[0]?.id || 'acc-1';
          const matchedAcc = currentAccounts.find(a => a.id === accountId) || currentAccounts[0];

          const created = await api.createTransaction({
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

          const remainingBal = (matchedAcc?.balance || 0) - extracted.amount;
          setLastCreatedTxId(created.id);
          setAutoToastMsg(`🎉 已自动记账：${extracted.merchant} -¥${extracted.amount.toFixed(2)}，【${matchedAcc?.name || '账户'}】剩余 ¥${remainingBal.toFixed(2)}`);
          confetti({ particleCount: 80, spread: 60, origin: { y: 0.2 } });
          setTimeout(() => {
            setAutoToastMsg(null);
            setLastCreatedTxId(null);
          }, 6000);
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
    <>
      <div className="app-shell-viewport min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* 🧪 Dynamic Floating Liquid Ambient Glow Orbs for iOS Liquid Glass Mode */}
      {liquidGlass && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div 
            className={`absolute -top-12 -left-12 w-80 h-80 rounded-full blur-3xl animate-pulse ${
              darkMode
                ? 'bg-gradient-to-tr from-indigo-900/25 via-slate-900/30 to-blue-900/25'
                : 'bg-gradient-to-tr from-sky-400/20 via-indigo-400/18 to-blue-500/20'
            }`} 
            style={{ animationDuration: '8s' }} 
          />
          <div 
            className={`absolute top-1/4 -right-16 w-88 h-88 rounded-full blur-3xl animate-pulse ${
              darkMode
                ? 'bg-gradient-to-bl from-purple-950/30 via-slate-900/30 to-indigo-950/25'
                : 'bg-gradient-to-bl from-purple-400/20 via-fuchsia-400/18 to-pink-400/18'
            }`} 
            style={{ animationDuration: '10s', animationDelay: '1.5s' }} 
          />
          <div 
            className={`absolute top-2/3 -left-16 w-80 h-80 rounded-full blur-3xl animate-pulse ${
              darkMode
                ? 'bg-gradient-to-tr from-emerald-950/25 via-slate-900/30 to-teal-950/20'
                : 'bg-gradient-to-tr from-teal-400/18 via-emerald-400/18 to-sky-400/15'
            }`} 
            style={{ animationDuration: '9s', animationDelay: '3s' }} 
          />
          <div 
            className={`absolute -bottom-16 right-1/4 w-80 h-80 rounded-full blur-3xl animate-pulse ${
              darkMode
                ? 'bg-gradient-to-tl from-slate-900/30 via-indigo-950/20 to-slate-950/40'
                : 'bg-gradient-to-tl from-amber-400/15 via-rose-400/15 to-orange-400/15'
            }`} 
            style={{ animationDuration: '11s', animationDelay: '4.5s' }} 
          />
        </div>
      )}

      {/* Mobile App Shell Wrapper */}
      <div className="app-shell-canvas w-full max-w-md mx-auto min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col shadow-2xl relative z-10">
        {/* Top Automation Toast (Safe from Dynamic Island with Undo Button) */}
        {autoToastMsg && (
          <div className="fixed top-[calc(env(safe-area-inset-top,48px)+0.75rem)] left-4 right-4 z-50 max-w-md mx-auto p-3.5 sm:p-4 rounded-2xl bg-emerald-600/95 dark:bg-emerald-600/95 backdrop-blur-md text-white font-bold text-xs shadow-2xl shadow-emerald-500/25 border border-emerald-400/30 flex items-center justify-between gap-2.5 animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-100" />
              <span className="truncate">{autoToastMsg}</span>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              {lastCreatedTxId && (
                <button
                  type="button"
                  onClick={handleUndoLastTx}
                  className="px-2.5 py-1 rounded-xl bg-white/20 hover:bg-rose-500 hover:text-white text-emerald-100 text-[10px] font-bold transition flex items-center gap-1 active:scale-95"
                  title="撤销这笔记账"
                >
                  <Undo2 className="w-3 h-3" />
                  <span>5秒撤销</span>
                </button>
              )}
              <button 
                type="button"
                onClick={() => setAutoToastMsg(null)} 
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Top Navbar */}
        <Navbar
          analytics={analytics}
          darkMode={darkMode}
          privacyMode={privacyMode}
          onToggleDarkMode={() => setDarkMode(prev => !prev)}
          onOpenAiChat={() => setAiChatOpen(true)}
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
                  privacyMode={privacyMode}
                  onTogglePrivacy={handleTogglePrivacy}
                  onNavigateTo={(p) => {
                    if (p === 'iphone_shortcut') {
                      setIphoneShortcutOpen(true);
                    } else {
                      setCurrentPage(p);
                    }
                  }}
                  onOpenQuickTx={() => setUniversalQuickAddOpen(true)}
                  onOpenBatchBalance={() => setBatchBalanceOcrOpen(true)}
                  onOpenAiChat={() => setAiChatOpen(true)}
                  onOpenOnboarding={() => setOnboardingOpen(true)}
                />
              )}

              {currentPage === 'accounts' && (
                <AccountsPage
                  accounts={accounts}
                  investments={investments}
                  onRefresh={loadAllData}
                  onOpenQuickTx={() => setQuickTxOpen(true)}
                  onNavigate={(p) => setCurrentPage(p as any)}
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

              {currentPage === 'planner' && (
                <MonthlyPlannerPage
                  debts={debts}
                  budgets={budgets}
                  transactions={transactions}
                  categories={categories}
                  onRefresh={loadAllData}
                  onNavigate={(p) => setCurrentPage(p as any)}
                  onOpenAiChat={() => setAiChatOpen(true)}
                />
              )}

              {currentPage === 'investments' && (
                <InvestmentsPage
                  investments={investments}
                  accounts={accounts}
                  onRefresh={loadAllData}
                  onOpenAiChat={() => setAiChatOpen(true)}
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
                  onNavigate={(val) => setCurrentPage(val as any)}
                  onOpenOnboarding={() => setOnboardingOpen(true)}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>

      {/* Mobile Bottom Navigation Bar (Directly viewport-fixed with z-50) */}
      <MobileBottomNav
        currentPage={currentPage}
        onSelectPage={(p) => setCurrentPage(p)}
        onOpenSmartParser={() => setSmartParserOpen(true)}
        onOpenQuickTx={() => setUniversalQuickAddOpen(true)}
        onOpenSnapshot={() => setSnapshotOpen(true)}
        onOpenImageOcr={() => setImageOcrOpen(true)}
      />

      {/* Universal 5-in-1 Quick Add Action Sheet */}
      <UniversalQuickAddModal
        isOpen={universalQuickAddOpen}
        onClose={() => setUniversalQuickAddOpen(false)}
        onSelectManual={() => setQuickTxOpen(true)}
        onSelectImageOcr={() => setImageOcrOpen(true)}
        onSelectSmartParser={() => setSmartParserOpen(true)}
        onSelectBatchBalance={() => setBatchBalanceOcrOpen(true)}
        onSelectSnapshot={() => setSnapshotOpen(true)}
        onClipboardIngest={handleClipboardIngest}
      />

      {/* Onboarding Guide Modal */}
      <OnboardingGuideModal
        isOpen={onboardingOpen}
        onClose={() => {
          setOnboardingOpen(false);
          localStore.saveOnboardingCompleted(true);
        }}
        onOpenBatchBalance={() => setBatchBalanceOcrOpen(true)}
        onOpenBudgets={() => setCurrentPage('budgets')}
        onOpenIphoneShortcut={() => setIphoneShortcutOpen(true)}
        onOpenAiChat={() => setAiChatOpen(true)}
      />

      {/* Global Modals */}
      <BatchBalanceOcrModal
        isOpen={batchBalanceOcrOpen}
        onClose={() => setBatchBalanceOcrOpen(false)}
        onSuccess={loadAllData}
        existingAccounts={accounts}
      />

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

      <AiChatAssistantModal
        isOpen={aiChatOpen}
        onClose={() => setAiChatOpen(false)}
        accounts={accounts}
        categories={categories}
        transactions={transactions}
        goals={goals}
        budgets={budgets}
        investments={investments}
        debts={debts}
        onRefresh={loadAllData}
        onNavigate={(page) => {
          setAiChatOpen(false);
          setCurrentPage(page as any);
        }}
        onOpenSettings={() => {
          setAiChatOpen(false);
          setCurrentPage('settings');
        }}
      />
    </>
  );
}

export default App;

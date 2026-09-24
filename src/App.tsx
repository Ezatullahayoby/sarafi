import React, { useState, useEffect } from 'react';
import { DatabaseService } from './services/db';
import { BackupService } from './services/backupService';
import { getAfghanTodayFull } from './utils/afghanDate';
import { DashboardView } from './components/DashboardView';
import { CustomersView } from './components/CustomersView';
import { BanksView } from './components/BanksView';
import { TradesView } from './components/TradesView';
import { CashBoxView } from './components/CashBoxView';
import { BalanceView } from './components/BalanceView';
import { ReceiptsView } from './components/ReceiptsView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { GlobalSearchModal } from './components/GlobalSearchModal';

import {
  LayoutDashboard,
  Users,
  Building2,
  TrendingUp,
  Wallet,
  Scale,
  Receipt,
  FileBarChart2,
  Settings,
  Search,
  Plus,
  Menu,
  X,
  Clock,
  Shield,
  Coins,
  Download,
  Calendar,
  CheckCircle2,
  Cloud,
  RefreshCw,
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
  const [selectedCustomerNavId, setSelectedCustomerNavId] = useState<string | null>(null);
  const [backupToast, setBackupToast] = useState<string>('');
  const [isSyncingManually, setIsSyncingManually] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string>('connected');

  const stats = DatabaseService.getDashboardStats();
  const settings = DatabaseService.getSettings();
  const afghanToday = getAfghanTodayFull();

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  // Initialize Firebase Cloud Database Sync on boot
  useEffect(() => {
    DatabaseService.initFirebaseSync(() => {
      setRefreshKey((prev) => prev + 1);
    });

    const unsubscribe = DatabaseService.subscribeFirebaseSyncStatus((status) => {
      setSyncStatus(status);
    });

    const handleSyncEvent = () => {
      setRefreshKey((prev) => prev + 1);
    };
    window.addEventListener('sarafi_sync_update', handleSyncEvent);

    return () => {
      unsubscribe();
      window.removeEventListener('sarafi_sync_update', handleSyncEvent);
    };
  }, []);

  const handleManualFirebaseSync = async () => {
    setIsSyncingManually(true);
    const res = await DatabaseService.syncAllToFirebase();
    setIsSyncingManually(false);
    if (res.success) {
      setBackupToast(`تمام ${res.count} رکورد با موفقیت در فایربیس ابری ذخیره و تثبیت شدند.`);
      setTimeout(() => setBackupToast(''), 4500);
    }
  };

  const handleQuickBackup = () => {
    try {
      const res = BackupService.exportBackup();
      if (res.success) {
        setBackupToast(`فایل پشتیبان با موفقیت دانلود شد: ${res.filename}`);
        setTimeout(() => setBackupToast(''), 4000);
      }
    } catch (err: any) {
      alert('خطا در دانلود فایل پشتیبان: ' + err.message);
    }
  };

  // Keyboard shortcut Ctrl+K / Cmd+K for fast global search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'داشبورد اصلی', icon: LayoutDashboard },
    { id: 'customers', label: 'مشتریان و حساب‌ها', icon: Users },
    { id: 'trades', label: 'معاملات بازار', icon: TrendingUp },
    { id: 'banks', label: 'بانک‌ها (تومان بانکی)', icon: Building2, badge: stats.pendingBankTransactionsCount },
    { id: 'cashbox', label: 'دخل نقدی (صندوق)', icon: Wallet },
    { id: 'balance', label: 'بلانس و تراز', icon: Scale },
    { id: 'receipts', label: 'رسیدها و اسناد', icon: Receipt },
    { id: 'reports', label: 'گزارشات مالی', icon: FileBarChart2 },
    { id: 'settings', label: 'تنظیمات و امنیت', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-800 font-sans selection:bg-emerald-500 selection:text-white antialiased" dir="rtl">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-l border-slate-200/90 shrink-0 sticky top-0 h-screen z-30">
        {/* Brand */}
        <div className="p-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-lg shadow-xs">
            ص
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900 leading-tight truncate">{settings.exchangeName}</h2>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">مدیریت مالی و ارزی هوشمند</p>
          </div>
        </div>

        {/* Global Search Quick Trigger */}
        <div className="p-3">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-400 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors"
          >
            <span className="flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400" />
              <span>جستجوی سریع...</span>
            </span>
            <kbd className="px-1.5 py-0.5 text-[10px] bg-white border border-slate-200 rounded text-slate-400 font-mono">
              Ctrl+K
            </kbd>
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (item.id === 'customers') setSelectedCustomerNavId(null);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`px-2 py-0.5 text-[10px] font-black rounded-full ${
                      isActive ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-900'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Footer status */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-200 flex items-center justify-center text-xs font-black text-slate-700">
              م
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">مدیر صرافی</div>
              <span className="text-[10px] text-emerald-600 flex items-center gap-1 font-semibold">
                ● متصل به دیتابیس
              </span>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('settings')}
            className="text-slate-400 hover:text-slate-600 p-1.5"
            title="تنظیمات"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Header Mobile / Tablet */}
        <header className="lg:hidden bg-white border-b border-slate-200/90 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm">
              ص
            </div>
            <span className="text-xs font-black text-slate-900 truncate max-w-[150px]">
              {settings.exchangeName}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              <Search className="w-5 h-5" />
            </button>
            <button
              onClick={() => setActiveTab('trades')}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 rounded-xl"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>معامله</span>
            </button>
          </div>
        </header>

        {/* Mobile Drawer Menu */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex">
            <div className="bg-white w-72 h-full flex flex-col p-4 space-y-4 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm">
                    ص
                  </div>
                  <h3 className="text-xs font-black text-slate-900">{settings.exchangeName}</h3>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold ${
                        isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-amber-500 text-white">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
            <div className="flex-1" onClick={() => setIsMobileMenuOpen(false)}></div>
          </div>
        )}

        {/* View Router */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-5">
          {/* Top Bar with Afghan Solar Date, Search, and Quick JSON Backup */}
          <div className="bg-white/90 backdrop-blur-xs px-4 py-2.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] text-slate-400 font-semibold leading-none">تقویم هجری شمسی افغانستان</div>
                <div className="text-xs font-black text-slate-800 mt-0.5">{afghanToday}</div>
              </div>
            </div>

            <div className="flex items-center flex-wrap gap-2">
              {backupToast && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] font-bold text-emerald-800 animate-fade-in">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{backupToast}</span>
                </div>
              )}

              {/* دکمه وضعیت و همگام‌سازی ابری فایربیس */}
              <button
                onClick={handleManualFirebaseSync}
                disabled={isSyncingManually}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-colors shadow-2xs disabled:opacity-70"
                title="پایگاه داده آنلاین فایربیس متصل است - برای ذخیره و همگام‌سازی ابری تمام حساب‌ها کلیک کنید"
              >
                {isSyncingManually ? (
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                )}
                <Cloud className="w-3.5 h-3.5 text-emerald-700" />
                <span>{isSyncingManually ? 'در حال همگام‌سازی ابری...' : 'فایربیس آنلاین (متصل)'}</span>
              </button>

              <button
                onClick={handleQuickBackup}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-colors shadow-2xs"
                title="دانلود نسخه پشتیبان کامل JSON از تمام داده‌های دیتابیس"
              >
                <Download className="w-3.5 h-3.5" />
                <span>پشتیبان JSON</span>
              </button>

              <button
                onClick={() => setIsSearchOpen(true)}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200 rounded-xl text-xs"
              >
                <Search className="w-3.5 h-3.5" />
                <span>جستجوی سریع (Ctrl+K)</span>
              </button>
            </div>
          </div>

          {activeTab === 'dashboard' && (
            <DashboardView
              key={refreshKey}
              onNavigate={(tab) => setActiveTab(tab)}
              onOpenNewTrade={() => setActiveTab('trades')}
              onRefresh={handleRefresh}
            />
          )}

          {activeTab === 'customers' && (
            <CustomersView
              key={refreshKey}
              initialCustomerId={selectedCustomerNavId}
              onRefresh={handleRefresh}
            />
          )}

          {activeTab === 'trades' && (
            <TradesView
              key={refreshKey}
              onRefresh={handleRefresh}
              onOpenReceipt={(tradeId) => {
                const receipts = DatabaseService.getReceipts();
                const found = receipts.find((r) => r.referenceId === tradeId);
                if (found) {
                  setSelectedReceiptId(found.id);
                }
                setActiveTab('receipts');
              }}
            />
          )}

          {activeTab === 'banks' && (
            <BanksView key={refreshKey} onRefresh={handleRefresh} />
          )}

          {activeTab === 'cashbox' && (
            <CashBoxView key={refreshKey} onRefresh={handleRefresh} />
          )}

          {activeTab === 'balance' && (
            <BalanceView key={refreshKey} onRefresh={handleRefresh} />
          )}

          {activeTab === 'receipts' && (
            <ReceiptsView
              key={refreshKey}
              selectedReceiptId={selectedReceiptId}
              onRefresh={handleRefresh}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView key={refreshKey} />
          )}

          {activeTab === 'settings' && (
            <SettingsView key={refreshKey} onRefresh={handleRefresh} />
          )}
        </main>
      </div>

      {/* Global Quick Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectCustomer={(custId) => {
          setSelectedCustomerNavId(custId);
          setActiveTab('customers');
        }}
        onSelectReceipt={(recId) => {
          setSelectedReceiptId(recId);
          setActiveTab('receipts');
        }}
        onSelectBank={(bankId) => {
          setActiveTab('banks');
        }}
      />
    </div>
  );
}

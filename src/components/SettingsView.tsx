import React, { useState, useRef } from 'react';
import { DatabaseService } from '../services/db';
import { AuthService } from '../services/auth';
import { AuditLog, Currency, SystemSettings, User } from '../types';
import { formatAfghanDate } from '../utils/afghanDate';
import {
  Settings,
  Shield,
  ShieldCheck,
  History,
  Coins,
  Building,
  UserCheck,
  CheckCircle2,
  Lock,
  KeyRound,
  Database,
  Trash2,
  AlertTriangle,
  Download,
  Upload,
  FileDown,
  FileUp,
  FileJson,
  Cloud,
  RefreshCw,
  Eye,
  EyeOff,
  Users,
} from 'lucide-react';

interface Props {
  onRefresh: () => void;
  onNavigateToUsers?: () => void;
}

export const SettingsView: React.FC<Props> = ({ onRefresh, onNavigateToUsers }) => {
  const settings = DatabaseService.getSettings();
  const currencies = DatabaseService.getCurrencies();
  const logs = DatabaseService.getAuditLogs();
  const currentUser = DatabaseService.getCurrentUser();
  const users = DatabaseService.getUsers();

  const [activeTab, setActiveTab] = useState<'rates' | 'general' | 'audit' | 'backup' | 'reset' | 'admin_security'>('rates');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // General Settings State
  const [exchangeName, setExchangeName] = useState(settings.exchangeName);
  const [phone, setPhone] = useState(settings.phone);
  const [address, setAddress] = useState(settings.address);
  const [receiptNote, setReceiptNote] = useState(settings.receiptNote);
  const [msg, setMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);

  // Admin Security State
  const adminUser = users.find((u) => u.role === 'admin');
  const [adminCurrentPass, setAdminCurrentPass] = useState('');
  const [adminNewUsername, setAdminNewUsername] = useState(adminUser?.username || 'adminsaraf');
  const [adminNewPass, setAdminNewPass] = useState('');
  const [adminConfirmPass, setAdminConfirmPass] = useState('');
  const [showAdminPass, setShowAdminPass] = useState(false);
  const [adminSecError, setAdminSecError] = useState('');

  const handleChangeAdminCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminSecError('');

    if (!adminNewUsername.trim()) {
      setAdminSecError('نام کاربری نمی‌تواند خالی باشد.');
      return;
    }

    if (adminNewPass && adminNewPass.length < 6) {
      setAdminSecError('رمز عبور جدید باید حداقل ۶ کاراکتر باشد.');
      return;
    }

    if (adminNewPass && adminNewPass !== adminConfirmPass) {
      setAdminSecError('رمز عبور جدید با تکرار آن یکسان نیست.');
      return;
    }

    const res = AuthService.changeAdminCredentials(
      adminCurrentPass,
      adminNewUsername.trim(),
      adminNewPass.trim() || undefined
    );

    if (res.success) {
      setMsg('اطلاعات ورود مدیر کل (Username و Password) با موفقیت به‌روزرسانی و رمزنگاری شد.');
      setAdminCurrentPass('');
      setAdminNewPass('');
      setAdminConfirmPass('');
      setTimeout(() => setMsg(''), 4000);
      onRefresh();
    } else {
      setAdminSecError(res.error || 'خطا در تغییر اطلاعات ورود مدیر.');
    }
  };

  const handleCloudSync = async () => {
    setIsSyncingCloud(true);
    const res = await DatabaseService.syncAllToFirebase();
    setIsSyncingCloud(false);
    if (res.success) {
      setMsg(`تمام ${res.count} رکورد با موفقیت در پایگاه داده ابری آنلاین فایربیس ذخیره و همگام شد.`);
      setTimeout(() => setMsg(''), 4000);
      onRefresh();
    } else {
      setErrorMsg('خطا در همگام‌سازی با فایربیس.');
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  // Currency Rates editing
  const [currencyRates, setCurrencyRates] = useState<{ [code: string]: { buy: number; sell: number } }>(() => {
    const initial: { [code: string]: { buy: number; sell: number } } = {};
    currencies.forEach((c) => {
      initial[c.code] = { buy: c.buyRate, sell: c.sellRate };
    });
    return initial;
  });

  const handleDownloadBackup = () => {
    try {
      const jsonStr = DatabaseService.exportBackup();
      const dateStr = new Date().toISOString().split('T')[0];
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `sarafi_backup_${dateStr}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setMsg('فایل پشتیبان کامل سیستم (JSON) با موفقیت دانلود شد.');
      setTimeout(() => setMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(`خطا در ایجاد فایل پشتیبان: ${err?.message || err}`);
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        if (!content) throw new Error('فایل انتخاب‌شده خالی است.');

        if (!window.confirm('آیا مطمئن هستید که می‌خواهید اطلاعات دیتابیس را از این فایل پشتیبان بازیابی کنید؟ اطلاعات قبلی با داده‌های این فایل جایگزین خواهند شد.')) {
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }

        const res = DatabaseService.importBackup(content);
        if (res.success) {
          setMsg(res.message);
          setTimeout(() => setMsg(''), 4000);
          onRefresh();
        } else {
          setErrorMsg(res.message);
          setTimeout(() => setErrorMsg(''), 5000);
        }
      } catch (err: any) {
        setErrorMsg(`خطا در خواندن فایل: ${err?.message || err}`);
        setTimeout(() => setErrorMsg(''), 5000);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: SystemSettings = {
      ...settings,
      exchangeName: exchangeName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      receiptNote: receiptNote.trim(),
    };
    DatabaseService.saveSettings(updated);
    DatabaseService.logAudit('update', 'settings', 'sys', 'ویرایش مشخصات سربرگ و اطلاعات صرافی');
    setMsg('تنظیمات با موفقیت ذخیره شد.');
    setTimeout(() => setMsg(''), 3000);
    onRefresh();
  };

  const handleSaveRates = () => {
    const currs = DatabaseService.getCurrencies();
    for (const c of currs) {
      if (currencyRates[c.code]) {
        c.buyRate = currencyRates[c.code].buy;
        c.sellRate = currencyRates[c.code].sell;
      }
    }
    DatabaseService.saveCurrencies(currs);
    DatabaseService.logAudit('update', 'currency', 'rates', 'به‌روزرسانی تابلو و نرخ‌های خرید و فروش روز بازار');
    setMsg('نرخ‌های ارز با موفقیت به‌روزرسانی شدند.');
    setTimeout(() => setMsg(''), 3000);
    onRefresh();
  };

  const handleSwitchUser = (userId: string) => {
    const u = users.find((item) => item.id === userId);
    if (u) {
      DatabaseService.setCurrentUser(u);
      DatabaseService.logAudit('login', 'settings', u.id, `تغییر کاربر فعال به «${u.name}» (${u.role})`);
      onRefresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-bold text-xs">
              مدیریت و امنیت
            </span>
            <h1 className="text-xl font-black text-slate-900">تنظیمات، نرخ ارزها و لاگ‌های امنیتی (Audit Log)</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            تنظیم تابلو نرخ روز، کنترل دسترسی کاربران و ثبت تمام رویدادهای مالی بدون امکان حذف سابقه
          </p>
        </div>

        {/* Current User Badge & Switcher */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl text-xs">
          <span className="text-slate-500 font-semibold">کاربر فعال:</span>
          <select
            value={currentUser.id}
            onChange={(e) => handleSwitchUser(e.target.value)}
            className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 font-bold text-slate-800"
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role === 'admin' ? 'مدیر' : 'کاربر'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {msg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{msg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 flex-wrap">
        <button
          onClick={() => setActiveTab('rates')}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-colors ${
            activeTab === 'rates'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          تابلو نرخ روز ارزها
        </button>
        <button
          onClick={() => setActiveTab('general')}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-colors ${
            activeTab === 'general'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          اطلاعات صرافی و سربرگ رسید
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-colors ${
            activeTab === 'audit'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          سوابق امنیتی و تغییرات ({logs.length})
        </button>
        <button
          onClick={() => setActiveTab('backup')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-colors ${
            activeTab === 'backup'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
          }`}
        >
          <FileJson className="w-3.5 h-3.5" />
          <span>پشتیبان‌گیری و بازیابی (Backup JSON)</span>
        </button>
        <button
          onClick={() => setActiveTab('reset')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-colors ${
            activeTab === 'reset'
              ? 'bg-rose-700 text-white shadow-xs'
              : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
          }`}
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>مدیریت و پاکسازی دیتابیس</span>
        </button>
      </div>

      {/* TAB: Currency Rates */}
      {activeTab === 'rates' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">
              تنظیم تابلو نرخ‌های خرید و فروش بازار (محاسبات تومان و افغانی بر مبنای ۱۰۰۰)
            </h3>
            <button
              onClick={handleSaveRates}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs"
            >
              ذخیره و اعمال نرخ‌ها
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currencies.map((c) => (
              <div key={c.code} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900">
                    {c.name} ({c.code})
                  </span>
                  {c.isBaseRateUnit1000 && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">
                      مبنای هر ۱۰۰۰ واحد
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">نرخ خرید صرافی:</label>
                    <input
                      type="number"
                      step="any"
                      value={currencyRates[c.code]?.buy ?? c.buyRate}
                      onChange={(e) =>
                        setCurrencyRates({
                          ...currencyRates,
                          [c.code]: {
                            ...currencyRates[c.code],
                            buy: parseFloat(e.target.value) || 0,
                          },
                        })
                      }
                      className="w-full px-3 py-1.5 text-xs font-mono font-bold border border-slate-200 rounded-xl bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">نرخ فروش صرافی:</label>
                    <input
                      type="number"
                      step="any"
                      value={currencyRates[c.code]?.sell ?? c.sellRate}
                      onChange={(e) =>
                        setCurrencyRates({
                          ...currencyRates,
                          [c.code]: {
                            ...currencyRates[c.code],
                            sell: parseFloat(e.target.value) || 0,
                          },
                        })
                      }
                      className="w-full px-3 py-1.5 text-xs font-mono font-bold border border-slate-200 rounded-xl bg-white"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: General Exchange Settings */}
      {activeTab === 'general' && (
        <form onSubmit={handleSaveGeneral} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
            مشخصات صرافی جهت چاپ روی فاکتورها و رسیدهای رسمی
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">نام صرافی و خدمات پولی:</label>
              <input
                type="text"
                value={exchangeName}
                onChange={(e) => setExchangeName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">شماره‌های تماس صرافی:</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">آدرس دقیق دکان / دفتر صرافی:</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">متن پاورقی رسید (سلب مسئولیت و شرایط):</label>
              <textarea
                value={receiptNote}
                onChange={(e) => setReceiptNote(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs"
            >
              ذخیره اطلاعات
            </button>
          </div>
        </form>
      )}

      {/* TAB: Audit Log (سوابق تغییرات و امنیت - شرط ۲۰) */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-bold text-slate-900">
                دفترچه امنیتی سابقه تغییرات سیستم (Audit Log)
              </h3>
            </div>
            <span className="text-[11px] text-slate-500">غیرقابل حذف برای تضمین شفافیت مالی صراف</span>
          </div>

          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="p-3">زمان رویداد</th>
                  <th className="p-3">کاربر</th>
                  <th className="p-3">نوع عملیات</th>
                  <th className="p-3">بخش</th>
                  <th className="p-3">جزئیات و شرح عملیات مالی</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/70">
                    <td className="p-3 text-slate-500 whitespace-nowrap font-sans">
                      <div className="font-bold text-slate-800">{formatAfghanDate(l.timestamp.split('T')[0])}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{new Date(l.timestamp).toLocaleTimeString('fa-IR')}</div>
                    </td>
                    <td className="p-3 font-bold text-slate-800 font-sans">{l.userName}</td>
                    <td className="p-3 font-sans">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                        {l.action}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600 font-sans">{l.entity}</td>
                    <td className="p-3 text-slate-900 font-sans">{l.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: Backup & Restore (فایل پشتیبان JSON) */}
      {activeTab === 'backup' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 text-blue-900 font-black text-sm">
                <FileJson className="w-5 h-5 text-blue-600" />
                <h2>پشتیبان‌گیری و بازیابی پایگاه داده (JSON Backup & Restore)</h2>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                شما می‌توانید در هر زمان از تمامی اطلاعات صرافی (مشتریان، حساب‌ها، بانک‌ها، تراکنش‌ها، معاملات و سوابق) یک نسخه پشتیبان به فرمت JSON دریافت کرده یا در صورت نیاز آن را بازیابی نمایید.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
              امنیت اطلاعات
            </span>
          </div>

          {/* Quick Statistics */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] text-slate-500">مشتریان فعال:</span>
              <div className="text-base font-black text-slate-800 mt-0.5">
                {DatabaseService.getCustomers().length} نفر
              </div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] text-slate-500">بانک‌های تعریف‌شده:</span>
              <div className="text-base font-black text-slate-800 mt-0.5">
                {DatabaseService.getBanks().length} بانک
              </div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] text-slate-500">تراکنش‌های بانکی:</span>
              <div className="text-base font-black text-slate-800 mt-0.5">
                {DatabaseService.getBankTransactions().length} تراکنش
              </div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] text-slate-500">معاملات ارزی:</span>
              <div className="text-base font-black text-slate-800 mt-0.5">
                {DatabaseService.getTrades().length} معامله
              </div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] text-slate-500">فاکتورها و رسیدها:</span>
              <div className="text-base font-black text-slate-800 mt-0.5">
                {DatabaseService.getReceipts().length} رسید
              </div>
            </div>
          </div>

          {/* Firebase Online Cloud Database Section */}
          <div className="p-5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Cloud className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-slate-900">پایگاه داده ابری آنلاین فایربیس (Firebase Cloud Firestore)</h3>
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    متصل و همگام آنلاین
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  تمام اطلاعات مشتریان، بانک‌ها، تراکنش‌ها، روزنامچه و معاملات شما به صورت کاملاً اتومات و امن بر روی دیتابیس ابری فایربیس ذخیره می‌شوند و هرگز از بین نمی‌روند.
                </p>
                <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 font-mono pt-1">
                  <span>پروژه فایربیس: <strong className="text-slate-700">helical-storm-rvxch</strong></span>
                  <span>شناسه پایگاه: <strong className="text-slate-700">ai-studio-remix</strong></span>
                  <span>قابلیت دسترسی: <strong className="text-emerald-700 font-sans">همیشه و از هرجا</strong></span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCloudSync}
              disabled={isSyncingCloud}
              className="w-full md:w-auto shrink-0 flex items-center justify-center gap-2 py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncingCloud ? 'animate-spin' : ''}`} />
              <span>{isSyncingCloud ? 'در حال همگام‌سازی ابری...' : 'همگام‌سازی فوری با فایربیس'}</span>
            </button>
          </div>

          {/* Action Boxes: Export and Import */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Export Card */}
            <div className="p-5 bg-gradient-to-br from-blue-50/60 to-indigo-50/40 border border-blue-200 rounded-2xl space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <FileDown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-blue-950">گرفتن فایل پشتیبان (Export Backup)</h3>
                  <p className="text-[11px] text-blue-700">دانلود تمام داده‌ها در یک فایل با فرمت JSON</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                با کلیک بر روی دکمه زیر، فایل پشتیبان حاوی تمام بانک‌ها، مشتریان، تراکنش‌ها، لاگ‌ها و تنظیمات تولید شده و بر روی رایانه شما ذخیره می‌شود. پیشنهاد می‌شود به صورت دوره‌ای نسخه پشتیبان تهیه فرمایید.
              </p>
              <button
                type="button"
                onClick={handleDownloadBackup}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>دانلود فوری فایل پشتیبان (JSON)</span>
              </button>
            </div>

            {/* Import / Restore Card */}
            <div className="p-5 bg-gradient-to-br from-emerald-50/60 to-teal-50/40 border border-emerald-200 rounded-2xl space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <FileUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-emerald-950">بازیابی فایل پشتیبان (Restore Backup)</h3>
                  <p className="text-[11px] text-emerald-700">بازگردانی دیتابیس از فایل پشتیبان JSON قبلی</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                اگر قبلاً فایلی از برنامه دانلود کرده‌اید، می‌توانید آن را انتخاب کنید تا کلیه داده‌های قبلی بازیابی شوند. پس از انتخاب فایل، سیستم از شما تایید نهایی خواهد گرفت.
              </p>
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json,application/json"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="backup-file-input"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>انتخاب و بارگذاری فایل JSON جهت بازیابی</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Database Reset & Management */}
      {activeTab === 'reset' && (
        <div className="bg-white p-6 rounded-2xl border border-rose-200/80 shadow-xs space-y-6">
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-rose-100">
            <div>
              <div className="flex items-center gap-2 text-rose-800 font-black text-sm">
                <Database className="w-5 h-5 text-rose-600" />
                <h2>پاکسازی دیتابیس و شروع مجدد (بدون اطلاعات آزمایشی)</h2>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-xl">
                با اجرای این عملیات، تمامی بانک‌ها، حساب‌های آزمایشی، مشتریان، فیش‌ها و سوابق معاملات حذف می‌شوند تا بتوانید دیتابیس تمیز و واقعی خود را از ابتدا وارد کنید.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
              مدیریت داده‌ها
            </span>
          </div>

          {/* Current Status Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] text-slate-500">بانک‌های تعریف‌شده:</span>
              <div className="text-lg font-black text-slate-800 mt-0.5">
                {DatabaseService.getBanks().length} بانک
              </div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] text-slate-500">مشتریان ثبت‌شده:</span>
              <div className="text-lg font-black text-slate-800 mt-0.5">
                {DatabaseService.getCustomers().length} مشتری
              </div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] text-slate-500">تراکنش‌های بانکی:</span>
              <div className="text-lg font-black text-slate-800 mt-0.5">
                {DatabaseService.getBankTransactions().length} تراکنش
              </div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] text-slate-500">معاملات ارزی:</span>
              <div className="text-lg font-black text-slate-800 mt-0.5">
                {DatabaseService.getTrades().length} معامله
              </div>
            </div>
          </div>

          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-3">
            <div className="flex items-center gap-2 font-bold text-rose-900">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>هشدار: عملیات غیرقابل بازگشت است</span>
            </div>
            <p className="text-rose-700 leading-relaxed">
              این عملیات دیتابیس را به وضعیت اولیه کاملاً صفر و تمیز برمی‌گرداند. هیچ نام بانک، هیچ مشتری و هیچ تراکنشی باقی نخواهد ماند.
            </p>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('آیا مطمئن هستید که می‌خواهید تمام داده‌های دیتابیس، بانک‌ها و حساب‌ها را کاملاً پاکسازی کنید؟')) {
                  DatabaseService.clearAllData();
                  setMsg('دیتابیس با موفقیت کاملاً خالی شد. هیچ بانک یا حسابی در سیستم باقی نمانده است.');
                  setTimeout(() => setMsg(''), 4000);
                  onRefresh();
                }
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-xs transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>خالی کردن کامل دیتابیس و حذف همه داده‌ها</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

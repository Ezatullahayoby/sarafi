import React, { useState } from 'react';
import { DatabaseService } from '../services/db';
import { CashBalance, Currency } from '../types';
import { GoogleExportService } from '../services/googleExport';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  RefreshCw,
  Coins,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';

interface Props {
  onRefresh: () => void;
}

export const CashBoxView: React.FC<Props> = ({ onRefresh }) => {
  const currencies = DatabaseService.getCurrencies();
  const balances = DatabaseService.getCashBalances();

  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('AFN');
  const [adjustType, setAdjustType] = useState<'in' | 'out'>('in');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(adjustAmount.replace(/,/g, ''));
    if (isNaN(num) || num <= 0) return;

    const delta = adjustType === 'in' ? num : -num;
    DatabaseService.updateCashAmount(selectedCurrency, delta);

    const curr = currencies.find((c) => c.code === selectedCurrency);
    DatabaseService.logAudit(
      'update',
      'currency',
      selectedCurrency,
      `تعدیل دخل نقدی ${curr?.name || selectedCurrency}: ${adjustType === 'in' ? 'افزایش' : 'کاهش'} به مبلغ ${num.toLocaleString()} (${adjustReason})`
    );

    setShowAdjustModal(false);
    setAdjustAmount('');
    setAdjustReason('');
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 font-bold text-xs">
              دخل فیزیکی صرافی
            </span>
            <h1 className="text-xl font-black text-slate-900">دخل نقدی و صندوق فیزیکی</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            صندوق فیزیکی صرافی کاملاً مستقل از حساب‌های بانکی است و با هر معامله نقدی بهصورت خودکار بهروزرسانی میشود
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAdjustModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>شارژ یا برداشت دستی از دخل</span>
          </button>
        </div>
      </div>

      {/* Currency Cash Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {currencies.map((c) => {
          const cashObj = balances.find((b) => b.currencyCode === c.code);
          const currentAmount = cashObj ? cashObj.amount : 0;
          const isToman = c.code === 'IRR';

          return (
            <div
              key={c.code}
              className={`p-5 rounded-2xl border shadow-xs transition-all ${
                isToman
                  ? 'bg-amber-50/40 border-amber-300 ring-1 ring-amber-400/20'
                  : 'bg-white border-slate-200/80'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                      isToman ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {c.symbol}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">{c.name} نقدی</h3>
                    <p className="text-[10px] text-slate-400">کد: {c.code}</p>
                  </div>
                </div>

                {isToman && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-200 text-amber-900 font-bold">
                    دخل فیزیکی
                  </span>
                )}
              </div>

              <div className="mt-4">
                <div className="text-2xl font-black text-slate-900 tracking-tight">
                  {currentAmount.toLocaleString()}{' '}
                  <span className="text-xs font-normal text-slate-400">{c.symbol}</span>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>موجودی اولیه:</span>
                  <span className="font-mono">{(cashObj?.initialBalance || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Distinction Note */}
      <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 space-y-1">
          <h4 className="font-bold">قانون طلایی سیستم حسابداری صرافی:</h4>
          <p className="leading-relaxed">
            «تومان نقدی» فقط شامل اسکناس‌های فیزیکی موجود در کشوی صرافی است. برای مدیریت کارت‌های بانکی، دستگاه‌های پوز و
            حساب‌های واریز شتابی، به بخش <strong>بانک‌ها</strong> مراجعه کنید. این دو سیستم از نظر دفاتر و گزارش‌ها ۱۰۰٪
            مستقل هستند.
          </p>
        </div>
      </div>

      {/* Modal Adjust Cash */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-black text-slate-900">تعدیل یا ثبت واریز/برداشت دخل فیزیکی</h3>
            <form onSubmit={handleAdjustSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ارز مورد نظر:</label>
                <select
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                >
                  {currencies.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">نوع تغییر دخل:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType('in')}
                    className={`py-2 text-xs font-bold rounded-xl border ${
                      adjustType === 'in'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    شارژ دخل (ورود وجه)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('out')}
                    className={`py-2 text-xs font-bold rounded-xl border ${
                      adjustType === 'out'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    برداشت از دخل (خروج وجه)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">مبلغ: *</label>
                <input
                  type="text"
                  required
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  placeholder="مبلغ را وارد کنید"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">علت / بابت: *</label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="مثلا: شارژ اولیه روزانه یا برداشت تنخواه"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs"
                >
                  ثبت در دخل نقدی
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

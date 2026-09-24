import React, { useState } from 'react';
import { DatabaseService } from '../services/db';
import { GoogleExportService } from '../services/googleExport';
import {
  BarChart3,
  FileSpreadsheet,
  Calendar,
  Filter,
  TrendingUp,
  Building2,
  Users,
  Search,
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const [reportType, setReportType] = useState<
    'trades' | 'bank_transactions' | 'customers' | 'profit_loss'
  >('trades');

  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const trades = DatabaseService.getTrades();
  const bankTxs = DatabaseService.getBankTransactions();
  const customers = DatabaseService.getCustomers();
  const stats = DatabaseService.getDashboardStats();

  const handleExportSpreadsheet = () => {
    if (reportType === 'bank_transactions') {
      GoogleExportService.exportBankJournal();
    } else {
      GoogleExportService.exportBalanceSheet();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs">
              گزارش‌گیری تحلیلی
            </span>
            <h1 className="text-xl font-black text-slate-900">گزارشات مالی و روزنامچه‌های صرافی</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            فیلتر بر اساس تاریخ، مشتری، بانک، وضعیت تراکنش‌ها و خروجی مستقیم به گوگل شیت و فایل اکسل
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportSpreadsheet}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>خروجی شیت / اکسل این گزارش</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 flex-wrap">
        <button
          onClick={() => setReportType('trades')}
          className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-colors ${
            reportType === 'trades'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          گزارش خرید و فروش ارز ({trades.length})
        </button>
        <button
          onClick={() => setReportType('bank_transactions')}
          className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-colors ${
            reportType === 'bank_transactions'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          گزارش واریز و برداشت بانک‌ها ({bankTxs.length})
        </button>
        <button
          onClick={() => setReportType('profit_loss')}
          className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-colors ${
            reportType === 'profit_loss'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          تحلیل سود و زیان
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-slate-600 font-semibold">فیلتر تاریخ:</span>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-xl"
            />
            {dateFilter && (
              <button
                onClick={() => setDateFilter('')}
                className="text-rose-600 hover:underline text-[11px]"
              >
                پاک کردن
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Report Table: Trades */}
      {reportType === 'trades' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">شماره سند</th>
                  <th className="p-3">تاریخ و ساعت</th>
                  <th className="p-3">نوع معامله</th>
                  <th className="p-3">مقدار ارز</th>
                  <th className="p-3">نرخ</th>
                  <th className="p-3">مبلغ تسویه</th>
                  <th className="p-3">مشتری</th>
                  <th className="p-3 text-emerald-700">سود تقریبی</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trades
                  .filter((t) => !dateFilter || t.date === dateFilter)
                  .map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/70">
                      <td className="p-3 font-mono font-bold text-slate-800">{t.tradeNumber}</td>
                      <td className="p-3 text-slate-500 font-mono">
                        {t.date} {t.time}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            t.type === 'buy' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {t.type === 'buy' ? 'خرید' : 'فروش'}
                        </span>
                      </td>
                      <td className="p-3 font-bold">
                        {t.amount.toLocaleString()} {t.currencyCode}
                      </td>
                      <td className="p-3 font-mono">{t.rate}</td>
                      <td className="p-3 font-mono font-bold">
                        {t.totalSettlementAmount.toLocaleString()} {t.settlementCurrency}
                      </td>
                      <td className="p-3 font-medium">{t.customerName}</td>
                      <td className="p-3 font-mono text-emerald-600 font-bold">
                        +{t.profitOrLoss.toLocaleString()}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Report Table: Bank Transactions */}
      {reportType === 'bank_transactions' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">بانک</th>
                  <th className="p-3">نوع</th>
                  <th className="p-3">مبلغ (تومان بانکی)</th>
                  <th className="p-3">۴ رقم کارت</th>
                  <th className="p-3">شماره پیگیری</th>
                  <th className="p-3">تاریخ و ساعت</th>
                  <th className="p-3">مشتری</th>
                  <th className="p-3">وضعیت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bankTxs
                  .filter((t) => !dateFilter || t.date === dateFilter)
                  .map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/70">
                      <td className="p-3 font-bold text-slate-900">{t.bankName}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            t.type === 'deposit' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                          }`}
                        >
                          {t.type === 'deposit' ? 'واریز' : 'برداشت'}
                        </span>
                      </td>
                      <td className="p-3 font-black text-slate-900 font-mono">
                        {t.amount.toLocaleString()} تومان
                      </td>
                      <td className="p-3 font-mono">****{t.cardLast4}</td>
                      <td className="p-3 font-mono text-slate-700">{t.trackingNumber}</td>
                      <td className="p-3 text-slate-500 font-mono">
                        {t.date} {t.time}
                      </td>
                      <td className="p-3 font-medium">{t.customerName || 'اختصاص نیافته'}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            t.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {t.status === 'approved' ? 'تأیید شده' : 'معلق'}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Report Table: Profit & Loss Analysis */}
      {reportType === 'profit_loss' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <span className="text-xs text-slate-500 font-semibold">کل سود معاملات ارزی</span>
            <div className="text-2xl font-black text-emerald-600 mt-2 font-mono">
              +{stats.totalProfit.toLocaleString()} <span className="text-xs font-normal">افغانی</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">محاسبه بر اساس مارجین خرید و فروش روز</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <span className="text-xs text-slate-500 font-semibold">کل تخفیفات / زیان معاملات</span>
            <div className="text-2xl font-black text-rose-600 mt-2 font-mono">
              -{stats.totalLoss.toLocaleString()} <span className="text-xs font-normal">افغانی</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">زیان احتمالی ناشی از نوسانات شدید</p>
          </div>

          <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-300 shadow-xs">
            <span className="text-xs text-emerald-900 font-bold">سود خالص کل صرافی</span>
            <div className="text-2xl font-black text-emerald-950 mt-2 font-mono">
              +{stats.netProfit.toLocaleString()} <span className="text-xs font-normal">افغانی</span>
            </div>
            <p className="text-[11px] text-emerald-700 mt-1">تراز نهایی عملکرد سودآوری</p>
          </div>
        </div>
      )}
    </div>
  );
};

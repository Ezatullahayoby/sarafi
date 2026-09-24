import React from 'react';
import { DatabaseService } from '../services/db';
import { GoogleExportService } from '../services/googleExport';
import { ExchangeStats } from '../types';
import { formatAfghanDate, getAfghanTodayFull } from '../utils/afghanDate';
import {
  Wallet,
  Building2,
  TrendingUp,
  Clock,
  Users,
  ArrowUpRight,
  ArrowDownLeft,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  ReceiptText,
  Calendar,
  Zap,
} from 'lucide-react';

interface Props {
  onNavigate: (tab: string, param?: string) => void;
  onOpenNewTrade: () => void;
  onRefresh: () => void;
}

export const DashboardView: React.FC<Props> = ({ onNavigate, onOpenNewTrade }) => {
  const stats: ExchangeStats = DatabaseService.getDashboardStats();
  const todaySolar = getAfghanTodayFull();

  const handleExportSheets = () => {
    GoogleExportService.exportBalanceSheet();
  };

  return (
    <div className="space-y-6">
      {/* Top Welcome Bar with Actions & Afghan Shamsi Date */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">داشبورد صرافی و دارایی‌ها</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              {todaySolar}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            سیستم حسابداری صرافی — مدیریت خودکار موجودی دخل‌ها، بانک‌ها و حساب مشتریان
          </p>
        </div>
        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={() => onNavigate('customers')}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            <Users className="w-4 h-4 text-slate-600" />
            <span>حساب مشتریان</span>
          </button>
          <button
            onClick={() => onNavigate('banks')}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 transition-colors"
          >
            <Building2 className="w-4 h-4 text-blue-600" />
            <span>دفتر بانک‌ها ({stats.pendingBankTransactionsCount > 0 ? `${stats.pendingBankTransactionsCount} معلق` : 'به‌روز'})</span>
          </button>
          <button
            onClick={handleExportSheets}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200 transition-colors"
            title="خروجی مستقیم به گوگل شیت و اکسل"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>اکسل</span>
          </button>
          <button
            onClick={onOpenNewTrade}
            className="flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors"
          >
            <TrendingUp className="w-4 h-4" />
            <span>معامله جدید</span>
          </button>
        </div>
      </div>

      {/* Main Balances Grid (Cash vs Bank IRT) - Clean & Elegant */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* افغانی نقدی */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">افغانی نقدی</span>
            <span className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm">
              ؋
            </span>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight" dir="ltr">
              {stats.cashAFN.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">دخل فیزیکی صرافی</p>
          </div>
        </div>

        {/* دالر نقدی */}
        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-2xs hover:shadow-xs transition-shadow bg-gradient-to-b from-emerald-50/30 to-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900">دالر نقدی (USD)</span>
            <span className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
              $
            </span>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-black text-emerald-950 font-mono tracking-tight" dir="ltr">
              {stats.cashUSD.toLocaleString()}
            </div>
            <p className="text-[11px] text-emerald-700/80 mt-0.5">اسکناس نقد گاوصندوق</p>
          </div>
        </div>

        {/* کلدار نقدی */}
        <div className="bg-white p-4 rounded-2xl border border-teal-200 shadow-2xs hover:shadow-xs transition-shadow bg-gradient-to-b from-teal-50/30 to-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-teal-900">کلدار نقدی (PKR)</span>
            <span className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-sm">
              ₨
            </span>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-black text-teal-950 font-mono tracking-tight" dir="ltr">
              {stats.cashPKR.toLocaleString()}
            </div>
            <p className="text-[11px] text-teal-700/80 mt-0.5">اسکناس کلدار دخل</p>
          </div>
        </div>

        {/* تومان نقدی */}
        <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-2xs hover:shadow-xs transition-shadow bg-gradient-to-b from-amber-50/30 to-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900">تومان نقدی (دخل)</span>
            <span className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-black text-amber-950 font-mono tracking-tight" dir="ltr">
              {stats.cashIRR.toLocaleString()}
            </div>
            <p className="text-[11px] text-amber-700/80 mt-0.5">اسکناس تومان دخل</p>
          </div>
        </div>

        {/* تومان بانکی (مجموع حساب‌ها) */}
        <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-2xs hover:shadow-xs transition-shadow bg-gradient-to-b from-blue-50/30 to-white col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-900">تومان بانکی</span>
            <span className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-black text-blue-950 font-mono tracking-tight" dir="ltr">
              {stats.bankIRR.toLocaleString()}
            </div>
            <p className="text-[11px] text-blue-700/80 mt-0.5">موجودی کارت‌ها و حساب‌ها</p>
          </div>
        </div>
      </div>

      {/* Secondary Financial Indicators: سود خالص و وضعیت مطالبات */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* سود و ضرر خالص */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">سود و زیان معاملات امروز</span>
              <span className="px-2 py-0.5 text-[11px] font-black rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                سود خالص
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono">{stats.netProfit.toLocaleString()}</span>
              <span className="text-xs text-slate-500 font-bold">افغانی</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>سود ناخالص: +{stats.totalProfit.toLocaleString()}</span>
            <span>کسورات/زیان: -{stats.totalLoss.toLocaleString()}</span>
          </div>
        </div>

        {/* وضعیت طلب و بدهی تجمیعی */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-600">خلاصه مطالبات و بدهی‌ها</span>
            <button
              onClick={() => onNavigate('balance')}
              className="text-xs text-emerald-700 hover:text-emerald-800 font-bold"
            >
              مشاهده بلانس ←
            </button>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-600 font-medium">طلب صرافی از مشتریان:</span>
              <span className="font-bold font-mono text-emerald-700" dir="ltr">
                {Object.entries(stats.totalReceivables)
                  .map(([cur, val]) => `${val.toLocaleString()} ${cur}`)
                  .join(' | ') || '۰'}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-600 font-medium">بدهی صرافی به مشتریان:</span>
              <span className="font-bold font-mono text-rose-700" dir="ltr">
                {Object.entries(stats.totalPayables)
                  .map(([cur, val]) => `${val.toLocaleString()} ${cur}`)
                  .join(' | ') || '۰'}
              </span>
            </div>
          </div>
        </div>

        {/* آمار عملیاتی روز و تراکنش معلق */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">اقلام نیازمند تأیید مدیر</span>
            <span className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              فعال و برخط
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div
              onClick={() => onNavigate('banks')}
              className={`cursor-pointer p-2.5 rounded-xl transition-colors border ${
                stats.pendingBankTransactionsCount > 0
                  ? 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-900'
                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
              }`}
              title="مشاهده و تأیید تراکنش‌های بانکی معلق"
            >
              <div className="flex items-center gap-1 text-[11px] font-bold">
                <AlertCircle className="w-3 h-3 text-amber-600" />
                <span>بانک</span>
              </div>
              <div className="text-lg font-black mt-0.5 font-mono">
                {stats.pendingBankTransactionsCount}
              </div>
            </div>

            <div
              onClick={() => onNavigate('trades')}
              className={`cursor-pointer p-2.5 rounded-xl transition-colors border ${
                (stats.pendingTradesCount || 0) > 0
                  ? 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-900'
                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
              }`}
              title="مشاهده و تأیید معاملات ارزی معلق"
            >
              <div className="flex items-center gap-1 text-[11px] font-bold">
                <Clock className="w-3 h-3 text-amber-600" />
                <span>معامله</span>
              </div>
              <div className="text-lg font-black mt-0.5 font-mono">
                {stats.pendingTradesCount || 0}
              </div>
            </div>

            <div
              onClick={() => onNavigate('customers')}
              className={`cursor-pointer p-2.5 rounded-xl transition-colors border ${
                (stats.pendingCustomerEntriesCount || 0) > 0
                  ? 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-900'
                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
              }`}
              title="مشاهده و تأیید اسناد حسابداری مشتریان"
            >
              <div className="flex items-center gap-1 text-[11px] font-bold">
                <Users className="w-3 h-3 text-amber-600" />
                <span>حسابات</span>
              </div>
              <div className="text-lg font-black mt-0.5 font-mono">
                {stats.pendingCustomerEntriesCount || 0}
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1 font-medium">
              <Users className="w-3.5 h-3.5 text-slate-400" /> کل حساب مشتریان:
            </span>
            <span className="font-bold text-slate-800">{stats.totalCustomersCount} مشتری</span>
          </div>
        </div>
      </div>

      {/* پیام اسناد در انتظار تأیید مدیر */}
      {((stats.pendingBankTransactionsCount || 0) + (stats.pendingTradesCount || 0) + (stats.pendingCustomerEntriesCount || 0)) > 0 && (
        <div className="flex items-center justify-between p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-bold">
              اسناد معلق در انتظار تأیید نهایی مدیر:
            </span>
            <span className="font-mono font-bold">
              {stats.pendingBankTransactionsCount > 0 && `${stats.pendingBankTransactionsCount} بانک | `}
              {(stats.pendingTradesCount || 0) > 0 && `${stats.pendingTradesCount} معامله | `}
              {(stats.pendingCustomerEntriesCount || 0) > 0 && `${stats.pendingCustomerEntriesCount} سند حساب مشتری`}
            </span>
          </div>
          <span className="text-[11px] text-amber-700 hidden sm:inline">برای تأیید، وارد بخش مربوطه شوید</span>
        </div>
      )}

      {/* Two Column Layout: آخرین معاملات و آخرین تراکنش‌های بانکی */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* آخرین معاملات بازار */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-900">آخرین معاملات ارزی</h2>
            </div>
            <button
              onClick={() => onNavigate('trades')}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
            >
              مشاهده همه ←
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {stats.recentTrades.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">هنوز معامله‌ای ثبت نشده است</div>
            ) : (
              stats.recentTrades.map((trade) => (
                <div key={trade.id} className="p-4 hover:bg-slate-50/70 transition-colors flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                        trade.type === 'buy'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {trade.type === 'buy' ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{trade.customerName}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                            trade.type === 'buy'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {trade.type === 'buy' ? 'خرید صرافی' : 'فروش صرافی'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 font-mono" dir="ltr">
                        {trade.amount.toLocaleString()} {trade.currencyCode} @ {trade.rate}
                      </p>
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-slate-900 font-mono" dir="ltr">
                      {trade.totalSettlementAmount.toLocaleString()} {trade.settlementCurrency}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {formatAfghanDate(trade.date)} {trade.time}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* آخرین تراکنش‌های بانکی (تومان بانکی) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-900">آخرین تراکنش‌های بانکی</h2>
            </div>
            <button
              onClick={() => onNavigate('banks')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700"
            >
              دفتر بانک‌ها ←
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {stats.recentBankTransactions.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">هیچ تراکنش بانکی وجود ندارد</div>
            ) : (
              stats.recentBankTransactions.map((tx) => (
                <div key={tx.id} className="p-4 hover:bg-slate-50/70 transition-colors flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                        tx.type === 'deposit' || tx.txKind === 'receipt'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {tx.type === 'deposit' || tx.txKind === 'receipt' ? 'رسید' : 'برد'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{tx.bankName}</span>
                        {tx.status === 'pending' ? (
                          <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                            <Clock className="w-3 h-3" /> معلق
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold">
                            <CheckCircle2 className="w-3 h-3" /> ثبت شده
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 font-mono" dir="ltr">
                        ****{tx.cardLast4} | پیگیری: {tx.trackingNumber}
                      </p>
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-blue-950 font-mono" dir="ltr">
                      {tx.amount.toLocaleString()} تومان
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {formatAfghanDate(tx.date)} {tx.time}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

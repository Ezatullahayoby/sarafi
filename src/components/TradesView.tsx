import React, { useState } from 'react';
import { DatabaseService } from '../services/db';
import { Customer, Trade, TradeType } from '../types';
import { GoogleExportService } from '../services/googleExport';
import { formatAfghanDate } from '../utils/afghanDate';
import {
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Search,
  Printer,
  Calendar,
  Wallet,
  Building2,
  FileSpreadsheet,
  CheckCircle,
  Clock,
  X,
  ShieldCheck,
} from 'lucide-react';

interface Props {
  onRefresh: () => void;
  onOpenReceipt: (tradeId: string) => void;
}

export const TradesView: React.FC<Props> = ({ onRefresh, onOpenReceipt }) => {
  const [showNewTradeModal, setShowNewTradeModal] = useState(false);
  const [tradeType, setTradeType] = useState<TradeType>('buy');
  const [currencyCode, setCurrencyCode] = useState('USD');
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState('');
  const [settlementCurrency, setSettlementCurrency] = useState('AFN'); // AFN, IRR_CASH, IRR_BANK, USD
  const [isCashSettled, setIsCashSettled] = useState(true);
  const [tradeApprovalMode, setTradeApprovalMode] = useState<'approved' | 'pending'>('approved');

  // Customer Selection / Fast Entry
  const [customerMode, setCustomerMode] = useState<'existing' | 'new_permanent' | 'new_transient'>('existing');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');

  const [filterType, setFilterType] = useState<'all' | 'buy' | 'sell'>('all');
  const [filterCurrency, setFilterCurrency] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const currencies = DatabaseService.getCurrencies();
  const customers = DatabaseService.getCustomers();
  const trades = DatabaseService.getTrades();

  const selectedCurr = currencies.find((c) => c.code === currencyCode) || currencies[0];

  // Auto calculate total settlement amount
  const parsedAmount = parseFloat(amount.replace(/,/g, '')) || 0;
  const parsedRate = parseFloat(rate.replace(/,/g, '')) || 0;
  let calculatedTotal = 0;
  if (selectedCurr?.isBaseRateUnit1000) {
    calculatedTotal = (parsedAmount / 1000) * parsedRate;
  } else {
    calculatedTotal = parsedAmount * parsedRate;
  }

  const handleOpenTradeModal = (type: TradeType = 'buy') => {
    setTradeType(type);
    const curr = currencies.find((c) => c.code === currencyCode) || currencies[0];
    setRate(type === 'buy' ? curr.buyRate.toString() : curr.sellRate.toString());
    setShowNewTradeModal(true);
  };

  const handleCurrencyChange = (code: string) => {
    setCurrencyCode(code);
    const curr = currencies.find((c) => c.code === code);
    if (curr) {
      setRate(tradeType === 'buy' ? curr.buyRate.toString() : curr.sellRate.toString());
    }
  };

  const handleApproveTrade = (tradeId: string) => {
    const res = DatabaseService.approveTrade(tradeId);
    if (res.success) {
      onRefresh();
    } else {
      alert(res.error || 'خطا در تأیید معامله');
    }
  };

  const handleRejectTrade = (tradeId: string) => {
    if (confirm('آیا از رد کردن این معامله معلق اطمینان دارید؟')) {
      const res = DatabaseService.rejectTrade(tradeId);
      if (res.success) {
        onRefresh();
      }
    }
  };

  const handleSubmitTrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedAmount <= 0 || parsedRate <= 0) return;

    let custId: string | undefined = undefined;
    let custName = '';
    let custPhone: string | undefined = undefined;
    let custType: Customer['type'] = 'permanent';

    if (customerMode === 'existing') {
      const c = customers.find((cust) => cust.id === selectedCustomerId);
      if (c) {
        custId = c.id;
        custName = c.name;
        custPhone = c.phone;
        custType = c.type;
      } else {
        custName = 'مشتری ناشناس';
      }
    } else {
      custName = newCustomerName.trim() || 'مشتری جدید';
      custPhone = newCustomerPhone.trim();
      custType = customerMode === 'new_transient' ? 'transient' : 'permanent';
    }

    const res = DatabaseService.executeTrade({
      type: tradeType,
      currencyCode,
      amount: parsedAmount,
      rate: parsedRate,
      settlementCurrency,
      customerId: custId,
      customerType: custType,
      customerName: custName,
      customerPhone: custPhone,
      isCashSettled,
      notes: notes.trim(),
      isApproved: tradeApprovalMode === 'approved',
    });

    if (res.success && res.trade) {
      setShowNewTradeModal(false);
      setAmount('');
      setNotes('');
      onRefresh();
      if (tradeApprovalMode === 'approved') {
        onOpenReceipt(res.trade.id);
      }
    }
  };

  const pendingTradesCount = trades.filter((t) => t.status === 'pending').length;

  // Filtered trades list
  const filteredTrades = trades.filter((t) => {
    if (filterType !== 'all' && t.type !== filterType) return false;
    if (filterCurrency !== 'all' && t.currencyCode !== filterCurrency) return false;
    if (statusFilter !== 'all' && (t.status || 'approved') !== statusFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        t.tradeNumber.toLowerCase().includes(term) ||
        t.customerName.toLowerCase().includes(term) ||
        (t.notes && t.notes.toLowerCase().includes(term))
      );
    }
    return true;
  });

  // توتل اتوماتیک معاملات
  const totalBuyAmount = filteredTrades
    .filter((t) => t.type === 'buy' && t.status !== 'rejected')
    .reduce((acc, t) => acc + t.totalSettlementAmount, 0);

  const totalSellAmount = filteredTrades
    .filter((t) => t.type === 'sell' && t.status !== 'rejected')
    .reduce((acc, t) => acc + t.totalSettlementAmount, 0);

  return (
    <div className="space-y-6">
      {/* Header & Quick Action Buttons */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs">
              معاملات و صرافی
            </span>
            <h1 className="text-xl font-black text-slate-900">خرید و فروش ارزهای بازار</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            ثبت خودکار در حسابات، تسویه نقدی یا دفتری، و سامانه تأیید نهایی مدیر
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={() => handleOpenTradeModal('buy')}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>خرید ارز (رسید به صرافی)</span>
          </button>
          <button
            onClick={() => handleOpenTradeModal('sell')}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>فروش ارز (برد از صرافی)</span>
          </button>
        </div>
      </div>

      {/* توتل اتوماتیک معاملات */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-blue-800">مجموع خریدها (رسید):</span>
            <div className="text-lg font-black text-blue-950 font-mono mt-0.5" dir="ltr">
              {totalBuyAmount.toLocaleString()}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-rose-800">مجموع فروش‌ها (برد):</span>
            <div className="text-lg font-black text-rose-950 font-mono mt-0.5" dir="ltr">
              {totalSellAmount.toLocaleString()}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-amber-800">معاملات معلق (نیاز به تأیید مدیر):</span>
            <div className="text-lg font-black text-amber-950 font-mono mt-0.5">
              {pendingTradesCount} معامله
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center flex-wrap gap-2">
          {/* نوع معامله */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-lg font-bold ${
                filterType === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              همه ({trades.length})
            </button>
            <button
              onClick={() => setFilterType('buy')}
              className={`px-3 py-1 rounded-lg font-bold ${
                filterType === 'buy' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600'
              }`}
            >
              خریدها
            </button>
            <button
              onClick={() => setFilterType('sell')}
              className={`px-3 py-1 rounded-lg font-bold ${
                filterType === 'sell' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600'
              }`}
            >
              فروش‌ها
            </button>
          </div>

          {/* فیلتر وضعیت تأیید مدیر */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] ${
                statusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              همه وضعیت‌ها
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 ${
                statusFilter === 'pending'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-amber-800 hover:bg-amber-100/50'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>معلق ({pendingTradesCount})</span>
            </button>
            <button
              onClick={() => setStatusFilter('approved')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] ${
                statusFilter === 'approved' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600'
              }`}
            >
              تأیید شده
            </button>
          </div>

          <select
            value={filterCurrency}
            onChange={(e) => setFilterCurrency(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-xl bg-white text-slate-700"
          >
            <option value="all">همه ارزها</option>
            {currencies.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            placeholder="جستجوی شماره سند، مشتری..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-3 pr-9 py-1.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Trades Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3">شماره سند</th>
                <th className="p-3">نوع معامله</th>
                <th className="p-3">ارز و مقدار</th>
                <th className="p-3">نرخ تبدیل</th>
                <th className="p-3">مبلغ کل تسویه</th>
                <th className="p-3">ارز و روش پرداخت</th>
                <th className="p-3">مشتری</th>
                <th className="p-3">تاریخ و ساعت</th>
                <th className="p-3 text-center">وضعیت و تأیید مدیر</th>
                <th className="p-3 text-center">رسید چاپی</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTrades.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    هیچ معامله‌ای یافت نشد.
                  </td>
                </tr>
              ) : (
                filteredTrades.map((t) => {
                  const isPending = t.status === 'pending';
                  const isApproved = t.status === 'approved' || !t.status;
                  const isRejected = t.status === 'rejected';

                  return (
                    <tr key={t.id} className={`hover:bg-slate-50/70 ${isPending ? 'bg-amber-50/30' : ''}`}>
                      <td className="p-3 font-mono font-bold text-slate-800">{t.tradeNumber}</td>
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-black border ${
                            t.type === 'buy'
                              ? 'bg-blue-100 text-blue-800 border-blue-200'
                              : 'bg-rose-100 text-rose-800 border-rose-200'
                          }`}
                        >
                          {t.type === 'buy' ? (
                            <ArrowDownLeft className="w-3 h-3 text-blue-700" />
                          ) : (
                            <ArrowUpRight className="w-3 h-3 text-rose-700" />
                          )}
                          {t.type === 'buy' ? 'خرید (رسید)' : 'فروش (برد)'}
                        </span>
                      </td>
                      <td className={`p-3 font-black ${t.type === 'buy' ? 'text-blue-700' : 'text-rose-700'}`}>
                        {t.amount.toLocaleString()}{' '}
                        {t.currencyCode === 'USD'
                          ? 'دالر ($)'
                          : t.currencyCode === 'PKR'
                          ? 'کلدار (₨)'
                          : t.currencyCode === 'AFN'
                          ? 'افغانی (؋)'
                          : t.currencyCode === 'IRR'
                          ? 'تومان'
                          : t.currencyCode}
                      </td>
                      <td className="p-3 font-mono text-slate-700">{t.rate}</td>
                      <td className="p-3 font-black text-slate-900 font-mono">
                        {t.totalSettlementAmount.toLocaleString()}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            t.settlementCurrency === 'IRR_BANK'
                              ? 'bg-blue-100 text-blue-800'
                              : t.settlementCurrency === 'IRR_CASH'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {t.settlementCurrency === 'IRR_BANK'
                            ? 'تومان بانکی'
                            : t.settlementCurrency === 'IRR_CASH'
                            ? 'تومان نقدی'
                            : t.settlementCurrency === 'USD'
                            ? 'دالر آمریکا'
                            : t.settlementCurrency === 'PKR'
                            ? 'کلدار پاکستان'
                            : t.settlementCurrency === 'AFN'
                            ? 'افغانی'
                            : t.settlementCurrency}
                          {t.isCashSettled ? ' (نقدی)' : ' (نسیه/حساب)'}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{t.customerName}</div>
                        <span className="text-[10px] text-slate-400">
                          {t.customerType === 'permanent' ? 'دائمی' : 'رهروی'}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600 whitespace-nowrap">
                        <div className="font-bold text-slate-800">{formatAfghanDate(t.date)}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{t.time}</div>
                      </td>

                      {/* وضعیت و تأیید نهایی مدیر */}
                      <td className="p-3 text-center whitespace-nowrap">
                        {isPending ? (
                          <div className="inline-flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 font-black text-[10px] border border-amber-300">
                              <Clock className="w-3 h-3 text-amber-700" />
                              معلق (نیاز به تأیید)
                            </span>
                            <button
                              type="button"
                              onClick={() => handleApproveTrade(t.id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] shadow-2xs transition-colors flex items-center gap-1"
                              title="تأیید نهایی توسط مدیر"
                            >
                              <CheckCircle className="w-3 h-3" />
                              <span>تأیید مدیر</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectTrade(t.id)}
                              className="p-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-[10px] transition-colors"
                              title="رد معامله"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : isApproved ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 font-bold text-[10px] border border-emerald-200">
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                            <span>تأیید شده {t.approvedBy ? `(${t.approvedBy})` : ''}</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">
                            رد شده
                          </span>
                        )}
                      </td>

                      <td className="p-3 text-center">
                        <button
                          onClick={() => onOpenReceipt(t.id)}
                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="مشاهده و چاپ رسید معامله"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: New Trade Entry Form */}
      {showNewTradeModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-black text-slate-900">
                  ثبت معامله جدید: {tradeType === 'buy' ? 'خرید ارز از مشتری' : 'فروش ارز به مشتری'}
                </h3>
              </div>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => handleOpenTradeModal('buy')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg ${
                    tradeType === 'buy' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  خرید
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenTradeModal('sell')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg ${
                    tradeType === 'sell' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  فروش
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmitTrade} className="space-y-4">
              {/* Row 1: انتخاب ارز، مقدار، نرخ */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ارز مورد معامله:</label>
                  <select
                    value={currencyCode}
                    onChange={(e) => handleCurrencyChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white font-bold"
                  >
                    {currencies.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">مقدار ارز: *</label>
                  <input
                    type="text"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="مثلا: 1,000"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    نرخ {selectedCurr?.isBaseRateUnit1000 ? '(بر اساس ۱۰۰۰ واحد)' : 'واحد'}: *
                  </label>
                  <input
                    type="text"
                    required
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    placeholder="نرخ روز"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              {/* Row 2: ارز و روش تسویه حساب */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ارز تسویه پرداخت/دریافت:</label>
                  <select
                    value={settlementCurrency}
                    onChange={(e) => setSettlementCurrency(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white font-semibold"
                  >
                    <option value="AFN">افغانی (دخل نقدی)</option>
                    <option value="IRR_CASH">تومان نقدی (دخل فیزیکی)</option>
                    <option value="IRR_BANK">تومان بانکی (حساب بانکی)</option>
                    <option value="USD">دالر آمریکا (دخل نقدی)</option>
                    <option value="PKR">کلدار پاکستان (دخل نقدی)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نحوه تسویه:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCashSettled(true)}
                      className={`py-2 text-xs font-bold rounded-xl border ${
                        isCashSettled
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      تسویه نقدی فوری
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCashSettled(false)}
                      className={`py-2 text-xs font-bold rounded-xl border ${
                        !isCashSettled
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      ثبت در حساب دفتری (نسیه)
                    </button>
                  </div>
                </div>
              </div>

              {/* Live Calculation Display Box */}
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-emerald-800 font-semibold">مبلغ کل محاسبه‌شده تسویه:</span>
                  <div className="text-xl font-black text-emerald-950 mt-0.5">
                    {calculatedTotal.toLocaleString()}{' '}
                    {settlementCurrency === 'IRR_BANK'
                      ? 'تومان بانکی'
                      : settlementCurrency === 'IRR_CASH'
                      ? 'تومان نقدی'
                      : settlementCurrency === 'USD'
                      ? 'دالر ($)'
                      : settlementCurrency === 'PKR'
                      ? 'کلدار (₨)'
                      : settlementCurrency === 'AFN'
                      ? 'افغانی (؋)'
                      : settlementCurrency}
                  </div>
                </div>
                <div className="text-left text-xs text-emerald-700">
                  {selectedCurr?.isBaseRateUnit1000 ? (
                    <span>محاسبه با فرمول: (مبلغ ÷ ۱۰۰۰) × نرخ</span>
                  ) : (
                    <span>محاسبه با فرمول: مبلغ × نرخ</span>
                  )}
                </div>
              </div>

              {/* Row 3: Customer Section (Permanent vs Transient) */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700">انتخاب یا ثبت مشتری:</label>
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setCustomerMode('existing')}
                    className={`px-3 py-1.5 rounded-lg border font-bold ${
                      customerMode === 'existing'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    مشتری موجود
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerMode('new_transient')}
                    className={`px-3 py-1.5 rounded-lg border font-bold ${
                      customerMode === 'new_transient'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    مشتری رهروی (معامله گذری)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerMode('new_permanent')}
                    className={`px-3 py-1.5 rounded-lg border font-bold ${
                      customerMode === 'new_permanent'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    افتتاح حساب دائمی جدید
                  </button>
                </div>

                {customerMode === 'existing' ? (
                  <div>
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                    >
                      <option value="">انتخاب از لیست مشتریان...</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.type === 'permanent' ? 'دائمی' : 'رهروی'}) - {c.phone || 'بدون تلفن'}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <input
                        type="text"
                        required
                        value={newCustomerName}
                        onChange={(e) => setNewCustomerName(e.target.value)}
                        placeholder="نام مشتری (الزامی)"
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={newCustomerPhone}
                        onChange={(e) => setNewCustomerPhone(e.target.value)}
                        placeholder="شماره تماس"
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">توضیحات معامله:</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="بابت تسویه، نام واسطه، یا توضیحات دیگر"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                />
              </div>

              {/* انتخاب وضعیت تأیید مدیر */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">وضعیت تأیید سند معامله:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTradeApprovalMode('approved')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition-colors ${
                      tradeApprovalMode === 'approved'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>تأیید نهایی مدیر (ثبت قطعی در حساب‌ها)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTradeApprovalMode('pending')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition-colors ${
                      tradeApprovalMode === 'pending'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>در انتظار بررسی و تأیید نهایی مدیر</span>
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewTradeModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs"
                >
                  ثبت نهایی و صدور رسید
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

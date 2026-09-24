import React, { useState } from 'react';
import { DatabaseService } from '../services/db';
import {
  Search,
  X,
  TrendingUp,
  Building2,
  Users,
  Printer,
  ArrowRight,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectCustomer: (customerId: string) => void;
  onSelectReceipt: (receiptId: string) => void;
  onSelectBank: (bankId: string) => void;
}

export const GlobalSearchModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSelectCustomer,
  onSelectReceipt,
  onSelectBank,
}) => {
  const [term, setTerm] = useState('');

  if (!isOpen) return null;

  const cleanTerm = term.trim().toLowerCase();

  // Search across customers, trades, bank transactions, and receipts
  const customers = DatabaseService.getCustomers().filter(
    (c) =>
      cleanTerm &&
      (c.name.toLowerCase().includes(cleanTerm) ||
        (c.phone && c.phone.includes(cleanTerm)) ||
        (c.notes && c.notes.toLowerCase().includes(cleanTerm)))
  );

  const bankTxs = DatabaseService.getBankTransactions().filter(
    (t) =>
      cleanTerm &&
      (t.trackingNumber.toLowerCase().includes(cleanTerm) ||
        t.cardLast4.includes(cleanTerm) ||
        t.amount.toString().includes(cleanTerm) ||
        (t.customerName && t.customerName.toLowerCase().includes(cleanTerm)))
  );

  const trades = DatabaseService.getTrades().filter(
    (t) =>
      cleanTerm &&
      (t.tradeNumber.toLowerCase().includes(cleanTerm) ||
        t.customerName.toLowerCase().includes(cleanTerm) ||
        t.amount.toString().includes(cleanTerm) ||
        t.totalSettlementAmount.toString().includes(cleanTerm))
  );

  const receipts = DatabaseService.getReceipts().filter(
    (r) =>
      cleanTerm &&
      (r.receiptNumber.toLowerCase().includes(cleanTerm) ||
        r.customerName.toLowerCase().includes(cleanTerm))
  );

  const hasResults =
    customers.length > 0 || bankTxs.length > 0 || trades.length > 0 || receipts.length > 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-start justify-center pt-20 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-200 flex items-center gap-3 bg-slate-50">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="جستجوی سریع در کل سیستم (نام مشتری، تلفن، پیگیری، ۴ رقم کارت، شماره سند، مبلغ...)"
            className="w-full bg-transparent text-sm font-semibold text-slate-900 focus:outline-none placeholder:text-slate-400"
          />
          {term && (
            <button
              onClick={() => setTerm('')}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-xs px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold"
          >
            بستن (ESC)
          </button>
        </div>

        {/* Results Body */}
        <div className="p-4 overflow-y-auto space-y-4">
          {!cleanTerm && (
            <div className="py-12 text-center text-xs text-slate-400 space-y-1">
              <p className="font-semibold text-slate-600">جستجوی جامع دیتابیس صرافی</p>
              <p>کلمه کلیدی، نام طرف حساب، شماره فیش یا مبلغ تراکنش را وارد کنید.</p>
            </div>
          )}

          {cleanTerm && !hasResults && (
            <div className="py-12 text-center text-xs text-slate-400">
              هیچ رکوردی منطبق با عبارت «{cleanTerm}» یافت نشد.
            </div>
          )}

          {/* Customers matches */}
          {customers.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-2">
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                <span>مشتریان ({customers.length})</span>
              </div>
              <div className="space-y-1.5">
                {customers.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      onSelectCustomer(c.id);
                      onClose();
                    }}
                    className="p-3 rounded-xl bg-slate-50 hover:bg-emerald-50/70 border border-slate-200/80 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900">{c.name}</div>
                      <span className="text-[10px] text-slate-400">
                        {c.phone || 'بدون تلفن'} | {c.type === 'permanent' ? 'دائمی' : 'رهروی'}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                      مشاهده حساب <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bank Transactions matches */}
          {bankTxs.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-2">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                <span>تراکنش‌های بانکی ({bankTxs.length})</span>
              </div>
              <div className="space-y-1.5">
                {bankTxs.map((tx) => (
                  <div
                    key={tx.id}
                    onClick={() => {
                      onSelectBank(tx.bankId);
                      onClose();
                    }}
                    className="p-3 rounded-xl bg-slate-50 hover:bg-blue-50/70 border border-slate-200/80 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        {tx.bankName} - {tx.amount.toLocaleString()} تومان ({tx.type === 'deposit' ? 'واریز' : 'برداشت'})
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        پیگیری: {tx.trackingNumber} | کارت: ****{tx.cardLast4} | مشتری: {tx.customerName || '---'}
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-white border border-slate-200">
                      {tx.status === 'approved' ? 'تأیید شده' : 'معلق'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trades matches */}
          {trades.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-2">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                <span>معاملات ارزی ({trades.length})</span>
              </div>
              <div className="space-y-1.5">
                {trades.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => {
                      onSelectReceipt(t.id);
                      onClose();
                    }}
                    className="p-3 rounded-xl bg-slate-50 hover:bg-emerald-50/70 border border-slate-200/80 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        {t.tradeNumber} - {t.type === 'buy' ? 'خرید' : 'فروش'} {t.amount.toLocaleString()} {t.currencyCode}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        مشتری: {t.customerName} | تسویه: {t.totalSettlementAmount.toLocaleString()} {t.settlementCurrency}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-emerald-600">مشاهده رسید</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

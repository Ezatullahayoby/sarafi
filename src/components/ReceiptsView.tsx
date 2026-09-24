import React, { useState } from 'react';
import { DatabaseService } from '../services/db';
import { Receipt } from '../types';
import { formatAfghanDate } from '../utils/afghanDate';
import { Printer, Search, Calendar, FileText, CheckCircle2, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

interface Props {
  selectedReceiptId?: string | null;
  onRefresh: () => void;
}

export const ReceiptsView: React.FC<Props> = ({ selectedReceiptId }) => {
  const receipts = DatabaseService.getReceipts();
  const settings = DatabaseService.getSettings();
  const [activeReceiptId, setActiveReceiptId] = useState<string | null>(
    selectedReceiptId || receipts[0]?.id || null
  );
  const [searchTerm, setSearchTerm] = useState('');

  const filteredReceipts = receipts.filter((r) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.receiptNumber.toLowerCase().includes(term) ||
      r.customerName.toLowerCase().includes(term) ||
      (r.customerPhone && r.customerPhone.includes(term))
    );
  });

  const activeReceipt = receipts.find((r) => r.id === activeReceiptId) || receipts[0];

  const handlePrint = () => {
    window.print();
  };

  const isReceiptKind = (r?: Receipt | null) => {
    if (!r) return true;
    if (r.txKind === 'receipt') return true;
    if (r.txKind === 'bard') return false;
    if ((r.type as string) === 'bank_deposit') return true;
    if ((r.type as string) === 'bank_withdraw') return false;
    return r.details.tradeType !== 'sell';
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs">
              رسیدها و فاکتورها
            </span>
            <h1 className="text-xl font-black text-slate-900">رسید رسمی معاملات و تراکنش‌ها</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            صدور فاکتور و رسید چاپی رسمی با تفکیک رنگی رسید (آبی) و برد (قرمز)، تاریخ شمسی افغانستان و شماره پیگیری یکتا
          </p>
        </div>

        {activeReceipt && (
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>چاپ و ذخیره PDF رسید</span>
          </button>
        )}
      </div>

      {/* Grid: List of Receipts & Printable View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Receipts List */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col h-[650px]">
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                placeholder="جستجو شماره رسید، مشتری..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-3 pr-9 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
            {filteredReceipts.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">هیچ رسیدی ثبت نشده است</div>
            ) : (
              filteredReceipts.map((r) => {
                const isSelected = activeReceipt?.id === r.id;
                const isRec = isReceiptKind(r);
                return (
                  <div
                    key={r.id}
                    onClick={() => setActiveReceiptId(r.id)}
                    className={`p-3.5 cursor-pointer transition-colors ${
                      isSelected
                        ? isRec
                          ? 'bg-blue-50/80 border-r-4 border-blue-600'
                          : 'bg-rose-50/80 border-r-4 border-rose-600'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-slate-900">{r.receiptNumber}</span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {formatAfghanDate(r.date)} {r.time}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-xs font-bold text-slate-800">{r.customerName}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-black border ${
                          isRec
                            ? 'bg-blue-100 text-blue-800 border-blue-200'
                            : 'bg-rose-100 text-rose-800 border-rose-200'
                        }`}
                      >
                        {isRec ? 'رسید (آبی)' : 'برد (قرمز)'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Printable Paper Voucher Card */}
        <div className="lg:col-span-8 bg-slate-100/70 p-4 rounded-2xl flex items-center justify-center">
          {activeReceipt ? (
            <div
              id="printable-receipt-card"
              className={`bg-white max-w-xl w-full p-8 rounded-2xl shadow-md border text-slate-800 space-y-6 print:shadow-none print:border-none print:m-0 ${
                isReceiptKind(activeReceipt) ? 'border-blue-200' : 'border-rose-200'
              }`}
            >
              {/* Receipt Header */}
              <div className="text-center pb-4 border-b-2 border-slate-900/80 space-y-1 relative">
                <div className="flex items-center justify-between">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black border ${
                      isReceiptKind(activeReceipt)
                        ? 'bg-blue-100 text-blue-800 border-blue-300'
                        : 'bg-rose-100 text-rose-800 border-rose-300'
                    }`}
                  >
                    {isReceiptKind(activeReceipt) ? 'رسید واریز (بستانکار)' : 'رسید برد (بدهکار / برداشت)'}
                  </span>
                  <span className="text-[11px] font-bold text-slate-600 font-mono">
                    تاریخ شمسی: {formatAfghanDate(activeReceipt.date)}
                  </span>
                </div>
                <h2 className="text-lg font-black text-slate-900 mt-2">{settings.exchangeName}</h2>
                <p className="text-xs text-slate-500 font-medium">سند رسمی و فاکتور حسابداری معاملات صرافی</p>
                <div className="flex items-center justify-center gap-4 text-[11px] text-slate-500 pt-1">
                  <span>آدرس: {settings.address}</span>
                  <span>تلفن: {settings.phone}</span>
                </div>
              </div>

              {/* Meta details */}
              <div className="grid grid-cols-2 text-xs gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-500">شماره رسید: </span>
                  <strong className="font-mono text-slate-900">{activeReceipt.receiptNumber}</strong>
                </div>
                <div className="text-left">
                  <span className="text-slate-500">تاریخ و ساعت: </span>
                  <strong className="font-mono text-slate-900">
                    {formatAfghanDate(activeReceipt.date)} - {activeReceipt.time}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">طرف حساب / مشتری: </span>
                  <strong className="text-slate-900">{activeReceipt.customerName}</strong>
                </div>
                <div className="text-left">
                  <span className="text-slate-500">شماره تماس: </span>
                  <strong className="font-mono text-slate-900">{activeReceipt.customerPhone || '---'}</strong>
                </div>
              </div>

              {/* Transaction breakdown table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-right">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">شرح عملیات</th>
                      <th className="p-2.5">نوع سند</th>
                      <th className="p-2.5">مقدار / مبلغ</th>
                      <th className="p-2.5">نرخ تبدیل</th>
                      <th className="p-2.5 text-left">مبلغ نهایی تسویه</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="p-3 font-medium">
                        {activeReceipt.details.tradeType
                          ? `${activeReceipt.details.tradeType === 'buy' ? 'خرید' : 'فروش'} ارز ${
                              activeReceipt.details.currencyCode
                            }`
                          : activeReceipt.details.paymentMethod || 'تراکنش بانکی'}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black ${
                            isReceiptKind(activeReceipt)
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {isReceiptKind(activeReceipt) ? 'رسید' : 'برد'}
                        </span>
                      </td>
                      <td className="p-3 font-bold font-mono">
                        {activeReceipt.details.amount?.toLocaleString() || '---'}
                      </td>
                      <td className="p-3 font-mono">{activeReceipt.details.rate || '---'}</td>
                      <td className={`p-3 font-black text-left font-mono ${
                        isReceiptKind(activeReceipt) ? 'text-blue-700' : 'text-rose-700'
                      }`}>
                        {activeReceipt.details.totalAmount
                          ? activeReceipt.details.totalAmount.toLocaleString()
                          : activeReceipt.details.amount?.toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Extra info & tracking if available */}
              {(activeReceipt.details.trackingNumber || activeReceipt.details.bankName) && (
                <div className="p-3 rounded-xl bg-blue-50 text-blue-950 text-xs flex justify-between border border-blue-100">
                  <span>بانک عامل: {activeReceipt.details.bankName}</span>
                  <span>شماره پیگیری: {activeReceipt.details.trackingNumber}</span>
                  <span>کارت: ****{activeReceipt.details.cardLast4}</span>
                </div>
              )}

              {/* Notes & Footer signature */}
              <div className="text-xs text-slate-500 pt-2 border-t border-slate-100 space-y-4">
                <p className="italic text-[11px] leading-relaxed">{settings.receiptNote}</p>

                <div className="flex items-center justify-between pt-6 px-4">
                  <div className="text-center space-y-8">
                    <span className="font-bold text-slate-700">امضا و اثر انگشت مشتری</span>
                    <div className="w-32 border-b border-dashed border-slate-400"></div>
                  </div>
                  <div className="text-center space-y-8">
                    <span className="font-bold text-slate-700">مهر و امضای مسئول صرافی</span>
                    <div className="w-32 border-b border-dashed border-slate-400"></div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-slate-400 text-xs">رسیدی انتخاب نشده است</div>
          )}
        </div>
      </div>
    </div>
  );
};

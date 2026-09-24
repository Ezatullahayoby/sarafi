import React, { useState } from 'react';
import { DatabaseService } from '../services/db';
import { GoogleExportService } from '../services/googleExport';
import {
  Scale,
  FileSpreadsheet,
  ArrowDownLeft,
  ArrowUpRight,
  HelpCircle,
  TrendingUp,
  AlertCircle,
  Target,
} from 'lucide-react';

interface Props {
  onRefresh: () => void;
}

export const BalanceView: React.FC<Props> = ({ onRefresh }) => {
  const report = DatabaseService.getCurrencyBalanceReport();
  const currencies = DatabaseService.getCurrencies();
  const [editingTargetCode, setEditingTargetCode] = useState<string | null>(null);
  const [newTargetVal, setNewTargetVal] = useState('');

  const handleExportSheets = () => {
    GoogleExportService.exportBalanceSheet();
  };

  const handleSaveTarget = (code: string) => {
    const num = parseFloat(newTargetVal.replace(/,/g, ''));
    if (!isNaN(num)) {
      const currs = DatabaseService.getCurrencies();
      const c = currs.find((item) => item.code === code);
      if (c) {
        c.targetBalance = num;
        DatabaseService.saveCurrencies(currs);
        DatabaseService.logAudit('update', 'currency', code, `تنظیم موجودی هدف بلانس برای ${c.name} به مقدار ${num.toLocaleString()}`);
        onRefresh();
      }
    }
    setEditingTargetCode(null);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs">
              مدیریت پوزیشن ارزی
            </span>
            <h1 className="text-xl font-black text-slate-900">بلانس، تراز معاملات و موجودی هدف</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            مشاهده مقدار خرید، فروش، مازاد یا کسری موجودی نسبت به هدف و راهنمای تصمیم‌گیری صراف
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportSheets}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>خروجی جدول بلانس به شیت</span>
          </button>
        </div>
      </div>

      {/* Balance Cards Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {report.map((item) => {
          const isOver = item.differenceFromTarget > 0;
          const isUnder = item.differenceFromTarget < 0;

          return (
            <div key={item.code} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-slate-900">{item.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">({item.code})</span>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                      isOver
                        ? 'bg-blue-100 text-blue-800'
                        : isUnder
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {isOver ? 'مازاد خرید' : isUnder ? 'کسری موجودی' : 'تراز دقیق'}
                  </span>
                </div>

                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">موجودی فعلی:</span>
                    <span className="font-black text-slate-900">
                      {item.currentBalance.toLocaleString()} {item.code}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">هدف بلانس صرافی:</span>
                    <div className="flex items-center gap-1">
                      {editingTargetCode === item.code ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            defaultValue={item.targetBalance}
                            onChange={(e) => setNewTargetVal(e.target.value)}
                            className="w-20 px-1 py-0.5 text-xs border border-slate-300 rounded"
                          />
                          <button
                            onClick={() => handleSaveTarget(item.code)}
                            className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded"
                          >
                            ثبت
                          </button>
                        </div>
                      ) : (
                        <span
                          onClick={() => {
                            setEditingTargetCode(item.code);
                            setNewTargetVal(item.targetBalance.toString());
                          }}
                          className="font-bold text-slate-700 cursor-pointer hover:underline"
                          title="کلیک برای تغییر هدف"
                        >
                          {item.targetBalance.toLocaleString()} ✏️
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-50">
                    <span className="text-slate-500">خرید شده:</span>
                    <span className="font-semibold text-emerald-600">+{item.totalBought.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">فروخته شده:</span>
                    <span className="font-semibold text-rose-600">-{item.totalSold.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-700 leading-relaxed">
                <span className="font-bold text-slate-900">وضعیت بلانس: </span>
                {item.actionAdvice}
              </div>
            </div>
          );
        })}
      </div>

      {/* Comprehensive Balance & Claims Table (شرط ۱۲ و ۱۴: طلب و بدهی ارزها و بلانس) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold text-slate-900">جدول جامع بلانس معاملات و طلب/بدهی به تفکیک ارزها</h3>
          </div>
          <span className="text-xs text-slate-400">به‌روزرسانی همگام با دیتابیس</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3">ارز</th>
                <th className="p-3">موجودی اولیه دخل</th>
                <th className="p-3 text-emerald-700">مجموع خرید</th>
                <th className="p-3 text-rose-700">مجموع فروش</th>
                <th className="p-3 font-bold text-slate-900">موجودی فعلی دخل</th>
                <th className="p-3 text-emerald-700">طلب صرافی از مشتریان</th>
                <th className="p-3 text-rose-700">بدهی صرافی به مشتریان</th>
                <th className="p-3">موجودی هدف</th>
                <th className="p-3">توصیه عملیاتی بلانس</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.map((row) => (
                <tr key={row.code} className="hover:bg-slate-50/70">
                  <td className="p-3 font-black text-slate-900">
                    {row.name} ({row.code})
                  </td>
                  <td className="p-3 text-slate-500 font-mono">{row.initialBalance.toLocaleString()}</td>
                  <td className="p-3 text-emerald-600 font-bold font-mono">+{row.totalBought.toLocaleString()}</td>
                  <td className="p-3 text-rose-600 font-bold font-mono">-{row.totalSold.toLocaleString()}</td>
                  <td className="p-3 font-black text-slate-900 font-mono">{row.currentBalance.toLocaleString()}</td>
                  <td className="p-3 font-bold text-emerald-600 font-mono">
                    {row.receivable > 0 ? row.receivable.toLocaleString() : '۰'}
                  </td>
                  <td className="p-3 font-bold text-rose-600 font-mono">
                    {row.payable > 0 ? row.payable.toLocaleString() : '۰'}
                  </td>
                  <td className="p-3 font-mono text-slate-700">{row.targetBalance.toLocaleString()}</td>
                  <td className="p-3">
                    <span className="text-[11px] font-medium text-slate-800">{row.actionAdvice}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  gregorianToSolar,
  solarToGregorian,
  solarStringToGregorian,
  gregorianToSolarString,
  AFGHAN_MONTHS,
  IRANIAN_MONTHS,
  toPersianDigits,
} from '../utils/afghanDate';
import { Calendar, ChevronDown } from 'lucide-react';

interface Props {
  value: string; // can be YYYY-MM-DD or YYYY/MM/DD
  onChange: (isoDate: string, solarStr: string) => void;
  label?: string;
  className?: string;
  required?: boolean;
}

export const SolarDateInput: React.FC<Props> = ({
  value,
  onChange,
  label,
  className = '',
  required = false,
}) => {
  const [solarStr, setSolarStr] = useState<string>('');
  const [showPicker, setShowPicker] = useState<boolean>(false);

  useEffect(() => {
    if (value) {
      const s = gregorianToSolarString(value);
      setSolarStr(s);
    } else {
      const todaySolar = gregorianToSolarString(new Date());
      setSolarStr(todaySolar);
    }
  }, [value]);

  const handleManualChange = (val: string) => {
    setSolarStr(val);
    if (val.length === 10 && (val.includes('/') || val.includes('-'))) {
      const iso = solarStringToGregorian(val);
      onChange(iso, val);
    }
  };

  const handleQuickSet = (daysOffset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    const iso = d.toISOString().split('T')[0];
    const sol = gregorianToSolarString(d);
    setSolarStr(sol);
    onChange(iso, sol);
    setShowPicker(false);
  };

  const currentSolar = gregorianToSolar(value || new Date());
  const [selectedYear, setSelectedYear] = useState<number>(currentSolar.year);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentSolar.month);
  const [selectedDay, setSelectedDay] = useState<number>(currentSolar.day);

  useEffect(() => {
    const s = gregorianToSolar(value || new Date());
    setSelectedYear(s.year);
    setSelectedMonth(s.month);
    setSelectedDay(s.day);
  }, [value]);

  const applyPickerSelection = (y: number, m: number, d: number) => {
    setSelectedYear(y);
    setSelectedMonth(m);
    setSelectedDay(d);
    const mm = m < 10 ? `0${m}` : `${m}`;
    const dd = d < 10 ? `0${d}` : `${d}`;
    const sol = `${y}/${mm}/${dd}`;
    const gDate = solarToGregorian(y, m, d);
    const iso = gDate.toISOString().split('T')[0];
    setSolarStr(sol);
    onChange(iso, sol);
  };

  const years = Array.from({ length: 15 }, (_, i) => currentSolar.year - 7 + i);
  const daysInMonth = selectedMonth <= 6 ? 31 : selectedMonth <= 11 ? 30 : 29;

  return (
    <div className={`relative ${className}`} dir="rtl">
      {label && (
        <label className="block text-xs font-bold text-slate-700 mb-1">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        <input
          type="text"
          value={solarStr}
          onChange={(e) => handleManualChange(e.target.value)}
          placeholder="۱۴۰۴/۰۱/۱۵"
          required={required}
          className="w-full px-3 py-2 pl-9 text-xs border border-slate-200 rounded-xl bg-white font-mono font-bold text-slate-800 text-right focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
        />
        <button
          type="button"
          onClick={() => setShowPicker(!showPicker)}
          className="absolute left-2.5 p-1 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100 transition-colors"
          title="انتخاب از تقویم شمسی"
        >
          <Calendar className="w-4 h-4" />
        </button>
      </div>

      {showPicker && (
        <div className="absolute z-50 mt-1 right-0 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-3.5 space-y-3 animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span>انتخاب تاریخ شمسی</span>
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleQuickSet(0)}
                className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              >
                امروز
              </button>
              <button
                type="button"
                onClick={() => handleQuickSet(-1)}
                className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                دیروز
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5 text-xs">
            {/* Year */}
            <div>
              <span className="text-[10px] text-slate-400 block mb-0.5">سال:</span>
              <select
                value={selectedYear}
                onChange={(e) => applyPickerSelection(Number(e.target.value), selectedMonth, selectedDay)}
                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Month */}
            <div>
              <span className="text-[10px] text-slate-400 block mb-0.5">ماه:</span>
              <select
                value={selectedMonth}
                onChange={(e) => applyPickerSelection(selectedYear, Number(e.target.value), Math.min(selectedDay, Number(e.target.value) <= 6 ? 31 : 30))}
                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none"
              >
                {AFGHAN_MONTHS.map((m, idx) => (
                  <option key={m} value={idx + 1}>
                    {idx + 1} - {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Day */}
            <div>
              <span className="text-[10px] text-slate-400 block mb-0.5">روز:</span>
              <select
                value={selectedDay}
                onChange={(e) => applyPickerSelection(selectedYear, selectedMonth, Number(e.target.value))}
                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none"
              >
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 font-medium">
              معادل: {selectedDay} {AFGHAN_MONTHS[selectedMonth - 1]} {selectedYear}
            </span>
            <button
              type="button"
              onClick={() => setShowPicker(false)}
              className="px-3 py-1 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg text-xs"
            >
              تایید
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

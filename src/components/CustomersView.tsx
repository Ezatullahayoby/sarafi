import React, { useState } from 'react';
import { DatabaseService } from '../services/db';
import { Customer, CustomerAccountEntry, CustomerBankAccount, AccountPeriod } from '../types';
import { GoogleExportService } from '../services/googleExport';
import { WhatsAppShareService } from '../services/whatsappShare';
import { formatAfghanDate, getAfghanTodayFull } from '../utils/afghanDate';
import { SolarDateInput } from './SolarDateInput';
import {
  Users,
  Search,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Printer,
  FileSpreadsheet,
  Building2,
  Wallet,
  CheckCircle,
  UserCheck,
  Calendar,
  CreditCard,
  Lock,
  History,
  Trash2,
  AlertCircle,
  Coins,
  DollarSign,
  Share2,
  Copy,
  MessageCircle,
  Check,
  X,
  Zap,
  Eye,
  Archive,
  RotateCcw,
  Clock,
  ShieldCheck,
} from 'lucide-react';

interface Props {
  initialCustomerId?: string | null;
  onSelectCustomer?: (customerId: string) => void;
  onRefresh: () => void;
}

export const CustomersView: React.FC<Props> = ({ initialCustomerId, onRefresh }) => {
  const [activeCustomerType, setActiveCustomerType] = useState<'permanent' | 'transient'>('permanent');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(initialCustomerId || null);
  const [searchTerm, setSearchTerm] = useState('');

  // Selected period filter ('active' or periodId)
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('active');

  // New Customer Form Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Direct manual debit/credit payment form inside customer account
  // Note: رسید = cash_in (واریز مشتری به ما = بستانکاری مشتری = رنگ آبی)
  // برد = cash_out (برداشت مشتری از ما = بدهکاری مشتری = رنگ قرمز)
  const [showAccountEntryModal, setShowAccountEntryModal] = useState(false);
  const [entryCategory, setEntryCategory] = useState<'receipt' | 'bard'>('receipt');
  const [entryCurrency, setEntryCurrency] = useState<'AFN' | 'IRR_CASH' | 'IRR_BANK' | 'USD' | 'PKR'>('IRR_BANK');
  const [entryAmount, setEntryAmount] = useState('');
  const [entryDesc, setEntryDesc] = useState('');
  const [entryCardLast4, setEntryCardLast4] = useState('');
  const [entryBankName, setEntryBankName] = useState('');
  const [entryBankId, setEntryBankId] = useState<string>('');
  const [entryDate, setEntryDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [entryIsApproved, setEntryIsApproved] = useState(true);

  // Add Bank Account / Card Modal
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [cardBankName, setCardBankName] = useState('');
  const [cardLast4Digits, setCardLast4Digits] = useState('');
  const [cardFullName, setCardFullName] = useState('');
  const [cardHolder, setCardHolder] = useState('');

  // Totaling (Close Period / تصفیه حساب) Modal
  const [showTotalingModal, setShowTotalingModal] = useState(false);
  const [totalingNotes, setTotalingNotes] = useState('');
  const [totalingSuccessMsg, setTotalingSuccessMsg] = useState('');
  const [carryForwardOption, setCarryForwardOption] = useState<'zero_reset' | 'carry_forward'>('zero_reset');

  // Archive & History Modal
  const [showPeriodsArchiveModal, setShowPeriodsArchiveModal] = useState(false);
  const [selectedArchivePeriod, setSelectedArchivePeriod] = useState<AccountPeriod | null>(null);

  // WhatsApp Share Modal
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareText, setShareText] = useState('');
  const [shareTargetPhone, setShareTargetPhone] = useState('');
  const [copiedShare, setCopiedShare] = useState(false);
  const [shareTitle, setShareTitle] = useState('');

  const [dateFilter, setDateFilter] = useState('');

  const banks = DatabaseService.getBanks();

  const customers = DatabaseService.getCustomers();
  const currencies = DatabaseService.getCurrencies();

  // Filter customers by search and type
  const filteredCustomers = customers.filter((c) => {
    if (c.type !== activeCustomerType) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return c.name.toLowerCase().includes(term) || (c.phone && c.phone.includes(term));
  });

  const selectedCustomer = selectedCustomerId
    ? customers.find((c) => c.id === selectedCustomerId)
    : filteredCustomers[0] || null;

  // Selected customer periods
  const customerPeriods: AccountPeriod[] = selectedCustomer
    ? DatabaseService.getAccountPeriods(selectedCustomer.id)
    : [];

  // Selected customer balances (calculated for active period)
  const balances = selectedCustomer
    ? DatabaseService.getCustomerBalances(selectedCustomer.id, {
        periodId: selectedPeriodId === 'active' ? undefined : selectedPeriodId,
        onlyActivePeriod: selectedPeriodId === 'active',
      })
    : {};

  // Account entries filtered by customer and period
  const rawEntries = selectedCustomer ? DatabaseService.getCustomerAccountEntries() : [];
  const accountEntries = rawEntries.filter((e) => {
    if (e.customerId !== selectedCustomer?.id) return false;
    if (dateFilter && e.date !== dateFilter) return false;
    if (selectedPeriodId === 'active') {
      // In active mode: show entries that belong to no period or current open period
      return !e.periodId || e.periodId === 'open';
    } else {
      return e.periodId === selectedPeriodId;
    }
  });

  // توتل اتوماتیک مجموع کل رسیدها و مجموع کل بردها
  const totalReceiptsByCur: { [cur: string]: number } = {};
  const totalBardsByCur: { [cur: string]: number } = {};

  accountEntries.forEach((e) => {
    if (e.status === 'rejected') return;
    const cur = e.currencyCode;
    if (!totalReceiptsByCur[cur]) totalReceiptsByCur[cur] = 0;
    if (!totalBardsByCur[cur]) totalBardsByCur[cur] = 0;
    if (e.credit > 0 || e.entryCategory === 'receipt') {
      totalReceiptsByCur[cur] += e.credit;
    }
    if (e.debit > 0 || e.entryCategory === 'bard') {
      totalBardsByCur[cur] += e.debit;
    }
  });

  const handleApproveEntry = (entryId: string) => {
    const res = DatabaseService.approveCustomerAccountEntry(entryId);
    if (res.success) {
      onRefresh();
    } else {
      alert(res.error || 'خطا در تأیید سند');
    }
  };

  const handleRejectEntry = (entryId: string) => {
    if (confirm('آیا از رد کردن این سند معلق اطمینان دارید؟')) {
      const res = DatabaseService.rejectCustomerAccountEntry(entryId);
      if (res.success) {
        onRefresh();
      }
    }
  };

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newCust: Customer = {
      id: 'cust_' + Date.now(),
      type: activeCustomerType,
      name: newName.trim(),
      phone: newPhone.trim(),
      address: newAddress.trim(),
      status: 'active',
      notes: newNotes.trim(),
      bankAccounts: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const all = DatabaseService.getCustomers();
    all.unshift(newCust);
    DatabaseService.saveCustomers(all);

    DatabaseService.logAudit('create', 'customer', newCust.id, `ایجاد مشتری جدید: ${newCust.name} (${newCust.type})`);

    setSelectedCustomerId(newCust.id);
    setShowAddModal(false);
    setNewName('');
    setNewPhone('');
    setNewAddress('');
    setNewNotes('');
    onRefresh();
  };

  const handleConvertToPermanent = (customer: Customer) => {
    if (confirm(`آیا مایلید مشتری رهروی «${customer.name}» با تمام سوابق قبلی به مشتری دائمی تبدیل شود؟`)) {
      DatabaseService.convertToPermanentCustomer(customer.id);
      setActiveCustomerType('permanent');
      setSelectedCustomerId(customer.id);
      onRefresh();
    }
  };

  // Add Bank Account / Card to Customer
  const handleAddCustomerBankCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    if (!cardBankName.trim() || !cardLast4Digits.trim()) {
      alert('لطفاً نام بانک و ۴ رقم آخر کارت را وارد نمایید.');
      return;
    }

    const clean4 = cardLast4Digits.replace(/\D/g, '').slice(-4);
    if (clean4.length < 4) {
      alert('لطفاً حداقل ۴ رقم آخر کارت را به طور صحیح وارد نمایید.');
      return;
    }

    DatabaseService.addCustomerBankAccount(selectedCustomer.id, {
      bankName: cardBankName.trim(),
      cardLast4: clean4,
      accountNumber: cardFullName.trim(),
      cardHolderName: cardHolder.trim() || selectedCustomer.name,
      isDefault: (selectedCustomer.bankAccounts?.length || 0) === 0,
    });

    setShowAddCardModal(false);
    setCardBankName('');
    setCardLast4Digits('');
    setCardFullName('');
    setCardHolder('');
    onRefresh();
  };

  const handleRemoveBankCard = (cardId: string) => {
    if (!selectedCustomer) return;
    if (confirm('آیا از حذف این کارت بانکی مشتری اطمینان دارید؟')) {
      DatabaseService.removeCustomerBankAccount(selectedCustomer.id, cardId);
      onRefresh();
    }
  };

  // Add Manual Account Entry (ثبت فول اتوماتیک رسید یا برد)
  const handleAddAccountEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    const num = parseFloat(entryAmount.replace(/,/g, ''));
    if (isNaN(num) || num <= 0) {
      alert('لطفاً مبلغ معتبری وارد کنید.');
      return;
    }

    const cleanCard4 = entryCardLast4.replace(/\D/g, '').slice(-4);
    const targetBankId = entryBankId || (banks.length > 0 ? banks[0].id : undefined);

    const res = DatabaseService.recordAutoTransaction({
      customerId: selectedCustomer.id,
      type: entryCategory,
      currencyCode: entryCurrency,
      amount: num,
      bankId: entryCurrency === 'IRR_BANK' ? targetBankId : undefined,
      cardLast4: cleanCard4,
      sourceCardLast4: entryCategory === 'receipt' ? cleanCard4 : undefined,
      destCardLast4: entryCategory === 'bard' ? cleanCard4 : undefined,
      description: entryDesc.trim(),
      date: entryDate,
      isApproved: entryIsApproved,
    });

    if (!res.success) {
      alert('خطا در ثبت خودکار سند: ' + res.error);
      return;
    }

    setShowAccountEntryModal(false);
    setEntryAmount('');
    setEntryDesc('');
    setEntryCardLast4('');
    setEntryBankName('');
    setEntryBankId('');
    onRefresh();

    // باز کردن فوری دیالوگ اشتراک‌گذاری در واتساپ برای همین سند جدید (در صورت تأیید)
    if (res.customerEntry && entryIsApproved) {
      const updatedBalances = DatabaseService.getCustomerBalances(selectedCustomer.id);
      const msg = WhatsAppShareService.formatCustomerEntryMessage(selectedCustomer, res.customerEntry, updatedBalances);
      setShareText(msg);
      setShareTargetPhone(selectedCustomer.phone || '');
      setShareTitle(entryCategory === 'receipt' ? 'رسید واریز وجه' : 'برد / برداشت وجه');
      setCopiedShare(false);
      setShareModalOpen(true);
    }
  };

  // اشتراک‌گذاری انفرادی هر سند (رسید یا برد) در واتساپ
  const handleShareEntryWhatsApp = (entry: CustomerAccountEntry) => {
    if (!selectedCustomer) return;
    const msg = WhatsAppShareService.formatCustomerEntryMessage(selectedCustomer, entry, balances);
    const isCredit = entry.credit > 0 || entry.entryCategory === 'receipt';
    setShareText(msg);
    setShareTargetPhone(selectedCustomer.phone || '');
    setShareTitle(isCredit ? 'رسید واریز وجه' : 'برد / برداشت وجه');
    setCopiedShare(false);
    setShareModalOpen(true);
  };

  // اشتراک‌گذاری کل بلانس و صورت‌حساب مشتری در واتساپ
  const handleShareCustomerBalanceWhatsApp = () => {
    if (!selectedCustomer) return;
    const msg = WhatsAppShareService.formatCustomerBalanceSummary(selectedCustomer, balances);
    setShareText(msg);
    setShareTargetPhone(selectedCustomer.phone || '');
    setShareTitle(`صورت‌حساب و موجودی ${selectedCustomer.name}`);
    setCopiedShare(false);
    setShareModalOpen(true);
  };

  // Totaling (تصفیه کامل، توتل و بایگانی اسناد دوره و باز کردن حساب جدید)
  const handleExecuteTotaling = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    const res = DatabaseService.closeCustomerAccountPeriod(selectedCustomer.id, {
      closingNotes: totalingNotes,
      carryForward: carryForwardOption === 'carry_forward',
    });

    if (res.success && res.period) {
      const isZero = carryForwardOption === 'zero_reset';
      setTotalingSuccessMsg(
        isZero
          ? `دوره جاری مشتری «${selectedCustomer.name}» با موفقیت تصفیه شد، تمامی اسناد با توتل در تاریخچه بایگانی گردیدند و حساب مشتری برای دوره جدید صفر و بازنشانی شد.`
          : `دوره جاری مشتری «${selectedCustomer.name}» با موفقیت تصفیه و مانده‌ها به عنوان سند افتتاحیه به دوره جدید منتقل گردیدند.`
      );
      setShowTotalingModal(false);
      setTotalingNotes('');
      setCarryForwardOption('zero_reset');
      setSelectedPeriodId('active');
      setTimeout(() => setTotalingSuccessMsg(''), 8000);
      onRefresh();
    } else {
      alert('خطا در تصفیه حساب: ' + res.error);
    }
  };

  const handlePrintCustomerStatement = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs">
              کاردکس و حساب مشتریان
            </span>
            <h1 className="text-xl font-black text-slate-900">
              {activeCustomerType === 'permanent' ? 'مشتریان دائمی' : 'مشتریان رهروی (گذری)'}
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            تفکیک کامل ارز دالر، تومان نقدی و بانکی، رسید (آبی)، برد (قرمز)، کارت‌های بانکی با ۴ رقم و تصفیه حساب (Totaling)
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Switch Customer Type */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1">
            <button
              onClick={() => {
                setActiveCustomerType('permanent');
                setSelectedCustomerId(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeCustomerType === 'permanent'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              مشتریان دائمی ({customers.filter((c) => c.type === 'permanent').length})
            </button>
            <button
              onClick={() => {
                setActiveCustomerType('transient');
                setSelectedCustomerId(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeCustomerType === 'transient'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              مشتریان رهروی ({customers.filter((c) => c.type === 'transient').length})
            </button>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت مشتری جدید</span>
          </button>
        </div>
      </div>

      {totalingSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-900 flex items-center gap-2 animate-fade-in shadow-2xs">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{totalingSuccessMsg}</span>
        </div>
      )}

      {/* Main Grid: Customer List Sidebar + Detail Statement Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Customer Directory */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col h-[740px]">
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                placeholder="جستجو نام، شماره تماس مشتری..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-3 pr-9 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
            {filteredCustomers.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">مشتری با این مشخصات یافت نشد.</div>
            ) : (
              filteredCustomers.map((cust) => {
                const isSelected = selectedCustomer?.id === cust.id;
                return (
                  <div
                    key={cust.id}
                    onClick={() => {
                      setSelectedCustomerId(cust.id);
                      setSelectedPeriodId('active');
                    }}
                    className={`p-3.5 cursor-pointer transition-colors ${
                      isSelected ? 'bg-emerald-50/70 border-r-4 border-emerald-600' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-slate-900">{cust.name}</h4>
                      <span className="text-[10px] text-slate-400">{cust.phone || 'بدون تماس'}</span>
                    </div>
                    {cust.address && <p className="text-[11px] text-slate-400 truncate mt-0.5">{cust.address}</p>}
                    
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {cust.bankAccounts && cust.bankAccounts.length > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold flex items-center gap-0.5">
                            <CreditCard className="w-2.5 h-2.5" /> {cust.bankAccounts.length} کارت
                          </span>
                        )}
                        {cust.type === 'transient' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-bold">
                            رهروی
                          </span>
                        )}
                      </div>

                      {cust.type === 'transient' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConvertToPermanent(cust);
                          }}
                          className="text-[10px] font-bold text-emerald-700 hover:underline flex items-center gap-1"
                          title="ارتقا به دائمی و حفظ تمام سوابق"
                        >
                          <UserCheck className="w-3 h-3" /> تبدیل به دائمی
                        </button>
                      )}
                    </div>

                    {/* اتومات توتل در کارت مشتری */}
                    {(() => {
                      const cb = DatabaseService.getCustomerBalances(cust.id, { onlyActivePeriod: true });
                      const prime = cb['IRR_BANK'] || cb['USD'] || cb['AFN'] || Object.values(cb)[0];
                      if (!prime) return null;
                      return (
                        <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono">
                          <span className="text-blue-700 font-bold" title="جمع کل رسیدهای مشتری">
                            رسید: {prime.totalReceipts.toLocaleString()}
                          </span>
                          <span className="text-rose-700 font-bold" title="جمع کل بردهای مشتری">
                            برد: {prime.totalBards.toLocaleString()}
                          </span>
                          <span
                            className={`font-black ${prime.balance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}
                            title="مانده حساب مشتری"
                          >
                            مانده: {prime.balance.toLocaleString()}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Customer Account Ledger */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col min-h-[740px]">
          {selectedCustomer ? (
            <div className="flex flex-col h-full space-y-4">
              {/* Customer Profile Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-slate-900">{selectedCustomer.name}</h2>
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                        selectedCustomer.type === 'permanent'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {selectedCustomer.type === 'permanent' ? 'مشتری دائمی' : 'مشتری رهروی'}
                    </span>
                    <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md font-mono">
                      تاریخ عضویت: {formatAfghanDate(selectedCustomer.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center flex-wrap gap-4 text-xs text-slate-400 mt-1">
                    <span>شماره تماس: {selectedCustomer.phone || 'ثبت نشده'}</span>
                    <span>آدرس: {selectedCustomer.address || 'ثبت نشده'}</span>
                  </div>
                </div>

                <div className="flex items-center flex-wrap gap-2">
                  {/* Totaling (تصفیه و بستن حساب) Button */}
                  <button
                    onClick={() => setShowTotalingModal(true)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 rounded-xl border border-amber-200 transition-colors shadow-2xs"
                    title="تصفیه مانده‌ها، قفل سوابق دوره و آغاز دوره حسابداری جدید"
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-700" />
                    <span>تصفیه حساب (Totaling)</span>
                  </button>

                  {/* آرشیو و تاریخچه دوره‌های تصفیه شده */}
                  <button
                    onClick={() => setShowPeriodsArchiveModal(true)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-300 transition-colors shadow-2xs"
                    title="مشاهده آرشیو و تاریخچه دوره‌های تصفیه شده مشتری به تفکیک توتل"
                  >
                    <History className="w-3.5 h-3.5 text-slate-600" />
                    <span>آرشیو دوره‌ها ({customerPeriods.length})</span>
                  </button>

                  <button
                    onClick={handleShareCustomerBalanceWhatsApp}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-300 transition-colors shadow-2xs"
                    title="اشتراک‌گذاری خلاصه موجودی‌ها و وضعیت حساب مشتری در واتساپ"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>اشتراک واتساپ</span>
                  </button>
                  <button
                    onClick={() =>
                      GoogleExportService.exportCustomerStatement(selectedCustomer.id, selectedCustomer.name)
                    }
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200 transition-colors"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>خروجی اکسل</span>
                  </button>
                  <button
                    onClick={handlePrintCustomerStatement}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>چاپ صورتحساب</span>
                  </button>
                  <button
                    onClick={() => setShowAccountEntryModal(true)}
                    className="flex items-center gap-1 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>ثبت رسید / برد</span>
                  </button>
                </div>
              </div>

              {/* Multiple Bank Accounts Strip (کارت‌های بانکی مشتری با ۴ رقم آخر) */}
              <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 text-slate-700 text-xs font-bold">
                    <CreditCard className="w-4 h-4 text-blue-600" />
                    <span>کارت‌ها و حساب‌های بانکی مشتری:</span>
                  </div>

                  {(!selectedCustomer.bankAccounts || selectedCustomer.bankAccounts.length === 0) ? (
                    <span className="text-[11px] text-slate-400">هنوز کارتی برای این مشتری ثبت نشده است.</span>
                  ) : (
                    selectedCustomer.bankAccounts.map((card) => (
                      <div
                        key={card.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-800 shadow-2xs"
                      >
                        <span className="text-blue-700">{card.bankName}</span>
                        <span className="font-mono text-slate-600" dir="ltr">
                          ****{card.cardLast4}
                        </span>
                        {card.cardHolderName && (
                          <span className="text-[10px] text-slate-400">({card.cardHolderName})</span>
                        )}
                        <button
                          onClick={() => handleRemoveBankCard(card.id)}
                          className="text-slate-300 hover:text-rose-500 mr-1"
                          title="حذف کارت"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddCardModal(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition-colors shrink-0 shadow-2xs"
                >
                  <Plus className="w-3 h-3 text-emerald-600" />
                  <span>افزودن کارت بانکی</span>
                </button>
              </div>

              {/* توتل اتوماتیک جمع کل رسیدها و جمع کل بردها */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-blue-900 block">جمع کل رسیدها (واریزها / طلبکاری مشتری):</span>
                    <div className="text-base font-black text-blue-950 font-mono mt-0.5" dir="ltr">
                      {Object.entries(totalReceiptsByCur)
                        .filter(([_, v]) => v > 0)
                        .map(([c, v]) => `${v.toLocaleString()} ${c === 'IRR_BANK' ? 'تومان' : c}`)
                        .join(' | ') || '۰'}
                    </div>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    <ArrowDownLeft className="w-5 h-5" />
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-rose-50/80 border border-rose-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-rose-900 block">جمع کل بردها (برداشت‌ها / بدهکاری مشتری):</span>
                    <div className="text-base font-black text-rose-950 font-mono mt-0.5" dir="ltr">
                      {Object.entries(totalBardsByCur)
                        .filter(([_, v]) => v > 0)
                        .map(([c, v]) => `${v.toLocaleString()} ${c === 'IRR_BANK' ? 'تومان' : c}`)
                        .join(' | ') || '۰'}
                    </div>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                    <ArrowUpRight className="w-5 h-5" />
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-700 block">وضعیت اسناد این دوره:</span>
                    <div className="text-xs font-bold text-slate-900 mt-1 flex items-center gap-2">
                      <span>تعداد اسناد: {accountEntries.length}</span>
                      {accountEntries.filter((e) => e.status === 'pending').length > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-black text-[10px] border border-amber-300">
                          {accountEntries.filter((e) => e.status === 'pending').length} سند معلق (منتظر تأیید مدیر)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                          همه اسناد قطعی و تأیید شده
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Balances Strip: تفکیک دقیق دالر، تومان نقدی، تومان بانکی، افغانی و کلدار */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {/* دالر USD */}
                <div className="p-3 rounded-xl border border-emerald-300 bg-emerald-50/40">
                  <div className="flex items-center justify-between text-emerald-800 text-[11px] font-bold">
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>موجودی دالر (USD)</span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900">
                      دالر
                    </span>
                  </div>
                  <div className="mt-1 text-sm font-black text-emerald-950 font-mono" dir="ltr">
                    {(balances['USD']?.balance || 0).toLocaleString()} $
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500">
                    {(balances['USD']?.balance || 0) >= 0 ? 'طلب مشتری از ما' : 'بدهی مشتری به ما'}
                  </span>
                </div>

                {/* کلدار پاکستان PKR */}
                <div className="p-3 rounded-xl border border-teal-300 bg-teal-50/40">
                  <div className="flex items-center justify-between text-teal-800 text-[11px] font-bold">
                    <div className="flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5" />
                      <span>موجودی کلدار (PKR)</span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-teal-100 text-teal-900">
                      کلدار
                    </span>
                  </div>
                  <div className="mt-1 text-sm font-black text-teal-950 font-mono" dir="ltr">
                    {(balances['PKR']?.balance || 0).toLocaleString()} ₨
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500">
                    {(balances['PKR']?.balance || 0) >= 0 ? 'طلب مشتری از ما' : 'بدهی مشتری به ما'}
                  </span>
                </div>

                {/* تومان بانکی IRR_BANK */}
                <div className="p-3 rounded-xl border border-blue-300 bg-blue-50/50">
                  <div className="flex items-center justify-between text-blue-800 text-[11px] font-bold">
                    <div className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>تومان بانکی</span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-100 text-blue-900">
                      بانکی
                    </span>
                  </div>
                  <div className="mt-1 text-sm font-black text-blue-950 font-mono" dir="ltr">
                    {(balances['IRR_BANK']?.balance || 0).toLocaleString()} تومان
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500">
                    {(balances['IRR_BANK']?.balance || 0) >= 0 ? 'طلب مشتری از ما' : 'بدهی مشتری به ما'}
                  </span>
                </div>

                {/* تومان نقدی IRR_CASH */}
                <div className="p-3 rounded-xl border border-amber-300 bg-amber-50/40">
                  <div className="flex items-center justify-between text-amber-800 text-[11px] font-bold">
                    <div className="flex items-center gap-1">
                      <Wallet className="w-3.5 h-3.5" />
                      <span>تومان نقدی</span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">
                      دخل نقد
                    </span>
                  </div>
                  <div className="mt-1 text-sm font-black text-amber-950 font-mono" dir="ltr">
                    {(balances['IRR_CASH']?.balance || 0).toLocaleString()} تومان
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500">
                    {(balances['IRR_CASH']?.balance || 0) >= 0 ? 'طلب مشتری از ما' : 'بدهی مشتری به ما'}
                  </span>
                </div>

                {/* افغانی AFN */}
                <div className="p-3 rounded-xl border border-slate-300 bg-slate-50">
                  <div className="flex items-center justify-between text-slate-700 text-[11px] font-bold">
                    <div className="flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5" />
                      <span>موجودی افغانی</span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 text-slate-800">
                      AFN
                    </span>
                  </div>
                  <div className="mt-1 text-sm font-black text-slate-900 font-mono" dir="ltr">
                    {(balances['AFN']?.balance || 0).toLocaleString()} ؋
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500">
                    {(balances['AFN']?.balance || 0) >= 0 ? 'طلب مشتری از ما' : 'بدهی مشتری به ما'}
                  </span>
                </div>
              </div>

              {/* Period Selector & Afghan Date Filter Strip */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 flex-wrap">
                  <History className="w-4 h-4 text-slate-500" />
                  <span className="font-bold text-slate-700">دوره حسابداری:</span>
                  <select
                    value={selectedPeriodId}
                    onChange={(e) => setSelectedPeriodId(e.target.value)}
                    className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none"
                  >
                    <option value="active">دوره جاری (فعال و باز)</option>
                    {customerPeriods.map((p) => (
                      <option key={p.id} value={p.id}>
                        دوره #{p.periodNumber} — تصفیه در {formatAfghanDate(p.endDate)}
                      </option>
                    ))}
                  </select>

                  {selectedPeriodId !== 'active' && (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded font-bold text-[10px] flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> اسناد این دوره قفل و بایگانی شده‌اند
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <SolarDateInput
                    label="فیلتر تاریخ (شمسی):"
                    value={dateFilter}
                    onChange={(iso) => setDateFilter(iso)}
                  />
                  {dateFilter && (
                    <button
                      onClick={() => setDateFilter('')}
                      className="text-rose-600 hover:underline text-[11px] font-bold mt-5"
                    >
                      حذف فیلتر
                    </button>
                  )}
                  <span className="text-slate-400 text-[11px] font-mono mr-2 mt-5">
                    تعداد سند: {accountEntries.length}
                  </span>
                </div>
              </div>

              {/* Color Coding Legend Banner */}
              <div className="flex items-center justify-between px-3 py-1.5 bg-slate-100/80 rounded-lg text-[11px]">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-600">راهنمای رنگ‌بندی اسناد:</span>
                  <span className="flex items-center gap-1 text-blue-700 font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block"></span>
                    رسیدها (واریز وجه / طلبکاری مشتری)
                  </span>
                  <span className="flex items-center gap-1 text-rose-700 font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block"></span>
                    بردها (برداشت وجه / بدهکاری مشتری)
                  </span>
                </div>
                <span className="text-slate-400 text-[10px]">تقویم شمسی افغانستان</span>
              </div>

              {/* Ledger Statement Table with Blue/Red Color Coding */}
              <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="p-3">تاریخ و زمان (افغانستان)</th>
                      <th className="p-3 text-center">نوع سند</th>
                      <th className="p-3">شرح سند / تراکنش</th>
                      <th className="p-3">۴ رقم کارت</th>
                      <th className="p-3">نوع ارز</th>
                      <th className="p-3 text-rose-700 text-left font-black">برد (بدهکار / قرمز)</th>
                      <th className="p-3 text-blue-700 text-left font-black">رسید (بستانکار / آبی)</th>
                      <th className="p-3 text-center whitespace-nowrap">وضعیت و تأیید مدیر</th>
                      <th className="p-3 text-center whitespace-nowrap">اشتراک واتساپ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {accountEntries.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-400">
                          هیچ سند مالی در این دوره برای این مشتری ثبت نشده است.
                        </td>
                      </tr>
                    ) : (
                      accountEntries.map((e) => {
                        const isReceipt = e.credit > 0 || e.entryCategory === 'receipt';
                        const isBard = e.debit > 0 || e.entryCategory === 'bard';
                        const card4 = e.sourceCardLast4 || e.destCardLast4;
                        const isPending = e.status === 'pending';
                        const isApproved = e.status === 'approved' || !e.status;
                        const isRejected = e.status === 'rejected';

                        return (
                          <tr
                            key={e.id}
                            className={`transition-colors ${
                              isPending
                                ? 'bg-amber-50/40'
                                : isReceipt
                                ? 'hover:bg-blue-50/40'
                                : isBard
                                ? 'hover:bg-rose-50/40'
                                : 'hover:bg-slate-50'
                            }`}
                          >
                            {/* Date formatted in Afghan Solar */}
                            <td className="p-3 text-slate-600 whitespace-nowrap">
                              <div className="font-bold text-slate-800">{formatAfghanDate(e.date, 'full')}</div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5" dir="ltr">
                                {e.date} {e.time}
                              </div>
                            </td>

                            {/* Badge: رسید (آبی) vs برد (قرمز) */}
                            <td className="p-3 text-center whitespace-nowrap">
                              {isReceipt ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 font-black text-[11px] border border-blue-200">
                                  <ArrowDownLeft className="w-3 h-3 text-blue-600" />
                                  رسید
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 font-black text-[11px] border border-rose-200">
                                  <ArrowUpRight className="w-3 h-3 text-rose-600" />
                                  برد
                                </span>
                              )}
                            </td>

                            <td className="p-3 font-medium text-slate-900 max-w-xs">{e.description}</td>

                            {/* Card 4 Digits */}
                            <td className="p-3 whitespace-nowrap">
                              {card4 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-[11px]" dir="ltr">
                                  ****{card4}
                                </span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>

                            {/* Currency */}
                            <td className="p-3 whitespace-nowrap">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  e.currencyCode === 'IRR_BANK'
                                    ? 'bg-blue-100 text-blue-800'
                                    : e.currencyCode === 'IRR_CASH'
                                    ? 'bg-amber-100 text-amber-800'
                                    : e.currencyCode === 'USD'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : e.currencyCode === 'PKR'
                                    ? 'bg-teal-100 text-teal-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {e.currencyCode === 'IRR_BANK'
                                  ? 'تومان بانکی'
                                  : e.currencyCode === 'IRR_CASH'
                                  ? 'تومان نقدی'
                                  : e.currencyCode === 'USD'
                                  ? 'دالر'
                                  : e.currencyCode === 'PKR'
                                  ? 'کلدار'
                                  : 'افغانی'}
                              </span>
                            </td>

                            {/* Debit / برد (قرمز) */}
                            <td className="p-3 font-black text-rose-600 font-mono text-left whitespace-nowrap" dir="ltr">
                              {e.debit > 0 ? e.debit.toLocaleString() : '-'}
                            </td>

                            {/* Credit / رسید (آبی) */}
                            <td className="p-3 font-black text-blue-600 font-mono text-left whitespace-nowrap" dir="ltr">
                              {e.credit > 0 ? e.credit.toLocaleString() : '-'}
                            </td>

                            {/* وضعیت و تأیید نهایی مدیر */}
                            <td className="p-3 text-center whitespace-nowrap">
                              {isPending ? (
                                <div className="inline-flex items-center gap-1">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 font-black text-[10px] border border-amber-300">
                                    <Clock className="w-3 h-3 text-amber-700" />
                                    معلق
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleApproveEntry(e.id)}
                                    className="px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] shadow-2xs transition-colors flex items-center gap-1"
                                    title="تأیید نهایی مدیر و قطعی شدن سند"
                                  >
                                    <CheckCircle className="w-3 h-3" />
                                    <span>تأیید</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRejectEntry(e.id)}
                                    className="p-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-[10px] transition-colors"
                                    title="رد سند"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : isApproved ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 font-bold text-[10px] border border-emerald-200">
                                  <CheckCircle className="w-3 h-3 text-emerald-600" />
                                  <span>تأیید شده {e.approvedBy ? `(${e.approvedBy})` : ''}</span>
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">
                                  رد شده
                                </span>
                              )}
                            </td>

                            {/* WhatsApp Share Button */}
                            <td className="p-3 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleShareEntryWhatsApp(e)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors shadow-2xs"
                                title="اشتراک‌گذاری این تراکنش در واتساپ به همراه مانده حساب"
                              >
                                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                                <span>ارسال فیش</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {/* تگ فوتر برای توتل اتوماتیک جدول */}
                  <tfoot className="bg-slate-50 font-black text-xs border-t-2 border-slate-300 sticky bottom-0">
                    <tr>
                      <td colSpan={5} className="p-3 text-slate-800 font-black">
                        توتل اتوماتیک اسناد دوره:
                      </td>
                      <td className="p-3 font-mono text-rose-700 text-left whitespace-nowrap font-black" dir="ltr">
                        {Object.entries(totalBardsByCur)
                          .filter(([_, v]) => v > 0)
                          .map(([c, v]) => `${v.toLocaleString()} ${c === 'IRR_BANK' ? 'تومان' : c}`)
                          .join(' | ') || '۰'}
                      </td>
                      <td className="p-3 font-mono text-blue-700 text-left whitespace-nowrap font-black" dir="ltr">
                        {Object.entries(totalReceiptsByCur)
                          .filter(([_, v]) => v > 0)
                          .map(([c, v]) => `${v.toLocaleString()} ${c === 'IRR_BANK' ? 'تومان' : c}`)
                          .join(' | ') || '۰'}
                      </td>
                      <td colSpan={2} className="p-3 text-center text-[11px] text-slate-500 font-normal">
                        محاسبه خودکار و سیستمی
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400 text-xs">
              یک مشتری را برای مشاهده صورتحساب انتخاب کنید.
            </div>
          )}
        </div>
      </div>

      {/* Modal: Add New Customer */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-black text-slate-900">
              ثبت {activeCustomerType === 'permanent' ? 'مشتری دائمی' : 'مشتری رهروی'} جدید
            </h3>
            <form onSubmit={handleCreateCustomer} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">نام و نام خانوادگی: *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="مثال: حاجی عبدالهادی"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">شماره تماس:</label>
                <input
                  type="text"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="0799..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">آدرس / موقعیت:</label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="کابل / هرات / مزار..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">توضیحات و سوابق:</label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  rows={2}
                  placeholder="توضیحات اضافی"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs"
                >
                  ایجاد حساب مشتری
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Bank Account / Card to Customer */}
      {showAddCardModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-black text-slate-900">
                افزودن کارت بانکی برای «{selectedCustomer.name}»
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              با ثبت ۴ رقم آخر کارت، در زمان رسید و برد بانکی به راحتی تراکنش با کارت مشتری تطبیق داده می‌شود.
            </p>

            <form onSubmit={handleAddCustomerBankCard} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">نام بانک: *</label>
                <input
                  type="text"
                  required
                  value={cardBankName}
                  onChange={(e) => setCardBankName(e.target.value)}
                  placeholder="مثال: بانک صادرات، ملت، ملی، سپه..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">۴ رقم آخر کارت بانکی: *</label>
                <input
                  type="text"
                  required
                  maxLength={4}
                  value={cardLast4Digits}
                  onChange={(e) => setCardLast4Digits(e.target.value.replace(/\D/g, ''))}
                  placeholder="مثال: 4321"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-mono font-bold tracking-widest text-center text-lg"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">نام صاحب کارت / حساب:</label>
                <input
                  type="text"
                  value={cardHolder}
                  onChange={(e) => setCardHolder(e.target.value)}
                  placeholder={selectedCustomer.name}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">شماره حساب / شبا (اختیاری):</label>
                <input
                  type="text"
                  value={cardFullName}
                  onChange={(e) => setCardFullName(e.target.value)}
                  placeholder="شماره حساب یا شماره کارت کامل"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-mono"
                  dir="ltr"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCardModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
                >
                  ذخیره کارت بانکی
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Direct Manual Receipt (Blue) or Bard (Red) Entry */}
      {showAccountEntryModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-black text-slate-900">
              ثبت سند حسابداری - {selectedCustomer.name}
            </h3>
            <form onSubmit={handleAddAccountEntry} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">انتخاب عملیات سند:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEntryCategory('receipt')}
                    className={`py-2.5 px-3 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1.5 ${
                      entryCategory === 'receipt'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-blue-50/50 text-blue-900 border-blue-200 hover:bg-blue-100/50'
                    }`}
                  >
                    <ArrowDownLeft className="w-4 h-4" />
                    <span>ثبت رسید (واریز - رنگ آبی)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEntryCategory('bard')}
                    className={`py-2.5 px-3 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1.5 ${
                      entryCategory === 'bard'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-rose-50/50 text-rose-900 border-rose-200 hover:bg-rose-100/50'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span>ثبت برد (برداشت - رنگ قرمز)</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  {entryCategory === 'receipt'
                    ? 'رسید: پول به حساب احمد می‌آید و تایید می‌شود (بستانکاری مشتری - رنگ آبی)'
                    : 'برد: پول از حساب احمد برداشت شده و کم می‌شود (بدهکاری مشتری - رنگ قرمز)'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">نوع ارز:</label>
                <select
                  value={entryCurrency}
                  onChange={(e) => setEntryCurrency(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white font-bold"
                >
                  <option value="IRR_BANK">تومان بانکی (حساب‌ها و کارت‌های بانکی)</option>
                  <option value="IRR_CASH">تومان نقدی (دخل فیزیکی)</option>
                  <option value="USD">دالر / USD (دخل ارزی)</option>
                  <option value="PKR">کلدار پاکستان / PKR (دخل نقدی)</option>
                  <option value="AFN">افغانی / AFN (دخل نقدی)</option>
                </select>
              </div>

              {/* If bank or customer has cards */}
              {entryCurrency === 'IRR_BANK' && (
                <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 space-y-2">
                  <label className="block text-xs font-bold text-blue-950">
                    انتخاب کارت مشتری یا وارد کردن ۴ رقم آخر:
                  </label>
                  {selectedCustomer.bankAccounts && selectedCustomer.bankAccounts.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-1.5">
                      {selectedCustomer.bankAccounts.map((card) => (
                        <button
                          key={card.id}
                          type="button"
                          onClick={() => {
                            setEntryCardLast4(card.cardLast4);
                            setEntryBankName(card.bankName);
                          }}
                          className={`px-2 py-1 rounded text-[11px] font-bold border transition-colors ${
                            entryCardLast4 === card.cardLast4
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {card.bankName} (****{card.cardLast4})
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-500 block mb-0.5">۴ رقم آخر کارت:</span>
                      <input
                        type="text"
                        maxLength={4}
                        value={entryCardLast4}
                        onChange={(e) => setEntryCardLast4(e.target.value)}
                        placeholder="مثال: 5678"
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg font-mono"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block mb-0.5">نام بانک مشتری:</span>
                      <input
                        type="text"
                        value={entryBankName}
                        onChange={(e) => setEntryBankName(e.target.value)}
                        placeholder="بانک صادرات..."
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-blue-900 font-bold block mb-1">
                      حساب بانکی صرافی (تغییر خودکار موجودی):
                    </span>
                    <select
                      value={entryBankId}
                      onChange={(e) => setEntryBankId(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-blue-300 rounded-lg bg-white font-medium"
                    >
                      <option value="">انتخاب خودکار (اولین بانک پیش‌فرض)</option>
                      {banks.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} (موجودی فعلی: {DatabaseService.calculateBankBalance(b.id).toLocaleString()} تومان)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* تاریخ سند به شمسی */}
              <SolarDateInput
                label="تاریخ ثبت سند (شمسی):"
                value={entryDate}
                onChange={(iso) => setEntryDate(iso)}
              />

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">مبلغ: *</label>
                <input
                  type="text"
                  required
                  value={entryAmount}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/,/g, '');
                    if (!isNaN(Number(raw))) {
                      setEntryAmount(raw ? Number(raw).toLocaleString() : '');
                    }
                  }}
                  placeholder="مبلغ را وارد کنید"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-mono font-bold text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">بابت / شرح سند:</label>
                <input
                  type="text"
                  value={entryDesc}
                  onChange={(e) => setEntryDesc(e.target.value)}
                  placeholder="توضیحات سند"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                />
              </div>

              {/* انتخاب وضعیت تأیید نهایی مدیر */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">وضعیت تأیید نهایی مدیر:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEntryIsApproved(true)}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition-colors ${
                      entryIsApproved
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>تأیید نهایی مدیر (ثبت قطعی در حساب و بانک/دخل)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEntryIsApproved(false)}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition-colors ${
                      !entryIsApproved
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>در انتظار بررسی و تأیید نهایی مدیر</span>
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAccountEntryModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-colors ${
                    entryCategory === 'receipt'
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  ثبت {entryCategory === 'receipt' ? 'رسید (آبی)' : 'برد (قرمز)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Totaling (تصفیه، توتل، ذخیره در آرشیو تاریخچه و بازنشانی حساب) */}
      {showTotalingModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 my-auto">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  تصفیه دوره حساب و توتل (Settlement & Archiving)
                </h3>
                <span className="text-[11px] text-slate-500 font-bold">
                  مشتری: {selectedCustomer.name} (دوره فعال فعلی #{selectedCustomer.currentPeriodNumber || 1})
                </span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1.5 text-amber-950">
              <div className="font-bold flex items-center gap-1.5 text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>محاسبه خودکار مانده و ذخیره جداگانه در آرشیو:</span>
              </div>
              <p className="leading-relaxed text-[11px]">
                تمام رسیدها و بردهای این دوره توتل شده، در آرشیو تاریخچه ذخیره می‌شوند و برای مشتری یک حساب و دوره جدید باز خواهد شد.
              </p>
            </div>

            {/* Current Balances & Totals preview to be locked */}
            <div className="space-y-2">
              <span className="text-xs font-black text-slate-700 block">
                خلاصه توتل و مانده حساب دوره جاری:
              </span>
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-right">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">نوع ارز</th>
                      <th className="p-2.5 text-blue-700">کل رسیدها (واریز)</th>
                      <th className="p-2.5 text-rose-700">کل بردها (برداشت)</th>
                      <th className="p-2.5 text-left">مانده نهایی</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      { code: 'USD', name: 'دالر (USD)', symbol: '$' },
                      { code: 'PKR', name: 'کلدار (PKR)', symbol: '₨' },
                      { code: 'IRR_BANK', name: 'تومان بانکی', symbol: 'تومان' },
                      { code: 'IRR_CASH', name: 'تومان نقدی', symbol: 'تومان' },
                      { code: 'AFN', name: 'افغانی (AFN)', symbol: '؋' },
                    ].map((curr) => {
                      const b = balances[curr.code] || { balance: 0, credit: 0, debit: 0 };
                      return (
                        <tr key={curr.code} className="hover:bg-slate-50/60">
                          <td className="p-2.5 font-bold text-slate-800">{curr.name}</td>
                          <td className="p-2.5 font-mono text-blue-700">
                            {b.credit > 0 ? b.credit.toLocaleString() : '۰'}
                          </td>
                          <td className="p-2.5 font-mono text-rose-700">
                            {b.debit > 0 ? b.debit.toLocaleString() : '۰'}
                          </td>
                          <td className="p-2.5 font-mono font-black text-left" dir="ltr">
                            <span className={b.balance > 0 ? 'text-emerald-700' : b.balance < 0 ? 'text-rose-700' : 'text-slate-500'}>
                              {b.balance.toLocaleString()} {curr.symbol}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* گزینه‌های بازنشانی دوره جدید (درخواست اصلی صراف) */}
            <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs font-black text-slate-800 block">نحوه باز شدن دوره جدید:</span>
              <label className="flex items-start gap-2.5 p-2 rounded-lg bg-white border border-emerald-300 cursor-pointer">
                <input
                  type="radio"
                  name="settleOption"
                  checked={carryForwardOption === 'zero_reset'}
                  onChange={() => setCarryForwardOption('zero_reset')}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="text-xs">
                  <span className="font-black text-emerald-950 block">
                    صفر کردن و بازنشانی کامل حساب برای دوره جدید (پیش‌فرض صراف)
                  </span>
                  <span className="text-[11px] text-slate-500 leading-relaxed block mt-0.5">
                    اسناد در تاریخچه آرشیو با توتل ذخیره می‌شوند و حساب مشتری برای دوره جدید کاملاً صفر می‌شود.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-2 rounded-lg bg-white border border-slate-200 cursor-pointer">
                <input
                  type="radio"
                  name="settleOption"
                  checked={carryForwardOption === 'carry_forward'}
                  onChange={() => setCarryForwardOption('carry_forward')}
                  className="mt-0.5 text-blue-600 focus:ring-blue-500"
                />
                <div className="text-xs">
                  <span className="font-black text-slate-900 block">
                    انتقال مانده به دوره جدید (سند افتتاحیه)
                  </span>
                  <span className="text-[11px] text-slate-500 leading-relaxed block mt-0.5">
                    مانده‌های قطعی بالا به عنوان سند افتتاحیه به حساب دوره جدید مشتری منتقل می‌گردند.
                  </span>
                </div>
              </label>
            </div>

            <form onSubmit={handleExecuteTotaling} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  توضیحات و بابت تصفیه حساب (اختیاری):
                </label>
                <input
                  type="text"
                  value={totalingNotes}
                  onChange={(e) => setTotalingNotes(e.target.value)}
                  placeholder="مثال: تسویه پایان ماه، تایید تلفنی با مشتری..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTotalingModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>تأیید تصفیه، ذخیره در آرشیو و بازنشانی حساب</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: آرشیو تاریخچه دوره‌های تصفیه شده مشتری */}
      {showPeriodsArchiveModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-auto max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center">
                  <Archive className="w-5 h-5 text-slate-700" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    آرشیو تاریخچه دوره‌های تصفیه شده
                  </h3>
                  <span className="text-[11px] text-slate-500 font-bold">
                    مشتری: {selectedCustomer.name} — کل دوره‌های تصفیه شده: {customerPeriods.length} دوره
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPeriodsArchiveModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {customerPeriods.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  تاکنون هیچ دوره‌ای برای این مشتری تصفیه نشده است. پس از تصفیه حساب، دوره‌ها با جزئیات کامل توتل در این بخش ذخیره می‌شوند.
                </div>
              ) : (
                customerPeriods.map((period) => (
                  <div
                    key={period.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors space-y-3"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-200/80">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 font-black text-xs">
                          دوره شماره #{period.periodNumber}
                        </span>
                        <span className="text-xs font-bold text-slate-700">
                          بازه دوره (شمسی): {formatAfghanDate(period.startDate)} الی {formatAfghanDate(period.endDate)}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                        {period.carryForwardOption === 'zero_reset' ? 'صفر و بازنشانی برای دوره جدید' : 'انتقال مانده'}
                      </span>
                    </div>

                    {period.closingNotes && (
                      <p className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200">
                        <span className="font-bold">توضیحات تصفیه:</span> {period.closingNotes}
                      </p>
                    )}

                    {/* جدول مانده‌ها و توتل‌های ذخیره شده دوره */}
                    <div className="overflow-x-auto bg-white rounded-lg border border-slate-200">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-100/70 text-slate-600 font-bold border-b border-slate-200">
                          <tr>
                            <th className="p-2">ارز</th>
                            <th className="p-2 text-blue-700">توتل رسیدها</th>
                            <th className="p-2 text-rose-700">توتل بردها</th>
                            <th className="p-2 text-left">مانده نهایی دوره</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {Object.entries(period.closedBalances || {}).map(([currency, bal]) => {
                            const rec = period.totalReceipts?.[currency] || 0;
                            const brd = period.totalBards?.[currency] || 0;
                            return (
                              <tr key={currency}>
                                <td className="p-2 font-bold text-slate-700">{currency}</td>
                                <td className="p-2 font-mono text-blue-700">{rec > 0 ? rec.toLocaleString() : '۰'}</td>
                                <td className="p-2 font-mono text-rose-700">{brd > 0 ? brd.toLocaleString() : '۰'}</td>
                                <td className="p-2 font-mono font-bold text-left" dir="ltr">
                                  {bal.toLocaleString()}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPeriodId(period.id);
                          setShowPeriodsArchiveModal(false);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold border border-blue-200 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>مشاهده تمام اسناد مالی این دوره</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowPeriodsArchiveModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                بستن پنجره
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: WhatsApp Share & Preview */}
      {shareModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">اشتراک‌گذاری در واتساپ</h3>
                  <p className="text-[11px] text-slate-500 font-medium">{shareTitle || 'فیش تراکنش مشتری'}</p>
                </div>
              </div>
              <button
                onClick={() => setShareModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Phone field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                شماره واتساپ گیرنده (مشتری):
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={shareTargetPhone}
                  onChange={(e) => setShareTargetPhone(e.target.value)}
                  placeholder="مثال: 0799123456 یا 93799123456 یا 09121234567"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-mono text-left bg-slate-50 focus:bg-white"
                  dir="ltr"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                می‌توانید شماره را تغییر دهید یا مستقیماً دکمه ارسال به واتساپ را بزنید.
              </p>
            </div>

            {/* Formatted Message Preview Box */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">متن پیام ارسالی:</span>
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await WhatsAppShareService.copyToClipboard(shareText);
                    if (ok) {
                      setCopiedShare(true);
                      setTimeout(() => setCopiedShare(false), 2500);
                    }
                  }}
                  className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:underline"
                >
                  {copiedShare ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>کپی شد!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>کپی متن پیام</span>
                    </>
                  )}
                </button>
              </div>

              <div
                className="bg-emerald-950/5 border border-emerald-200/80 rounded-xl p-3.5 text-xs text-slate-800 font-mono whitespace-pre-wrap max-h-60 overflow-y-auto leading-relaxed select-all"
                dir="rtl"
              >
                {shareText}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShareModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                بستن
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await WhatsAppShareService.copyToClipboard(shareText);
                    setCopiedShare(true);
                    setTimeout(() => setCopiedShare(false), 2500);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  <span>{copiedShare ? 'کپی شد' : 'کپی'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    WhatsAppShareService.openWhatsApp(shareTargetPhone, shareText);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>ارسال مستقیم به واتساپ</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

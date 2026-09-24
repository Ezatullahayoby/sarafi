import React, { useState } from 'react';
import { DatabaseService } from '../services/db';
import { Bank, BankTransaction, CustomerType } from '../types';
import { GoogleExportService } from '../services/googleExport';
import { formatAfghanDate } from '../utils/afghanDate';
import { SolarDateInput } from './SolarDateInput';
import {
  Building2,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Search,
  CreditCard,
  History,
  ShieldAlert,
  UserPlus,
  Users,
  X,
  UserCheck,
  Check,
  Receipt,
  ArrowRight,
  Upload,
  Eye,
  Camera,
  Image as ImageIcon,
  Zap,
} from 'lucide-react';

interface Props {
  onRefresh: () => void;
}

export const BanksView: React.FC<Props> = ({ onRefresh }) => {
  const banks = DatabaseService.getBanks();
  const [selectedBankId, setSelectedBankId] = useState<string>(banks[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'journal' | 'pending' | 'newTx' | 'newBank'>(
    banks.length === 0 ? 'newBank' : 'journal'
  );
  const [searchTerm, setSearchTerm] = useState('');

  // New Transaction Form State
  const [formBankId, setFormBankId] = useState<string>(banks[0]?.id || '');
  const [txType, setTxType] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState('');
  const [cardLast4, setCardLast4] = useState('');
  const [sourceCardLast4, setSourceCardLast4] = useState('');
  const [destCardLast4, setDestCardLast4] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txTime, setTxTime] = useState(new Date().toTimeString().split(' ')[0].substring(0, 5));
  const [customerId, setCustomerId] = useState('');
  const [notes, setNotes] = useState('');
  const [receiptImage, setReceiptImage] = useState<string>('');
  const [autoApprove, setAutoApprove] = useState<boolean>(true); // پیش‌فرض: اعمال فوول اتوماتیک

  // Duplicate Check Modal state
  const [duplicateWarning, setDuplicateWarning] = useState<BankTransaction | null>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Pending Approval & Customer Assignment Modal State (درخواست کاربر: انتساب یا افزودن سریع مشتری)
  const [approvingTx, setApprovingTx] = useState<BankTransaction | null>(null);
  const [selectedTargetCustomerId, setSelectedTargetCustomerId] = useState<string>('');
  const [customerSearchTerm, setCustomerSearchTerm] = useState<string>('');
  const [isAddingNewCustomer, setIsAddingNewCustomer] = useState<boolean>(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustType, setNewCustType] = useState<CustomerType>('permanent');
  const [newCustNotes, setNewCustNotes] = useState('');
  const [approvalModalError, setApprovalModalError] = useState('');
  const [modalReceiptImage, setModalReceiptImage] = useState<string>('');
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  // New Bank Form State
  const [newBankName, setNewBankName] = useState('');
  const [newAccountNumber, setNewAccountNumber] = useState('');
  const [newCardNumber, setNewCardNumber] = useState('');
  const [newInitialBalance, setNewInitialBalance] = useState('');
  const [newBankNotes, setNewBankNotes] = useState('');

  const customers = DatabaseService.getCustomers();
  const allTxs = DatabaseService.getBankTransactions();
  const selectedBank = banks.find((b) => b.id === selectedBankId) || banks[0];
  const selectedBankBalance = selectedBank ? DatabaseService.calculateBankBalance(selectedBank.id) : 0;

  // Filtered transactions
  const bankTxs = allTxs.filter((t) => {
    if (t.bankId !== selectedBank?.id) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      t.trackingNumber.toLowerCase().includes(term) ||
      t.cardLast4.includes(term) ||
      t.amount.toString().includes(term) ||
      (t.customerName && t.customerName.toLowerCase().includes(term))
    );
  });

  const pendingTxs = allTxs.filter((t) => t.status === 'pending');

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('حجم تصویر نباید بیشتر از ۵ مگابایت باشد.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setter(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCreateTransaction = (allowOverride = false) => {
    setErrorMsg('');
    setSuccessMsg('');

    const targetBank = banks.find((b) => b.id === (formBankId || selectedBankId)) || selectedBank;
    if (!targetBank) {
      setErrorMsg('هنوز هیچ حسابی تعریف نشده است. لطفاً ابتدا در تب «تعریف بانک جدید» حساب بانکی خود را اضافه کنید.');
      return;
    }

    const numAmount = parseFloat(amount.replace(/,/g, ''));
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg('لطفاً مبلغ معتبر به تومان وارد کنید.');
      return;
    }

    if (!trackingNumber.trim()) {
      setErrorMsg('شماره پیگیری تراکنش بانکی الزامی است.');
      return;
    }

    // Checking Duplicate Prevention (شرط ۸ درخواست کاربر)
    if (!allowOverride) {
      const duplicate = DatabaseService.findDuplicateBankTransaction({
        trackingNumber: trackingNumber.trim(),
        amount: numAmount,
        cardLast4: cardLast4.trim(),
        bankId: targetBank.id,
      });

      if (duplicate) {
        setDuplicateWarning(duplicate);
        return;
      }
    }

    const assignedCustomer = customers.find((c) => c.id === customerId);
    const cleanCard = (cardLast4 || (txType === 'deposit' ? sourceCardLast4 : destCardLast4) || '0000').replace(/\D/g, '').slice(-4);

    // تا وقتی اسم مشتری انتخاب نشود، تراکنش تایید نمی‌شود و حتماً در حالت تعلیق باقی می‌ماند
    if (autoApprove && assignedCustomer) {
      // ثبت تمام‌خودکار (فول اتوماتیک) همراه با تایید نهایی:
      // رسید: به حساب بانک اضافه شده و به حساب مشتری افزوده می‌شود
      // برد: از حساب بانک کسر شده و از حساب مشتری کم می‌شود
      const res = DatabaseService.recordAutoTransaction({
        customerId: assignedCustomer.id,
        type: txType === 'deposit' ? 'receipt' : 'bard',
        currencyCode: 'IRR_BANK',
        amount: numAmount,
        bankId: targetBank.id,
        cardLast4: cleanCard,
        sourceCardLast4: sourceCardLast4.trim() ? sourceCardLast4.trim().slice(-4) : cleanCard,
        destCardLast4: destCardLast4.trim() ? destCardLast4.trim().slice(-4) : cleanCard,
        trackingNumber: trackingNumber.trim(),
        description: notes.trim() || (txType === 'deposit' ? `رسید واریز به بانک ${targetBank.name}` : `برد برداشت از بانک ${targetBank.name}`),
        date: txDate,
        time: txTime,
        receiptImage: receiptImage || undefined,
        isApproved: true,
      });

      if (!res.success) {
        setErrorMsg(res.error || 'خطا در ثبت خودکار تراکنش');
        return;
      }

      setAmount('');
      setCardLast4('');
      setSourceCardLast4('');
      setDestCardLast4('');
      setTrackingNumber('');
      setNotes('');
      setCustomerId('');
      setReceiptImage('');
      setDuplicateWarning(null);
      setOverrideReason('');
      setSelectedBankId(targetBank.id);
      setSuccessMsg(
        `تراکنش ${txType === 'deposit' ? 'رسید (واریز)' : 'برد (برداشت)'} به مبلغ ${numAmount.toLocaleString()} تومان با موفقیت ثبت شد و به حساب بانک «${targetBank.name}» و حساب مشتری «${assignedCustomer.name}» اعمال گردید.`
      );
      setActiveTab('journal');
      onRefresh();
      return;
    }

    // اگر مشتری انتخاب نشده باشد یا تایید خودکار غیرفعال باشد: در حالت تعلیق قرار می‌گیرد
    const newTx: BankTransaction = {
      id: 'tx_' + Date.now(),
      bankId: targetBank.id,
      bankName: targetBank.name,
      type: txType,
      txKind: txType === 'deposit' ? 'receipt' : 'bard',
      actionEffect: txType === 'deposit' ? 'deduct_bank_add_customer' : 'add_bank_deduct_customer',
      amount: numAmount,
      cardLast4: cleanCard,
      sourceCardLast4: sourceCardLast4.trim() ? sourceCardLast4.trim().slice(-4) : (txType === 'deposit' ? cleanCard : undefined),
      destCardLast4: destCardLast4.trim() ? destCardLast4.trim().slice(-4) : (txType === 'withdraw' ? cleanCard : undefined),
      trackingNumber: trackingNumber.trim(),
      date: txDate,
      time: txTime,
      status: 'pending', // در حالت تعلیق تا انتخاب مشتری و تایید مدیر
      receiptImage: receiptImage || undefined,
      customerId: assignedCustomer?.id,
      customerName: assignedCustomer?.name,
      notes: notes.trim(),
      isDuplicateOverride: allowOverride,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const txs = DatabaseService.getBankTransactions();
    txs.unshift(newTx);
    DatabaseService.saveBankTransactions(txs);

    DatabaseService.logAudit(
      'create',
      'bank_transaction',
      newTx.id,
      `ثبت تراکنش در حالت تعلیق به مبلغ ${numAmount.toLocaleString()} تومان (در انتظار انتخاب مشتری و تأیید نهایی مدیر)`
    );

    // Reset Form
    setAmount('');
    setCardLast4('');
    setSourceCardLast4('');
    setDestCardLast4('');
    setTrackingNumber('');
    setNotes('');
    setCustomerId('');
    setReceiptImage('');
    setDuplicateWarning(null);
    setOverrideReason('');
    setSelectedBankId(targetBank.id);
    setSuccessMsg(
      !assignedCustomer
        ? `تراکنش ${txType === 'deposit' ? 'رسید' : 'برد'} ثبت شد. به دلیل عدم تعیین مشتری، تراکنش در حالت «تعلیق» قرار گرفت تا مدیر آن را به مشتری اختصاص داده و تأیید نهایی نماید.`
        : `تراکنش ${txType === 'deposit' ? 'رسید' : 'برد'} به مبلغ ${numAmount.toLocaleString()} تومان ثبت شد و در حالت تعلیق قرار گرفت.`
    );
    setActiveTab('pending');
    onRefresh();
  };

  const openApprovalModal = (tx: BankTransaction) => {
    setApprovingTx(tx);
    setSelectedTargetCustomerId(tx.customerId || '');
    setCustomerSearchTerm('');
    setIsAddingNewCustomer(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustType('permanent');
    setNewCustNotes('');
    setApprovalModalError('');
    setModalReceiptImage(tx.receiptImage || '');
  };

  const handleCreateCustomerInModal = () => {
    if (!newCustName.trim()) {
      setApprovalModalError('نام و نام خانوادگی مشتری الزامی است.');
      return null;
    }
    const created = DatabaseService.addCustomer({
      name: newCustName.trim(),
      phone: newCustPhone.trim() || undefined,
      type: newCustType,
      notes: newCustNotes.trim() || `ایجاد در زمان تأیید فیش بانکی ${approvingTx?.trackingNumber || ''}`,
    });
    setSelectedTargetCustomerId(created.id);
    setIsAddingNewCustomer(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustNotes('');
    setApprovalModalError('');
    return created;
  };

  const handleConfirmApproval = () => {
    if (!approvingTx) return;
    setApprovalModalError('');

    let finalCustId = selectedTargetCustomerId;

    // اگر کاربر در حال پر کردن فرم مشتری جدید بود، ابتدا مشتری را ذخیره می‌کنیم
    if (isAddingNewCustomer && newCustName.trim()) {
      const created = handleCreateCustomerInModal();
      if (!created) return;
      finalCustId = created.id;
    }

    if (!finalCustId) {
      setApprovalModalError('لطفاً مشخص فرمایید این مبلغ به حساب کدام مشتری انتقال داده شود.');
      return;
    }

    const result = DatabaseService.approveBankTransaction(approvingTx.id, finalCustId, {
      actionEffect: approvingTx.actionEffect || 'deduct_bank_add_customer',
      receiptImage: modalReceiptImage || approvingTx.receiptImage,
    });
    if (result.success) {
      setSuccessMsg(
        `فیش بانکی تأیید شد: مبلغ ${approvingTx.amount.toLocaleString()} تومان از موجودی بانک «${
          approvingTx.bankName
        }» کسر گردید و مستقیماً به حساب «${result.customerName || 'مشتری'}» افزوده شد.`
      );
      setApprovingTx(null);
      onRefresh();
    } else {
      setApprovalModalError(result.error || 'خطا در تایید تراکنش');
    }
  };

  const handleRejectTransaction = (txId: string) => {
    const reason = window.prompt('لطفاً علت رد تراکنش معلق را وارد کنید (اختیاری):');
    if (reason === null) return;
    const res = DatabaseService.rejectBankTransaction(txId, reason || undefined);
    if (res.success) {
      setSuccessMsg('تراکنش معلق رد و بایگانی شد.');
      onRefresh();
    } else {
      setErrorMsg(res.error || 'خطا در رد تراکنش');
    }
  };

  const handleCreateBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBankName.trim()) {
      setErrorMsg('نام بانک الزامی است');
      return;
    }
    const initBal = parseFloat(newInitialBalance.replace(/,/g, '')) || 0;
    const newBank: Bank = {
      id: 'bnk_' + Date.now(),
      name: newBankName.trim(),
      accountNumber: newAccountNumber.trim(),
      cardNumber: newCardNumber.trim(),
      initialBalance: initBal,
      notes: newBankNotes.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [...banks, newBank];
    DatabaseService.saveBanks(updated);
    DatabaseService.logAudit('create', 'bank', newBank.id, `ایجاد حساب جدید برای ${newBank.name} با موجودی اولیه ${initBal.toLocaleString()} تومان`);

    setSelectedBankId(newBank.id);
    setActiveTab('journal');
    setNewBankName('');
    setNewAccountNumber('');
    setNewCardNumber('');
    setNewInitialBalance('');
    setNewBankNotes('');
    setSuccessMsg(`بانک ${newBank.name} با موفقیت افزوده شد.`);
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Bank Selector */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 font-black text-xs">
              تومان بانکی
            </span>
            <h1 className="text-xl font-black text-slate-900">دفاتر و روزنامچه‌های بانکی صرافی</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            مدیریت اختصاصی موجودی تومان در حساب‌های بانکی، ثبت مستقیم تراکنش، جلوگیری از ثبت تکراری و تاییدیه رسید
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={() => GoogleExportService.exportBankJournal(selectedBank?.name || 'دفتر بانک‌ها')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>خروجی روزنامچه این بانک</span>
          </button>
          <button
            onClick={() => setActiveTab('newBank')}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>تعریف بانک جدید</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Empty State when no banks exist */}
      {banks.length === 0 && (
        <div className="p-8 bg-blue-50/60 border border-blue-200 rounded-2xl text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center mx-auto">
            <Building2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-black text-slate-800">هیچ حساب بانکی هنوز ثبت نشده است</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            دیتابیس کاملاً خالی است. برای شروع، نام بانک و مشخصات اولین حساب خود را اضافه کنید.
          </p>
          <button
            type="button"
            onClick={() => setActiveTab('newBank')}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>افزودن اولین حساب بانکی</span>
          </button>
        </div>
      )}

      {/* Bank Tabs Selector Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {banks.map((bank) => {
          const bal = DatabaseService.calculateBankBalance(bank.id);
          const isSelected = bank.id === selectedBank?.id;
          return (
            <div
              key={bank.id}
              onClick={() => {
                setSelectedBankId(bank.id);
                if (activeTab === 'newBank') setActiveTab('journal');
              }}
              className={`cursor-pointer p-4 rounded-2xl border transition-all ${
                isSelected
                  ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-500/20 shadow-xs'
                  : 'bg-white border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                      isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900">{bank.name}</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">حساب: {bank.accountNumber || '---'}</p>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 flex items-baseline justify-between">
                <span className="text-[10px] text-slate-500">موجودی دفتر:</span>
                <span className="text-sm font-black text-blue-900">
                  {bal.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">تومان</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Duplicate Transaction Warning Modal (شرط ۸) */}
      {duplicateWarning && (
        <div className="p-5 bg-rose-50 border-2 border-rose-400 rounded-2xl space-y-4">
          <div className="flex items-start gap-3 text-rose-900">
            <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-black">هشدار امنیتی: این تراکنش بانکی قبلاً در سیستم ثبت شده است!</h4>
              <p className="text-xs text-rose-800 mt-1">
                اطلاعات ثبت شده مشابه یک تراکنش قبلی در دیتابیس است. برای جلوگیری از کلاهبرداری یا ثبت مجدد فیش، تراکنش مسدود شد:
              </p>
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-rose-200 text-xs space-y-1.5 text-slate-700">
            <div>
              <strong>شماره پیگیری:</strong> {duplicateWarning.trackingNumber} | <strong>مبلغ:</strong>{' '}
              {duplicateWarning.amount.toLocaleString()} تومان | <strong>۴ رقم کارت:</strong>{' '}
              {duplicateWarning.cardLast4}
            </div>
            <div>
              <strong>بانک:</strong> {duplicateWarning.bankName} | <strong>تاریخ ثبت:</strong> {duplicateWarning.date} ساعت{' '}
              {duplicateWarning.time}
            </div>
            <div>
              <strong>اختصاص یافته به مشتری:</strong> {duplicateWarning.customerName || 'نامشخص'} |{' '}
              <strong>وضعیت:</strong> {duplicateWarning.status === 'approved' ? 'تأیید شده' : 'معلق'}
            </div>
          </div>

          <div className="pt-2 border-t border-rose-200">
            <label className="block text-xs font-bold text-rose-950 mb-1">
              اگر به عنوان مدیر قصد ثبت استثنا دارید، علت را حتماً وارد کنید:
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="مثال: رسید مجدد با هماهنگی صراف تایید گردید..."
                className="flex-1 px-3 py-2 text-xs border border-rose-300 rounded-xl bg-white"
              />
              <button
                type="button"
                onClick={() => handleCreateTransaction(true)}
                disabled={!overrideReason.trim()}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl whitespace-nowrap"
              >
                ثبت اجباری با دسترسی مدیر
              </button>
              <button
                type="button"
                onClick={() => setDuplicateWarning(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl"
              >
                انصراف و لغو
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Sub-Navigation inside Selected Bank */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('journal')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-colors ${
              activeTab === 'journal'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            روزنامچه {selectedBank?.name || 'بانک'} ({bankTxs.length})
          </button>
          <button
            onClick={() => setActiveTab('newTx')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-colors ${
              activeTab === 'newTx'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ثبت تراکنش در همین صفحه</span>
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-colors ${
              activeTab === 'pending'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>تراکنش‌های معلق ({pendingTxs.length})</span>
          </button>
        </div>

        {activeTab === 'journal' && (
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              placeholder="جستجو پیگیری، کارت، مبلغ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-3 pr-9 py-1.5 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
      </div>

      {/* TAB CONTENT: NEW TRANSACTION INLINE (انتخاب بانک و ثبت در حالت تعلیق) */}
      {activeTab === 'newTx' && (
        <div className="bg-white p-5 rounded-2xl border border-blue-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">
                ثبت تراکنش بانکی جدید
              </h3>
            </div>
            <span className="text-xs text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 font-medium">
              تراکنش در بانک مشخص‌شده ذخیره و تا زمان بررسی عکس فیش در «حالت تعلیق» می‌ماند
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* انتخاب بانک مقصد تراکنش (درخواست صریح کاربر) */}
            <div className="sm:col-span-2 lg:col-span-4 p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="block text-xs font-black text-blue-950">
                  این تراکنش را می‌خواهید به کدام بانک اضافه کنید؟ <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-blue-700 font-semibold">
                  بانک مورد نظر را جهت انتساب تراکنش انتخاب نمایید
                </span>
              </div>
              <select
                value={formBankId || selectedBank?.id || ''}
                onChange={(e) => {
                  setFormBankId(e.target.value);
                  setSelectedBankId(e.target.value);
                }}
                className="w-full px-3 py-2.5 bg-white border border-blue-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 shadow-2xs"
              >
                {banks.map((b) => {
                  const bal = DatabaseService.calculateBankBalance(b.id);
                  return (
                    <option key={b.id} value={b.id}>
                      {b.name} — کارت: {b.cardNumber || b.accountNumber || 'بدون کارت'} (موجودی فعلی: {bal.toLocaleString()} تومان)
                    </option>
                  );
                })}
              </select>
            </div>

            {/* نوع تراکنش: رسید (آبی) یا برد (قرمز) */}
            <div className="sm:col-span-2 lg:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">نوع عملیات بانکی:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTxType('deposit')}
                  className={`py-2.5 px-3 text-xs font-black rounded-xl border flex items-center justify-center gap-2 transition-all shadow-xs ${
                    txType === 'deposit'
                      ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-400'
                      : 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
                  }`}
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  <span>ثبت تراکنش رسید (واریز - رنگ آبی)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTxType('withdraw')}
                  className={`py-2.5 px-3 text-xs font-black rounded-xl border flex items-center justify-center gap-2 transition-all shadow-xs ${
                    txType === 'withdraw'
                      ? 'bg-rose-600 text-white border-rose-600 ring-2 ring-rose-400'
                      : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>ثبت تراکنش برد (برداشت - رنگ قرمز)</span>
                </button>
              </div>
            </div>

            {/* مبلغ به تومان */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                مبلغ به تومان بانکی: <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="مثال: 15,000,000"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold"
              />
            </div>

            {/* شماره پیگیری */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                شماره پیگیری فیش: <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="کد پیگیری تراکنش"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            {/* ۴ رقم کارت مبدأ و مقصد */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">۴ رقم آخر کارت مبدأ:</label>
              <input
                type="text"
                maxLength={4}
                value={sourceCardLast4}
                onChange={(e) => {
                  setSourceCardLast4(e.target.value);
                  if (txType === 'deposit') setCardLast4(e.target.value);
                }}
                placeholder="مثلا: 4321"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono text-center"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">۴ رقم آخر کارت مقصد:</label>
              <input
                type="text"
                maxLength={4}
                value={destCardLast4}
                onChange={(e) => {
                  setDestCardLast4(e.target.value);
                  if (txType === 'withdraw') setCardLast4(e.target.value);
                }}
                placeholder="مثلا: 8876"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono text-center"
              />
            </div>

            {/* تاریخ و ساعت */}
            <div>
              <SolarDateInput
                label="تاریخ تراکنش (شمسی):"
                value={txDate}
                onChange={(iso) => setTxDate(iso)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ساعت تراکنش:</label>
              <input
                type="time"
                value={txTime}
                onChange={(e) => setTxTime(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
              />
            </div>

            {/* اختصاص به مشتری */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">انتساب به مشتری (اختیاری):</label>
              <select
                value={customerId}
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomerId(val);
                  const cust = customers.find((c) => c.id === val);
                  if (cust?.bankAccounts && cust.bankAccounts.length > 0) {
                    const primary = cust.bankAccounts.find((a) => a.isPrimary) || cust.bankAccounts[0];
                    if (primary) {
                      const last4 = primary.cardLast4 || primary.cardNumber?.slice(-4) || '';
                      if (txType === 'deposit') {
                        setSourceCardLast4(last4);
                        setCardLast4(last4);
                      } else {
                        setDestCardLast4(last4);
                        setCardLast4(last4);
                      }
                    }
                  }
                }}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
              >
                <option value="">انتخاب مشتری یا ثبت بعد از ارائه عکس رسید...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.type === 'permanent' ? 'دائمی' : 'رهروی'})
                  </option>
                ))}
              </select>

              {/* کارت‌های ثبت شده مشتری انتخاب شده */}
              {customerId && (() => {
                const c = customers.find((x) => x.id === customerId);
                if (c && c.bankAccounts && c.bankAccounts.length > 0) {
                  return (
                    <div className="mt-2 p-2 bg-blue-50/70 border border-blue-200 rounded-xl">
                      <span className="text-[11px] font-bold text-blue-900 block mb-1">
                        کارت‌های بانکی ثبت‌شده «{c.name}» (برای پر شدن خودکار کلیک کنید):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {c.bankAccounts.map((acc) => {
                          const last4 = acc.cardLast4 || acc.cardNumber?.slice(-4) || '---';
                          return (
                            <button
                              key={acc.id}
                              type="button"
                              onClick={() => {
                                if (txType === 'deposit') {
                                  setSourceCardLast4(last4);
                                  setCardLast4(last4);
                                } else {
                                  setDestCardLast4(last4);
                                  setCardLast4(last4);
                                }
                              }}
                              className="px-2.5 py-1 bg-white hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-xs font-mono font-bold flex items-center gap-1 shadow-2xs transition-colors"
                            >
                              <CreditCard className="w-3 h-3 text-blue-600" />
                              <span>{acc.bankName}: ****{last4}</span>
                              {acc.isPrimary && <span className="text-[9px] bg-blue-600 text-white px-1 rounded">اصلی</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            {/* توضیحات */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">توضیحات / بابت:</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="توضیحات تراکنش"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
              />
            </div>

            {/* بارگذاری عکس فیش / رسید تراکنش بانکی */}
            <div className="sm:col-span-2 lg:col-span-4 p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                عکس یا اسکرین‌شات تراکنش (ارائه شده توسط مشتری):
              </label>
              <div className="flex items-center gap-3 flex-wrap">
                <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition-colors shadow-2xs">
                  <Upload className="w-4 h-4 text-blue-600" />
                  <span>{receiptImage ? 'تغییر عکس فیش' : 'بارگذاری عکس فیش / رسید'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageFileChange(e, setReceiptImage)}
                  />
                </label>
                {receiptImage && (
                  <div className="flex items-center gap-2 p-1.5 bg-white border border-slate-200 rounded-lg">
                    <img
                      src={receiptImage}
                      alt="فیش پیوست شده"
                      className="w-10 h-10 object-cover rounded-md border border-slate-300 cursor-pointer hover:opacity-90"
                      onClick={() => setViewingImage(receiptImage)}
                    />
                    <button
                      type="button"
                      onClick={() => setViewingImage(receiptImage)}
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-bold"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      مشاهده عکس
                    </button>
                    <button
                      type="button"
                      onClick={() => setReceiptImage('')}
                      className="text-xs text-rose-600 hover:underline flex items-center gap-1 font-bold mr-2"
                    >
                      <X className="w-3.5 h-3.5" />
                      حذف عکس
                    </button>
                  </div>
                )}
                {!receiptImage && (
                  <span className="text-[11px] text-slate-500">
                    اگر مشتری عکس فیش را بعداً نشان داد، در زمان بررسی فیش در بخش «تراکنش‌های معلق» نیز می‌توانید آن را بررسی یا بارگذاری کنید.
                  </span>
                )}
              </div>
            </div>

            {/* تنظیمات اتوماسیون حساب‌ها (درخواست صریح صراف: فول اتومات) */}
            <div className="sm:col-span-2 lg:col-span-4 p-4 bg-emerald-50/90 border border-emerald-300 rounded-xl space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoApprove}
                    onChange={(e) => setAutoApprove(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded border-emerald-300 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-emerald-600" />
                    <span>ثبت فوری و تمام‌خودکار در حساب بانک و مشتری (فوول اتومات)</span>
                  </span>
                </label>
                <span className="text-[11px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-lg border border-emerald-200">
                  {autoApprove ? 'سیستم خودکار فعال' : 'ثبت به صورت معلق'}
                </span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                {autoApprove
                  ? 'با ثبت تراکنش: اگر رسید باشد مستقیماً به موجودی بانک افزوده و حساب مشتری بستانکار می‌شود. اگر برد باشد از موجودی بانک کسر و حساب مشتری بدهکار می‌شود.'
                  : 'تراکنش به عنوان معلق ذخیره می‌شود تا بعداً در تب «تراکنش‌های معلق» بررسی و تایید گردد.'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setActiveTab('journal')}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              انصراف
            </button>
            <button
              type="button"
              onClick={() => handleCreateTransaction(false)}
              className={`flex items-center gap-1.5 px-5 py-2 text-xs font-black text-white rounded-xl shadow-xs transition-colors ${
                autoApprove
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {autoApprove ? <Zap className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
              <span>{autoApprove ? 'ثبت تمام‌خودکار (اعمال آنی در حساب‌ها)' : 'ثبت تراکنش در حالت تعلیق'}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB CONTENT: NEW BANK FORM */}
      {activeTab === 'newBank' && (
        <form onSubmit={handleCreateBank} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Building2 className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">تعریف حساب بانکی جدید</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">نام بانک: *</label>
              <input
                type="text"
                required
                value={newBankName}
                onChange={(e) => setNewBankName(e.target.value)}
                placeholder="مثلا: بانک تجارت"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">شماره حساب:</label>
              <input
                type="text"
                value={newAccountNumber}
                onChange={(e) => setNewAccountNumber(e.target.value)}
                placeholder="شماره حساب بانکی"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">شماره کارت ۱۶ رقمی:</label>
              <input
                type="text"
                value={newCardNumber}
                onChange={(e) => setNewCardNumber(e.target.value)}
                placeholder="شماره کارت"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">موجودی اولیه (تومان):</label>
              <input
                type="number"
                value={newInitialBalance}
                onChange={(e) => setNewInitialBalance(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">توضیحات و یادداشت:</label>
            <input
              type="text"
              value={newBankNotes}
              onChange={(e) => setNewBankNotes(e.target.value)}
              placeholder="توضیحات حساب"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setActiveTab('journal')}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
            >
              ذخیره بانک
            </button>
          </div>
        </form>
      )}

      {/* TAB CONTENT: PENDING TRANSACTIONS (شرط ۷: تایید پس از رسید مشتری و انتساب به حساب) */}
      {activeTab === 'pending' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 bg-amber-50/70 border-b border-amber-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-700" />
              <h3 className="text-xs font-bold text-amber-900">
                تراکنش‌های بانکی در انتظار تأیید و بررسی رسید مشتری
              </h3>
            </div>
            <span className="text-[11px] text-amber-800 font-semibold">
              تعداد معلق: {pendingTxs.length} مورد
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">بانک</th>
                  <th className="p-3">نوع</th>
                  <th className="p-3">مبلغ (تومان بانکی)</th>
                  <th className="p-3">عکس فیش / رسید</th>
                  <th className="p-3">شماره پیگیری</th>
                  <th className="p-3">۴ رقم کارت</th>
                  <th className="p-3">تاریخ و ساعت</th>
                  <th className="p-3">مشتری انتسابی</th>
                  <th className="p-3 text-center">عملیات بررسی و تایید</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingTxs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400">
                      هیچ تراکنش معلقی وجود ندارد؛ تمام فیش‌ها بررسی و تأیید شده‌اند.
                    </td>
                  </tr>
                ) : (
                  pendingTxs.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/70">
                      <td className="p-3 font-bold text-slate-800">{tx.bankName}</td>
                      <td className="p-3">
                        {tx.type === 'deposit' || tx.txKind === 'receipt' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-200">
                            رسید (واریز)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200">
                            برد (برداشت)
                          </span>
                        )}
                      </td>
                      <td className={`p-3 font-black ${tx.type === 'deposit' || tx.txKind === 'receipt' ? 'text-blue-700' : 'text-rose-700'}`}>
                        {tx.amount.toLocaleString()} تومان
                      </td>
                      <td className="p-3">
                        {tx.receiptImage ? (
                          <button
                            type="button"
                            onClick={() => setViewingImage(tx.receiptImage!)}
                            className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-100 hover:bg-blue-50 border border-slate-300 rounded-lg group transition-colors"
                            title="مشاهده عکس رسید تراکنش"
                          >
                            <img
                              src={tx.receiptImage}
                              alt="فیش"
                              className="w-6 h-6 object-cover rounded border border-slate-300"
                            />
                            <span className="text-[11px] font-bold text-blue-700 group-hover:underline flex items-center gap-0.5">
                              <Eye className="w-3 h-3" />
                              عکس فیش
                            </span>
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                            <Camera className="w-3 h-3" />
                            بدون عکس
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-mono text-slate-700">{tx.trackingNumber}</td>
                      <td className="p-3 font-mono">
                        {tx.sourceCardLast4 || tx.destCardLast4 ? (
                          <div className="text-[11px]">
                            {tx.sourceCardLast4 && <span className="text-slate-500">مبدأ: ****{tx.sourceCardLast4} </span>}
                            {tx.destCardLast4 && <span className="text-slate-700">مقصد: ****{tx.destCardLast4}</span>}
                          </div>
                        ) : (
                          <span>****{tx.cardLast4}</span>
                        )}
                      </td>
                      <td className="p-3 text-slate-600 whitespace-nowrap">
                        <div className="font-bold text-slate-800">{formatAfghanDate(tx.date)}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{tx.time}</div>
                      </td>
                      <td className="p-3">
                        {tx.customerName ? (
                          <div className="flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span className="font-bold text-slate-800">{tx.customerName}</span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" /> نیازمند انتخاب مشتری
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openApprovalModal(tx)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>بررسی و تایید</span>
                          </button>
                          <button
                            type="button"
                            title="رد تراکنش معلق"
                            onClick={() => handleRejectTransaction(tx.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: JOURNAL LEDGER OF SELECTED BANK (شرط ۶ و ۹) */}
      {activeTab === 'journal' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold text-slate-900">
                روزنامچه و ریز تراکنش‌های {selectedBank?.name}
              </h3>
            </div>
            <div className="text-xs text-slate-500">
              موجودی لحظه‌ای: <strong className="text-blue-900">{selectedBankBalance.toLocaleString()} تومان</strong>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">نوع</th>
                  <th className="p-3">مبلغ (تومان بانکی)</th>
                  <th className="p-3">۴ رقم کارت</th>
                  <th className="p-3">شماره پیگیری</th>
                  <th className="p-3">تاریخ و ساعت</th>
                  <th className="p-3">مشتری</th>
                  <th className="p-3">وضعیت</th>
                  <th className="p-3">توضیحات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bankTxs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      هیچ تراکنشی برای این بانک ثبت نشده است.
                    </td>
                  </tr>
                ) : (
                  bankTxs.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/70">
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black ${
                            tx.type === 'deposit' || tx.txKind === 'receipt'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {tx.type === 'deposit' || tx.txKind === 'receipt' ? (
                            <ArrowDownLeft className="w-3 h-3 text-blue-700" />
                          ) : (
                            <ArrowUpRight className="w-3 h-3 text-rose-700" />
                          )}
                          {tx.type === 'deposit' || tx.txKind === 'receipt' ? 'رسید (واریز)' : 'برد (برداشت)'}
                        </span>
                      </td>
                      <td className={`p-3 font-black ${tx.type === 'deposit' || tx.txKind === 'receipt' ? 'text-blue-700' : 'text-rose-700'}`}>
                        {tx.amount.toLocaleString()} تومان
                      </td>
                      <td className="p-3 font-mono">
                        {tx.sourceCardLast4 || tx.destCardLast4 ? (
                          <div className="text-[11px]">
                            {tx.sourceCardLast4 && <span className="text-slate-500">مبدأ: ****{tx.sourceCardLast4} </span>}
                            {tx.destCardLast4 && <span className="text-slate-700">مقصد: ****{tx.destCardLast4}</span>}
                          </div>
                        ) : (
                          <span>****{tx.cardLast4}</span>
                        )}
                      </td>
                      <td className="p-3 font-mono text-slate-600">{tx.trackingNumber}</td>
                      <td className="p-3 text-slate-600 whitespace-nowrap">
                        <div className="font-bold text-slate-800">{formatAfghanDate(tx.date)}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{tx.time}</div>
                      </td>
                      <td className="p-3 font-medium text-slate-800">
                        {tx.customerName || <span className="text-slate-400 text-[10px]">بدون مشتری</span>}
                      </td>
                      <td className="p-3">
                        {tx.status === 'approved' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold">
                            <CheckCircle2 className="w-3 h-3" /> تأیید شده
                          </span>
                        ) : tx.status === 'rejected' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">
                            <X className="w-3 h-3" /> رد شده
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openApprovalModal(tx)}
                            className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold border border-amber-300 transition-colors"
                            title="تعیین مشتری و تایید نهایی"
                          >
                            <Clock className="w-3 h-3" /> معلق (تأیید و انتقال)
                          </button>
                        )}
                      </td>
                      <td className="p-3 text-slate-500 max-w-xs truncate">{tx.notes || '---'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: تأیید و انتقال مبلغ به حساب مشتری (بر اساس درخواست کاربر) */}
      {approvingTx && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">تأیید تراکنش و انتقال به حساب مشتری</h3>
                  <p className="text-[11px] text-blue-200 mt-0.5">
                    شماره پیگیری فیش: <span className="font-mono">{approvingTx.trackingNumber}</span> | {approvingTx.bankName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setApprovingTx(null)}
                className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* خلاصه تراکنش بانکی */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                        approvingTx.type === 'deposit' || approvingTx.txKind === 'receipt'
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}
                    >
                      {approvingTx.type === 'deposit' || approvingTx.txKind === 'receipt'
                        ? 'تراکنش رسید (واریز به حساب - بستانکار مشتری)'
                        : 'تراکنش برد (برداشت از حساب - بدهکار مشتری)'}
                    </span>
                    <span className="text-xs font-bold text-slate-800">{approvingTx.bankName}</span>
                  </div>
                  <div>
                    <span className={`text-lg font-black ${approvingTx.type === 'deposit' || approvingTx.txKind === 'receipt' ? 'text-blue-700' : 'text-rose-700'}`}>
                      {approvingTx.amount.toLocaleString()}{' '}
                      <span className="text-xs font-normal text-slate-500">تومان بانکی</span>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-500 pt-2 border-t border-slate-200/60">
                  <div>
                    <span className="text-slate-400">کارت:</span> ****{approvingTx.cardLast4}
                  </div>
                  <div>
                    <span className="text-slate-400">تاریخ و زمان:</span> {formatAfghanDate(approvingTx.date)} {approvingTx.time}
                  </div>
                  <div className="col-span-2 sm:col-span-1 truncate">
                    <span className="text-slate-400">پیگیری:</span> {approvingTx.trackingNumber}
                  </div>
                </div>
              </div>

              {/* بخش بررسی عکس فیش ارائه‌شده توسط مشتری (درخواست کلیدی کاربر) */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-black text-slate-900">
                      عکس فیش / رسید تراکنش بانکی (ارائه شده توسط مشتری):
                    </span>
                  </div>
                  {modalReceiptImage && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                      فیش پیوست است
                    </span>
                  )}
                </div>

                {modalReceiptImage ? (
                  <div className="flex items-center gap-3 p-2 bg-white rounded-xl border border-slate-200">
                    <img
                      src={modalReceiptImage}
                      alt="رسید تراکنش"
                      className="w-16 h-16 object-cover rounded-lg border border-slate-300 cursor-pointer hover:opacity-90 shadow-2xs"
                      onClick={() => setViewingImage(modalReceiptImage)}
                    />
                    <div className="space-y-1.5 flex-1">
                      <p className="text-xs font-bold text-slate-800">
                        عکس فیش مشتری با موفقیت بارگذاری شده است.
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setViewingImage(modalReceiptImage)}
                          className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center gap-1 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          بزرگنمایی و بررسی دقیق عکس فیش
                        </button>
                        <label className="cursor-pointer px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg flex items-center gap-1 border border-slate-200 transition-colors">
                          <Upload className="w-3.5 h-3.5" />
                          تغییر عکس
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleImageFileChange(e, setModalReceiptImage)}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50/70 border border-dashed border-amber-300 rounded-xl space-y-2 text-center">
                    <p className="text-xs text-amber-900 font-medium">
                      هنوز عکسی برای این تراکنش بارگذاری نشده است. اگر مشتری عکس رسید را آورده، می‌توانید آن را ضمیمه کنید:
                    </p>
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 text-xs font-bold rounded-xl transition-colors shadow-2xs">
                      <Camera className="w-3.5 h-3.5 text-amber-700" />
                      بارگذاری عکس رسید مشتری
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageFileChange(e, setModalReceiptImage)}
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* سوال محوری کاربر: این مبلغ را به حساب کدام مشتری انتقال میدی؟ */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-blue-600" />
                    <label className="text-xs font-black text-slate-900">
                      این مبلغ را به حساب کدام مشتری انتقال می‌دهید؟ <span className="text-rose-500">*</span>
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingNewCustomer(!isAddingNewCustomer);
                      setApprovalModalError('');
                    }}
                    className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg transition-colors ${
                      isAddingNewCustomer
                        ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>{isAddingNewCustomer ? 'انتخاب از لیست مشتریان موجود' : '+ مشتری در لیست نیست؟ افزودن مشتری جدید'}</span>
                  </button>
                </div>

                {/* حالت الف: افزودن مشتری جدید در همین جا */}
                {isAddingNewCustomer ? (
                  <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                          +
                        </div>
                        <h4 className="text-xs font-bold text-emerald-950">
                          تعریف سریع مشتری جدید برای این فیش
                        </h4>
                      </div>
                      <span className="text-[10px] text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full font-medium">
                        ثبت فوری بدون خروج از صفحه
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          نام و نام خانوادگی مشتری: <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={newCustName}
                          onChange={(e) => setNewCustName(e.target.value)}
                          placeholder="مثال: جاوید احمدی"
                          autoFocus
                          className="w-full px-3 py-2 text-xs border border-emerald-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          شماره تماس / همراه:
                        </label>
                        <input
                          type="text"
                          value={newCustPhone}
                          onChange={(e) => setNewCustPhone(e.target.value)}
                          placeholder="مثال: 0912... یا 079..."
                          className="w-full px-3 py-2 text-xs border border-emerald-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          نوع حساب مشتری:
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setNewCustType('permanent')}
                            className={`py-1.5 text-xs font-bold rounded-xl border transition-colors ${
                              newCustType === 'permanent'
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            مشتری دائمی
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewCustType('transient')}
                            className={`py-1.5 text-xs font-bold rounded-xl border transition-colors ${
                              newCustType === 'transient'
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            مشتری رهروی
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          یادداشت یا آدرس (اختیاری):
                        </label>
                        <input
                          type="text"
                          value={newCustNotes}
                          onChange={(e) => setNewCustNotes(e.target.value)}
                          placeholder="توضیحات مشتری..."
                          className="w-full px-3 py-2 text-xs border border-emerald-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-emerald-200/70">
                      <span className="text-[10px] text-emerald-800">
                        مشتری در دفتر حساب‌ها ثبت شده و بلافاصله برای این انتقال اختصاص می‌یابد.
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCreateCustomerInModal()}
                        disabled={!newCustName.trim()}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-xl shadow-xs transition-colors"
                      >
                        ثبت و انتخاب این مشتری
                      </button>
                    </div>
                  </div>
                ) : (
                  /* حالت ب: انتخاب از لیست مشتریان موجود */
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="جستجوی نام یا شماره تلفن مشتری..."
                        value={customerSearchTerm}
                        onChange={(e) => setCustomerSearchTerm(e.target.value)}
                        className="w-full pl-3 pr-9 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        انتخاب مشتری از لیست ({customers.length} مشتری ثبت شده):
                      </label>
                      <select
                        value={selectedTargetCustomerId}
                        onChange={(e) => {
                          setSelectedTargetCustomerId(e.target.value);
                          setApprovalModalError('');
                        }}
                        className="w-full px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- لطفاً مشتری را جهت انتقال مبلغ انتخاب کنید --</option>
                        {customers
                          .filter((c) => {
                            if (!customerSearchTerm) return true;
                            const term = customerSearchTerm.toLowerCase();
                            return (
                              c.name.toLowerCase().includes(term) ||
                              (c.phone && c.phone.includes(term))
                            );
                          })
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({c.type === 'permanent' ? 'دائمی' : 'رهروی'})
                              {c.phone ? ` - تلفن: ${c.phone}` : ''}
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* نمایش خلاصه وضعیت حساب مشتری و اثر حسابداری کسر از بانک و اضافه به مشتری */}
                    {(() => {
                      const selCust = customers.find((c) => c.id === selectedTargetCustomerId);
                      const currentBankBal = DatabaseService.calculateBankBalance(approvingTx.bankId);
                      const bankAfter = currentBankBal - approvingTx.amount;

                      if (!selCust) return null;
                      const cBalances = DatabaseService.getCustomerBalances(selCust.id);
                      const bankIrr = cBalances['IRR_BANK']?.balance || 0;
                      return (
                        <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-2xl space-y-3 text-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                                {selCust.name.charAt(0)}
                              </div>
                              <div>
                                <span className="font-black text-slate-900">{selCust.name}</span>
                                <span className="text-[10px] text-slate-500 mr-2">
                                  ({selCust.type === 'permanent' ? 'مشتری دائمی' : 'مشتری رهروی'})
                                  {selCust.phone ? ` | تلفن: ${selCust.phone}` : ''}
                                </span>
                              </div>
                            </div>
                            <span className="text-[11px] text-blue-900 font-semibold">
                              طلب/بدهی فعلی مشتری:{' '}
                              <strong>
                                {bankIrr > 0
                                  ? `${bankIrr.toLocaleString()} تومان (بستانکار)`
                                  : bankIrr < 0
                                  ? `${Math.abs(bankIrr).toLocaleString()} تومان (بدهکار)`
                                  : 'تسویه (۰)'}
                              </strong>
                            </span>
                          </div>

                          {/* کارت تشریح شفاف چرخه مالی طبق خواسته کاربر */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-blue-200/70">
                            <div className="p-2.5 bg-white rounded-xl border border-rose-200 space-y-1">
                              <span className="text-[11px] font-black text-rose-700 flex items-center gap-1">
                                <ArrowDownLeft className="w-3.5 h-3.5 text-rose-600" />
                                ۱. کسر از موجودی بانک {approvingTx.bankName}:
                              </span>
                              <div className="text-[11px] text-slate-700 font-mono">
                                <div>موجودی فعلی: {currentBankBal.toLocaleString()} ت</div>
                                <div className="text-rose-600 font-bold">کسر: -{approvingTx.amount.toLocaleString()} ت</div>
                                <div className="font-black text-slate-900">موجودی جدید: {bankAfter.toLocaleString()} ت</div>
                              </div>
                            </div>

                            <div className="p-2.5 bg-white rounded-xl border border-emerald-200 space-y-1">
                              <span className="text-[11px] font-black text-emerald-700 flex items-center gap-1">
                                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                                ۲. واریز به حساب {selCust.name}:
                              </span>
                              <div className="text-[11px] text-slate-700">
                                <div>مبلغ فیش: <span className="font-black text-emerald-700">+{approvingTx.amount.toLocaleString()} تومان</span></div>
                                <div className="text-[10px] text-slate-500 mt-1">مستقیماً به عنوان بستانکاری/طلب در دفتر حساب مشتری ثبت و فیش رسید صادر می‌شود.</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* خطای مدال در صورت عدم انتخاب مشتری */}
              {approvalModalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{approvalModalError}</span>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setApprovingTx(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleConfirmApproval}
                className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>تأیید فیش، کسر از بانک و واریز به حساب مشتری</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX MODAL: بزرگنمایی عکس رسید / فیش بانکی */}
      {viewingImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setViewingImage(null)}
        >
          <div
            className="relative max-w-3xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl p-2 border border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 text-white">
              <div className="flex items-center gap-2 text-xs font-bold">
                <ImageIcon className="w-4 h-4 text-blue-400" />
                <span>مشاهده عکس فیش / رسید تراکنش</span>
              </div>
              <button
                type="button"
                onClick={() => setViewingImage(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2 flex items-center justify-center max-h-[75vh] overflow-auto">
              <img
                src={viewingImage}
                alt="رسید بزرگنمایی شده"
                className="max-w-full max-h-[72vh] object-contain rounded-lg"
              />
            </div>
            <div className="px-3 py-2 text-center text-[11px] text-slate-400 border-t border-slate-800">
              کلیک در بیرون پنجره یا دکمه ضربدر جهت بستن
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

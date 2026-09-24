export type Role = 'admin' | 'employee' | 'user';

export type UserPermission =
  | 'view_customers'
  | 'manage_customers'
  | 'delete_customers'
  | 'view_customer_accounts'
  | 'create_trades'
  | 'view_trades'
  | 'delete_trades'
  | 'create_entries'
  | 'view_entries'
  | 'delete_entries'
  | 'create_bank_tx'
  | 'view_banks'
  | 'manage_banks'
  | 'approve_transactions'
  | 'view_reports'
  | 'view_cashbox'
  | 'view_balance'
  | 'manage_users'
  | 'manage_settings'
  | 'view_audit_logs'
  | 'change_admin_credentials';

export type CustomerType = 'permanent' | 'transient'; // دائمی یا رهروی

export type TransactionStatus = 'pending' | 'approved' | 'rejected';

export type TradeType = 'buy' | 'sell'; // خرید یا فروش ارز

export type BankTransactionType = 'deposit' | 'withdraw'; // واریز یا برداشت

export interface CustomerBankAccount {
  id: string;
  bankName: string; // نام بانک ایرانی، مثلاً صادرات، ملت، ملی
  accountNumber?: string;
  cardNumber?: string;
  cardLast4: string; // ۴ رقم آخر کارت یا حساب
  holderName?: string;
  cardHolderName?: string;
  isDefault?: boolean;
  isPrimary?: boolean;
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: Role;
  status: 'active' | 'inactive';
  passwordHash?: string;
  salt?: string;
  phone?: string;
  permissions: UserPermission[];
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
}

export interface Customer {
  id: string;
  type: CustomerType;
  name: string;
  phone?: string;
  address?: string;
  status: 'active' | 'inactive';
  notes?: string;
  bankAccounts?: CustomerBankAccount[]; // حساب‌ها و کارت‌های بانکی متعدد مشتری
  currentPeriodNumber?: number; // دوره جاری حساب
  createdAt: string;
  updatedAt: string;
}

export interface AccountPeriod {
  id: string;
  customerId: string;
  customerName?: string;
  periodNumber: number;
  startDate: string;
  endDate: string;
  closingDate: string;
  closingNotes?: string;
  closedBy?: string;
  totalReceipts?: {
    [currencyCode: string]: number; // مجموع کل رسیدهای دوره به تفکیک ارز
  };
  totalBards?: {
    [currencyCode: string]: number; // مجموع کل بردهای دوره به تفکیک ارز
  };
  closedBalances: {
    [currencyCode: string]: number; // مانده نهایی ارزها در زمان قفل و تصفیه دوره
  };
  totalEntriesCount?: number;
  carryForwardOption?: 'zero_reset' | 'carry_forward'; // صفر کردن برای دوره جدید یا انتقال مانده
  isCurrent: boolean;
}

export interface Bank {
  id: string;
  name: string;
  accountNumber: string;
  cardNumber?: string;
  initialBalance: number; // تومان بانکی
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type BankActionEffect =
  | 'deduct_bank_add_customer' // کسر از موجودی بانک و افزایش به حساب مشتری (درخواست مستقیم صراف)
  | 'add_bank_add_customer'    // واریز مشتری به بانک و افزایش به حساب مشتری
  | 'deduct_bank_deduct_customer' // برداشت از بانک و کسر از حساب مشتری
  | 'add_bank_deduct_customer';

export interface BankTransaction {
  id: string;
  bankId: string;
  bankName: string;
  type: BankTransactionType; // واریز (رسید) یا برداشت (برد)
  receiptType?: 'receipt' | 'bard'; // رسید (واریز - رنگ آبی) | برد (برداشت - رنگ قرمز)
  txKind?: 'receipt' | 'bard'; // رسید (واریز - رنگ آبی) | برد (برداشت - رنگ قرمز)
  actionEffect?: BankActionEffect;
  amount: number; // مبلغ به تومان بانکی
  cardLast4: string; // ۴ رقم آخر کارت (سازگاری با نسخه قبل)
  sourceCardLast4?: string; // ۴ رقم کارت یا حساب مبدأ
  destCardLast4?: string; // ۴ رقم کارت یا حساب مقصد
  trackingNumber: string; // شماره پیگیری
  date: string; // تاریخ YYYY-MM-DD
  time: string; // ساعت HH:mm
  status: TransactionStatus; // معلق / در انتظار تأیید | تأیید شده
  customerId?: string; // بعد از تأیید به مشتری اختصاص می‌یابد
  customerName?: string;
  customerBankAccountId?: string; // کارت اختصاصی انتخاب شده از حساب‌های مشتری
  receiptImage?: string; // تصویر یا عکس رسید و فیش تراکنش بانکی
  notes?: string;
  approvedBy?: string;
  approvedAt?: string;
  isDuplicateOverride?: boolean;
  duplicateReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Currency {
  code: string; // AFN, IRR, USD, EUR, etc.
  name: string; // افغانی، تومان، دالر، یورو
  symbol: string;
  isBaseRateUnit1000?: boolean; // تومان و افغانی با ضریب ۱۰۰۰ محاسبه می‌شوند
  buyRate: number; // نرخ خرید نسبت به ارز پایه (یا افغانی/دالر)
  sellRate: number; // نرخ فروش
  targetBalance?: number; // موجودی هدف برای بلانس
}

export interface CashBalance {
  currencyCode: string;
  amount: number; // موجودی فیزیکی دخل نقدی
  initialBalance: number;
}

export interface Trade {
  id: string;
  tradeNumber: string; // شماره سند یکتا مثلا TR-1001
  type: TradeType; // buy یا sell
  currencyCode: string; // ارزی که خرید یا فروش می‌شود (مثلا USD یا AFN)
  amount: number; // مقدار ارز
  rate: number; // نرخ بر اساس هر ۱۰۰۰ واحد (یا مستقیم)
  settlementCurrency: string; // ارزی که پرداخت/دریافت شده (مثلا تومان نقدی 'IRR_CASH' یا تومان بانکی 'IRR_BANK' یا 'AFN')
  totalSettlementAmount: number; // مجموع مبلغ به ارز تسویه
  customerId?: string; // می‌تواند مشتری دائمی یا رهروی باشد
  customerType: CustomerType;
  customerName: string;
  customerPhone?: string;
  isCashSettled: boolean; // آیا از دخل نقدی تسویه شد یا نسیه/حساب مشتری
  date: string;
  time: string;
  notes?: string;
  profitOrLoss: number; // سود یا زیان معامله
  status?: TransactionStatus; // 'pending' | 'approved' | 'rejected'
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  createdById: string;
}

export interface CustomerAccountEntry {
  id: string;
  customerId: string;
  date: string;
  time: string;
  type: 'trade_settlement' | 'bank_deposit' | 'bank_withdraw' | 'cash_in' | 'cash_out' | 'debt_adjustment' | 'period_opening';
  entryCategory?: 'receipt' | 'bard'; // رسید (واریز/بستانکاری - رنگ آبی) | برد (برداشت/بدهکاری - رنگ قرمز)
  referenceId?: string; // آی‌دی معامله یا تراکنش بانک
  description: string;
  currencyCode: string; // AFN, USD, IRR_CASH (تومان نقدی), IRR_BANK (تومان بانکی)
  debit: number; // بدهکار / برد (برداشت مشتری / بدهی - رنگ قرمز)
  credit: number; // بستانکار / رسید (واریز مشتری / طلب - رنگ آبی)
  sourceCardLast4?: string; // ۴ رقم کارت مبدأ
  destCardLast4?: string; // ۴ رقم کارت مقصد
  bankName?: string;
  periodId?: string; // دوره حساب برای قابلیت قفل و تصفیه حساب (Totaling)
  isOpeningBalance?: boolean; // مانده منتقل شده از دوره قبل
  status?: TransactionStatus; // 'pending' (در انتظار تایید مدیر) | 'approved' (تایید شده قطعی)
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
}

export interface Receipt {
  id: string;
  receiptNumber: string;
  type: 'trade' | 'bank_transaction' | 'customer_payment';
  txKind?: 'receipt' | 'bard' | 'trade'; // رسید (آبی) | برد (قرمز) | معامله
  referenceId: string;
  customerName: string;
  customerPhone?: string;
  date: string;
  time: string;
  details: {
    tradeType?: TradeType;
    currencyCode?: string;
    amount?: number;
    rate?: number;
    totalAmount?: number;
    paymentMethod?: string;
    bankName?: string;
    trackingNumber?: string;
    cardLast4?: string;
    sourceCardLast4?: string; // ۴ رقم مبدأ
    destCardLast4?: string; // ۴ رقم مقصد
  };
  notes?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  date?: string; // YYYY/MM/DD هجری شمسی یا میلادی
  time?: string; // HH:mm
  userId: string;
  userName: string;
  userRole?: string;
  action: 'create' | 'update' | 'delete' | 'approve' | 'override' | 'login' | 'logout' | 'password_change' | 'status_change';
  entity: 'trade' | 'bank_transaction' | 'customer' | 'bank' | 'currency' | 'settings' | 'user' | 'auth' | 'backup';
  entityId: string;
  details: string;
  status?: 'success' | 'failed' | 'warning';
}

export interface SystemSettings {
  exchangeName: string;
  phone: string;
  address: string;
  receiptNote: string;
  baseCurrency: string; // ارز پایه محاسبه سود (پیشفرض AFN یا USD)
}

export interface ExchangeStats {
  cashAFN: number;
  cashIRR: number; // تومان نقدی دخل
  cashUSD: number; // دالر نقدی دخل
  cashPKR: number; // کلدار نقدی دخل
  bankIRR: number; // مجموع تومان در حساب‌های بانکی
  totalReceivables: { [currency: string]: number }; // طلب‌ها
  totalPayables: { [currency: string]: number }; // بدهی‌ها
  totalProfit: number;
  totalLoss: number;
  netProfit: number;
  todayTradesCount: number;
  pendingBankTransactionsCount: number;
  pendingTradesCount?: number;
  pendingCustomerEntriesCount?: number;
  totalCustomersCount: number;
  recentTrades: Trade[];
  recentBankTransactions: BankTransaction[];
}

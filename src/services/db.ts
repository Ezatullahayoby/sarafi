import {
  AccountPeriod,
  AuditLog,
  Bank,
  BankActionEffect,
  BankTransaction,
  CashBalance,
  Currency,
  Customer,
  CustomerAccountEntry,
  CustomerBankAccount,
  CustomerType,
  ExchangeStats,
  Receipt,
  SystemSettings,
  Trade,
  TradeType,
  User,
  UserPermission,
} from '../types';
import {
  firestoreSetDoc,
  firestoreDeleteDoc,
  firestoreSeedCollection,
  firestoreSubscribeCollection,
  testConnection,
  getSyncStatus,
  subscribeToSyncStatus,
  SyncStatus,
} from './firebase';
import { DEFAULT_ADMIN_HASH, DEFAULT_ADMIN_SALT } from '../utils/security';
import { getAfghanTodayFull } from '../utils/afghanDate';

const STORAGE_PREFIX = 'sarafi_db_v2_';

// Automatic one-time cleanup of previous mock/demo data in client browser
try {
  if (typeof localStorage !== 'undefined') {
    const purgeFlag = 'sarafi_v2_clean_slate_executed';
    if (!localStorage.getItem(purgeFlag)) {
      const oldKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('sarafi_db_') || k.includes('sarafi'))) {
          oldKeys.push(k);
        }
      }
      oldKeys.forEach((k) => localStorage.removeItem(k));
      localStorage.setItem(purgeFlag, 'true');
    }
  }
} catch (e) {
  console.warn('Storage purge warning:', e);
}

function getStore<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error loading key ' + key, err);
    return defaultValue;
  }
}

function setStore<T>(key: string, data: T): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data));
  } catch (err) {
    console.error('Error saving key ' + key, err);
  }
}

const ROOT_ADMIN_PERMISSIONS: UserPermission[] = [
  'view_customers',
  'manage_customers',
  'delete_customers',
  'view_customer_accounts',
  'create_trades',
  'view_trades',
  'delete_trades',
  'create_entries',
  'view_entries',
  'delete_entries',
  'create_bank_tx',
  'view_banks',
  'manage_banks',
  'approve_transactions',
  'view_reports',
  'view_cashbox',
  'view_balance',
  'manage_users',
  'manage_settings',
  'view_audit_logs',
  'change_admin_credentials',
];

// Initial seed data if first time running
const INITIAL_USERS: User[] = [
  {
    id: 'usr_super_admin',
    username: 'adminsaraf',
    name: 'مدیر کل صرافی',
    role: 'admin',
    status: 'active',
    passwordHash: DEFAULT_ADMIN_HASH,
    salt: DEFAULT_ADMIN_SALT,
    permissions: ROOT_ADMIN_PERMISSIONS,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

const INITIAL_CURRENCIES: Currency[] = [
  { code: 'AFN', name: 'افغانی', symbol: '؋', isBaseRateUnit1000: true, buyRate: 1.0, sellRate: 1.0, targetBalance: 0 },
  { code: 'IRR', name: 'تومان', symbol: 'تومان', isBaseRateUnit1000: true, buyRate: 88.5, sellRate: 89.2, targetBalance: 0 },
  { code: 'USD', name: 'دالر آمریکا', symbol: '$', isBaseRateUnit1000: false, buyRate: 68.2, sellRate: 68.6, targetBalance: 0 },
  { code: 'PKR', name: 'کلدار پاکستان', symbol: '₨', isBaseRateUnit1000: true, buyRate: 245.0, sellRate: 247.5, targetBalance: 0 },
  { code: 'EUR', name: 'یورو', symbol: '€', isBaseRateUnit1000: false, buyRate: 72.1, sellRate: 72.8, targetBalance: 0 },
];

const INITIAL_CASH_BALANCES: CashBalance[] = [
  { currencyCode: 'AFN', amount: 0, initialBalance: 0 },
  { currencyCode: 'IRR', amount: 0, initialBalance: 0 },
  { currencyCode: 'USD', amount: 0, initialBalance: 0 },
  { currencyCode: 'PKR', amount: 0, initialBalance: 0 },
  { currencyCode: 'EUR', amount: 0, initialBalance: 0 },
];

const INITIAL_BANKS: Bank[] = [];

const INITIAL_CUSTOMERS: Customer[] = [];

const INITIAL_SETTINGS: SystemSettings = {
  exchangeName: 'صرافی و خدمات پولی',
  phone: '',
  address: '',
  receiptNote: 'رسید فوق فقط با مهر و امضای صرافی معتبر است.',
  baseCurrency: 'AFN',
};

export class DatabaseService {
  // Read collections
  static getUsers(): User[] {
    const list = getStore<User[]>('users', INITIAL_USERS);
    let admin = list.find((u) => u.role === 'admin');
    if (!admin) {
      list.unshift(INITIAL_USERS[0]);
      setStore('users', list);
    } else {
      let modified = false;
      if (!admin.passwordHash || !admin.salt) {
        admin.passwordHash = DEFAULT_ADMIN_HASH;
        admin.salt = DEFAULT_ADMIN_SALT;
        modified = true;
      }
      if (admin.username === 'admin') {
        admin.username = 'adminsaraf';
        admin.name = 'مدیر کل صرافی';
        modified = true;
      }
      if (!admin.status) {
        admin.status = 'active';
        modified = true;
      }
      if (!admin.permissions || admin.permissions.length === 0) {
        admin.permissions = ROOT_ADMIN_PERMISSIONS;
        modified = true;
      }
      if (modified) {
        setStore('users', list);
      }
    }
    return list;
  }

  static saveUsers(users: User[]): void {
    setStore('users', users);
    users.forEach((u) => {
      // Clean undefined and sync to Firestore
      firestoreSetDoc('users', u.id, u).catch((err) => console.warn('Firestore sync user err:', err));
    });
  }

  static getCurrencies(): Currency[] {
    const list = getStore('currencies', INITIAL_CURRENCIES);
    // Ensure PKR exists in list
    if (!list.some((c) => c.code === 'PKR')) {
      list.push({ code: 'PKR', name: 'کلدار پاکستان', symbol: '₨', isBaseRateUnit1000: true, buyRate: 245.0, sellRate: 247.5, targetBalance: 0 });
      setStore('currencies', list);
    }
    return list;
  }

  static saveCurrencies(currencies: Currency[]): void {
    setStore('currencies', currencies);
    currencies.forEach((c) => {
      firestoreSetDoc('currencies', c.code, c).catch((err) => console.warn('Firestore sync currency err:', err));
    });
  }

  static getCashBalances(): CashBalance[] {
    const list = getStore('cash_balances', INITIAL_CASH_BALANCES);
    if (!list.some((b) => b.currencyCode === 'PKR')) {
      list.push({ currencyCode: 'PKR', amount: 0, initialBalance: 0 });
      setStore('cash_balances', list);
    }
    return list;
  }

  static saveCashBalances(balances: CashBalance[]): void {
    setStore('cash_balances', balances);
    balances.forEach((b) => {
      firestoreSetDoc('cash_balances', b.currencyCode, b).catch((err) => console.warn('Firestore sync cash_balance err:', err));
    });
  }

  static getBanks(): Bank[] {
    return getStore('banks', INITIAL_BANKS);
  }

  static saveBanks(banks: Bank[]): void {
    setStore('banks', banks);
    banks.forEach((b) => {
      firestoreSetDoc('banks', b.id, b).catch((err) => console.warn('Firestore sync bank err:', err));
    });
  }

  static getBankTransactions(): BankTransaction[] {
    return getStore('bank_transactions', []);
  }

  static saveBankTransactions(txs: BankTransaction[]): void {
    setStore('bank_transactions', txs);
    txs.forEach((t) => {
      firestoreSetDoc('bank_transactions', t.id, t).catch((err) => console.warn('Firestore sync bank_tx err:', err));
    });
  }

  static getCustomers(): Customer[] {
    return getStore('customers', INITIAL_CUSTOMERS);
  }

  static saveCustomers(customers: Customer[]): void {
    setStore('customers', customers);
    customers.forEach((c) => {
      firestoreSetDoc('customers', c.id, c).catch((err) => console.warn('Firestore sync customer err:', err));
    });
  }

  static addCustomer(customer: {
    type: CustomerType;
    name: string;
    phone?: string;
    address?: string;
    notes?: string;
  }): Customer {
    const newCust: Customer = {
      id: 'cust_' + Date.now(),
      type: customer.type,
      name: customer.name.trim(),
      phone: customer.phone?.trim() || undefined,
      address: customer.address?.trim() || undefined,
      status: 'active',
      notes: customer.notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const customers = DatabaseService.getCustomers();
    customers.unshift(newCust);
    DatabaseService.saveCustomers(customers);
    DatabaseService.logAudit(
      'create',
      'customer',
      newCust.id,
      `ایجاد مشتری جدید: ${newCust.name} (${newCust.type === 'permanent' ? 'دائمی' : 'رهروی'})`
    );
    return newCust;
  }

  static getCustomerAccountEntries(): CustomerAccountEntry[] {
    return getStore('customer_accounts', []);
  }

  static saveCustomerAccountEntries(entries: CustomerAccountEntry[]): void {
    setStore('customer_accounts', entries);
    entries.forEach((e) => {
      firestoreSetDoc('customer_entries', e.id, e).catch((err) => console.warn('Firestore sync entry err:', err));
    });
  }

  static getAccountPeriods(customerId?: string): AccountPeriod[] {
    const periods = getStore<AccountPeriod[]>('account_periods', []);
    if (customerId) {
      return periods.filter((p) => p.customerId === customerId);
    }
    return periods;
  }

  static saveAccountPeriods(periods: AccountPeriod[]): void {
    setStore('account_periods', periods);
    periods.forEach((p) => {
      firestoreSetDoc('account_periods', p.id, p).catch((err) => console.warn('Firestore sync period err:', err));
    });
  }

  static addCustomerBankAccount(
    customerId: string,
    account: {
      bankName: string;
      cardNumber?: string;
      accountNumber?: string;
      cardLast4: string;
      holderName?: string;
      cardHolderName?: string;
      isDefault?: boolean;
      isPrimary?: boolean;
    }
  ): CustomerBankAccount | null {
    const customers = DatabaseService.getCustomers();
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) return null;

    if (!customer.bankAccounts) customer.bankAccounts = [];
    const newAccount: CustomerBankAccount = {
      id: 'cba_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      bankName: account.bankName.trim(),
      accountNumber: account.accountNumber?.trim(),
      cardNumber: account.cardNumber?.trim(),
      cardLast4: account.cardLast4.trim(),
      holderName: account.cardHolderName?.trim() || account.holderName?.trim() || customer.name,
      cardHolderName: account.cardHolderName?.trim() || account.holderName?.trim() || customer.name,
      isDefault: account.isDefault !== undefined ? account.isDefault : customer.bankAccounts.length === 0,
      isPrimary: account.isPrimary !== undefined ? account.isPrimary : customer.bankAccounts.length === 0,
    };
    customer.bankAccounts.push(newAccount);
    customer.updatedAt = new Date().toISOString();
    DatabaseService.saveCustomers(customers);

    DatabaseService.logAudit(
      'update',
      'customer',
      customer.id,
      `افزودن حساب/کارت بانکی جدید به مشتری «${customer.name}»: ${account.bankName} (کارت: ****${account.cardLast4})`
    );
    return newAccount;
  }

  static removeCustomerBankAccount(customerId: string, accountId: string): boolean {
    const customers = DatabaseService.getCustomers();
    const customer = customers.find((c) => c.id === customerId);
    if (!customer || !customer.bankAccounts) return false;

    customer.bankAccounts = customer.bankAccounts.filter((a) => a.id !== accountId);
    customer.updatedAt = new Date().toISOString();
    DatabaseService.saveCustomers(customers);
    return true;
  }

  static closeCustomerAccountPeriod(
    customerId: string,
    options?: {
      closingNotes?: string;
      carryForward?: boolean; // false: صفر کردن و بازنشانی، true: انتقال مانده
    } | string
  ): {
    success: boolean;
    period?: AccountPeriod;
    error?: string;
  } {
    const customers = DatabaseService.getCustomers();
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) return { success: false, error: 'مشتری یافت نشد' };

    const entries = DatabaseService.getCustomerAccountEntries();
    const activeEntries = entries.filter((e) => e.customerId === customerId && !e.periodId);

    if (activeEntries.length === 0) {
      return { success: false, error: 'هیچ سند فعالی در دوره جاری برای تصفیه و قفل وجود ندارد.' };
    }

    const currentPeriodNum = customer.currentPeriodNumber || 1;
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);

    const isStringOpt = typeof options === 'string';
    const closingNotes = isStringOpt ? options : options?.closingNotes;
    const shouldCarryForward = isStringOpt ? false : (options?.carryForward ?? false);

    // محاسبه مانده‌ها، مجموع کل رسیدها و مجموع کل بردها برای این دوره
    const balances = DatabaseService.getCustomerBalances(customerId);
    const closedBalances: { [code: string]: number } = {};
    const totalReceipts: { [code: string]: number } = {};
    const totalBards: { [code: string]: number } = {};

    for (const [code, val] of Object.entries(balances)) {
      closedBalances[code] = val.balance;
      totalReceipts[code] = val.credit;
      totalBards[code] = val.debit;
    }

    const periodId = 'period_' + customerId + '_' + Date.now();
    const newPeriod: AccountPeriod = {
      id: periodId,
      customerId,
      customerName: customer.name,
      periodNumber: currentPeriodNum,
      startDate: activeEntries[0]?.date || dateStr,
      endDate: activeEntries[activeEntries.length - 1]?.date || dateStr,
      closingDate: now.toISOString(),
      closingNotes: closingNotes || 'تصفیه کامل دوره، بایگانی در تاریخچه و بازنشانی حساب برای دوره جدید',
      closedBy: DatabaseService.getCurrentUser().name,
      closedBalances,
      totalReceipts,
      totalBards,
      totalEntriesCount: activeEntries.length,
      carryForwardOption: shouldCarryForward ? 'carry_forward' : 'zero_reset',
      isCurrent: false,
    };

    // بایگانی و قفل کردن تمام اسناد این دوره
    activeEntries.forEach((e) => {
      e.periodId = periodId;
    });

    // آغاز دوره جدید برای مشتری
    customer.currentPeriodNumber = currentPeriodNum + 1;
    customer.updatedAt = now.toISOString();

    // در صورتی که کاربر انتقال مانده را خواسته باشد، سند افتتاحیه ثبت می‌شود، در غیر این صورت حساب صفر شده و دوره جدید با صفر شروع می‌شود
    if (shouldCarryForward) {
      for (const [code, bal] of Object.entries(closedBalances)) {
        if (bal !== 0) {
          entries.push({
            id: 'ca_open_' + Date.now() + '_' + code,
            customerId,
            date: dateStr,
            time: timeStr,
            type: 'period_opening',
            entryCategory: bal > 0 ? 'receipt' : 'bard',
            description: `مانده انتقالی از دوره ${currentPeriodNum} به دوره ${customer.currentPeriodNumber}`,
            currencyCode: code,
            debit: bal < 0 ? Math.abs(bal) : 0,
            credit: bal > 0 ? bal : 0,
            isOpeningBalance: true,
            createdAt: now.toISOString(),
          });
        }
      }
    }

    DatabaseService.saveCustomerAccountEntries(entries);
    DatabaseService.saveCustomers(customers);

    const periods = DatabaseService.getAccountPeriods();
    periods.unshift(newPeriod);
    DatabaseService.saveAccountPeriods(periods);

    DatabaseService.logAudit(
      'update',
      'customer',
      customerId,
      `تصفیه و بستن کامل دوره ${currentPeriodNum} برای ${customer.name}: تمام اسناد در آرشیو تاریخچه با توتل ذخیره شدند و دوره ${customer.currentPeriodNumber} با حساب ${shouldCarryForward ? 'مانده انتقالی' : 'صفر و پاک'} باز شد.`
    );

    return { success: true, period: newPeriod };
  }

  static getTrades(): Trade[] {
    return getStore('trades', []);
  }

  static saveTrades(trades: Trade[]): void {
    setStore('trades', trades);
    trades.forEach((t) => {
      firestoreSetDoc('trades', t.id, t).catch((err) => console.warn('Firestore sync trade err:', err));
    });
  }

  static getReceipts(): Receipt[] {
    return getStore('receipts', []);
  }

  static saveReceipts(receipts: Receipt[]): void {
    setStore('receipts', receipts);
  }

  static getAuditLogs(): AuditLog[] {
    return getStore('audit_logs', []);
  }

  static saveAuditLogs(logs: AuditLog[]): void {
    setStore('audit_logs', logs);
    logs.slice(0, 50).forEach((l) => {
      firestoreSetDoc('audit_logs', l.id, l).catch((err) => console.warn('Firestore sync log err:', err));
    });
  }

  static addAuditLogDirect(log: AuditLog): void {
    const logs = DatabaseService.getAuditLogs();
    logs.unshift(log);
    setStore('audit_logs', logs.slice(0, 1000));
    firestoreSetDoc('audit_logs', log.id, log).catch((err) => console.warn('Firestore sync audit_log err:', err));
  }

  static logAudit(
    action: AuditLog['action'],
    entity: AuditLog['entity'],
    entityId: string,
    details: string,
    currentUser?: User
  ): void {
    const user = currentUser || DatabaseService.getCurrentUser();
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const newLog: AuditLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: now.toISOString(),
      date: getAfghanTodayFull(),
      time: timeStr,
      userId: user.id,
      userName: user.name,
      userRole: user.role === 'admin' ? 'مدیر کل' : 'کارمند',
      action,
      entity,
      entityId,
      details,
      status: 'success',
    };
    DatabaseService.addAuditLogDirect(newLog);
  }

  static clearAllData(): void {
    const currentUser = DatabaseService.getCurrentUser();
    if (currentUser && currentUser.role !== 'admin') {
      throw new Error('عدم دسترسی: پاکسازی کامل پایگاه داده تنها توسط مدیر کل صرافی مجاز است.');
    }
    try {
      if (typeof localStorage !== 'undefined') {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.startsWith('sarafi_db_') || k.includes('sarafi'))) {
            // Keep admin user credentials intact
            if (!k.includes('users') && !k.includes('session')) {
              keysToRemove.push(k);
            }
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      }
      DatabaseService.saveBanks([]);
      DatabaseService.saveCustomers([]);
      DatabaseService.saveBankTransactions([]);
      DatabaseService.saveCustomerAccountEntries([]);
      DatabaseService.saveAccountPeriods([]);
      DatabaseService.saveTrades([]);
      DatabaseService.saveReceipts([]);
      DatabaseService.saveCashBalances(INITIAL_CASH_BALANCES);
      DatabaseService.saveCurrencies(INITIAL_CURRENCIES);
    } catch (err) {
      console.error('Error clearing database data:', err);
    }
  }

  static getSettings(): SystemSettings {
    return getStore('settings', INITIAL_SETTINGS);
  }

  static saveSettings(settings: SystemSettings): void {
    setStore('settings', settings);
    firestoreSetDoc('settings', 'general', { id: 'general', ...settings }).catch((err) =>
      console.warn('Firestore sync settings err:', err)
    );
  }

  // ==========================================
  // ONLINE FIREBASE CLOUD DATABASE SYNC
  // ==========================================
  private static isSyncInitialized = false;

  static async initFirebaseSync(onRemoteUpdate?: () => void): Promise<void> {
    if (DatabaseService.isSyncInitialized) return;
    DatabaseService.isSyncInitialized = true;

    try {
      // 1. Connection check per Firebase skill
      await testConnection();

      // 2. Initial Seed: If Firestore has no records yet, migrate current local data
      const currentCustomers = DatabaseService.getCustomers();
      if (currentCustomers.length > 0) {
        await firestoreSeedCollection('customers', currentCustomers);
      }
      const currentEntries = DatabaseService.getCustomerAccountEntries();
      if (currentEntries.length > 0) {
        await firestoreSeedCollection('customer_entries', currentEntries);
      }
      const currentBanks = DatabaseService.getBanks();
      if (currentBanks.length > 0) {
        await firestoreSeedCollection('banks', currentBanks);
      }
      const currentBankTxs = DatabaseService.getBankTransactions();
      if (currentBankTxs.length > 0) {
        await firestoreSeedCollection('bank_transactions', currentBankTxs);
      }
      const currentTrades = DatabaseService.getTrades();
      if (currentTrades.length > 0) {
        await firestoreSeedCollection('trades', currentTrades);
      }
      const currentPeriods = DatabaseService.getAccountPeriods();
      if (currentPeriods.length > 0) {
        await firestoreSeedCollection('account_periods', currentPeriods);
      }
      const currentUsers = DatabaseService.getUsers();
      if (currentUsers.length > 0) {
        await firestoreSeedCollection('users', currentUsers);
      }

      // 3. Realtime Cloud Subscriptions (Automatic two-way sync across devices)
      firestoreSubscribeCollection<User>('users', (remoteUsers) => {
        if (remoteUsers && remoteUsers.length > 0) {
          setStore('users', remoteUsers);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('sarafi_sync_update'));
          }
          if (onRemoteUpdate) onRemoteUpdate();
        }
      });

      firestoreSubscribeCollection<Customer>('customers', (remoteCustomers) => {
        if (remoteCustomers && remoteCustomers.length > 0) {
          setStore('customers', remoteCustomers);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('sarafi_sync_update'));
          }
          if (onRemoteUpdate) onRemoteUpdate();
        }
      });

      firestoreSubscribeCollection<CustomerAccountEntry>('customer_entries', (remoteEntries) => {
        if (remoteEntries && remoteEntries.length > 0) {
          setStore('customer_accounts', remoteEntries);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('sarafi_sync_update'));
          }
          if (onRemoteUpdate) onRemoteUpdate();
        }
      });

      firestoreSubscribeCollection<Bank>('banks', (remoteBanks) => {
        if (remoteBanks && remoteBanks.length > 0) {
          setStore('banks', remoteBanks);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('sarafi_sync_update'));
          }
          if (onRemoteUpdate) onRemoteUpdate();
        }
      });

      firestoreSubscribeCollection<BankTransaction>('bank_transactions', (remoteTxs) => {
        if (remoteTxs && remoteTxs.length > 0) {
          setStore('bank_transactions', remoteTxs);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('sarafi_sync_update'));
          }
          if (onRemoteUpdate) onRemoteUpdate();
        }
      });

      firestoreSubscribeCollection<Trade>('trades', (remoteTrades) => {
        if (remoteTrades && remoteTrades.length > 0) {
          setStore('trades', remoteTrades);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('sarafi_sync_update'));
          }
          if (onRemoteUpdate) onRemoteUpdate();
        }
      });

      firestoreSubscribeCollection<AccountPeriod>('account_periods', (remotePeriods) => {
        if (remotePeriods && remotePeriods.length > 0) {
          setStore('account_periods', remotePeriods);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('sarafi_sync_update'));
          }
          if (onRemoteUpdate) onRemoteUpdate();
        }
      });
    } catch (err) {
      console.warn('Firebase initial sync warning:', err);
    }
  }

  /**
   * Upload all local records to Firestore manually
   */
  static async syncAllToFirebase(): Promise<{ success: boolean; count: number }> {
    try {
      let count = 0;
      const users = DatabaseService.getUsers();
      for (const u of users) {
        await firestoreSetDoc('users', u.id, u);
        count++;
      }
      const customers = DatabaseService.getCustomers();
      for (const c of customers) {
        await firestoreSetDoc('customers', c.id, c);
        count++;
      }
      const entries = DatabaseService.getCustomerAccountEntries();
      for (const e of entries) {
        await firestoreSetDoc('customer_entries', e.id, e);
        count++;
      }
      const banks = DatabaseService.getBanks();
      for (const b of banks) {
        await firestoreSetDoc('banks', b.id, b);
        count++;
      }
      const txs = DatabaseService.getBankTransactions();
      for (const t of txs) {
        await firestoreSetDoc('bank_transactions', t.id, t);
        count++;
      }
      const trades = DatabaseService.getTrades();
      for (const tr of trades) {
        await firestoreSetDoc('trades', tr.id, tr);
        count++;
      }
      const periods = DatabaseService.getAccountPeriods();
      for (const p of periods) {
        await firestoreSetDoc('account_periods', p.id, p);
        count++;
      }
      const logs = DatabaseService.getAuditLogs().slice(0, 50);
      for (const l of logs) {
        await firestoreSetDoc('audit_logs', l.id, l);
        count++;
      }
      return { success: true, count };
    } catch (err) {
      console.error('Manual sync to Firebase error:', err);
      return { success: false, count: 0 };
    }
  }

  static getFirebaseSyncStatus(): { status: SyncStatus; details: string } {
    return getSyncStatus();
  }

  static subscribeFirebaseSyncStatus(listener: (status: SyncStatus, details?: string) => void): () => void {
    return subscribeToSyncStatus(listener);
  }

  static getCurrentUser(): User {
    try {
      if (typeof sessionStorage !== 'undefined') {
        const raw =
          sessionStorage.getItem('sarafi_auth_session_user') ||
          localStorage.getItem('sarafi_last_auth_user');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.id) return parsed;
        }
      }
    } catch {}
    const users = DatabaseService.getUsers();
    return users.find((u) => u.role === 'admin') || INITIAL_USERS[0];
  }

  static setCurrentUser(user: User): void {
    setStore('current_user', user);
    try {
      sessionStorage.setItem('sarafi_auth_session_user', JSON.stringify(user));
    } catch {}
  }

  // ==========================================
  // TRANSACTION DUPLICATE CHECK
  // ==========================================
  static findDuplicateBankTransaction(data: {
    trackingNumber: string;
    amount: number;
    cardLast4: string;
    bankId: string;
  }): BankTransaction | undefined {
    const txs = DatabaseService.getBankTransactions();
    // بررسی شماره پیگیری و بانک یا مبلغ و چهار رقم کارت در یک بانک
    return txs.find(
      (t) =>
        t.bankId === data.bankId &&
        ((t.trackingNumber.trim() !== '' && t.trackingNumber.trim() === data.trackingNumber.trim()) ||
          (t.amount === data.amount && t.cardLast4 === data.cardLast4 && data.cardLast4.length === 4))
    );
  }

  // ==========================================
  // BANK LOGIC & LEDGER
  // ==========================================
  static calculateBankBalance(bankId: string): number {
    const banks = DatabaseService.getBanks();
    const bank = banks.find((b) => b.id === bankId);
    if (!bank) return 0;

    const txs = DatabaseService.getBankTransactions().filter((t) => t.bankId === bankId && t.status === 'approved');
    let balance = bank.initialBalance;
    for (const tx of txs) {
      // فرمول قطعی: رسید به بانک اضافه می‌شود (+)، برد از بانک کم می‌شود (-)
      const isDeposit = tx.type === 'deposit' || tx.txKind === 'receipt' || tx.receiptType === 'receipt';
      if (isDeposit) {
        balance += tx.amount;
      } else {
        balance -= tx.amount;
      }
    }
    return balance;
  }

  static getTotalBankIRR(): number {
    const banks = DatabaseService.getBanks();
    return banks.reduce((sum, b) => sum + DatabaseService.calculateBankBalance(b.id), 0);
  }

  // ==========================================
  // CASH BOX (دخل نقدی)
  // ==========================================
  static getCashAmount(currencyCode: string): number {
    const balances = DatabaseService.getCashBalances();
    const found = balances.find((b) => b.currencyCode === currencyCode);
    return found ? found.amount : 0;
  }

  static updateCashAmount(currencyCode: string, delta: number): void {
    const balances = DatabaseService.getCashBalances();
    const idx = balances.findIndex((b) => b.currencyCode === currencyCode);
    if (idx >= 0) {
      balances[idx].amount += delta;
    } else {
      balances.push({ currencyCode, amount: delta, initialBalance: 0 });
    }
    DatabaseService.saveCashBalances(balances);
  }

  /**
   * ثبت تمام‌خودکار (فول اتوماتیک) رسید و برد در تمام حساب‌ها
   * با ثبت رسید: به حساب مشتری طلبکاری و به موجودی بانک/صندوق افزوده می‌شود.
   * با ثبت برد: از حساب مشتری کسر (بدهکاری) و از موجودی بانک/صندوق کم می‌شود.
   */
  static recordAutoTransaction(params: {
    customerId?: string;
    type: 'receipt' | 'bard';
    currencyCode: string;
    amount: number;
    bankId?: string;
    cardLast4?: string;
    sourceCardLast4?: string;
    destCardLast4?: string;
    trackingNumber?: string;
    description?: string;
    notes?: string;
    date?: string;
    time?: string;
    receiptImage?: string;
    isApproved?: boolean;
  }): {
    success: boolean;
    customerEntry?: CustomerAccountEntry;
    bankTx?: BankTransaction;
    receiptId?: string;
    error?: string;
  } {
    const {
      customerId,
      type,
      currencyCode,
      amount,
      bankId,
      cardLast4,
      sourceCardLast4,
      destCardLast4,
      trackingNumber,
      description,
      notes,
      date,
      time,
      receiptImage,
      isApproved = true,
    } = params;

    if (!amount || amount <= 0) {
      return { success: false, error: 'مبلغ باید بزرگتر از صفر باشد' };
    }

    const now = new Date();
    const txDate = date || now.toISOString().split('T')[0];
    const txTime = time || now.toTimeString().split(' ')[0].substring(0, 5);
    const isReceipt = type === 'receipt';

    let customer = customerId ? DatabaseService.getCustomers().find((c) => c.id === customerId) : undefined;
    let targetBank: Bank | undefined;
    let bankTx: BankTransaction | undefined;
    let customerEntry: CustomerAccountEntry | undefined;
    let receiptId: string | undefined;

    // ۱. پردازش بانک در صورت ارز IRR_BANK یا تعیین بانک
    if (currencyCode === 'IRR_BANK' || bankId) {
      const banks = DatabaseService.getBanks();
      targetBank = banks.find((b) => b.id === bankId) || banks[0];
      if (!targetBank && banks.length > 0) {
        targetBank = banks[0];
      }

      if (targetBank) {
        const cleanCard = (cardLast4 || (isReceipt ? sourceCardLast4 : destCardLast4) || '0000')
          .replace(/\D/g, '')
          .slice(-4);

        const effectiveStatus: 'approved' | 'pending' = customer && isApproved ? 'approved' : 'pending';

        bankTx = {
          id: 'tx_auto_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
          bankId: targetBank.id,
          bankName: targetBank.name,
          type: isReceipt ? 'deposit' : 'withdraw',
          txKind: type,
          amount,
          cardLast4: cleanCard,
          sourceCardLast4: isReceipt ? cleanCard : sourceCardLast4,
          destCardLast4: !isReceipt ? cleanCard : destCardLast4,
          trackingNumber: trackingNumber || 'AUTO-' + Math.floor(100000 + Math.random() * 900000),
          date: txDate,
          time: txTime,
          status: effectiveStatus,
          receiptImage: receiptImage || undefined,
          customerId: customer?.id,
          customerName: customer?.name,
          notes: notes || description || (isReceipt ? 'رسید خودکار بانکی' : 'برد خودکار بانکی'),
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        };

        const txs = DatabaseService.getBankTransactions();
        txs.unshift(bankTx);
        DatabaseService.saveBankTransactions(txs);
      }
    } else {
      // دخل نقدی
      if (isApproved) {
        DatabaseService.updateCashAmount(currencyCode, isReceipt ? amount : -amount);
      }
    }

    // ۲. ثبت در حساب مشتری (در صورت انتساب مشتری)
    if (customer) {
      const debit = isReceipt ? 0 : amount;
      const credit = isReceipt ? amount : 0;
      const cleanCard = (cardLast4 || '0000').replace(/\D/g, '').slice(-4);
      const currentUser = DatabaseService.getCurrentUser();

      customerEntry = {
        id: 'ca_auto_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        customerId: customer.id,
        date: txDate,
        time: txTime,
        type: isReceipt ? 'cash_in' : 'cash_out',
        entryCategory: type,
        referenceId: bankTx?.id,
        description:
          description ||
          (isReceipt
            ? `رسید واریز وجه (${currencyCode === 'IRR_BANK' ? targetBank?.name || 'بانک' : currencyCode})`
            : `برد و پرداخت وجه (${currencyCode === 'IRR_BANK' ? targetBank?.name || 'بانک' : currencyCode})`),
        currencyCode,
        debit,
        credit,
        sourceCardLast4: isReceipt ? cleanCard : undefined,
        destCardLast4: !isReceipt ? cleanCard : undefined,
        bankName: targetBank?.name,
        status: isApproved ? 'approved' : 'pending',
        approvedBy: isApproved ? currentUser.name : undefined,
        approvedAt: isApproved ? now.toISOString() : undefined,
        createdAt: now.toISOString(),
      };

      const entries = DatabaseService.getCustomerAccountEntries();
      entries.push(customerEntry);
      DatabaseService.saveCustomerAccountEntries(entries);
    }

    // ۳. صدور رسید رسمی در سامانه اسناد
    receiptId = 'rec_auto_' + Date.now();
    const receipts = DatabaseService.getReceipts();
    receipts.unshift({
      id: receiptId,
      receiptNumber: (isReceipt ? 'REC-' : 'BRD-') + Math.floor(100000 + Math.random() * 900000),
      type: currencyCode === 'IRR_BANK' ? 'bank_transaction' : 'customer_payment',
      txKind: type,
      referenceId: bankTx?.id || customerEntry?.id || ('ref_' + Date.now()),
      customerName: customer?.name || 'مشتری آزاد / متفرقه',
      customerPhone: customer?.phone,
      date: txDate,
      time: txTime,
      details: {
        paymentMethod: currencyCode === 'IRR_BANK' ? `بانک ${targetBank?.name || ''}` : `دخل نقدی (${currencyCode})`,
        bankName: targetBank?.name,
        amount,
        currencyCode,
      },
      notes: description || notes,
      createdAt: now.toISOString(),
    });
    DatabaseService.saveReceipts(receipts);

    DatabaseService.logAudit(
      'create',
      'trade',
      receiptId,
      `ثبت تمام‌خودکار ${isReceipt ? 'رسید' : 'برد'} به مبلغ ${amount.toLocaleString()} ${currencyCode}` +
        (customer ? ` برای مشتری ${customer.name}` : '') +
        (targetBank ? ` در بانک ${targetBank.name}` : '')
    );

    return {
      success: true,
      customerEntry,
      bankTx,
      receiptId,
    };
  }

  // ==========================================
  // APPROVE PENDING BANK TRANSACTION
  // ==========================================
  static approveBankTransaction(
    transactionId: string,
    customerId?: string,
    options?: {
      actionEffect?: BankActionEffect;
      receiptImage?: string;
      user?: User;
    } | User
  ): { success: boolean; error?: string; customerName?: string; receiptId?: string } {
    const txs = DatabaseService.getBankTransactions();
    const tx = txs.find((t) => t.id === transactionId);
    if (!tx) return { success: false, error: 'تراکنش یافت نشد' };

    if (tx.status === 'approved') return { success: false, error: 'این تراکنش قبلاً تأیید شده است' };

    const assignedCustomerId = customerId || tx.customerId;
    const customers = DatabaseService.getCustomers();
    const customer = assignedCustomerId ? customers.find((c) => c.id === assignedCustomerId) : undefined;

    const isUserObject = options && 'role' in options;
    const currentUser = (isUserObject ? (options as User) : (options as any)?.user) || DatabaseService.getCurrentUser();
    const actionEffect: BankActionEffect =
      (!isUserObject && (options as any)?.actionEffect) || tx.actionEffect || 'deduct_bank_add_customer';

    if (!isUserObject && (options as any)?.receiptImage) {
      tx.receiptImage = (options as any).receiptImage;
    }

    tx.status = 'approved';
    tx.actionEffect = actionEffect;
    tx.approvedBy = currentUser.name;
    tx.approvedAt = new Date().toISOString();
    tx.updatedAt = new Date().toISOString();

    let createdReceiptId: string | undefined;

    if (customer) {
      tx.customerId = customer.id;
      tx.customerName = customer.name;

      // محاسبه اثر حسابداری کاملاً اتومات:
      // رسید (واریز به بانک) -> بستانکاری مشتری (credit)
      // برد (برداشت از بانک) -> بدهکاری مشتری (debit)
      const isReceipt = tx.type === 'deposit' || tx.txKind === 'receipt' || tx.receiptType === 'receipt';
      let debit = isReceipt ? 0 : tx.amount;
      let credit = isReceipt ? tx.amount : 0;
      let descAction = isReceipt ? 'واریز به بانک و افزایش به حساب مشتری (رسید)' : 'برداشت از بانک و کسر از حساب مشتری (برد)';

      // اضافه کردن رکورد به روزنامچه حساب مشتری
      const accounts = DatabaseService.getCustomerAccountEntries();
      const newEntry: CustomerAccountEntry = {
        id: 'ca_' + Date.now(),
        customerId: customer.id,
        date: tx.date,
        time: tx.time,
        type: isReceipt ? 'bank_deposit' : 'bank_withdraw',
        entryCategory: isReceipt ? 'receipt' : 'bard',
        referenceId: tx.id,
        description: `تراکنش ${isReceipt ? 'رسید' : 'برد'} ${tx.bankName} (${descAction}) - پیگیری: ${tx.trackingNumber}`,
        currencyCode: 'IRR_BANK', // تومان بانکی کاملاً جدا از تومان نقدی
        debit,
        credit,
        sourceCardLast4: tx.sourceCardLast4 || tx.cardLast4,
        destCardLast4: tx.destCardLast4,
        bankName: tx.bankName,
        createdAt: new Date().toISOString(),
      };
      accounts.push(newEntry);
      DatabaseService.saveCustomerAccountEntries(accounts);

      // ثبت رسید مشتری
      createdReceiptId = 'rec_bnk_' + Date.now();
      const receipts = DatabaseService.getReceipts();
      receipts.unshift({
        id: createdReceiptId,
        receiptNumber: 'BNK-' + Math.floor(100000 + Math.random() * 900000),
        type: 'bank_transaction',
        txKind: isReceipt ? 'receipt' : 'bard',
        referenceId: tx.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        date: tx.date,
        time: tx.time,
        details: {
          paymentMethod: `تومان بانکی (${tx.bankName}) - ${isReceipt ? 'رسید (واریز)' : 'برد (برداشت)'}`,
          bankName: tx.bankName,
          amount: tx.amount,
          trackingNumber: tx.trackingNumber,
          cardLast4: tx.cardLast4,
          sourceCardLast4: tx.sourceCardLast4 || tx.cardLast4,
          destCardLast4: tx.destCardLast4,
        },
        notes: `تراکنش بانکی ${isReceipt ? 'رسید' : 'برد'} با موفقیت تأیید شد. مبلغ ${tx.amount.toLocaleString()} تومان با بانک ${tx.bankName} برای مشتری ${customer.name} نهایی گردید.`,
        createdAt: new Date().toISOString(),
      });
      DatabaseService.saveReceipts(receipts);
    }

    DatabaseService.saveBankTransactions(txs);
    DatabaseService.logAudit(
      'approve',
      'bank_transaction',
      tx.id,
      `تأیید فیش بانکی به مبلغ ${tx.amount.toLocaleString()} تومان (کسر از ${tx.bankName} و افزایش به حساب ${customer ? customer.name : 'مشتری'})`,
      currentUser
    );

    return {
      success: true,
      customerName: customer?.name,
      receiptId: createdReceiptId,
    };
  }

  // رد تراکنش بانکی معلق
  static rejectBankTransaction(
    transactionId: string,
    reason?: string,
    user?: User
  ): { success: boolean; error?: string } {
    const txs = DatabaseService.getBankTransactions();
    const tx = txs.find((t) => t.id === transactionId);
    if (!tx) return { success: false, error: 'تراکنش یافت نشد' };
    if (tx.status === 'approved') return { success: false, error: 'تراکنش قبلاً تأیید شده است و امکان رد آن وجود ندارد' };

    const currentUser = user || DatabaseService.getCurrentUser();
    tx.status = 'rejected';
    tx.notes = (tx.notes ? tx.notes + ' | ' : '') + `رد شده توسط ${currentUser.name}` + (reason ? `: ${reason}` : '');
    tx.updatedAt = new Date().toISOString();
    DatabaseService.saveBankTransactions(txs);
    DatabaseService.logAudit(
      'delete',
      'bank_transaction',
      tx.id,
      `رد تراکنش بانکی معلق به مبلغ ${tx.amount.toLocaleString()} تومان (${reason || 'بدون ذکر دلیل'})`,
      currentUser
    );
    return { success: true };
  }

  // ==========================================
  // CUSTOMER ENTRY APPROVAL & REJECTION (تأیید نهایی مدیر)
  // ==========================================
  static approveCustomerAccountEntry(entryId: string, user?: User): { success: boolean; error?: string } {
    const entries = DatabaseService.getCustomerAccountEntries();
    const entry = entries.find((e) => e.id === entryId);
    if (!entry) return { success: false, error: 'سند یافت نشد' };
    if (entry.status === 'approved') return { success: false, error: 'این سند قبلاً تأیید شده است' };

    const currentUser = user || DatabaseService.getCurrentUser();
    entry.status = 'approved';
    entry.approvedBy = currentUser.name;
    entry.approvedAt = new Date().toISOString();
    DatabaseService.saveCustomerAccountEntries(entries);

    // اگر این سند به تراکنش بانکی وصل بوده باشد، تراکنش بانک هم تایید می‌شود
    if (entry.referenceId && entry.currencyCode === 'IRR_BANK') {
      const txs = DatabaseService.getBankTransactions();
      const tx = txs.find((t) => t.id === entry.referenceId);
      if (tx && tx.status === 'pending') {
        tx.status = 'approved';
        tx.approvedBy = currentUser.name;
        tx.approvedAt = new Date().toISOString();
        DatabaseService.saveBankTransactions(txs);
      }
    } else if (entry.currencyCode !== 'IRR_BANK') {
      // دخل نقدی: اعمال اثر سند به صندوق
      const isReceipt = entry.entryCategory === 'receipt' || entry.credit > 0;
      const amt = isReceipt ? entry.credit : entry.debit;
      DatabaseService.updateCashAmount(entry.currencyCode, isReceipt ? amt : -amt);
    }

    DatabaseService.logAudit(
      'approve',
      'customer',
      entry.customerId,
      `تأیید نهایی سند ${entry.entryCategory === 'receipt' ? 'رسید' : 'برد'} مشتری توسط مدیر: ${entry.description}`,
      currentUser
    );
    return { success: true };
  }

  static rejectCustomerAccountEntry(entryId: string, reason?: string, user?: User): { success: boolean; error?: string } {
    const entries = DatabaseService.getCustomerAccountEntries();
    const entry = entries.find((e) => e.id === entryId);
    if (!entry) return { success: false, error: 'سند یافت نشد' };
    if (entry.status === 'approved') return { success: false, error: 'سند تأیید شده قابل رد نیست' };

    const currentUser = user || DatabaseService.getCurrentUser();
    entry.status = 'rejected';
    entry.description = entry.description + (reason ? ` [رد شد: ${reason}]` : ' [رد شده توسط مدیر]');
    DatabaseService.saveCustomerAccountEntries(entries);

    DatabaseService.logAudit(
      'delete',
      'customer',
      entry.customerId,
      `رد سند معلق مشتری: ${entry.description}`,
      currentUser
    );
    return { success: true };
  }

  // ==========================================
  // TRADE APPROVAL & REJECTION (تأیید نهایی معامله)
  // ==========================================
  static approveTrade(tradeId: string, user?: User): { success: boolean; error?: string } {
    const trades = DatabaseService.getTrades();
    const trade = trades.find((t) => t.id === tradeId);
    if (!trade) return { success: false, error: 'معامله یافت نشد' };
    if (trade.status === 'approved') return { success: false, error: 'این معامله قبلاً تأیید شده است' };

    const currentUser = user || DatabaseService.getCurrentUser();
    trade.status = 'approved';
    trade.approvedBy = currentUser.name;
    trade.approvedAt = new Date().toISOString();
    DatabaseService.saveTrades(trades);

    // اعمال در دخل یا بانک
    if (trade.isCashSettled) {
      if (trade.type === 'buy') {
        DatabaseService.updateCashAmount(trade.currencyCode, trade.amount);
        if (trade.settlementCurrency === 'IRR_CASH') {
          DatabaseService.updateCashAmount('IRR', -trade.totalSettlementAmount);
        } else if (trade.settlementCurrency === 'IRR_BANK') {
          const banks = DatabaseService.getBanks();
          if (banks.length > 0) {
            const txs = DatabaseService.getBankTransactions();
            txs.unshift({
              id: 'tx_trade_' + Date.now(),
              bankId: banks[0].id,
              bankName: banks[0].name,
              type: 'withdraw',
              amount: trade.totalSettlementAmount,
              cardLast4: '0000',
              trackingNumber: trade.tradeNumber,
              date: trade.date,
              time: trade.time,
              status: 'approved',
              customerId: trade.customerId,
              customerName: trade.customerName,
              notes: `تسویه خرید معامله ${trade.tradeNumber}`,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
            DatabaseService.saveBankTransactions(txs);
          }
        } else {
          DatabaseService.updateCashAmount(trade.settlementCurrency, -trade.totalSettlementAmount);
        }
      } else {
        DatabaseService.updateCashAmount(trade.currencyCode, -trade.amount);
        if (trade.settlementCurrency === 'IRR_CASH') {
          DatabaseService.updateCashAmount('IRR', trade.totalSettlementAmount);
        } else if (trade.settlementCurrency === 'IRR_BANK') {
          const banks = DatabaseService.getBanks();
          if (banks.length > 0) {
            const txs = DatabaseService.getBankTransactions();
            txs.unshift({
              id: 'tx_trade_' + Date.now(),
              bankId: banks[0].id,
              bankName: banks[0].name,
              type: 'deposit',
              amount: trade.totalSettlementAmount,
              cardLast4: '0000',
              trackingNumber: trade.tradeNumber,
              date: trade.date,
              time: trade.time,
              status: 'approved',
              customerId: trade.customerId,
              customerName: trade.customerName,
              notes: `تسویه فروش معامله ${trade.tradeNumber}`,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
            DatabaseService.saveBankTransactions(txs);
          }
        } else {
          DatabaseService.updateCashAmount(trade.settlementCurrency, trade.totalSettlementAmount);
        }
      }
    }

    // تایید سندهای متناظر در حساب مشتری
    if (trade.customerId && !trade.isCashSettled) {
      const entries = DatabaseService.getCustomerAccountEntries();
      for (const e of entries) {
        if (e.referenceId === trade.id && e.status === 'pending') {
          e.status = 'approved';
          e.approvedBy = currentUser.name;
          e.approvedAt = new Date().toISOString();
        }
      }
      DatabaseService.saveCustomerAccountEntries(entries);
    }

    DatabaseService.logAudit('approve', 'trade', trade.id, `تأیید نهایی معامله ${trade.tradeNumber} توسط مدیر`, currentUser);
    return { success: true };
  }

  static rejectTrade(tradeId: string, reason?: string, user?: User): { success: boolean; error?: string } {
    const trades = DatabaseService.getTrades();
    const trade = trades.find((t) => t.id === tradeId);
    if (!trade) return { success: false, error: 'معامله یافت نشد' };
    if (trade.status === 'approved') return { success: false, error: 'معامله تأیید شده قابل رد نیست' };

    const currentUser = user || DatabaseService.getCurrentUser();
    trade.status = 'rejected';
    trade.notes = (trade.notes ? trade.notes + ' | ' : '') + `رد شده توسط ${currentUser.name}` + (reason ? `: ${reason}` : '');
    DatabaseService.saveTrades(trades);

    DatabaseService.logAudit('delete', 'trade', trade.id, `رد معامله معلق ${trade.tradeNumber}`, currentUser);
    return { success: true };
  }

  // ==========================================
  // CUSTOMER ACCOUNT BALANCES (طلب و بدهی)
  // ==========================================
  static getCustomerBalances(
    customerId: string,
    options?: { onlyActivePeriod?: boolean; periodId?: string }
  ): { [currency: string]: { debit: number; credit: number; balance: number; totalReceipts: number; totalBards: number } } {
    let entries = DatabaseService.getCustomerAccountEntries().filter((e) => e.customerId === customerId);

    if (options?.periodId) {
      entries = entries.filter((e) => e.periodId === options.periodId);
    } else if (options?.onlyActivePeriod !== false) {
      // به طور پیش‌فرض فقط اسناد دوره فعال جاری (اسنادی که هنوز در دوره‌های قبلی قفل نشده‌اند) را محاسبه می‌کند
      entries = entries.filter((e) => !e.periodId);
    }

    // فیلتر کردن اسناد رد شده
    entries = entries.filter((e) => e.status !== 'rejected');

    const summary: { [currency: string]: { debit: number; credit: number; balance: number; totalReceipts: number; totalBards: number } } = {};

    for (const e of entries) {
      if (!summary[e.currencyCode]) {
        summary[e.currencyCode] = { debit: 0, credit: 0, balance: 0, totalReceipts: 0, totalBards: 0 };
      }
      summary[e.currencyCode].debit += e.debit;
      summary[e.currencyCode].credit += e.credit;
      summary[e.currencyCode].totalBards += e.debit;
      summary[e.currencyCode].totalReceipts += e.credit;
      // balance: مثبت یعنی طلب مشتری از ما (بستانکاری مشتری) / منفی یعنی بدهکاری مشتری به ما
      summary[e.currencyCode].balance += e.credit - e.debit;
    }

    return summary;
  }

  // کل طلب‌ها و بدهی‌های تجمیعی صرافی
  static getTotalReceivablesAndPayables(): {
    receivables: { [cur: string]: number }; // طلب صرافی از مشتریان (جایی که مشتری بدهکار است)
    payables: { [cur: string]: number }; // بدهی صرافی به مشتریان (جایی که مشتری بستانکار است)
  } {
    const customers = DatabaseService.getCustomers();
    const receivables: { [cur: string]: number } = {};
    const payables: { [cur: string]: number } = {};

    for (const c of customers) {
      const balances = DatabaseService.getCustomerBalances(c.id);
      for (const [cur, data] of Object.entries(balances)) {
        if (data.balance < 0) {
          // مشتری بدهکار است -> صرافی طلبکار است
          receivables[cur] = (receivables[cur] || 0) + Math.abs(data.balance);
        } else if (data.balance > 0) {
          // مشتری بستانکار است -> صرافی بدهکار است
          payables[cur] = (payables[cur] || 0) + data.balance;
        }
      }
    }

    return { receivables, payables };
  }

  // ==========================================
  // ADD TRADE (خرید و فروش ارز)
  // ==========================================
  static executeTrade(params: {
    type: TradeType;
    currencyCode: string;
    amount: number;
    rate: number;
    settlementCurrency: string; // 'AFN', 'IRR_CASH', 'IRR_BANK', 'USD'
    customerId?: string;
    customerType: Customer['type'];
    customerName: string;
    customerPhone?: string;
    isCashSettled: boolean;
    notes?: string;
    isApproved?: boolean;
  }): { success: boolean; error?: string; trade?: Trade; receipt?: Receipt } {
    const currencies = DatabaseService.getCurrencies();
    const curr = currencies.find((c) => c.code === params.currencyCode);
    if (!curr) return { success: false, error: 'ارز معامله معتبر نیست' };

    const isApproved = params.isApproved !== undefined ? params.isApproved : true;

    // محاسبه مبلغ تسویه (با در نظر گرفتن واحد ۱۰۰۰ تومانی/افغانی در صورت لزوم)
    let totalSettlement = 0;
    if (curr.isBaseRateUnit1000) {
      totalSettlement = (params.amount / 1000) * params.rate;
    } else {
      totalSettlement = params.amount * params.rate;
    }

    // سود یا ضرر تقریبی نسبت به نرخ پایه بازار
    const marketBuyRate = curr.buyRate;
    const marketSellRate = curr.sellRate;
    let profitOrLoss = 0;
    if (params.type === 'buy') {
      // اگر ارزان‌تر از نرخ فروش بازار خریده باشیم = سود
      profitOrLoss = Math.max(0, (marketSellRate - params.rate) * (curr.isBaseRateUnit1000 ? params.amount / 1000 : params.amount));
    } else {
      // فروش: اگر گران‌تر از نرخ خرید بازار فروخته باشیم = سود
      profitOrLoss = Math.max(0, (params.rate - marketBuyRate) * (curr.isBaseRateUnit1000 ? params.amount / 1000 : params.amount));
    }

    // ایجاد مشتری رهروی در صورت نبود
    let finalCustomerId = params.customerId;
    const customers = DatabaseService.getCustomers();
    if (!finalCustomerId) {
      const newCust: Customer = {
        id: 'cust_tr_' + Date.now(),
        type: params.customerType,
        name: params.customerName.trim() || 'مشتری ناشناس',
        phone: params.customerPhone,
        status: 'active',
        notes: `ایجاد خودکار در معامله ${params.currencyCode}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      customers.unshift(newCust);
      DatabaseService.saveCustomers(customers);
      finalCustomerId = newCust.id;
    }

    const tradeId = 'trd_' + Date.now();
    const tradeNumber = 'TR-' + Math.floor(1000 + Math.random() * 9000);
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);

    const currentUser = DatabaseService.getCurrentUser();

    const trade: Trade = {
      id: tradeId,
      tradeNumber,
      type: params.type,
      currencyCode: params.currencyCode,
      amount: params.amount,
      rate: params.rate,
      settlementCurrency: params.settlementCurrency,
      totalSettlementAmount: totalSettlement,
      customerId: finalCustomerId,
      customerType: params.customerType,
      customerName: params.customerName,
      customerPhone: params.customerPhone,
      isCashSettled: params.isCashSettled,
      date: dateStr,
      time: timeStr,
      notes: params.notes,
      profitOrLoss,
      status: isApproved ? 'approved' : 'pending',
      approvedBy: isApproved ? currentUser.name : undefined,
      approvedAt: isApproved ? now.toISOString() : undefined,
      createdAt: now.toISOString(),
      createdById: currentUser.id,
    };

    // به روزرسانی دخل نقدی یا حساب بانکی در صورت تسویه نقدی/مستقیم و تأیید
    if (params.isCashSettled && isApproved) {
      if (params.type === 'buy') {
        // ما ارز را خریدیم -> ارز به دخل اضافه می‌شود
        DatabaseService.updateCashAmount(params.currencyCode, params.amount);
        // مبلغ تسویه از دخل یا بانک پرداخت می‌شود
        if (params.settlementCurrency === 'IRR_CASH') {
          DatabaseService.updateCashAmount('IRR', -totalSettlement);
        } else if (params.settlementCurrency === 'IRR_BANK') {
          // کسر از اولین بانک در دسترس به عنوان برداشت
          const banks = DatabaseService.getBanks();
          if (banks.length > 0) {
            const txs = DatabaseService.getBankTransactions();
            txs.unshift({
              id: 'tx_auto_' + Date.now(),
              bankId: banks[0].id,
              bankName: banks[0].name,
              type: 'withdraw',
              amount: totalSettlement,
              cardLast4: '0000',
              trackingNumber: tradeNumber,
              date: dateStr,
              time: timeStr,
              status: 'approved',
              customerId: finalCustomerId,
              customerName: params.customerName,
              notes: `تسویه خرید معامله ${tradeNumber}`,
              createdAt: now.toISOString(),
              updatedAt: now.toISOString(),
            });
            DatabaseService.saveBankTransactions(txs);
          }
        } else {
          DatabaseService.updateCashAmount(params.settlementCurrency, -totalSettlement);
        }
      } else {
        // فروش: ارز از دخل کسر می‌شود
        DatabaseService.updateCashAmount(params.currencyCode, -params.amount);
        // مبلغ تسویه دریافت شده به دخل یا بانک اضافه می‌شود
        if (params.settlementCurrency === 'IRR_CASH') {
          DatabaseService.updateCashAmount('IRR', totalSettlement);
        } else if (params.settlementCurrency === 'IRR_BANK') {
          const banks = DatabaseService.getBanks();
          if (banks.length > 0) {
            const txs = DatabaseService.getBankTransactions();
            txs.unshift({
              id: 'tx_auto_' + Date.now(),
              bankId: banks[0].id,
              bankName: banks[0].name,
              type: 'deposit',
              amount: totalSettlement,
              cardLast4: '0000',
              trackingNumber: tradeNumber,
              date: dateStr,
              time: timeStr,
              status: 'approved',
              customerId: finalCustomerId,
              customerName: params.customerName,
              notes: `تسویه فروش معامله ${tradeNumber}`,
              createdAt: now.toISOString(),
              updatedAt: now.toISOString(),
            });
            DatabaseService.saveBankTransactions(txs);
          }
        } else {
          DatabaseService.updateCashAmount(params.settlementCurrency, totalSettlement);
        }
      }
    } else if (!params.isCashSettled) {
      // معامله نسیه یا ثبتی روی حساب مشتری: ثبت سند در حساب مشتری
      const accounts = DatabaseService.getCustomerAccountEntries();
      if (params.type === 'buy') {
        // ما ارز از مشتری خریدیم اما هنوز پول تسویه را نداده‌ایم -> مشتری طلبکار (بستانکار) می‌شود
        accounts.push({
          id: 'ca_' + Date.now() + '_1',
          customerId: finalCustomerId,
          date: dateStr,
          time: timeStr,
          type: 'trade_settlement',
          entryCategory: 'receipt',
          referenceId: tradeId,
          description: `معامله ${tradeNumber}: طلب بابت فروش ${params.amount} ${curr.name} به صرافی`,
          currencyCode: params.settlementCurrency,
          debit: 0,
          credit: totalSettlement,
          status: isApproved ? 'approved' : 'pending',
          approvedBy: isApproved ? currentUser.name : undefined,
          approvedAt: isApproved ? now.toISOString() : undefined,
          createdAt: now.toISOString(),
        });
        // در صورت تایید، ارز خریداری شده وارد دخل ما می‌شود
        if (isApproved) {
          DatabaseService.updateCashAmount(params.currencyCode, params.amount);
        }
      } else {
        // ما ارز به مشتری فروختیم اما او هنوز پولش را نداده است -> مشتری بدهکار می‌شود
        accounts.push({
          id: 'ca_' + Date.now() + '_2',
          customerId: finalCustomerId,
          date: dateStr,
          time: timeStr,
          type: 'trade_settlement',
          entryCategory: 'bard',
          referenceId: tradeId,
          description: `معامله ${tradeNumber}: بدهی بابت خرید ${params.amount} ${curr.name} از صرافی`,
          currencyCode: params.settlementCurrency,
          debit: totalSettlement,
          credit: 0,
          status: isApproved ? 'approved' : 'pending',
          approvedBy: isApproved ? currentUser.name : undefined,
          approvedAt: isApproved ? now.toISOString() : undefined,
          createdAt: now.toISOString(),
        });
        // در صورت تایید، ارز فروخته شده از دخل کسر می‌شود
        if (isApproved) {
          DatabaseService.updateCashAmount(params.currencyCode, -params.amount);
        }
      }
      DatabaseService.saveCustomerAccountEntries(accounts);
    }

    // ذخیره معامله
    const allTrades = DatabaseService.getTrades();
    allTrades.unshift(trade);
    DatabaseService.saveTrades(allTrades);

    // صدور رسید
    const receipts = DatabaseService.getReceipts();
    const receipt: Receipt = {
      id: 'rec_' + Date.now(),
      receiptNumber: 'REC-' + Math.floor(100000 + Math.random() * 900000),
      type: 'trade',
      txKind: 'trade',
      referenceId: trade.id,
      customerName: params.customerName,
      customerPhone: params.customerPhone,
      date: dateStr,
      time: timeStr,
      details: {
        tradeType: params.type,
        currencyCode: params.currencyCode,
        amount: params.amount,
        rate: params.rate,
        totalAmount: totalSettlement,
        paymentMethod: params.isCashSettled ? `تسویه نقدی (${params.settlementCurrency})` : 'ثبت در حساب دفتری مشتری',
      },
      notes: params.notes || 'سند معامله ارزی با موفقیت نهایی شد.',
      createdAt: now.toISOString(),
    };
    receipts.unshift(receipt);
    DatabaseService.saveReceipts(receipts);

    // ثبت در Audit Log
    DatabaseService.logAudit(
      'create',
      'trade',
      trade.id,
      `ثبت معامله ${trade.tradeNumber}: ${params.type === 'buy' ? 'خرید' : 'فروش'} ${params.amount.toLocaleString()} ${curr.name} با نرخ ${params.rate} برای ${params.customerName}`,
      currentUser
    );

    return { success: true, trade, receipt };
  }

  // ==========================================
  // CONVERT TRANSIENT TO PERMANENT CUSTOMER
  // ==========================================
  static convertToPermanentCustomer(customerId: string, address?: string, phone?: string): boolean {
    const customers = DatabaseService.getCustomers();
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) return false;

    customer.type = 'permanent';
    if (address) customer.address = address;
    if (phone) customer.phone = phone;
    customer.updatedAt = new Date().toISOString();
    DatabaseService.saveCustomers(customers);

    DatabaseService.logAudit('update', 'customer', customer.id, `تبدیل مشتری رهروی «${customer.name}» به مشتری دائمی با حفظ تمام سوابق و اسناد قبلی`);
    return true;
  }

  // ==========================================
  // STATS & DASHBOARD DATA
  // ==========================================
  static getDashboardStats(): ExchangeStats {
    const trades = DatabaseService.getTrades();
    const bankTxs = DatabaseService.getBankTransactions();
    const customers = DatabaseService.getCustomers();
    const today = new Date().toISOString().split('T')[0];

    const todayTrades = trades.filter((t) => t.date === today);
    const pendingBankTxs = bankTxs.filter((t) => t.status === 'pending');
    const pendingTrades = trades.filter((t) => t.status === 'pending');
    const customerEntries = DatabaseService.getCustomerAccountEntries();
    const pendingCustomerEntries = customerEntries.filter((e) => e.status === 'pending');

    const totalProfit = trades.reduce((acc, t) => acc + (t.profitOrLoss > 0 ? t.profitOrLoss : 0), 0);
    const totalLoss = trades.reduce((acc, t) => acc + (t.profitOrLoss < 0 ? Math.abs(t.profitOrLoss) : 0), 0);

    const { receivables, payables } = DatabaseService.getTotalReceivablesAndPayables();

    return {
      cashAFN: DatabaseService.getCashAmount('AFN'),
      cashIRR: DatabaseService.getCashAmount('IRR'),
      cashUSD: DatabaseService.getCashAmount('USD'),
      cashPKR: DatabaseService.getCashAmount('PKR'),
      bankIRR: DatabaseService.getTotalBankIRR(),
      totalReceivables: receivables,
      totalPayables: payables,
      totalProfit,
      totalLoss,
      netProfit: totalProfit - totalLoss,
      todayTradesCount: todayTrades.length,
      pendingBankTransactionsCount: pendingBankTxs.length,
      pendingTradesCount: pendingTrades.length,
      pendingCustomerEntriesCount: pendingCustomerEntries.length,
      totalCustomersCount: customers.length,
      recentTrades: trades.slice(0, 6),
      recentBankTransactions: bankTxs.slice(0, 6),
    };
  }

  // ==========================================
  // CURRENCY BALANCE / POSITION (بلانس معاملات)
  // ==========================================
  static getCurrencyBalanceReport(): Array<{
    code: string;
    name: string;
    currentBalance: number;
    initialBalance: number;
    totalBought: number;
    totalSold: number;
    netTradeChange: number;
    receivable: number;
    payable: number;
    targetBalance: number;
    differenceFromTarget: number;
    actionAdvice: string;
  }> {
    const currencies = DatabaseService.getCurrencies();
    const balances = DatabaseService.getCashBalances();
    const trades = DatabaseService.getTrades();
    const { receivables, payables } = DatabaseService.getTotalReceivablesAndPayables();

    return currencies.map((curr) => {
      const cashObj = balances.find((b) => b.currencyCode === curr.code);
      const currentBalance = cashObj ? cashObj.amount : 0;
      const initialBalance = cashObj ? cashObj.initialBalance : 0;

      const currencyTrades = trades.filter((t) => t.currencyCode === curr.code);
      const totalBought = currencyTrades.filter((t) => t.type === 'buy').reduce((acc, t) => acc + t.amount, 0);
      const totalSold = currencyTrades.filter((t) => t.type === 'sell').reduce((acc, t) => acc + t.amount, 0);

      const netTradeChange = totalBought - totalSold;
      const target = curr.targetBalance || 0;
      const differenceFromTarget = currentBalance - target;

      let actionAdvice = '';
      if (differenceFromTarget > 0) {
        actionAdvice = `${Math.abs(differenceFromTarget).toLocaleString()} ${curr.name} مازاد بر هدف موجود است (پیشنهاد فروش)`;
      } else if (differenceFromTarget < 0) {
        actionAdvice = `نیاز به خرید ${Math.abs(differenceFromTarget).toLocaleString()} ${curr.name} جهت رسیدن به موجودی هدف`;
      } else {
        actionAdvice = 'موجودی دقیقاً مطابق بلانس هدف است';
      }

      return {
        code: curr.code,
        name: curr.name,
        currentBalance,
        initialBalance,
        totalBought,
        totalSold,
        netTradeChange,
        receivable: receivables[curr.code] || 0,
        payable: payables[curr.code] || 0,
        targetBalance: target,
        differenceFromTarget,
        actionAdvice,
      };
    });
  }

  // ==========================================
  // BACKUP & RESTORE (فایل پشتیبان JSON)
  // ==========================================
  static exportBackup(): string {
    const backupData = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      system: 'Sarafi Exchange Accounting System',
      data: {
        customers: DatabaseService.getCustomers(),
        banks: DatabaseService.getBanks(),
        bankTransactions: DatabaseService.getBankTransactions(),
        trades: DatabaseService.getTrades(),
        receipts: DatabaseService.getReceipts(),
        currencies: DatabaseService.getCurrencies(),
        cashBalances: DatabaseService.getCashBalances(),
        auditLogs: DatabaseService.getAuditLogs(),
        settings: DatabaseService.getSettings(),
        users: DatabaseService.getUsers(),
      }
    };
    return JSON.stringify(backupData, null, 2);
  }

  static importBackup(jsonContent: string): { success: boolean; message: string; count?: Record<string, number> } {
    try {
      const parsed = JSON.parse(jsonContent);
      const data = parsed.data || parsed;

      if (!data || typeof data !== 'object') {
        return { success: false, message: 'فایل پشتیبان نامعتبر است یا فرمت داده‌ها شناسایی نشد.' };
      }

      if (Array.isArray(data.customers)) {
        DatabaseService.saveCustomers(data.customers);
      }
      if (Array.isArray(data.banks)) {
        DatabaseService.saveBanks(data.banks);
      }
      if (Array.isArray(data.bankTransactions)) {
        DatabaseService.saveBankTransactions(data.bankTransactions);
      }
      if (Array.isArray(data.trades)) {
        setStore('trades', data.trades);
      }
      if (Array.isArray(data.receipts)) {
        setStore('receipts', data.receipts);
      }
      if (Array.isArray(data.currencies)) {
        DatabaseService.saveCurrencies(data.currencies);
      }
      if (Array.isArray(data.cashBalances)) {
        DatabaseService.saveCashBalances(data.cashBalances);
      }
      if (Array.isArray(data.auditLogs)) {
        setStore('audit_logs', data.auditLogs);
      }
      if (data.settings && typeof data.settings === 'object') {
        DatabaseService.saveSettings(data.settings);
      }

      DatabaseService.logAudit('update', 'settings', 'backup', 'بازیابی موفقیت‌آمیز پایگاه داده از فایل پشتیبان JSON');

      return {
        success: true,
        message: 'بازیابی اطلاعات از فایل پشتیبان با موفقیت انجام شد.',
        count: {
          customers: (data.customers || []).length,
          banks: (data.banks || []).length,
          bankTransactions: (data.bankTransactions || []).length,
          trades: (data.trades || []).length,
          receipts: (data.receipts || []).length,
        }
      };
    } catch (err: any) {
      return { success: false, message: `خطا در بازخوانی فایل JSON: ${err?.message || err}` };
    }
  }
}

import { DatabaseService } from './db';
import { formatAfghanDate } from '../utils/afghanDate';

export interface BackupDataPayload {
  version: string;
  systemName: string;
  exchangeName: string;
  exportedAtIso: string;
  afghanDate: string;
  summary: {
    banksCount: number;
    bankTransactionsCount: number;
    customersCount: number;
    customerEntriesCount: number;
    tradesCount: number;
    receiptsCount: number;
  };
  data: {
    banks: any[];
    bankTransactions: any[];
    customers: any[];
    customerAccounts: any[];
    accountPeriods?: any[];
    trades: any[];
    receipts: any[];
    currencies: any[];
    cashBalances: any[];
    settings: any;
    auditLogs: any[];
    users: any[];
  };
}

export class BackupService {
  /**
   * استخراج کامل دیتابیس به صورت یک فایل JSON و دانلود در مرورگر
   */
  static exportBackup(): { success: boolean; filename: string; payload: BackupDataPayload } {
    const settings = DatabaseService.getSettings();
    const banks = DatabaseService.getBanks();
    const bankTransactions = DatabaseService.getBankTransactions();
    const customers = DatabaseService.getCustomers();
    const customerAccounts = DatabaseService.getCustomerAccountEntries();
    const accountPeriods = DatabaseService.getAccountPeriods();
    const trades = DatabaseService.getTrades();
    const receipts = DatabaseService.getReceipts();
    const currencies = DatabaseService.getCurrencies();
    const cashBalances = DatabaseService.getCashBalances();
    const auditLogs = DatabaseService.getAuditLogs();
    const users = DatabaseService.getUsers();

    const now = new Date();
    const afghanDateStr = formatAfghanDate(now, 'full');
    const afghanDateShort = formatAfghanDate(now, 'short').replace(/\//g, '_');
    const timeFormatted = now.toTimeString().split(' ')[0].replace(/:/g, '');

    const payload: BackupDataPayload = {
      version: '2.0.0',
      systemName: 'Remix Exchange Accounting System',
      exchangeName: settings.exchangeName,
      exportedAtIso: now.toISOString(),
      afghanDate: afghanDateStr,
      summary: {
        banksCount: banks.length,
        bankTransactionsCount: bankTransactions.length,
        customersCount: customers.length,
        customerEntriesCount: customerAccounts.length,
        tradesCount: trades.length,
        receiptsCount: receipts.length,
      },
      data: {
        banks,
        bankTransactions,
        customers,
        customerAccounts,
        accountPeriods,
        trades,
        receipts,
        currencies,
        cashBalances,
        settings,
        auditLogs,
        users,
      },
    };

    const jsonString = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const filename = `sarafi_backup_${afghanDateShort}_${timeFormatted}.json`;

    // Trigger download in browser
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    DatabaseService.logAudit(
      'update',
      'settings',
      'backup_export',
      `گرفتن فایل پشتیبان (Backup) از کل سیستم در تاریخ ${afghanDateStr} شامل ${customers.length} مشتری و ${bankTransactions.length} تراکنش بانکی`
    );

    return { success: true, filename, payload };
  }

  /**
   * بازگردانی فایل پشتیبان و بازنویسی دیتابیس با داده‌های فایل JSON
   */
  static restoreBackup(jsonString: string): { success: boolean; message: string; summary?: any } {
    try {
      const parsed: BackupDataPayload = JSON.parse(jsonString);

      if (!parsed.data) {
        return { success: false, message: 'ساختار فایل پشتیبان نامعتبر است (کلید data وجود ندارد).' };
      }

      const { data } = parsed;

      if (Array.isArray(data.banks)) {
        DatabaseService.saveBanks(data.banks);
      }
      if (Array.isArray(data.bankTransactions)) {
        DatabaseService.saveBankTransactions(data.bankTransactions);
      }
      if (Array.isArray(data.customers)) {
        DatabaseService.saveCustomers(data.customers);
      }
      if (Array.isArray(data.customerAccounts)) {
        DatabaseService.saveCustomerAccountEntries(data.customerAccounts);
      }
      if (Array.isArray(data.accountPeriods)) {
        DatabaseService.saveAccountPeriods(data.accountPeriods);
      }
      if (Array.isArray(data.trades)) {
        DatabaseService.saveTrades(data.trades);
      }
      if (Array.isArray(data.receipts)) {
        DatabaseService.saveReceipts(data.receipts);
      }
      if (Array.isArray(data.currencies)) {
        DatabaseService.saveCurrencies(data.currencies);
      }
      if (Array.isArray(data.cashBalances)) {
        DatabaseService.saveCashBalances(data.cashBalances);
      }
      if (data.settings && typeof data.settings === 'object') {
        DatabaseService.saveSettings(data.settings);
      }
      if (Array.isArray(data.auditLogs)) {
        DatabaseService.saveAuditLogs(data.auditLogs);
      }
      if (Array.isArray(data.users)) {
        DatabaseService.saveUsers(data.users);
      }

      DatabaseService.logAudit(
        'update',
        'settings',
        'backup_restore',
        `بازگردانی موفق فایل پشتیبان با موفقیت انجام شد (${parsed.exchangeName || 'صرافی'} - تاریخ خروجی: ${parsed.afghanDate || 'نامشخص'})`
      );

      return {
        success: true,
        message: 'اطلاعات با موفقیت از فایل پشتیبان بازیابی شدند.',
        summary: parsed.summary || {
          banksCount: data.banks?.length || 0,
          bankTransactionsCount: data.bankTransactions?.length || 0,
          customersCount: data.customers?.length || 0,
          tradesCount: data.trades?.length || 0,
        },
      };
    } catch (err: any) {
      return {
        success: false,
        message: `خطا در خواندن و تجزیه فایل پشتیبان: ${err.message || 'فایل نامعتبر است'}`,
      };
    }
  }
}

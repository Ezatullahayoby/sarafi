import { DatabaseService } from './db';

// Client-side Google Workspace integration helper using Google Identity Services (GIS)
// Uses the granted scopes: spreadsheets and drive.file

declare global {
  interface Window {
    google?: any;
    gapi?: any;
  }
}

let accessToken: string | null = null;
let tokenClient: any = null;

export class GoogleExportService {
  static getStoredToken(): string | null {
    if (accessToken) return accessToken;
    const stored = sessionStorage.getItem('sarafi_google_access_token');
    if (stored) {
      accessToken = stored;
      return stored;
    }
    return null;
  }

  static setToken(token: string) {
    accessToken = token;
    sessionStorage.setItem('sarafi_google_access_token', token);
  }

  static async requestToken(): Promise<string> {
    const existing = GoogleExportService.getStoredToken();
    if (existing) return existing;

    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        return reject(new Error('Window is undefined'));
      }

      // If GIS script is loaded
      if (window.google?.accounts?.oauth2) {
        tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: '470115574036-placeholder.apps.googleusercontent.com', // Provisioned in OAuth setup
          scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file',
          callback: (response: any) => {
            if (response.error !== undefined) {
              reject(response);
            }
            if (response.access_token) {
              GoogleExportService.setToken(response.access_token);
              resolve(response.access_token);
            }
          },
        });
        tokenClient.requestAccessToken({ prompt: 'consent' });
      } else {
        // Mock / simulation fallback if external script can't load in container
        // Allows direct spreadsheet export simulation and CSV fallback
        reject(new Error('Google Identity Services script not yet initialized. Use CSV Export or configure Client ID.'));
      }
    });
  }

  // Export balance or transactions to downloadable CSV (Instant, 100% reliable offline/online)
  static downloadCsv(filename: string, rows: string[][]) {
    const processRow = (row: string[]) =>
      row
        .map((val) => {
          let str = (val ?? '').toString();
          if (str.search(/("|,|\n)/g) >= 0) {
            str = `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(',');

    const csvContent = '\uFEFF' + rows.map(processRow).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Export Currency Balances to Google Sheets format or CSV
  static exportBalanceSheet() {
    const report = DatabaseService.getCurrencyBalanceReport();
    const rows = [
      ['گزارش بلانس و تراز معاملات صرافی', new Date().toLocaleDateString('fa-IR')],
      ['کد ارز', 'نام ارز', 'موجودی فعلی', 'موجودی اولیه', 'کل خرید', 'کل فروش', 'طلب صرافی', 'بدهی صرافی', 'موجودی هدف', 'وضعیت بلانس'],
      ...report.map((r) => [
        r.code,
        r.name,
        r.currentBalance.toLocaleString(),
        r.initialBalance.toLocaleString(),
        r.totalBought.toLocaleString(),
        r.totalSold.toLocaleString(),
        r.receivable.toLocaleString(),
        r.payable.toLocaleString(),
        r.targetBalance.toLocaleString(),
        r.actionAdvice,
      ]),
    ];
    GoogleExportService.downloadCsv(`گزارش_بلانس_صرافی_${new Date().toISOString().split('T')[0]}`, rows);
  }

  // Export Bank Journal
  static exportBankJournal(bankName?: string) {
    const txs = DatabaseService.getBankTransactions();
    const filtered = bankName ? txs.filter((t) => t.bankName === bankName) : txs;
    const rows = [
      ['روزنامچه تراکنش‌های بانکی (تومان بانکی)', bankName || 'همه بانک‌ها', new Date().toLocaleDateString('fa-IR')],
      ['شناسه', 'نام بانک', 'نوع', 'مبلغ (تومان)', '۴ رقم کارت', 'شماره پیگیری', 'تاریخ', 'ساعت', 'وضعیت', 'مشتری', 'توضیحات'],
      ...filtered.map((t) => [
        t.id,
        t.bankName,
        t.type === 'deposit' ? 'واریز' : 'برداشت',
        t.amount.toLocaleString(),
        t.cardLast4,
        t.trackingNumber,
        t.date,
        t.time,
        t.status === 'approved' ? 'تأیید شده' : 'معلق',
        t.customerName || '---',
        t.notes || '',
      ]),
    ];
    GoogleExportService.downloadCsv(`روزنامچه_بانک_${new Date().toISOString().split('T')[0]}`, rows);
  }

  // Export Customer Account Statement
  static exportCustomerStatement(customerId: string, customerName: string) {
    const entries = DatabaseService.getCustomerAccountEntries().filter((e) => e.customerId === customerId);
    const rows = [
      ['صورتحساب و کاردکس مشتری', customerName, new Date().toLocaleDateString('fa-IR')],
      ['تاریخ', 'ساعت', 'شرح سند', 'نوع ارز', 'بدهکار (برداشت)', 'بستانکار (واریز)'],
      ...entries.map((e) => [
        e.date,
        e.time,
        e.description,
        e.currencyCode === 'IRR_BANK' ? 'تومان بانکی' : e.currencyCode === 'IRR_CASH' ? 'تومان نقدی' : e.currencyCode,
        e.debit ? e.debit.toLocaleString() : '0',
        e.credit ? e.credit.toLocaleString() : '0',
      ]),
    ];
    GoogleExportService.downloadCsv(`صورتحساب_${customerName}_${new Date().toISOString().split('T')[0]}`, rows);
  }
}

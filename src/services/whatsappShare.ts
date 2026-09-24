import { CustomerAccountEntry, Customer, Receipt } from '../types';
import { DatabaseService } from './db';
import { formatAfghanDate } from '../utils/afghanDate';

export class WhatsAppShareService {
  /**
   * ساخت متن اشتراک‌گذاری رسید یا برد انفرادی مشتری در واتساپ
   * مطابق با فرمت درخواستی صرافی
   */
  static formatCustomerEntryMessage(
    customer: Customer,
    entry: CustomerAccountEntry,
    allBalances?: { [currency: string]: { debit: number; credit: number; balance: number } }
  ): string {
    const settings = DatabaseService.getSettings();
    const isReceipt = entry.credit > 0 || entry.entryCategory === 'receipt';
    const amount = entry.credit > 0 ? entry.credit : entry.debit;
    
    // دریافت مانده‌های لحظه‌ای مشتری در صورتی که پاس داده نشده باشد
    const balances = allBalances || DatabaseService.getCustomerBalances(customer.id);

    // نوع ارز
    let currencyName = 'تومان';
    if (entry.currencyCode === 'USD') currencyName = 'دالر';
    else if (entry.currencyCode === 'PKR') currencyName = 'کلدار';
    else if (entry.currencyCode === 'AFN') currencyName = 'افغانی';
    else if (entry.currencyCode === 'IRR_CASH') currencyName = 'تومان نقدی';
    else if (entry.currencyCode === 'IRR_BANK') currencyName = 'تومان بانکی';

    // عنوان رسید یا برد
    const titleEmoji = isReceipt ? '🟢' : '🔴';
    const titleKind = isReceipt ? 'رسید' : 'برد / برداشت';
    const titleContext = entry.currencyCode === 'IRR_BANK' || entry.bankName ? `${titleKind} بانکی` : `${titleKind} نقدی`;

    // شماره سند یا فیش
    const docNumber = entry.id.replace('ca_', '').replace('manual_', '').slice(-5);

    // کارت
    const cardInfo = entry.destCardLast4 || entry.sourceCardLast4;
    const bankName = entry.bankName ? ` (${entry.bankName})` : '';

    // فرمت‌بندی ترازها با نماد مثبت (+) و منفی (-)
    const formatBalance = (val: number, symbolSuffix: string) => {
      if (val === 0) return `0`;
      const sign = val > 0 ? `+` : ``;
      return `${sign}${val.toLocaleString()} ${symbolSuffix}`;
    };

    const afnBal = balances['AFN']?.balance || 0;
    const usdBal = balances['USD']?.balance || 0;
    const pkrBal = balances['PKR']?.balance || 0;
    const irrCashBal = balances['IRR_CASH']?.balance || 0;
    const irrBankBal = balances['IRR_BANK']?.balance || 0;

    let text = `*🏢 ${settings.exchangeName || 'شرکت صرافی و خدمات پولی'}*\n\n`;
    text += `${titleEmoji} *${titleContext}*\n`;
    text += `👤 محترم : ${customer.name}\n`;
    text += `🧾 نمبر سند: *${docNumber}*\n`;
    text += `💰 مبلغ: *${amount.toLocaleString()} ${currencyName}*\n`;

    if (cardInfo) {
      const cardLabel = isReceipt ? 'از کارت' : 'به کارت';
      text += `📥 ${cardLabel}: ****${cardInfo}${bankName}\n`;
    }

    if (entry.description) {
      text += `📋 توضیحات: ${entry.description}\n`;
    }

    text += `📅 تاریخ: ${entry.date} - ${entry.time}\n`;
    text += `📊 موجودی فعلی شما:\n`;
    text += `──────────────\n`;
    text += `🇦🇫 افغانی نقدی: _${formatBalance(afnBal, '؋')}_\n`;
    text += `🇺🇸 دالر نقدی: _${formatBalance(usdBal, '$')}_\n`;
    if (pkrBal !== 0) {
      text += `🇵🇰 کلدار نقدی: _${formatBalance(pkrBal, '₨')}_\n`;
    }
    text += `🇮🇷 تومان نقدی: *${formatBalance(irrCashBal, 'تومان')}*\n`;
    text += `🇮🇷 تومان بانکی: _${formatBalance(irrBankBal, 'تومان')}_`;

    return text;
  }

  /**
   * ساخت متن صورت‌حساب کل مشتری (بلانس) جهت اشتراک‌گذاری
   */
  static formatCustomerBalanceSummary(
    customer: Customer,
    allBalances?: { [currency: string]: { debit: number; credit: number; balance: number } }
  ): string {
    const settings = DatabaseService.getSettings();
    const balances = allBalances || DatabaseService.getCustomerBalances(customer.id);

    const formatBalance = (val: number, symbolSuffix: string) => {
      if (val === 0) return `0`;
      const sign = val > 0 ? `+` : ``;
      return `${sign}${val.toLocaleString()} ${symbolSuffix}`;
    };

    const afnBal = balances['AFN']?.balance || 0;
    const usdBal = balances['USD']?.balance || 0;
    const pkrBal = balances['PKR']?.balance || 0;
    const irrCashBal = balances['IRR_CASH']?.balance || 0;
    const irrBankBal = balances['IRR_BANK']?.balance || 0;

    let text = `*🏢 ${settings.exchangeName || 'شرکت صرافی و خدمات پولی'}*\n\n`;
    text += `📋 *صورتحساب و بلانس حساب*\n`;
    text += `👤 محترم: ${customer.name}\n`;
    if (customer.phone) text += `📞 شماره تماس: ${customer.phone}\n`;
    text += `📅 تاریخ محاسبه: ${new Date().toISOString().split('T')[0]}\n`;
    text += `📊 وضعیت موجودی‌ها / بدهی و طلب:\n`;
    text += `──────────────\n`;
    text += `🇦🇫 افغانی: *${formatBalance(afnBal, '؋')}* (${afnBal >= 0 ? 'طلب شما' : 'بدهی شما'})\n`;
    text += `🇺🇸 دالر: *${formatBalance(usdBal, '$')}* (${usdBal >= 0 ? 'طلب شما' : 'بدهی شما'})\n`;
    if (pkrBal !== 0) {
      text += `🇵🇰 کلدار: *${formatBalance(pkrBal, '₨')}* (${pkrBal >= 0 ? 'طلب شما' : 'بدهی شما'})\n`;
    }
    text += `🇮🇷 تومان نقدی: *${formatBalance(irrCashBal, 'تومان')}* (${irrCashBal >= 0 ? 'طلب شما' : 'بدهی شما'})\n`;
    text += `🇮🇷 تومان بانکی: *${formatBalance(irrBankBal, 'تومان')}* (${irrBankBal >= 0 ? 'طلب شما' : 'بدهی شما'})\n`;
    text += `──────────────\n`;
    text += `⚠️ مثبت (+) نشان‌دهنده طلب شما از صرافی و منفی (-) نشان‌دهنده بدهی می‌باشد.`;

    return text;
  }

  /**
   * اشتراک‌گذاری رسید رسمی (Receipt) در واتساپ
   */
  static formatOfficialReceiptMessage(receipt: Receipt): string {
    const settings = DatabaseService.getSettings();
    const isRec = receipt.txKind === 'receipt' || receipt.details.tradeType === 'buy';
    const titleEmoji = isRec ? '🟢' : '🔴';
    const titleKind = isRec ? 'رسید دریافت وجه / خرید ارز' : 'رسید پرداخت وجه / فروش ارز';

    let text = `*🏢 ${settings.exchangeName || 'شرکت صرافی و خدمات پولی'}*\n\n`;
    text += `${titleEmoji} *${titleKind}*\n`;
    text += `👤 محترم: ${receipt.customerName}\n`;
    text += `🧾 نمبر سند / رسید: *${receipt.receiptNumber}*\n`;

    if (receipt.details.tradeType) {
      text += `💱 نوع معامله: *${receipt.details.tradeType === 'buy' ? 'خرید' : 'فروش'} ارز ${receipt.details.currencyCode}*\n`;
      text += `💰 مقدار ارز: *${receipt.details.amount?.toLocaleString()} ${receipt.details.currencyCode}*\n`;
      text += `📈 نرخ تبدیل: *${receipt.details.rate}*\n`;
      text += `💵 مبلغ کل تسویه: *${receipt.details.totalAmount?.toLocaleString()}*\n`;
    } else {
      text += `💰 مبلغ: *${receipt.details.amount?.toLocaleString()} تومان*\n`;
    }

    if (receipt.details.bankName) {
      text += `🏦 بانک عامل: ${receipt.details.bankName}\n`;
    }
    if (receipt.details.cardLast4 || receipt.details.destCardLast4) {
      text += `💳 کارت: ****${receipt.details.destCardLast4 || receipt.details.cardLast4}\n`;
    }
    if (receipt.details.trackingNumber) {
      text += `🔢 شماره پیگیری: ${receipt.details.trackingNumber}\n`;
    }
    if (receipt.notes) {
      text += `📋 توضیحات: ${receipt.notes}\n`;
    }

    text += `📅 تاریخ: ${formatAfghanDate(receipt.date)} - ${receipt.time}\n`;
    return text;
  }

  /**
   * باز کردن مستقیم واتساپ یا کپی کردن متن
   */
  static openWhatsApp(phone: string | undefined, message: string): void {
    // پاکسازی شماره تلفن
    let cleanPhone = (phone || '').replace(/\D/g, '');
    if (cleanPhone.startsWith('00')) cleanPhone = cleanPhone.substring(2);
    if (cleanPhone.startsWith('0')) {
      // اگر با 0 شروع شده، شماره داخلی است. اگر ۹۳ افغان باشد
      cleanPhone = '93' + cleanPhone.substring(1);
    }

    const encoded = encodeURIComponent(message);
    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    
    // باز کردن پنجره واتساپ
    window.open(url, '_blank');
  }

  /**
   * کپی متن در حافظه کلیپ‌بورد با فال‌بک
   */
  static async copyToClipboard(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      // فال‌بک برای مرورگرهایی که دسترسی ندارند
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch (e) {
      console.error('Failed to copy to clipboard', e);
      return false;
    }
  }
}

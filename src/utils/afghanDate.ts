/**
 * سامانه مدیریت تقویم و تاریخ شمسی افغانستان (هجری خورشیدی)
 * ماه‌های افغانستان: حمل، ثور، جوزا، سرطان، اسد، سنبله، میزان، عقرب، قوس، جدی، دلو، حوت
 */

export const AFGHAN_MONTHS = [
  'حمل',
  'ثور',
  'جوزا',
  'سرطان',
  'اسد',
  'سنبله',
  'میزان',
  'عقرب',
  'قوس',
  'جدی',
  'دلو',
  'حوت',
] as const;

export const IRANIAN_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
] as const;

export const WEEK_DAYS_AFGHAN = [
  'یک‌شنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنج‌شنبه',
  'جمعه',
  'شنبه',
] as const;

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export function toPersianDigits(input: string | number): string {
  if (input === null || input === undefined) return '';
  const str = input.toString();
  return str.replace(/\d/g, (d) => PERSIAN_DIGITS[parseInt(d, 10)]);
}

export function fromPersianDigits(input: string): string {
  if (!input) return '';
  return input
    .replace(/[۰-۹]/g, (d) => PERSIAN_DIGITS.indexOf(d).toString())
    .replace(/[٠-٩]/g, (d) => (d.charCodeAt(0) - 1632).toString());
}

/**
 * تبدیل میلادی به هجری خورشیدی (شمسی)
 */
export function gregorianToSolar(dateInput?: Date | string | null): {
  year: number;
  month: number;
  day: number;
  monthName: string;
  dayOfWeek: string;
} {
  let date: Date;
  if (!dateInput) {
    date = new Date();
  } else if (typeof dateInput === 'string') {
    // اگر فرمت YYYY-MM-DD یا YYYY/MM/DD باشد
    if ((dateInput.includes('-') || dateInput.includes('/')) && dateInput.length <= 10) {
      const sep = dateInput.includes('-') ? '-' : '/';
      const parts = dateInput.split(sep).map(Number);
      // اگر سال کمتر از 1700 بود، خودش شمسی است!
      if (parts[0] < 1700 && parts[0] > 1300) {
        return {
          year: parts[0],
          month: parts[1] || 1,
          day: parts[2] || 1,
          monthName: AFGHAN_MONTHS[(parts[1] || 1) - 1] || '',
          dayOfWeek: '',
        };
      }
      date = new Date(parts[0], parts[1] - 1, parts[2] || 1, 12, 0, 0);
    } else {
      date = new Date(dateInput);
    }
  } else {
    date = dateInput;
  }

  if (isNaN(date.getTime())) {
    date = new Date();
  }

  const gy = date.getFullYear();
  const gm = date.getMonth() + 1;
  const gd = date.getDate();
  const dayOfWeekIndex = date.getDay();

  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    355666 +
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) +
    gd +
    g_d_m[gm - 1];

  let jy = -1595 + 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;

  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }

  const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);

  return {
    year: jy,
    month: jm,
    day: jd,
    monthName: AFGHAN_MONTHS[jm - 1] || '',
    dayOfWeek: WEEK_DAYS_AFGHAN[dayOfWeekIndex] || '',
  };
}

/**
 * تبدیل هجری خورشیدی (شمسی) به میلادی
 */
export function solarToGregorian(jy: number, jm: number, jd: number): Date {
  let sal_a: number[], gy: number, gm: number, gd: number, days: number;
  jy += 1595;
  days =
    -355668 +
    365 * jy +
    Math.floor(jy / 33) * 8 +
    Math.floor(((jy % 33) + 3) / 4) +
    jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);

  gy = 400 * Math.floor(days / 146097);
  days %= 146097;

  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }

  gy += 4 * Math.floor(days / 1461);
  days %= 1461;

  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }

  gd = days + 1;
  sal_a = [0, 31, (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  for (gm = 0; gm < 13 && gd > sal_a[gm]; gm++) gd -= sal_a[gm];

  return new Date(gy, gm - 1, gd, 12, 0, 0);
}

/**
 * تبدیل رشته تاریخ شمسی مانند "1403/07/02" یا "1403-07-02" به تاریخ میلادی YYYY-MM-DD
 */
export function solarStringToGregorian(solarStr: string): string {
  if (!solarStr) return new Date().toISOString().split('T')[0];
  const clean = fromPersianDigits(solarStr).trim();
  const sep = clean.includes('/') ? '/' : clean.includes('-') ? '-' : '';
  if (!sep) return clean;

  const parts = clean.split(sep).map(Number);
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return new Date().toISOString().split('T')[0];
  }

  // اگر سال بیشتر از ۱۷۰۰ بود، خودش میلادی است
  if (parts[0] > 1700) {
    const mm = parts[1] < 10 ? `0${parts[1]}` : `${parts[1]}`;
    const dd = parts[2] < 10 ? `0${parts[2]}` : `${parts[2]}`;
    return `${parts[0]}-${mm}-${dd}`;
  }

  const gDate = solarToGregorian(parts[0], parts[1], parts[2]);
  const gy = gDate.getFullYear();
  const gm = gDate.getMonth() + 1;
  const gd = gDate.getDate();
  const gmm = gm < 10 ? `0${gm}` : `${gm}`;
  const gdd = gd < 10 ? `0${gd}` : `${gd}`;
  return `${gy}-${gmm}-${gdd}`;
}

/**
 * دریافت تاریخ به فرمت استاندارد شمسی ۱۴۰۴/۰۶/۲۲
 */
export function gregorianToSolarString(dateInput?: Date | string | null): string {
  const solar = gregorianToSolar(dateInput);
  const mm = solar.month < 10 ? `0${solar.month}` : `${solar.month}`;
  const dd = solar.day < 10 ? `0${solar.day}` : `${solar.day}`;
  return `${solar.year}/${mm}/${dd}`;
}

/**
 * فرمت تاریخ شمسی افغانستان به صورت متنی یا عددی
 * full: ۲۲ سنبله ۱۴۰۴
 * short: ۱۴۰۴/۰۶/۲۲
 * withDay: سه‌شنبه، ۲۲ سنبله ۱۴۰۴
 */
export function formatAfghanDate(
  dateInput?: Date | string | null,
  format: 'full' | 'short' | 'withDay' = 'full',
  persianDigits = false
): string {
  if (!dateInput) return '';
  const solar = gregorianToSolar(dateInput);

  let formatted = '';
  if (format === 'short') {
    const mm = solar.month < 10 ? `0${solar.month}` : `${solar.month}`;
    const dd = solar.day < 10 ? `0${solar.day}` : `${solar.day}`;
    formatted = `${solar.year}/${mm}/${dd}`;
  } else if (format === 'withDay') {
    formatted = `${solar.dayOfWeek}، ${solar.day} ${solar.monthName} ${solar.year}`;
  } else {
    formatted = `${solar.day} ${solar.monthName} ${solar.year}`;
  }

  return persianDigits ? toPersianDigits(formatted) : formatted;
}

/**
 * نمایش همزمان تاریخ شمسی افغانستان با ساعت
 */
export function formatAfghanDateTime(
  dateInput?: Date | string | null,
  timeStr?: string,
  persianDigits = false
): string {
  const dStr = formatAfghanDate(dateInput, 'full', persianDigits);
  if (!timeStr) return dStr;
  const timeFormatted = persianDigits ? toPersianDigits(timeStr) : timeStr;
  return `${dStr} - ساعت ${timeFormatted}`;
}

/**
 * دریافت تاریخ امروز به شمسی افغانستان با نام ماه
 */
export function getAfghanTodayFull(): string {
  return formatAfghanDate(new Date(), 'withDay');
}

/**
 * دریافت تاریخ امروز شمسی به فرمت ۱۴۰۴/۰۶/۲۲
 */
export function getAfghanTodayShort(): string {
  return formatAfghanDate(new Date(), 'short');
}

/**
 * فرمت‌بندی اعداد مالی با جداکننده هزارگان (کامای ۳ رقمی)
 */
export function formatMoney(amount: number | string | undefined | null): string {
  if (amount === undefined || amount === null || amount === '') return '0';
  const num = typeof amount === 'number' ? amount : parseFloat(amount.toString().replace(/,/g, ''));
  if (isNaN(num)) return '0';
  return num.toLocaleString('en-US');
}

/**
 * 臺灣證券交易所 (TWSE) 與 櫃買中心 (TPEx) 市場交易時間判斷工具
 * 遵循 SPEC 13.3 規定：平日 09:00–13:30，非交易時段與假日不主動發起背景輪詢
 */

export interface MarketHoursOptions {
  /** 允許開盤前後的緩衝分鐘數（預設 5 分鐘，即 08:55 ~ 13:35） */
  bufferMinutes?: number;
}

/**
 * 取得指定時間在台灣時區 (Asia/Taipei, UTC+8) 的時間物件
 */
export function getTaiwanDate(date: Date = new Date()): {
  year: number;
  month: number;
  day: number;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  hours: number;
  minutes: number;
  seconds: number;
  dateString: string; // YYYY-MM-DD
} {
  // 使用 Intl.DateTimeFormat 確保在任何系統環境/時區下均精確轉換為台灣時間
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const findPart = (type: string) => parts.find((p) => p.type === type)?.value || '';

  const year = parseInt(findPart('year'), 10);
  const month = parseInt(findPart('month'), 10);
  const day = parseInt(findPart('day'), 10);
  const hours = parseInt(findPart('hour'), 10);
  const minutes = parseInt(findPart('minute'), 10);
  const seconds = parseInt(findPart('second'), 10);

  const weekdayStr = findPart('weekday');
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const dayOfWeek = weekdayMap[weekdayStr] ?? 0;

  const monthStr = String(month).padStart(2, '0');
  const dayStr = String(day).padStart(2, '0');
  const dateString = `${year}-${monthStr}-${dayStr}`;

  return {
    year,
    month,
    day,
    dayOfWeek,
    hours,
    minutes,
    seconds,
    dateString,
  };
}

/**
 * 判斷當前是否為台股常態盤中交易時段 (平日 09:00 ~ 13:30，含緩衝 08:55 ~ 13:35)
 */
export function isTaiwanMarketHours(now: Date = new Date(), options?: MarketHoursOptions): boolean {
  const tw = getTaiwanDate(now);

  // 週六 (6) 與 週日 (0) 休市
  if (tw.dayOfWeek === 0 || tw.dayOfWeek === 6) {
    return false;
  }

  const buffer = options?.bufferMinutes ?? 5;
  const startMinute = 9 * 60 - buffer; // 08:55 (535)
  const endMinute = 13 * 60 + 30 + buffer; // 13:35 (815)

  const currentMinute = tw.hours * 60 + tw.minutes;

  return currentMinute >= startMinute && currentMinute <= endMinute;
}

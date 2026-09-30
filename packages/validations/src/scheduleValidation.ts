/**
 * Laundelle Centralized Schedule Validation Utility
 *
 * Implements robust date/time slot interval validation, current-time handling with
 * configurable lead times, same-day sequence rules, and format normalization.
 */

export interface ScheduleConfig {
  /** Minimum minutes between current time and slot start time for today's slots */
  minBookingLeadMinutes: number;
  /** Available pickup time slots */
  pickupSlots: string[];
  /** Available delivery time slots */
  deliverySlots: string[];
}

export const DEFAULT_SCHEDULE_CONFIG: ScheduleConfig = {
  minBookingLeadMinutes: 30,
  pickupSlots: [
    '09:00 - 12:00',
    '14:00 - 17:00',
    '18:00 - 21:00',
    '08:00 AM - 10:00 AM',
    '10:00 AM - 12:00 PM',
    '02:00 PM - 04:00 PM',
    '06:00 PM - 08:00 PM',
  ],
  deliverySlots: [
    '09:00 - 12:00',
    '14:00 - 17:00',
    '18:00 - 21:00',
    '10:00 AM - 12:00 PM',
    '02:00 PM - 04:00 PM',
    '05:00 PM - 07:00 PM',
    '08:00 PM - 10:00 PM',
  ],
};

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface SlotAvailability {
  slot: string;
  disabled: boolean;
  reason?: string;
}

/**
 * Normalizes and parses a date string into year, month (1-12), day (1-31) and midnight local Date.
 * Supports:
 * - YYYY-MM-DD (e.g., 2026-09-15)
 * - DD-MM-YYYY (e.g., 15-09-2026)
 * - DD/MM/YYYY (e.g., 15/09/2026)
 * - YYYY/MM/DD (e.g., 2026/09/15)
 * - ISO string (e.g., 2026-09-15T00:00:00.000Z)
 */
export function parseDateString(dateStr: string): { year: number; month: number; day: number; date: Date } | null {
  if (!dateStr || typeof dateStr !== 'string') return null;

  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  let year: number;
  let month: number;
  let day: number;

  // 1. Check YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:T.*)?$/);
  if (ymdMatch) {
    year = parseInt(ymdMatch[1], 10);
    month = parseInt(ymdMatch[2], 10);
    day = parseInt(ymdMatch[3], 10);
  } else {
    // 2. Check DD-MM-YYYY or DD/MM/YYYY
    const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:T.*)?$/);
    if (dmyMatch) {
      day = parseInt(dmyMatch[1], 10);
      month = parseInt(dmyMatch[2], 10);
      year = parseInt(dmyMatch[3], 10);
    } else {
      // 3. Fallback to Date.parse
      const parsed = new Date(trimmed);
      if (isNaN(parsed.getTime())) return null;
      year = parsed.getFullYear();
      month = parsed.getMonth() + 1;
      day = parsed.getDate();
    }
  }

  // Validate range
  if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  // Check actual day limit for given year/month
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day > daysInMonth) return null;

  // Create date at local midnight
  const date = new Date(year, month - 1, day, 0, 0, 0, 0);
  return { year, month, day, date };
}

/**
 * Parses time string like "08:00 AM" or "14:00" into hours (0-23) and minutes (0-59).
 */
export function parseTimeComponent(timeStr: string): { hours: number; minutes: number } | null {
  if (!timeStr) return null;
  const trimmed = timeStr.trim();

  // 1. Check 12-hour format with AM/PM (e.g. "08:00 AM", "2:00 PM")
  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const period = match12[3].toUpperCase();

    if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) return null;

    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    return { hours, minutes };
  }

  // 2. Check 24-hour format (e.g. "14:00", "09:00", "9:00", "18:30")
  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = parseInt(match24[2], 10);

    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

    return { hours, minutes };
  }

  return null;
}

/**
 * Converts a slot string (e.g. "08:00 AM - 10:00 AM") and base date into start/end Date objects.
 */
export function parseTimeSlot(
  slotStr: string,
  baseDate: Date
): { start: Date; end: Date } | null {
  if (!slotStr || !baseDate || isNaN(baseDate.getTime())) return null;

  const parts = slotStr.split('-');
  if (parts.length !== 2) return null;

  const startComp = parseTimeComponent(parts[0]);
  const endComp = parseTimeComponent(parts[1]);
  if (!startComp || !endComp) return null;

  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const day = baseDate.getDate();

  const start = new Date(year, month, day, startComp.hours, startComp.minutes, 0, 0);
  const end = new Date(year, month, day, endComp.hours, endComp.minutes, 0, 0);

  // If slot spans over midnight (e.g., 11:00 PM - 01:00 AM)
  if (end.getTime() <= start.getTime()) {
    end.setDate(end.getDate() + 1);
  }

  return { start, end };
}

/**
 * Returns today's date formatted as YYYY-MM-DD for HTML input[type="date"] min attribute.
 */
export function getTodayYyyyMmDd(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Formats a Date or date string to YYYY-MM-DD.
 */
export function formatDateToYyyyMmDd(dateInput: Date | string): string {
  if (!dateInput) return '';
  if (typeof dateInput === 'string') {
    const parsed = parseDateString(dateInput);
    if (!parsed) return dateInput;
    return `${parsed.year}-${String(parsed.month).padStart(2, '0')}-${String(parsed.day).padStart(2, '0')}`;
  }
  return getTodayYyyyMmDd(dateInput);
}

/**
 * Formats a Date or date string to DD-MM-YYYY.
 */
export function formatDateToDdMmYyyy(dateInput: Date | string): string {
  if (!dateInput) return '';
  const parsed = typeof dateInput === 'string' ? parseDateString(dateInput) : {
    year: dateInput.getFullYear(),
    month: dateInput.getMonth() + 1,
    day: dateInput.getDate(),
  };
  if (!parsed) return typeof dateInput === 'string' ? dateInput : '';
  return `${String(parsed.day).padStart(2, '0')}-${String(parsed.month).padStart(2, '0')}-${parsed.year}`;
}

/**
 * Checks if two dates fall on the exact same calendar day in local time.
 */
export function isSameCalendarDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

// =========================================================================
// VALIDATION HELPERS
// =========================================================================

/**
 * Validates Pickup Date:
 * - Must not be empty or invalid date.
 * - Must not be in the past (before local today midnight).
 */
export function isPickupDateValid(
  pickupDate: string,
  now: Date = new Date(),
  _config: ScheduleConfig = DEFAULT_SCHEDULE_CONFIG
): ValidationResult {
  if (!pickupDate || !pickupDate.trim()) {
    return { valid: false, error: 'Pickup Date is required.' };
  }

  const parsed = parseDateString(pickupDate);
  if (!parsed) {
    return { valid: false, error: 'Pickup Date is invalid. Please select a valid date.' };
  }

  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  if (parsed.date.getTime() < todayMidnight.getTime()) {
    return { valid: false, error: 'Pickup Date cannot be in the past.' };
  }

  return { valid: true };
}

/**
 * Validates Pickup Time Slot:
 * - Must not be empty.
 * - Must be a valid interval.
 * - If Pickup Date is today, slot start time must be at least minBookingLeadMinutes after current time.
 */
export function isPickupTimeSlotValid(
  pickupDate: string,
  pickupSlot: string,
  now: Date = new Date(),
  config: ScheduleConfig = DEFAULT_SCHEDULE_CONFIG
): ValidationResult {
  const dateCheck = isPickupDateValid(pickupDate, now, config);
  if (!dateCheck.valid) {
    return dateCheck;
  }

  if (!pickupSlot || !pickupSlot.trim()) {
    return { valid: false, error: 'Pickup Time Slot is required.' };
  }

  const parsedDate = parseDateString(pickupDate);
  if (!parsedDate) {
    return { valid: false, error: 'Pickup Date is invalid.' };
  }

  const slotInterval = parseTimeSlot(pickupSlot, parsedDate.date);
  if (!slotInterval) {
    return { valid: false, error: `Invalid time slot format: "${pickupSlot}".` };
  }

  // If today, check if slot has already passed or is within lead time
  if (isSameCalendarDay(parsedDate.date, now)) {
    const leadTimeMs = config.minBookingLeadMinutes * 60 * 1000;
    const earliestAllowed = now.getTime() + leadTimeMs;

    if (slotInterval.start.getTime() < earliestAllowed) {
      if (slotInterval.start.getTime() <= now.getTime()) {
        return {
          valid: false,
          error: `The ${pickupSlot} pickup slot has already passed for today. Please choose a future slot or date.`,
        };
      }
      return {
        valid: false,
        error: `Pickup slots require at least ${config.minBookingLeadMinutes} minutes booking lead time.`,
      };
    }
  }

  return { valid: true };
}

/**
 * Validates Delivery Date:
 * - Must not be empty or invalid date.
 * - Must not be in the past.
 * - Must not be earlier than Pickup Date.
 */
export function isDeliveryDateValid(
  pickupDate: string,
  deliveryDate: string,
  now: Date = new Date(),
  config: ScheduleConfig = DEFAULT_SCHEDULE_CONFIG
): ValidationResult {
  if (!deliveryDate || !deliveryDate.trim()) {
    return { valid: false, error: 'Delivery Date is required.' };
  }

  const parsedDelivery = parseDateString(deliveryDate);
  if (!parsedDelivery) {
    return { valid: false, error: 'Delivery Date is invalid. Please select a valid date.' };
  }

  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  if (parsedDelivery.date.getTime() < todayMidnight.getTime()) {
    return { valid: false, error: 'Delivery Date cannot be in the past.' };
  }

  if (pickupDate && pickupDate.trim()) {
    const parsedPickup = parseDateString(pickupDate);
    if (parsedPickup) {
      if (parsedDelivery.date.getTime() < parsedPickup.date.getTime()) {
        return { valid: false, error: 'Delivery Date cannot be before Pickup Date.' };
      }
      if (isSameCalendarDay(parsedPickup.date, parsedDelivery.date)) {
        return { valid: false, error: 'Delivery Date must be at least 24 hours after Pickup Date (next day or later).' };
      }
    }
  }

  return { valid: true };
}

/**
 * Validates Delivery Time Slot:
 * - Must not be empty.
 * - Must be a valid interval.
 * - If Delivery Date is today, must not be in the past (respecting minBookingLeadMinutes).
 * - If Pickup Date and Delivery Date are the same day:
 *   Delivery time slot must be strictly after the Pickup time slot.
 */
export function isDeliveryTimeSlotValid(
  pickupDate: string,
  pickupSlot: string,
  deliveryDate: string,
  deliverySlot: string,
  now: Date = new Date(),
  config: ScheduleConfig = DEFAULT_SCHEDULE_CONFIG
): ValidationResult {
  const deliveryDateCheck = isDeliveryDateValid(pickupDate, deliveryDate, now, config);
  if (!deliveryDateCheck.valid) {
    return deliveryDateCheck;
  }

  if (!deliverySlot || !deliverySlot.trim()) {
    return { valid: false, error: 'Delivery Time Slot is required.' };
  }

  const parsedDeliveryDate = parseDateString(deliveryDate);
  if (!parsedDeliveryDate) {
    return { valid: false, error: 'Delivery Date is invalid.' };
  }

  const deliveryInterval = parseTimeSlot(deliverySlot, parsedDeliveryDate.date);
  if (!deliveryInterval) {
    return { valid: false, error: `Invalid delivery time slot format: "${deliverySlot}".` };
  }

  // If delivery is today, must not be in the past
  if (isSameCalendarDay(parsedDeliveryDate.date, now)) {
    const earliestAllowed = now.getTime();
    if (deliveryInterval.start.getTime() < earliestAllowed) {
      return {
        valid: false,
        error: `The ${deliverySlot} delivery slot has already passed for today.`,
      };
    }
  }

  // 24-hour turnaround gap check:
  // (deliverySlot.start - pickupSlot.start) must be at least 24 hours (24 * 60 * 60 * 1000 ms)
  const parsedPickupDate = pickupDate ? parseDateString(pickupDate) : null;
  if (parsedPickupDate && pickupSlot && pickupSlot.trim()) {
    const pickupInterval = parseTimeSlot(pickupSlot, parsedPickupDate.date);
    if (pickupInterval) {
      const gapMs = deliveryInterval.start.getTime() - pickupInterval.start.getTime();
      const minGapMs = 24 * 60 * 60 * 1000;
      if (gapMs < minGapMs) {
        return {
          valid: false,
          error: 'A minimum 24-hour turnaround gap is required between pickup and delivery slots.',
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Master validation function for the complete schedule combination.
 * Validates all 4 fields, chronological order, lead times, and same-day sequences.
 */
export function isScheduleValid(
  pickupDate: string,
  pickupSlot: string,
  deliveryDate: string,
  deliverySlot: string,
  now: Date = new Date(),
  config: ScheduleConfig = DEFAULT_SCHEDULE_CONFIG
): ValidationResult {
  const pDateCheck = isPickupDateValid(pickupDate, now, config);
  if (!pDateCheck.valid) return pDateCheck;

  const pSlotCheck = isPickupTimeSlotValid(pickupDate, pickupSlot, now, config);
  if (!pSlotCheck.valid) return pSlotCheck;

  const dDateCheck = isDeliveryDateValid(pickupDate, deliveryDate, now, config);
  if (!dDateCheck.valid) return dDateCheck;

  const dSlotCheck = isDeliveryTimeSlotValid(pickupDate, pickupSlot, deliveryDate, deliverySlot, now, config);
  if (!dSlotCheck.valid) return dSlotCheck;

  return { valid: true };
}

// =========================================================================
// UI SLOT AVAILABILITY PROVIDERS
// =========================================================================

/**
 * Computes available pickup slots with disabled status and clear reasons for the UI dropdown.
 */
export function getAvailablePickupSlots(
  pickupDate: string,
  now: Date = new Date(),
  config: ScheduleConfig = DEFAULT_SCHEDULE_CONFIG
): SlotAvailability[] {
  const slots = config.pickupSlots;
  if (!pickupDate) {
    return slots.map((s) => ({ slot: s, disabled: false }));
  }

  const parsed = parseDateString(pickupDate);
  if (!parsed) {
    return slots.map((s) => ({ slot: s, disabled: true, reason: 'Invalid date' }));
  }

  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  if (parsed.date.getTime() < todayMidnight.getTime()) {
    return slots.map((s) => ({ slot: s, disabled: true, reason: 'Date in past' }));
  }

  const isToday = isSameCalendarDay(parsed.date, now);
  const leadTimeMs = config.minBookingLeadMinutes * 60 * 1000;
  const earliestAllowed = now.getTime() + leadTimeMs;

  return slots.map((slot) => {
    if (!isToday) {
      return { slot, disabled: false };
    }

    const interval = parseTimeSlot(slot, parsed.date);
    if (!interval) {
      return { slot, disabled: true, reason: 'Malformed slot' };
    }

    if (interval.start.getTime() <= now.getTime()) {
      return { slot, disabled: true, reason: 'Already passed' };
    }

    if (interval.start.getTime() < earliestAllowed) {
      return { slot, disabled: true, reason: `< ${config.minBookingLeadMinutes}m lead time` };
    }

    return { slot, disabled: false };
  });
}

/**
 * Computes available delivery slots with disabled status and clear reasons for the UI dropdown.
 */
export function getAvailableDeliverySlots(
  pickupDate: string,
  pickupSlot: string,
  deliveryDate: string,
  now: Date = new Date(),
  config: ScheduleConfig = DEFAULT_SCHEDULE_CONFIG
): SlotAvailability[] {
  const slots = config.deliverySlots;
  if (!deliveryDate) {
    return slots.map((s) => ({ slot: s, disabled: false }));
  }

  const parsedDelivery = parseDateString(deliveryDate);
  if (!parsedDelivery) {
    return slots.map((s) => ({ slot: s, disabled: true, reason: 'Invalid date' }));
  }

  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  if (parsedDelivery.date.getTime() < todayMidnight.getTime()) {
    return slots.map((s) => ({ slot: s, disabled: true, reason: 'Date in past' }));
  }

  const parsedPickup = pickupDate ? parseDateString(pickupDate) : null;
  if (parsedPickup && parsedDelivery.date.getTime() < parsedPickup.date.getTime()) {
    return slots.map((s) => ({ slot: s, disabled: true, reason: 'Before pickup date' }));
  }

  // Same day delivery is not allowed because of the minimum 24-hour turnaround gap rule
  if (parsedPickup && isSameCalendarDay(parsedPickup.date, parsedDelivery.date)) {
    return slots.map((s) => ({ slot: s, disabled: true, reason: 'Min 24h gap required' }));
  }

  const isDeliveryToday = isSameCalendarDay(parsedDelivery.date, now);
  const pickupInterval = (parsedPickup && pickupSlot) ? parseTimeSlot(pickupSlot, parsedPickup.date) : null;

  return slots.map((slot) => {
    const interval = parseTimeSlot(slot, parsedDelivery.date);
    if (!interval) {
      return { slot, disabled: true, reason: 'Malformed slot' };
    }

    // Past check if delivery is today
    if (isDeliveryToday && interval.start.getTime() <= now.getTime()) {
      return { slot, disabled: true, reason: 'Already passed' };
    }

    // 24-hour minimum gap from pickup slot start time
    if (pickupInterval) {
      const gapMs = interval.start.getTime() - pickupInterval.start.getTime();
      if (gapMs < 24 * 60 * 60 * 1000) {
        return { slot, disabled: true, reason: 'Requires min 24h turnaround' };
      }
    }

    return { slot, disabled: false };
  });
}

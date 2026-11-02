export type NumKey = 'kg' | 'crab' | 'vnFee' | 'rate1' | 'thFee' | 'rate2';

export const NUM_KEYS: NumKey[] = ['kg', 'crab', 'vnFee', 'rate1', 'thFee', 'rate2'];

export const FIELD_NAMES: Record<NumKey, string> = {
  kg: 'จำนวนปู',
  crab: 'ค่าปูฝั่งเวียดนาม',
  vnFee: 'ค่าดำเนินการเวียดนาม',
  rate1: 'เรทที่ 1',
  thFee: 'ค่าดำเนินการไทย',
  rate2: 'เรทที่ 2',
};

const MUST_BE_POSITIVE: NumKey[] = ['kg', 'crab', 'rate1', 'rate2'];

export type LotInput = Record<NumKey, number> & { date: string };
export type Lot = LotInput & { id: number };
export type DefaultKey = 'rate1' | 'rate2' | 'vnFee' | 'thFee';
export const DEFAULT_KEYS: DefaultKey[] = ['rate1', 'rate2', 'vnFee', 'thFee'];
export type Defaults = Record<DefaultKey, number>;
export type FieldErrors = Partial<Record<NumKey | 'date', string>>;

// vnFee・thFee は kg あたり、rate1・rate2 は 1฿ あたりの VND
export function calcLot(i: Record<NumKey, number>) {
  const vnFeeTot = i.vnFee * i.kg;
  const thFeeTot = i.thFee * i.kg;
  const net = i.crab - vnFeeTot;
  const thbConv = i.crab / i.rate1;
  const billed = thbConv + thFeeTot;
  const transfer = net / i.rate2;
  return {
    vnFeeTot,
    thFeeTot,
    net,
    thbConv,
    billed,
    transfer,
    profit: billed - transfer,
    vnFeeThb: vnFeeTot / i.rate2,
    spread: i.crab / i.rate1 - i.crab / i.rate2,
  };
}

export type LotCalc = ReturnType<typeof calcLot>;
export type EnrichedLot = Lot & LotCalc;

export const enrichLot = (l: Lot): EnrichedLot => ({ ...l, ...calcLot(l) });

// 空欄は NaN で渡す。requireAll が true のときだけ未入力をエラーにする
export function validateNumbers(v: Record<NumKey, number>, requireAll: boolean): FieldErrors {
  const e: FieldErrors = {};
  for (const k of NUM_KEYS) {
    const n = v[k];
    if (Number.isNaN(n)) {
      if (requireAll) e[k] = 'กรุณากรอก' + FIELD_NAMES[k];
      continue;
    }
    if (!Number.isFinite(n)) {
      e[k] = FIELD_NAMES[k] + 'ไม่ถูกต้อง';
    } else if (MUST_BE_POSITIVE.includes(k)) {
      if (!(n > 0)) e[k] = (k.startsWith('rate') ? 'เรท' : FIELD_NAMES[k]) + 'ต้องมากกว่า 0';
    } else if (n < 0) {
      e[k] = FIELD_NAMES[k] + 'ต้องไม่ติดลบ';
    }
  }
  if (!e.vnFee && !e.crab && v.vnFee * v.kg > v.crab) {
    e.vnFee = 'ค่าดำเนินการรวมต้องไม่เกินค่าปูทั้งหมด';
  }
  return e;
}

export function isValidDate(s: unknown): s is string {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function parseLotInput(body: unknown):
  | { ok: true; value: LotInput }
  | { ok: false; errors: FieldErrors } {
  const src = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const nums = {} as Record<NumKey, number>;
  for (const k of NUM_KEYS) nums[k] = typeof src[k] === 'number' ? (src[k] as number) : NaN;
  const errors = validateNumbers(nums, true);
  if (!isValidDate(src.date)) errors.date = 'วันที่ไม่ถูกต้อง';
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { ...nums, date: src.date as string } };
}

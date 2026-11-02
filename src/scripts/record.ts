import { fetchDefaults, fetchLot, saveLot } from '../lib/api';
import { fmt0, fmt2, fmtDate, fmtInput, fmtV, iso, parseNum, profitColor, sgn } from '../lib/format';
import { calcLot, DEFAULT_KEYS, validateNumbers, type Defaults, type LotCalc, type NumKey } from '../lib/lot';
import { say } from '../lib/toast';

// 画面上の並び順。最初のエラー欄へフォーカスするのに使う
const FIELD_ORDER: NumKey[] = ['rate1', 'rate2', 'vnFee', 'thFee', 'kg', 'crab'];
const INTEGER_KEYS: NumKey[] = ['crab', 'vnFee'];
const NAV_OFFSET = 72;
const SPY_OFFSET = 90;
const SECTION_IDS = ['0', 'A', 'B', 'C', 'res'];

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const text = (id: string, value: string) => ($(id).textContent = value);

type Form = Record<NumKey, string> & { date: string };
type Calc = { input: Record<NumKey, number>; res: LotCalc };

const emptyForm = (): Form => ({ date: iso(new Date()), kg: '', crab: '', vnFee: '', rate1: '', thFee: '', rate2: '' });

let f = emptyForm();
let calc: Calc | null = null;
let stale = false;
let attempted = false;
let editingId: number | null = null;
let saving = false;
let defaults: Defaults | null = null;

// onlyEmpty が true のときは、入力済みの欄を上書きしない
function applyDefaults(onlyEmpty: boolean) {
  if (!defaults) return;
  for (const k of DEFAULT_KEYS) {
    if (!onlyEmpty || f[k] === '') f[k] = fmtInput(String(defaults[k]), !INTEGER_KEYS.includes(k));
  }
}

const numbers = () => Object.fromEntries(FIELD_ORDER.map((k) => [k, parseNum(f[k])])) as Record<NumKey, number>;

function render() {
  const errs = validateNumbers(numbers(), attempted);
  for (const k of FIELD_ORDER) {
    const box = document.querySelector(`[data-box="${k}"]`)!;
    const input = $<HTMLInputElement>(`f-${k}`);
    const err = $(`err-${k}`);
    if (input.value !== f[k]) input.value = f[k];
    box.classList.toggle('invalid', !!errs[k]);
    input.setAttribute('aria-invalid', String(!!errs[k]));
    err.hidden = !errs[k];
    err.textContent = errs[k] ?? '';
  }
  const dateInput = $<HTMLInputElement>('f-date');
  if (dateInput.value !== f.date) dateInput.value = f.date;

  const r = calc?.res;
  const dash = '—';
  text('f-net', r ? fmt0(r.net) : dash);
  text('f-thbConv', r ? fmt2(r.thbConv) : dash);
  text('f-billed', r ? fmt2(r.billed) : dash);
  text('f-transfer', r ? fmt2(r.transfer) : dash);
  renderResult(r, calc?.input.kg);

  document.querySelectorAll('.dimmable').forEach((el) => el.classList.toggle('stale', stale));
  $('stale-badge').hidden = !stale;
  $<HTMLButtonElement>('btn-save').disabled = !calc || stale || saving;
}

function setBreakdown(id: string, value: string, sub: string, color?: string) {
  const dd = $(`res-${id}`);
  dd.style.color = color ?? '';
  dd.textContent = value;
  dd.appendChild(Object.assign(document.createElement('small'), { id: `res-${id}k`, textContent: sub }));
}

function renderResult(r: LotCalc | undefined, kg: number | undefined) {
  const result = $('s-res');
  const profit = $('res-profit');
  if (!r || kg === undefined) {
    result.style.borderColor = 'var(--line)';
    profit.style.color = 'var(--muted)';
    profit.textContent = '—';
    for (const id of ['a', 'b', 'c']) setBreakdown(id, '—', '');
    text('res-ab', '—');
    text('res-kg', '—');
    text('res-pk', '—');
    return;
  }
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const a = r2(r.vnFeeThb);
  const b = r2(r.thFeeTot);
  const t = r2(r.profit);
  const c = r2(t - a - b);
  const perKg = (v: number) => sgn(v / kg) + ' ฿/กก.';

  result.style.borderColor = profitColor(r.profit);
  profit.style.color = profitColor(r.profit);
  profit.textContent = sgn(t);
  const rows: [string, string, string, string?][] = [
    ['a', fmt2(a), perKg(a)],
    ['b', fmt2(b), perKg(b)],
    ['c', sgn(c), perKg(c), profitColor(c)],
  ];
  for (const [id, value, sub, color] of rows) setBreakdown(id, value, sub, color);
  text('res-ab', fmt2(a + b) + ' ฿');
  text('res-kg', fmtV(kg) + ' กก.');
  const pk = $('res-pk');
  pk.textContent = perKg(t);
  pk.style.color = profitColor(r.profit);
}

function markChanged() {
  if (calc) stale = true;
}

function onInput(k: NumKey, el: HTMLInputElement) {
  const raw = el.value;
  const pos = el.selectionStart ?? raw.length;
  const keep = raw.slice(0, pos).replace(/[^0-9.]/g, '').length;
  const val = fmtInput(raw, !INTEGER_KEYS.includes(k));
  f[k] = val;
  markChanged();
  el.value = val;
  let count = 0;
  let i = 0;
  while (i < val.length && count < keep) {
    if (/[0-9.]/.test(val[i])) count++;
    i++;
  }
  try {
    el.setSelectionRange(i, i);
  } catch {
    // number 型などで selection が使えない場合は無視する
  }
  render();
}

function doCalc() {
  attempted = true;
  const nums = numbers();
  const errs = validateNumbers(nums, true);
  const bad = FIELD_ORDER.find((k) => errs[k]);
  if (bad) {
    render();
    $<HTMLInputElement>(`f-${bad}`).focus();
    return;
  }
  calc = { input: nums, res: calcLot(nums) };
  stale = false;
  render();
}

// 初期値は新規保存のときだけ更新する。編集のときは保存済みの初期値に戻す
function resetAfterSave(saved: Defaults | null) {
  if (saved) defaults = saved;
  f = { ...f, kg: '', crab: '' };
  applyDefaults(false);
  calc = null;
  stale = false;
  attempted = false;
  editingId = null;
  $('edit-banner').hidden = true;
  history.replaceState(null, '', '/');
  render();
}

async function doSave() {
  if (!calc || stale || saving) return;
  saving = true;
  render();
  const wasEditing = editingId !== null;
  const input = calc.input;
  try {
    const result = await saveLot({ ...input, date: f.date }, editingId);
    if (result.ok) {
      resetAfterSave(wasEditing ? null : { rate1: input.rate1, rate2: input.rate2, vnFee: input.vnFee, thFee: input.thFee });
      say(wasEditing ? 'อัปเดตล็อตเรียบร้อย' : 'บันทึกล็อตเรียบร้อย');
    } else {
      say('บันทึกไม่สำเร็จ ตรวจข้อมูลแล้วลองใหม่');
    }
  } catch (e) {
    console.error('ロットの保存に失敗', e);
    say('บันทึกไม่สำเร็จ ตรวจอินเทอร์เน็ตแล้วลองใหม่');
  } finally {
    saving = false;
    render();
  }
}

function cancelEdit() {
  f = { ...f, kg: '', crab: '' };
  applyDefaults(false);
  calc = null;
  stale = false;
  attempted = false;
  editingId = null;
  $('edit-banner').hidden = true;
  history.replaceState(null, '', '/');
  render();
}

async function loadEditTarget() {
  const id = Number(new URLSearchParams(location.search).get('edit'));
  if (!Number.isInteger(id) || id <= 0) return;
  const lot = await fetchLot(id).catch(() => null);
  if (!lot) {
    say('ไม่พบล็อตที่ต้องการแก้ไข');
    history.replaceState(null, '', '/');
    return;
  }
  const show = (k: NumKey) => fmtInput(String(lot[k]), !INTEGER_KEYS.includes(k));
  f = { date: lot.date, kg: show('kg'), crab: show('crab'), vnFee: show('vnFee'), rate1: show('rate1'), thFee: show('thFee'), rate2: show('rate2') };
  editingId = lot.id;
  calc = null;
  stale = false;
  attempted = false;
  text('edit-date', fmtDate(lot.date));
  $('edit-banner').hidden = false;
  render();
}

function setupJumpNav() {
  const buttons = document.querySelectorAll<HTMLButtonElement>('[data-jump]');
  let active = '0';
  const mark = (key: string) => {
    active = key;
    buttons.forEach((b) => b.setAttribute('aria-current', String(b.dataset.jump === key)));
  };
  buttons.forEach((b) =>
    b.addEventListener('click', () => {
      const el = document.getElementById('s-' + b.dataset.jump);
      if (!el) return;
      window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - NAV_OFFSET), behavior: 'smooth' });
      mark(b.dataset.jump!);
    }),
  );
  window.addEventListener(
    'scroll',
    () => {
      let key = '0';
      for (const id of SECTION_IDS) {
        const el = document.getElementById('s-' + id);
        if (el && el.getBoundingClientRect().top <= SPY_OFFSET) key = id;
      }
      if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) key = 'res';
      if (key !== active) mark(key);
    },
    { passive: true },
  );
  mark(active);
}

for (const k of FIELD_ORDER) {
  const el = $<HTMLInputElement>(`f-${k}`);
  el.addEventListener('input', () => onInput(k, el));
}
$<HTMLInputElement>('f-date').addEventListener('change', (e) => {
  f.date = (e.target as HTMLInputElement).value;
  markChanged();
  render();
});
$('btn-calc').addEventListener('click', doCalc);
$('btn-save').addEventListener('click', doSave);
$('cancel-edit').addEventListener('click', cancelEdit);

async function init() {
  const editing = new URLSearchParams(location.search).has('edit');
  // 編集中は既存ロットの値を使うので、初期値は先に読み込むだけにする
  defaults = await fetchDefaults().catch(() => null);
  if (editing) {
    await loadEditTarget();
  } else {
    applyDefaults(true);
    render();
  }
}

setupJumpNav();
render();
init();

import { fetchLots, removeLot } from '../lib/api';
import { fmt0, fmt2, fmtDate, fmtV, profitColor, sgn } from '../lib/format';
import { enrichLot, type EnrichedLot } from '../lib/lot';
import { say } from '../lib/toast';

const WIDE_MIN_PX = 768;
const CSV_BOM = '﻿';

type SortKey = 'date' | 'kg' | 'crab' | 'vnFee' | 'rate1' | 'thFee' | 'billed' | 'rate2' | 'transfer' | 'profit';
type Column = { key: SortKey; label: string; text: (l: EnrichedLot) => string; align?: 'left' };

const COLUMNS: Column[] = [
  { key: 'date', label: 'วันที่', text: (l) => fmtDate(l.date), align: 'left' },
  { key: 'kg', label: 'กก.', text: (l) => fmtV(l.kg) },
  { key: 'crab', label: 'ค่าปู ₫', text: (l) => fmt0(l.crab) },
  { key: 'vnFee', label: 'ค่าดำเนินการ VN ₫/กก.', text: (l) => fmt0(l.vnFee) },
  { key: 'rate1', label: 'เรท 1', text: (l) => fmtV(l.rate1) },
  { key: 'thFee', label: 'ค่าดำเนินการไทย ฿/กก.', text: (l) => fmt2(l.thFee) },
  { key: 'billed', label: 'ยอดเก็บลูกค้า ฿', text: (l) => fmt2(l.billed) },
  { key: 'rate2', label: 'เรท 2', text: (l) => fmtV(l.rate2) },
  { key: 'transfer', label: 'ยอดโอน ฿', text: (l) => fmt2(l.transfer) },
  { key: 'profit', label: 'กำไร ฿', text: (l) => sgn(l.profit) },
];

const $ = (id: string) => document.getElementById(id)!;
const input = (id: string) => $(id) as HTMLInputElement;

let all: EnrichedLot[] = [];
let from = '';
let to = '';
let sortKey: SortKey = 'date';
let sortDir: 'asc' | 'desc' = 'desc';
let sheetId: number | null = null;
let wide = window.innerWidth >= WIDE_MIN_PX;

const total = (rows: EnrichedLot[], k: 'kg' | 'billed' | 'transfer' | 'profit') => rows.reduce((x, l) => x + l[k], 0);

function visibleRows() {
  const dir = sortDir === 'asc' ? 1 : -1;
  return all
    .filter((l) => (!from || l.date >= from) && (!to || l.date <= to))
    .sort((a, b) => {
      const x = a[sortKey];
      const y = b[sortKey];
      return (x < y ? -1 : x > y ? 1 : 0) * dir || b.id - a.id;
    });
}

function render() {
  const rangeErr = !!(from && to && from > to);
  $('range-err').hidden = !rangeErr;

  const rows = visibleRows();
  $('raw-empty').hidden = rows.length > 0;
  $('cards-view').hidden = wide || rows.length === 0;
  $('table-view').hidden = !wide || rows.length === 0;
  if (!rows.length) return;

  const sum = {
    kg: fmtV(total(rows, 'kg')),
    billed: fmt2(total(rows, 'billed')),
    transfer: fmt2(total(rows, 'transfer')),
    profit: sgn(total(rows, 'profit')),
  };

  if (wide) {
    $('thead-row').innerHTML = COLUMNS.map((c) => {
      const align = c.align ?? 'right';
      const aria = sortKey === c.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none';
      const arrow = sortKey === c.key ? (sortDir === 'asc' ? '▲' : '▼') : '';
      return `<th scope="col" aria-sort="${aria}" class="${align}"><button type="button" class="${align}" data-sort="${c.key}">${c.label} ${arrow}</button></th>`;
    }).join('');
    $('tbody').innerHTML = rows
      .map(
        (l) =>
          `<tr data-id="${l.id}" tabindex="0">` +
          COLUMNS.map((c) => {
            const color = c.key === 'profit' ? profitColor(l.profit) : 'var(--ink)';
            const weight = c.key === 'profit' || c.key === 'date' ? 700 : 400;
            return `<td class="${c.align ?? 'right'}" style="color:${color};font-weight:${weight}">${c.text(l)}</td>`;
          }).join('') +
          '</tr>',
      )
      .join('');
    const footCells = [`${rows.length} ล็อต`, sum.kg, '', '', '', '', sum.billed, '', sum.transfer, sum.profit];
    $('tfoot-row').innerHTML = footCells
      .map((t, i) => {
        const color = i === footCells.length - 1 ? profitColor(total(rows, 'profit')) : 'var(--ink)';
        return `<td class="${i === 0 ? 'left' : 'right'}" style="color:${color}">${t}</td>`;
      })
      .join('');
  } else {
    $('cards').innerHTML = rows
      .map(
        (l) => `<button type="button" class="card lot-card" data-id="${l.id}" aria-label="เปิดเมนูล็อต ${fmtDate(l.date)}">
          <div class="row"><span class="date">${fmtDate(l.date)}</span><span class="kg">${fmtV(l.kg)} กก.</span></div>
          <div class="pair">
            <div><small>ยอดเก็บลูกค้า ฿</small><b>${fmt2(l.billed)}</b></div>
            <div><small>ยอดโอน ฿</small><b>${fmt2(l.transfer)}</b></div>
          </div>
          <div class="row profit-row"><small>กำไร ฿</small><b style="color:${profitColor(l.profit)}">${sgn(l.profit)}</b></div>
        </button>`,
      )
      .join('');
    $('sum-title').textContent = `สรุปตามตัวกรอง · ${rows.length} ล็อต`;
    $('sum-kg').textContent = `${sum.kg} กก.`;
    $('sum-billed').textContent = `${sum.billed} ฿`;
    $('sum-transfer').textContent = `${sum.transfer} ฿`;
    $('sum-profit').textContent = `${sum.profit} ฿`;
  }
}

function showSheet(mode: 'menu' | 'detail' | 'confirm') {
  const lot = all.find((l) => l.id === sheetId);
  $('sheet-root').hidden = !lot;
  if (!lot) return;
  $('sheet-title').textContent = `ล็อต ${fmtDate(lot.date)}`;
  const profit = $('sheet-profit');
  profit.textContent = `${sgn(lot.profit)} ฿`;
  profit.style.color = profitColor(lot.profit);
  $('sheet-menu').hidden = mode !== 'menu';
  $('sheet-detail').hidden = mode !== 'detail';
  $('sheet-confirm').hidden = mode !== 'confirm';
  if (mode === 'detail') {
    const rows: [string, string, string?][] = [
      ['วันที่', fmtDate(lot.date)],
      ['จำนวนปู (กก.)', fmtV(lot.kg)],
      ['ค่าปูทั้งหมด (₫)', fmt0(lot.crab)],
      ['ค่าดำเนินการ VN (₫ ต่อ กก.)', fmt0(lot.vnFee)],
      ['ค่าดำเนินการ VN รวม (₫)', fmt0(lot.vnFeeTot)],
      ['รวมค่าปู − ค่าดำเนินการ (₫)', fmt0(lot.net)],
      ['เรท 1 (₫ ต่อ ฿)', fmtV(lot.rate1)],
      ['คิดเป็นเงินไทย (฿)', fmt2(lot.thbConv)],
      ['ค่าดำเนินการไทย (฿ ต่อ กก.)', fmt2(lot.thFee)],
      ['ค่าดำเนินการไทย รวม (฿)', fmt2(lot.thFeeTot)],
      ['ยอดเก็บลูกค้า (฿)', fmt2(lot.billed)],
      ['เรท 2 (₫ ต่อ ฿)', fmtV(lot.rate2)],
      ['ยอดโอน (฿)', fmt2(lot.transfer)],
      ['กำไรจากค่าดำเนินการ VN (฿)', fmt2(lot.vnFeeThb)],
      ['กำไรจากค่าดำเนินการไทย (฿)', fmt2(lot.thFeeTot)],
      ['กำไรจากส่วนต่างเรท (฿)', sgn(lot.spread), profitColor(lot.spread)],
      ['กำไรรวม (฿)', sgn(lot.profit), profitColor(lot.profit)],
    ];
    $('detail-list').innerHTML = rows
      .map(([k, v, c]) => `<div><dt>${k}</dt><dd style="color:${c ?? 'var(--ink)'}">${v}</dd></div>`)
      .join('');
  }
}

function openSheet(id: number) {
  sheetId = id;
  showSheet('menu');
}

function closeSheet() {
  sheetId = null;
  showSheet('menu');
}

async function confirmDelete() {
  if (sheetId === null) return;
  const id = sheetId;
  try {
    if (!(await removeLot(id))) throw new Error('delete failed');
    all = all.filter((l) => l.id !== id);
    closeSheet();
    render();
    say('ลบล็อตเรียบร้อย');
  } catch (e) {
    console.error('ロットの削除に失敗', e);
    say('ลบไม่สำเร็จ ลองใหม่อีกครั้ง');
  }
}

function exportCsv() {
  const rows = visibleRows();
  if (!rows.length) {
    say('ไม่มีข้อมูลให้ส่งออก');
    return;
  }
  const header = ['date', 'kg', 'crab_vnd', 'vn_fee_vnd_per_kg', 'rate1', 'th_fee_thb_per_kg', 'billed_thb', 'rate2', 'transfer_thb', 'profit_thb'];
  const lines = rows.map((l) =>
    [l.date, l.kg, l.crab, l.vnFee, l.rate1, l.thFee, l.billed.toFixed(2), l.rate2, l.transfer.toFixed(2), l.profit.toFixed(2)].join(','),
  );
  const blob = new Blob([CSV_BOM + [header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'crab-ledger.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

const rowId = (e: Event) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-id]');
  return el ? Number(el.dataset.id) : null;
};

$('cards').addEventListener('click', (e) => {
  const id = rowId(e);
  if (id !== null) openSheet(id);
});
$('tbody').addEventListener('click', (e) => {
  const id = rowId(e);
  if (id !== null) openSheet(id);
});
$('tbody').addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const id = rowId(e);
  if (id === null) return;
  e.preventDefault();
  openSheet(id);
});
$('thead-row').addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-sort]');
  if (!btn) return;
  const key = btn.dataset.sort as SortKey;
  sortDir = sortKey === key && sortDir === 'desc' ? 'asc' : 'desc';
  sortKey = key;
  render();
});

input('d-from').addEventListener('change', (e) => {
  from = (e.target as HTMLInputElement).value;
  render();
});
input('d-to').addEventListener('change', (e) => {
  to = (e.target as HTMLInputElement).value;
  render();
});
$('export-csv').addEventListener('click', exportCsv);

$('sheet-backdrop').addEventListener('click', closeSheet);
$('act-close').addEventListener('click', closeSheet);
$('act-detail').addEventListener('click', () => showSheet('detail'));
$('act-delete').addEventListener('click', () => showSheet('confirm'));
$('act-confirm-delete').addEventListener('click', confirmDelete);
$('act-edit').addEventListener('click', () => {
  if (sheetId !== null) location.href = `/?edit=${sheetId}`;
});
document.querySelectorAll('[data-back]').forEach((b) => b.addEventListener('click', () => showSheet('menu')));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && sheetId !== null) closeSheet();
});

window.addEventListener('resize', () => {
  const next = window.innerWidth >= WIDE_MIN_PX;
  if (next !== wide) {
    wide = next;
    render();
  }
});

async function load() {
  try {
    all = (await fetchLots()).map(enrichLot);
    $('loading').hidden = true;
    render();
  } catch (e) {
    console.error('ロット一覧の取得に失敗', e);
    $('loading').hidden = true;
    $('load-error').hidden = false;
  }
}

load();

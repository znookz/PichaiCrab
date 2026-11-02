import { fetchLots } from '../lib/api';
import { barChartSvg, lineChartSvg } from '../lib/charts';
import { fmt2, fmtV, iso, profitColor, sgn } from '../lib/format';
import { enrichLot, type EnrichedLot } from '../lib/lot';

type Period = '7' | 'month' | '90' | 'all';

const WIDE_MIN_PX = 768;
const CHART_W_WIDE = 640;
const CHART_W_NARROW = 340;
const CHART_H = 220;

const $ = (id: string) => document.getElementById(id)!;

let all: EnrichedLot[] = [];
let period: Period = 'all';

function periodStart(p: Period) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (p === '7') {
    today.setDate(today.getDate() - 6);
    return iso(today);
  }
  if (p === 'month') return iso(new Date(today.getFullYear(), today.getMonth(), 1));
  if (p === '90') {
    today.setMonth(today.getMonth() - 3);
    return iso(today);
  }
  return '0000-00-00';
}

const sum = (rows: EnrichedLot[], k: 'kg' | 'billed' | 'profit') => rows.reduce((x, l) => x + l[k], 0);

function markChips() {
  document.querySelectorAll<HTMLButtonElement>('[data-period]').forEach((b) =>
    b.setAttribute('aria-pressed', String(b.dataset.period === period)),
  );
}

function render() {
  markChips();
  const start = periodStart(period);
  const rows = all.filter((l) => l.date >= start).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id));
  $('empty').hidden = rows.length > 0;
  $('content').hidden = rows.length === 0;
  if (!rows.length) return;

  const profit = sum(rows, 'profit');
  const kpis = [
    { label: 'จำนวนล็อต', value: String(rows.length), color: 'var(--ink)' },
    { label: 'น้ำหนักรวม (กก.)', value: fmtV(sum(rows, 'kg')), color: 'var(--ink)' },
    { label: 'ยอดเก็บลูกค้ารวม (฿)', value: fmt2(sum(rows, 'billed')), color: 'var(--ink)' },
    { label: 'กำไรรวม (฿)', value: sgn(profit), color: profitColor(profit) },
  ];
  $('kpis').innerHTML = kpis
    .map(
      (k) =>
        `<div class="card kpi"><div class="kpi-label">${k.label}</div><div class="kpi-value" style="color:${k.color}">${k.value}</div></div>`,
    )
    .join('');

  const W = window.innerWidth >= WIDE_MIN_PX ? CHART_W_WIDE : CHART_W_NARROW;
  for (const [id, svg] of [
    ['chart-bar', barChartSvg(rows, W)],
    ['chart-line', lineChartSvg(rows, W)],
  ]) {
    const el = $(id);
    el.setAttribute('viewBox', `0 0 ${W} ${CHART_H}`);
    el.innerHTML = svg;
  }
}

document.querySelectorAll<HTMLButtonElement>('[data-period]').forEach((b) =>
  b.addEventListener('click', () => {
    period = b.dataset.period as Period;
    render();
  }),
);

let wasWide = window.innerWidth >= WIDE_MIN_PX;
window.addEventListener('resize', () => {
  const wide = window.innerWidth >= WIDE_MIN_PX;
  if (wide !== wasWide) {
    wasWide = wide;
    if (all.length) render();
  }
});

async function load() {
  markChips();
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

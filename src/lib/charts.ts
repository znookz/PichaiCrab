import type { EnrichedLot } from './lot';
import { fmtV, kfmt, profitColor, shortDate } from './format';

const H = 220;

function niceTicks(min: number, max: number, n: number) {
  const span = max - min || 1;
  const raw = span / n;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const m = raw / p;
  const step = (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
  const lo = Math.floor(min / step + 1e-9) * step;
  const hi = Math.ceil(max / step - 1e-9) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return ticks;
}

const f1 = (n: number) => n.toFixed(1);

const gridSvg = (ticks: number[], y: (v: number) => number, x1: number, x2: number, label: (v: number) => string) =>
  ticks
    .map(
      (v) =>
        `<line x1="${x1}" x2="${x2}" y1="${f1(y(v))}" y2="${f1(y(v))}" style="stroke:var(--line)" stroke-width="1"/>` +
        `<text x="${x1 - 6}" y="${f1(y(v) + 4)}" text-anchor="end" style="fill:var(--muted)" font-size="11">${label(v)}</text>`,
    )
    .join('');

const xLabelsSvg = (rows: EnrichedLot[], x: (i: number) => number, W: number) => {
  const every = Math.ceil(rows.length / (W > 400 ? 10 : 6));
  return rows
    .map((r, i) =>
      i % every === 0
        ? `<text x="${f1(x(i))}" y="212" text-anchor="middle" font-size="11" style="fill:var(--muted)">${shortDate(r.date)}</text>`
        : '',
    )
    .join('');
};

// 1ロットごとの利益の棒グラフ。rows は日付昇順で渡す
export function barChartSvg(rows: EnrichedLot[], W: number) {
  const px = 42, pr = 8, pt = 22, pb = 26;
  const pw = W - px - pr, ph = H - pt - pb, n = rows.length;
  const ticks = niceTicks(Math.min(0, ...rows.map((r) => r.profit)), Math.max(0, ...rows.map((r) => r.profit)), 4);
  const mn = ticks[0], mx = ticks[ticks.length - 1];
  const y = (v: number) => pt + (ph * (mx - v)) / (mx - mn || 1);
  const slot = pw / n, bw = Math.min(slot * 0.62, 36);
  const showVal = n <= (W > 400 ? 12 : 8);
  const cx = (i: number) => px + slot * (i + 0.5);

  const bars = rows
    .map((r, i) => {
      const v = r.profit, top = Math.min(y(v), y(0)), h = Math.max(Math.abs(y(v) - y(0)), 2);
      const fill = profitColor(v);
      const ty = v < 0 ? top + h + 12 : top - 5;
      return (
        `<rect x="${f1(cx(i) - bw / 2)}" y="${f1(top)}" width="${f1(bw)}" height="${f1(h)}" rx="3" style="fill:${fill}"/>` +
        (showVal
          ? `<text x="${f1(cx(i))}" y="${f1(ty)}" text-anchor="middle" font-size="11" font-weight="600" style="fill:${fill}">${kfmt(v)}</text>`
          : '')
      );
    })
    .join('');

  return (
    gridSvg(ticks, y, px, W - pr, kfmt) +
    `<line x1="${px}" x2="${W - pr}" y1="${f1(y(0))}" y2="${f1(y(0))}" style="stroke:var(--line-strong)" stroke-width="1.5"/>` +
    bars +
    xLabelsSvg(rows, cx, W)
  );
}

// เรท 1 (เส้นทึบ ●) เทียบเรท 2 (เส้นประ ■)
export function lineChartSvg(rows: EnrichedLot[], W: number) {
  const px = 42, pr = 34, pt = 16, pb = 26;
  const pw = W - px - pr, ph = H - pt - pb, n = rows.length;
  const all = rows.flatMap((r) => [r.rate1, r.rate2]);
  const ticks = niceTicks(Math.min(...all) - 1, Math.max(...all) + 1, 4);
  const mn = ticks[0], mx = ticks[ticks.length - 1];
  const y = (v: number) => pt + (ph * (mx - v)) / (mx - mn || 1);
  const x = (i: number) => (n === 1 ? px + pw / 2 : px + (pw * i) / (n - 1));
  const path = (k: 'rate1' | 'rate2') => rows.map((r, i) => (i ? 'L' : 'M') + f1(x(i)) + ' ' + f1(y(r[k]))).join(' ');
  const last = rows[n - 1];
  const rate2Higher = last.rate2 >= last.rate1;

  const dots = rows.map((r, i) => `<circle cx="${f1(x(i))}" cy="${f1(y(r.rate1))}" r="4" style="fill:var(--teal)"/>`).join('');
  const squares = rows
    .map((r, i) => `<rect x="${f1(x(i) - 4)}" y="${f1(y(r.rate2) - 4)}" width="8" height="8" style="fill:var(--coral)"/>`)
    .join('');
  const endLabel = (v: number, dy: number, fill: string) =>
    `<text x="${f1(x(n - 1) + 8)}" y="${f1(y(v) + dy)}" font-size="11" font-weight="700" style="fill:${fill}">${fmtV(v)}</text>`;

  return (
    gridSvg(ticks, y, px, W - pr, fmtV) +
    `<path d="${path('rate1')}" fill="none" stroke-width="2.5" stroke-linejoin="round" style="stroke:var(--teal)"/>` +
    `<path d="${path('rate2')}" fill="none" stroke-width="2.5" stroke-linejoin="round" stroke-dasharray="6 4" style="stroke:var(--coral)"/>` +
    dots +
    squares +
    endLabel(last.rate1, rate2Higher ? 14 : -2, 'var(--teal)') +
    endLabel(last.rate2, rate2Higher ? -2 : 14, 'var(--coral)') +
    xLabelsSvg(rows, x, W)
  );
}

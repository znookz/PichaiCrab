const TH_MON = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nfv = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const nfk = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

export const fmt0 = (n: number) => nf0.format(Math.round(n));
export const fmt2 = (n: number) => nf2.format(Math.round(n * 100) / 100 + 0);
export const fmtV = (n: number) => nfv.format(n);
export const sgn = (n: number) => (n < 0 ? '−' : '+') + fmt2(Math.abs(n));
export const kfmt = (v: number) => (v === 0 ? '0' : (v < 0 ? '−' : '') + nfk.format(Math.abs(v) / 1000) + 'k');

export const iso = (d: Date) =>
  d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

export const fmtDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return d + ' ' + TH_MON[m - 1] + ' ' + (y + 543);
};

export const shortDate = (s: string) => {
  const [, m, d] = s.split('-').map(Number);
  return d + '/' + m;
};

export const profitColor = (n: number) => (n < 0 ? 'var(--neg)' : 'var(--pos)');

// 入力欄の整形。dec が true のときだけ小数点以下2桁まで許可する
export function fmtInput(raw: string, dec: boolean) {
  const s = raw.replace(dec ? /[^0-9.]/g : /[^0-9]/g, '');
  const [head, ...rest] = s.split('.');
  const int = head.replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return dec && rest.length ? int + '.' + rest.join('').slice(0, 2) : int;
}

export const parseNum = (s: string) => (s === '' ? NaN : parseFloat(s.replace(/,/g, '')));

import { env } from 'cloudflare:workers';
import type { Defaults, Lot, LotInput } from './lot';

type Row = {
  id: number;
  date: string;
  kg: number;
  crab: number;
  vn_fee: number;
  rate1: number;
  th_fee: number;
  rate2: number;
};

const COLUMNS = 'id, date, kg, crab, vn_fee, rate1, th_fee, rate2';

const toLot = (r: Row): Lot => ({
  id: r.id,
  date: r.date,
  kg: r.kg,
  crab: r.crab,
  vnFee: r.vn_fee,
  rate1: r.rate1,
  thFee: r.th_fee,
  rate2: r.rate2,
});

const values = (v: LotInput) => [v.date, v.kg, v.crab, v.vnFee, v.rate1, v.thFee, v.rate2];

export async function listLots(): Promise<Lot[]> {
  const { results } = await env.DB.prepare(`SELECT ${COLUMNS} FROM lots ORDER BY date DESC, id DESC`).all<Row>();
  return results.map(toLot);
}

export async function getLot(id: number): Promise<Lot | null> {
  const row = await env.DB.prepare(`SELECT ${COLUMNS} FROM lots WHERE id = ?`).bind(id).first<Row>();
  return row ? toLot(row) : null;
}

export async function getDefaults(): Promise<Defaults | null> {
  const row = await env.DB
    .prepare('SELECT rate1, rate2, vn_fee, th_fee FROM settings WHERE id = 1')
    .first<{ rate1: number; rate2: number; vn_fee: number; th_fee: number }>();
  return row ? { rate1: row.rate1, rate2: row.rate2, vnFee: row.vn_fee, thFee: row.th_fee } : null;
}

// 新規保存のときだけ初期値を更新する(編集では更新しない)。ロットと同一バッチで実行
export async function insertLot(v: LotInput): Promise<number> {
  const [inserted] = await env.DB.batch([
    env.DB
      .prepare('INSERT INTO lots (date, kg, crab, vn_fee, rate1, th_fee, rate2) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(...values(v)),
    env.DB
      .prepare(
        `INSERT INTO settings (id, rate1, rate2, vn_fee, th_fee) VALUES (1, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET rate1 = excluded.rate1, rate2 = excluded.rate2, vn_fee = excluded.vn_fee, th_fee = excluded.th_fee`,
      )
      .bind(v.rate1, v.rate2, v.vnFee, v.thFee),
  ]);
  return inserted.meta.last_row_id;
}

export async function updateLot(id: number, v: LotInput): Promise<boolean> {
  const r = await env.DB
    .prepare('UPDATE lots SET date = ?, kg = ?, crab = ?, vn_fee = ?, rate1 = ?, th_fee = ?, rate2 = ? WHERE id = ?')
    .bind(...values(v), id)
    .run();
  return r.meta.changes > 0;
}

export async function deleteLot(id: number): Promise<boolean> {
  const r = await env.DB.prepare('DELETE FROM lots WHERE id = ?').bind(id).run();
  return r.meta.changes > 0;
}

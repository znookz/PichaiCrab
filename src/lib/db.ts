import { env } from 'cloudflare:workers';
import type { Lot, LotInput } from './lot';

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

export async function insertLot(v: LotInput): Promise<number> {
  const r = await env.DB
    .prepare('INSERT INTO lots (date, kg, crab, vn_fee, rate1, th_fee, rate2) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(...values(v))
    .run();
  return r.meta.last_row_id;
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

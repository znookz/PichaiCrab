import type { Defaults, FieldErrors, Lot, LotInput } from './lot';

export async function fetchLots(): Promise<Lot[]> {
  const res = await fetch('/api/lots');
  if (!res.ok) throw new Error('โหลดข้อมูลไม่สำเร็จ');
  return res.json();
}

export async function fetchLot(id: number): Promise<Lot | null> {
  const res = await fetch(`/api/lots/${id}`);
  return res.ok ? res.json() : null;
}

export async function fetchDefaults(): Promise<Defaults | null> {
  const res = await fetch('/api/defaults');
  return res.ok ? res.json() : null;
}

export type SaveResult = { ok: true } | { ok: false; errors?: FieldErrors };

export async function saveLot(input: LotInput, editingId: number | null): Promise<SaveResult> {
  const res = await fetch(editingId ? `/api/lots/${editingId}` : '/api/lots', {
    method: editingId ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (res.ok) return { ok: true };
  const body = await res.json().catch(() => ({}));
  return { ok: false, errors: body.errors };
}

export async function removeLot(id: number): Promise<boolean> {
  return (await fetch(`/api/lots/${id}`, { method: 'DELETE' })).ok;
}

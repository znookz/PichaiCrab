import type { APIRoute } from 'astro';
import { deleteLot, getLot, updateLot } from '../../../lib/db';
import { parseLotInput } from '../../../lib/lot';

export const prerender = false;

const NOT_FOUND = () => Response.json({ error: 'ไม่พบล็อตนี้' }, { status: 404 });

const parseId = (raw: string | undefined) => {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export const GET: APIRoute = async ({ params }) => {
  const id = parseId(params.id);
  const lot = id ? await getLot(id) : null;
  return lot ? Response.json(lot, { headers: { 'Cache-Control': 'no-store' } }) : NOT_FOUND();
};

export const PUT: APIRoute = async ({ params, request }) => {
  const id = parseId(params.id);
  if (!id) return NOT_FOUND();
  const parsed = parseLotInput(await request.json().catch(() => null));
  if (!parsed.ok) return Response.json({ errors: parsed.errors }, { status: 400 });
  return (await updateLot(id, parsed.value)) ? Response.json({ id }) : NOT_FOUND();
};

export const DELETE: APIRoute = async ({ params }) => {
  const id = parseId(params.id);
  return id && (await deleteLot(id)) ? Response.json({ id }) : NOT_FOUND();
};

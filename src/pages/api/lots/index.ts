import type { APIRoute } from 'astro';
import { insertLot, listLots } from '../../../lib/db';
import { parseLotInput } from '../../../lib/lot';

export const prerender = false;

const NO_STORE = { 'Cache-Control': 'no-store' };

export const GET: APIRoute = async () => {
  return Response.json(await listLots(), { headers: NO_STORE });
};

export const POST: APIRoute = async ({ request }) => {
  const parsed = parseLotInput(await request.json().catch(() => null));
  if (!parsed.ok) return Response.json({ errors: parsed.errors }, { status: 400 });
  const id = await insertLot(parsed.value);
  return Response.json({ id }, { status: 201 });
};

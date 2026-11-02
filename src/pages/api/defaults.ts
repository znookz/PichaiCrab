import type { APIRoute } from 'astro';
import { getDefaults } from '../../lib/db';

export const prerender = false;

export const GET: APIRoute = async () => {
  return Response.json(await getDefaults(), { headers: { 'Cache-Control': 'no-store' } });
};

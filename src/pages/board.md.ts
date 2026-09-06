import type { APIRoute } from 'astro';
import { board } from '../lib/board';
import { boardMarkdown } from '../lib/markdown';

export const GET: APIRoute = async () => {
  return new Response(boardMarkdown(await board()), { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
};

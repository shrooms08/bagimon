import { NextResponse, type NextRequest } from 'next/server';
import { getSupabase } from '../../../../../lib/supabase';
import { renderBagimonPng } from '../../../../../lib/bagimon-art';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: { bagimonId: string } },
): Promise<Response> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('bagimons')
    .select('coin_mint, current_mood, is_alive')
    .eq('id', params.bagimonId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const mood = data.is_alive ? data.current_mood : 'dying';
  const png = await renderBagimonPng(data.coin_mint, mood, 512);
  return new Response(new Uint8Array(png), {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      // The image only changes when mood changes, which is rare within an
      // hour. Cache aggressively at the edge and stale-while-revalidate.
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}

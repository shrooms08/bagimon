import { NextResponse, type NextRequest } from 'next/server';
import { getSupabase } from '../../../../../lib/supabase';
import { issueNonce } from '../../../../../lib/interaction-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET → { nonceToken, message } for a CREATOR CLAIM. The client signs `message`
// and POSTs the result to /claim. Same stateless nonce as holder interactions,
// but minted with the 'claim' purpose so it can't be replayed to feed/pet.
export async function GET(
  _req: NextRequest,
  { params }: { params: { bagimonId: string } },
): Promise<Response> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('bagimons')
    .select('id')
    .eq('id', params.bagimonId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const { nonceToken, message } = await issueNonce(params.bagimonId, 'claim');
  return NextResponse.json({ nonceToken, message });
}

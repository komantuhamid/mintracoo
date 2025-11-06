import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { fid } = await req.json();
    if (!Number.isInteger(fid)) return NextResponse.json({ error: 'bad fid' }, { status: 400 });
    const resp = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`, {
      headers: { 'api_key': process.env.NEYNAR_API_KEY as string }
    });
    if (!resp.ok) return NextResponse.json({ error: 'neynar failed' }, { status: 500 });
    const j = await resp.json();
    const u = j.users?.[0];
    return NextResponse.json({ pfp_url: u?.pfp_url, display_name: u?.display_name || u?.profile?.display_name, username: u?.username, fid: u?.fid });
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || 'server error' }, { status: 500 });
  }
}

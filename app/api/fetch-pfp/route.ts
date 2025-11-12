import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { fid } = await req.json();

    if (!fid) {
      return NextResponse.json({ error: 'Missing FID' }, { status: 400 });
    }

    // Use Neynar API to get user info
    const neynarApiKey = process.env.NEYNAR_API_KEY;
    
    if (!neynarApiKey) {
      return NextResponse.json({ error: 'NEYNAR_API_KEY not configured' }, { status: 500 });
    }

    const url = `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`;
    const response = await fetch(url, {
      headers: {
        'accept': 'application/json',
        'api_key': neynarApiKey,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch from Neynar');
    }

    const data = await response.json();
    const user = data.users?.[0];

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      username: user.username,
      display_name: user.display_name,
      pfp_url: user.pfp_url,
      fid: user.fid,
    });

  } catch (error: any) {
    console.error('fetch-pfp error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

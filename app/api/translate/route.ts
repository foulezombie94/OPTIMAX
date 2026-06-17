import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { text, lang } = await request.json();

    if (!text || !lang) {
      return NextResponse.json({ error: 'Missing text or lang' }, { status: 400 });
    }

    // Fetch from Lingva API (server-side bypasses CORS)
    const res = await fetch(`https://lingva.ml/api/v1/fr/${lang}/${encodeURIComponent(text)}`);
    
    if (!res.ok) {
      throw new Error(`Lingva API responded with status ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Translation proxy error:', error);
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 });
  }
}

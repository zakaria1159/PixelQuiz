import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')
  if (!q) return NextResponse.json({ error: 'Missing query' }, { status: 400 })

  try {
    const res = await fetch(
      `https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=1`,
      { next: { revalidate: 3600 } } // cache for 1 hour
    )
    const data = await res.json()
    const preview = data.data?.[0]?.preview

    if (preview) {
      return NextResponse.json({ previewUrl: preview })
    }
    return NextResponse.json({ error: 'No preview found' }, { status: 404 })
  } catch {
    return NextResponse.json({ error: 'Deezer API error' }, { status: 500 })
  }
}

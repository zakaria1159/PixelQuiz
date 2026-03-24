import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, COOKIE_NAME } from '@/lib/adminAuth'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Login + auth endpoint are always accessible
  if (pathname === '/admin/login' || pathname === '/api/admin/auth') return NextResponse.next()

  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!await verifyToken(token ?? '')) {
    const loginUrl = new URL('/admin/login', req.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}

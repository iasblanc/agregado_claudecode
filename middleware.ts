import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Public routes — no auth needed
  const publicRoutes = ['/', '/auth/login', '/auth/register', '/auth/callback', '/vagas']
  const isPublic = publicRoutes.some(r => pathname === r || pathname.startsWith('/vagas'))

  if (!user && !isPublic) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  if (user) {
    // If already logged in and visiting auth pages, redirect
    if (pathname.startsWith('/auth/login') || pathname.startsWith('/auth/register')) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('tipo, is_admin')
        .eq('id', user.id)
        .single()

      if (profile?.is_admin) return NextResponse.redirect(new URL('/admin/dashboard', request.url))
      if (profile?.tipo === 'transportadora') return NextResponse.redirect(new URL('/transportadora/dashboard', request.url))
      return NextResponse.redirect(new URL('/agregado/dashboard', request.url))
    }

    // Guard admin routes
    if (pathname.startsWith('/admin')) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      if (!profile?.is_admin) {
        return NextResponse.redirect(new URL('/', request.url))
      }
    }

    // Guard transportadora routes
    if (pathname.startsWith('/transportadora')) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('tipo')
        .eq('id', user.id)
        .single()

      if (profile?.tipo !== 'transportadora') {
        return NextResponse.redirect(new URL('/agregado/dashboard', request.url))
      }
    }

    // Guard agregado routes
    if (pathname.startsWith('/agregado')) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('tipo')
        .eq('id', user.id)
        .single()

      if (profile?.tipo !== 'agregado') {
        return NextResponse.redirect(new URL('/transportadora/dashboard', request.url))
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

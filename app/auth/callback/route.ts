import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          },
        },
      }
    )

    await supabase.auth.exchangeCodeForSession(code)

    // Profile is created automatically by the database trigger (handle_new_user)
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const tipo = user.user_metadata?.tipo || 'agregado'
      return NextResponse.redirect(`${origin}/${tipo === 'transportadora' ? 'transportadora' : 'agregado'}/dashboard`)
    }
  }

  return NextResponse.redirect(`${origin}/`)
}

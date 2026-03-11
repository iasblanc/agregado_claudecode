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

    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      // Check if profile already exists (e.g. if created immediately after signUp)
      const { data: existing } = await supabase
        .from('profiles')
        .select('id, tipo')
        .eq('id', user.id)
        .single()

      if (!existing) {
        // Create profile from user_metadata saved during signUp
        const nome = user.user_metadata?.nome || ''
        const tipo = user.user_metadata?.tipo || 'agregado'

        await supabase.from('profiles').upsert({
          id: user.id,
          tipo,
          nome,
          is_admin: false,
        })

        if (tipo === 'agregado') {
          await supabase.from('agregados').upsert({ id: user.id })
        } else {
          await supabase.from('transportadoras').upsert({ id: user.id })
        }
      }

      // Redirect to the correct dashboard based on profile type
      const profileTipo = existing?.tipo || user.user_metadata?.tipo || 'agregado'
      if (profileTipo === 'transportadora') {
        return NextResponse.redirect(`${origin}/transportadora/dashboard`)
      }
      return NextResponse.redirect(`${origin}/agregado/dashboard`)
    }
  }

  return NextResponse.redirect(`${origin}/`)
}

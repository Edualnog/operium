import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Helper to reliably get the auth cookie name
const getAuthCookieName = () => {
  if (!supabaseUrl) return 'sb-auth-token'
  try {
    const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
    return `sb-${projectRef}-auth-token`
  } catch {
    return 'sb-auth-token'
  }
}

export async function middleware(request: NextRequest) {
  // Add pathname header for server components to read current route
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', request.nextUrl.pathname)

  // CRITICAL: Initialize response object early to carry cookies
  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  // 1. Bypasses for static assets and manifests
  if (
    request.nextUrl.pathname.includes('manifest.webmanifest') ||
    request.nextUrl.pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|map)$/)
  ) {
    return response
  }

  // 2. Bypass for auth routes (callbacks, verify)
  // BUT we still want to refresh session if possible, though usually callback handles it.
  // We'll let them pass through without session check enforcement here, 
  // but we should still initialize client to manage cookies if needed in future.
  if (request.nextUrl.pathname.startsWith('/auth/')) {
    return response
  }

  // 2.5 CRITICAL: Intercept auth codes landing on root URL (Supabase Site URL fallback)
  // This happens when Supabase ignores redirectTo and falls back to the configured Site URL
  const code = request.nextUrl.searchParams.get('code')
  if (request.nextUrl.pathname === '/' && code) {
    const callbackUrl = new URL('/auth/callback', request.url)
    // Copy all search params to preserve type, next, etc.
    request.nextUrl.searchParams.forEach((value, key) => {
      callbackUrl.searchParams.set(key, value)
    })
    return NextResponse.redirect(callbackUrl)
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return response
  }

  // 3. Initialize Supabase Client with Cookie Management
  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          // Update request cookies for the current request
          request.cookies.set({
            name,
            value,
            ...options,
          })

          // CRITICAL: Create a new response instance if we are modifying cookies
          // This ensures the response we return effectively sets the cookie
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })

          // Set cookie on the response
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })

          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })

          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // 4. Validate Session
  // Do not rely solely on cookie presence, verify with getUser()
  const hasSessionCookie = Boolean(request.cookies.get(getAuthCookieName()))
  let user = null

  // ALWAYS refresh session to ensure cookies are valid and updated
  // calls to getUser() also refresh the session if needed
  try {
    const { data: { user: authUser }, error } = await supabase.auth.getUser()
    if (!error && authUser) {
      user = authUser
    }
  } catch (error) {
    // Ignore auth errors here
  }

  const pathname = request.nextUrl.pathname
  const isDashboardRoute = pathname.startsWith('/dashboard')
  // NOTE: Removed isSetupRoute check for /criar-senha (page deleted)
  const isAuthRoute = pathname === '/login' || pathname === '/signup'

  // 5. Route Guards

  // Guard: Dashboard -> Redirect to Login if no user
  if (isDashboardRoute && !user) {
    const redirectUrl = new URL('/login', request.url)
    // Pass the original URL as redirect param so user can return after login
    redirectUrl.searchParams.set('redirect', pathname)

    // CRITICAL: We must copy cookies from our current 'response' object 
    // to the new redirect response to preserve any session updates made above
    const redirectResponse = NextResponse.redirect(redirectUrl)

    // Copy cookies manually (Next.js middleware quirk)
    const setCookieHeader = response.headers.get('set-cookie')
    if (setCookieHeader) {
      redirectResponse.headers.set('set-cookie', setCookieHeader)
    }

    return redirectResponse
  }

  // Guard: Login/Signup -> Redirect to Dashboard if user exists
  if (isAuthRoute && user) {
    const redirectResponse = NextResponse.redirect(new URL('/dashboard', request.url))
    // Copy cookies manually
    const setCookieHeader = response.headers.get('set-cookie')
    if (setCookieHeader) {
      redirectResponse.headers.set('set-cookie', setCookieHeader)
    }
    return redirectResponse
  }

  // ============================================================================
  // ROLE-BASED ACCESS CONTROL (Defense in Depth)
  // Redirect FIELD users to /app, WAREHOUSE users stay in dashboard
  // ============================================================================
  if (isDashboardRoute && user) {
    // CRITICAL: Do NOT redirect if this is a recovery/invite flow
    // The user needs to complete password setup first
    const typeParam = request.nextUrl.searchParams.get('type')
    const isRecoveryOrInvite = typeParam === 'recovery' || typeParam === 'invite'

    if (!isRecoveryOrInvite) {
      try {
        // Check if user has operium profile
        const { data: operiumProfile } = await supabase
          .from('operium_profiles')
          .select('role')
          .eq('user_id', user.id)
          .eq('active', true)
          .single()

        // Only FIELD users go to mobile app, WAREHOUSE stays in main dashboard
        if (operiumProfile && operiumProfile.role === 'FIELD') {
          const redirectResponse = NextResponse.redirect(new URL('/app', request.url))
          const setCookieHeader = response.headers.get('set-cookie')
          if (setCookieHeader) {
            redirectResponse.headers.set('set-cookie', setCookieHeader)
          }
          return redirectResponse
        }
      } catch {
        // No operium profile = org owner, allow access
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - manifest.webmanifest (PWA manifest)
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

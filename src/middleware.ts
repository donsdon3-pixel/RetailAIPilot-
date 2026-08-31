import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const { pathname } = request.nextUrl;

  // Public paths that should never be blocked by middleware
  const isLoginPage = pathname === '/login';
  const isPublicStatic =
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname === '/llms.txt';
  const isPublicApi = pathname.startsWith('/api/qa');

  if (isPublicStatic) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  try {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            supabaseResponse = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    // 1. If user is authenticated and visits /login, redirect to Dashboard
    if (user && isLoginPage) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    // 2. If user is unauthenticated and visiting a protected page (not /login and not public API and not public static)
    if (!user && !isLoginPage && !isPublicApi && !isPublicStatic) {
      const redirectUrl = new URL('/login', request.url);
      return NextResponse.redirect(redirectUrl);
    }

    // 3. If user is visiting /admin, restrict strictly to SUPER_ADMIN role
    if (pathname.startsWith('/admin')) {
      const userRole = user?.app_metadata?.role || user?.user_metadata?.role;
      if (userRole !== 'SUPER_ADMIN') {
        return NextResponse.redirect(new URL('/', request.url));
      }
    }
  } catch (err) {
    console.error('[Middleware Error]', err);
    if (!isLoginPage && !isPublicApi && !isPublicStatic) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Set global security headers on all responses
  supabaseResponse.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://generativelanguage.googleapis.com wss://*.supabase.co; frame-ancestors 'none';"
  );
  supabaseResponse.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  supabaseResponse.headers.set('X-Frame-Options', 'DENY');
  supabaseResponse.headers.set('X-Content-Type-Options', 'nosniff');
  supabaseResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  supabaseResponse.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, robots.txt, sitemap.xml, llms.txt
     */
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|llms.txt).*)',
  ],
};

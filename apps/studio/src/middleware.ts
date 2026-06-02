/**
 * Next.js middleware — runs on every request before page rendering.
 *
 * Two jobs:
 *   1. Refresh the Supabase session if it's about to expire (keeps users
 *      logged in across server-rendered pages).
 *   2. Redirect unauthenticated users from protected pages to /login.
 */
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthPage = pathname.startsWith("/login");
  const isPublicAsset = pathname.startsWith("/_next") || pathname.startsWith("/favicon");

  // Not logged in + trying to access any protected page → redirect to /login.
  // This includes the root path "/" itself.
  if (!user && !isAuthPage && !isPublicAsset) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Logged in + on /login → redirect to dashboard
  if (user && isAuthPage) {
    const dashUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(dashUrl);
  }

  // Logged in + on root → redirect to dashboard
  if (user && pathname === "/") {
    const dashUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(dashUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     * - public files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

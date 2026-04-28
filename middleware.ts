import { NextResponse, type NextRequest } from "next/server";

// Routes that don't need auth.
const PUBLIC = ["/login", "/api/auth/login", "/api/auth/callback", "/api/auth/logout", "/_next", "/favicon.ico"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }
  const cookie = req.cookies.get("sf_session");
  if (!cookie?.value) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

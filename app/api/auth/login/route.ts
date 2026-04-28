import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

export async function GET(req: Request) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "GITHUB_CLIENT_ID is not set" }, { status: 500 });
  }
  const url = new URL(req.url);
  const redirectUri = `${url.origin}/api/auth/callback`;
  const state = randomBytes(16).toString("hex");

  const authorize = new URL("https://github.com/login/oauth/authorize");
  authorize.searchParams.set("client_id", clientId);
  authorize.searchParams.set("redirect_uri", redirectUri);
  // GitHub App permissions are declared on the App itself (Contents R/W, Pull requests R/W,
  // Email addresses R), so the `scope` query parameter is intentionally omitted — GitHub Apps
  // ignore it and would only confuse anyone reading the logs.
  authorize.searchParams.set("state", state);

  const res = NextResponse.redirect(authorize.toString());
  res.cookies.set("sf_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}

import { NextResponse } from "next/server";
import { setSession } from "@/lib/auth";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = req.headers
    .get("cookie")
    ?.split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith("sf_oauth_state="))
    ?.split("=")[1];

  if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });
  if (!state || state !== cookieState) {
    return NextResponse.json({ error: "Invalid state" }, { status: 400 });
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "GitHub OAuth env vars missing" }, { status: 500 });
  }

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: `${url.origin}/api/auth/callback`,
    }),
  });
  if (!tokenRes.ok) {
    return NextResponse.json({ error: "GitHub token exchange failed" }, { status: 502 });
  }
  const tokenJson = (await tokenRes.json()) as { access_token?: string; error?: string };
  if (!tokenJson.access_token) {
    return NextResponse.json({ error: tokenJson.error || "No access token" }, { status: 502 });
  }

  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${tokenJson.access_token}`,
      Accept: "application/vnd.github+json",
    },
  });
  if (!userRes.ok) return NextResponse.json({ error: "Failed to fetch user" }, { status: 502 });
  const user = (await userRes.json()) as {
    login: string;
    name: string | null;
    email: string | null;
    avatar_url: string;
  };

  // Try to get a verified primary email if /user.email is null
  let email = user.email;
  if (!email) {
    const emailsRes = await fetch("https://api.github.com/user/emails", {
      headers: {
        Authorization: `Bearer ${tokenJson.access_token}`,
        Accept: "application/vnd.github+json",
      },
    });
    if (emailsRes.ok) {
      const emails = (await emailsRes.json()) as Array<{
        email: string;
        primary: boolean;
        verified: boolean;
      }>;
      email = emails.find((e) => e.primary && e.verified)?.email ?? null;
    }
  }
  // Fall back to GitHub's no-reply email so commits still attribute correctly
  if (!email) email = `${user.login}@users.noreply.github.com`;

  await setSession({
    token: tokenJson.access_token,
    login: user.login,
    name: user.name,
    email,
    avatarUrl: user.avatar_url,
  });

  const res = NextResponse.redirect(new URL("/", url.origin));
  res.cookies.delete("sf_oauth_state");
  return res;
}

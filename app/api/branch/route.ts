import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { allowedBranches } from "@/lib/github";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const branch = (body as { branch?: unknown })?.branch;
  if (typeof branch !== "string" || !allowedBranches().includes(branch)) {
    return NextResponse.json({ error: "Branch not allowed" }, { status: 400 });
  }
  cookies().set("sf_branch", branch, {
    httpOnly: false, // not security-sensitive; UI may read it for display
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return NextResponse.json({ ok: true, branch });
}

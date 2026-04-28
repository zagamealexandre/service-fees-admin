import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listFileHistory } from "@/lib/github";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const url = new URL(req.url);
    const perPage = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 30)));
    const history = await listFileHistory(session.token, perPage);
    return NextResponse.json({ history });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Read failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

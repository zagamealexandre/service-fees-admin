import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listOpenServiceFeePRs } from "@/lib/github";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const pulls = await listOpenServiceFeePRs(session.token);
    return NextResponse.json({ pulls });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Read failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

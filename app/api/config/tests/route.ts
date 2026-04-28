import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { readTestsFile } from "@/lib/github";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const result = await readTestsFile(session.token);
    if (!result) return NextResponse.json({ tests: null });
    return NextResponse.json({ tests: result.json, sha: result.sha, htmlUrl: result.htmlUrl });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Read failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

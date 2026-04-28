import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  baseBranch,
  commitFile,
  createBranch,
  getBranchSha,
  openPullRequest,
  readConfigFile,
} from "@/lib/github";
import { ServiceFeeConfigSchema } from "@/lib/schema";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const { json, sha, htmlUrl } = await readConfigFile(session.token);
    return NextResponse.json({ json, sha, htmlUrl });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Read failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

type SaveBody = {
  content: unknown;
  baseSha: string;
  prTitle: string;
  prBody?: string;
};

function isSaveBody(b: unknown): b is SaveBody {
  if (!b || typeof b !== "object") return false;
  const o = b as Record<string, unknown>;
  return (
    "content" in o &&
    typeof o.baseSha === "string" &&
    typeof o.prTitle === "string"
  );
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!isSaveBody(body)) {
    return NextResponse.json({ error: "Missing fields: content, baseSha, prTitle" }, { status: 400 });
  }

  const parsed = ServiceFeeConfigSchema.safeParse(body.content);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Schema validation failed", issues: parsed.error.issues },
      { status: 422 }
    );
  }

  try {
    // Detect concurrent edits
    const current = await readConfigFile(session.token);
    if (current.sha !== body.baseSha) {
      return NextResponse.json(
        { error: "conflict", currentSha: current.sha, currentJson: current.json },
        { status: 409 }
      );
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, "-").replace(/-(\d{3})Z$/, "Z");
    const branch = `sf/${stamp}-${session.login}`;

    const baseSha = await getBranchSha(session.token, baseBranch());
    await createBranch(session.token, branch, baseSha);

    const newContent = JSON.stringify(parsed.data, null, 2) + "\n";
    const commitMsg = body.prTitle.trim() || "Update service fees";
    await commitFile(
      session.token,
      branch,
      commitMsg,
      newContent,
      current.sha,
      { name: session.name || session.login, email: session.email || `${session.login}@users.noreply.github.com` }
    );

    const pr = await openPullRequest(
      session.token,
      branch,
      body.prTitle.trim() || "Update service fees",
      (body.prBody || "").trim()
    );
    return NextResponse.json({ ok: true, pr });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Save failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

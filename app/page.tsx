import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { allowedBranches, baseBranch, readConfigFile } from "@/lib/github";
import { ServiceFeeConfigSchema } from "@/lib/schema";
import { EditorShell } from "@/components/EditorShell";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getSession();
  if (!session) redirect("/login");

  let json: unknown;
  let sha: string;
  let htmlUrl: string;
  try {
    const r = await readConfigFile(session.token);
    json = r.json;
    sha = r.sha;
    htmlUrl = r.htmlUrl;
  } catch (e) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-lg font-semibold text-ink">Could not load configuration</h1>
        <p className="mt-2 text-sm text-subtle">
          {e instanceof Error ? e.message : "Unknown error."}
        </p>
        <p className="mt-4 text-sm text-subtle">
          Check that <code className="rounded bg-slate-100 px-1.5 py-0.5">GITHUB_REPO</code> is set
          and that the file{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5">config/service-fees.json</code>{" "}
          exists on the base branch.
        </p>
        <p className="mt-4 text-sm">
          <a className="underline" href="/api/auth/logout">
            Sign out
          </a>
        </p>
      </main>
    );
  }

  const parsed = ServiceFeeConfigSchema.safeParse(json);
  if (!parsed.success) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-lg font-semibold text-ink">Configuration shape is unexpected</h1>
        <p className="mt-2 text-sm text-subtle">
          The file at <code>config/service-fees.json</code> on the base branch does not match the
          expected schema.
        </p>
        <pre className="mt-3 max-h-72 overflow-auto rounded-md border border-line bg-slate-50 p-3 text-xs">
          {JSON.stringify(parsed.error.issues, null, 2)}
        </pre>
      </main>
    );
  }

  return (
    <main>
      <EditorShell
        initialConfig={parsed.data}
        baseSha={sha}
        configHtmlUrl={htmlUrl}
        user={{ login: session.login, name: session.name, avatarUrl: session.avatarUrl }}
        branches={allowedBranches()}
        activeBranch={baseBranch()}
      />
    </main>
  );
}

// Thin GitHub REST helpers. Token is the user's OAuth access token (repo scope).

const GH = "https://api.github.com";

export type RepoSlug = { owner: string; repo: string };

export function repoFromEnv(): RepoSlug {
  const slug = process.env.GITHUB_REPO;
  if (!slug || !slug.includes("/")) {
    throw new Error("GITHUB_REPO env var must be set as 'owner/repo'.");
  }
  const [owner, repo] = slug.split("/");
  return { owner, repo };
}

export function baseBranch(): string {
  return process.env.GITHUB_BASE_BRANCH || "main";
}

export const CONFIG_PATH = "config/service-fees.json";

async function gh(token: string, path: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${GH}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  return res;
}

export async function readConfigFile(token: string): Promise<{
  json: unknown;
  sha: string;
  htmlUrl: string;
}> {
  const { owner, repo } = repoFromEnv();
  const res = await gh(
    token,
    `/repos/${owner}/${repo}/contents/${CONFIG_PATH}?ref=${encodeURIComponent(baseBranch())}`
  );
  if (res.status === 404) {
    throw new Error(`${CONFIG_PATH} not found on ${baseBranch()} — commit a starter file first.`);
  }
  if (!res.ok) throw new Error(`GitHub read failed (${res.status}): ${await res.text()}`);
  const data = (await res.json()) as { content: string; sha: string; html_url: string; encoding: string };
  const content = Buffer.from(data.content, data.encoding === "base64" ? "base64" : "utf8").toString("utf8");
  return { json: JSON.parse(content), sha: data.sha, htmlUrl: data.html_url };
}

export async function getBranchSha(token: string, branch: string): Promise<string> {
  const { owner, repo } = repoFromEnv();
  const res = await gh(token, `/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`);
  if (!res.ok) throw new Error(`Could not read branch ${branch} (${res.status}).`);
  const data = (await res.json()) as { object: { sha: string } };
  return data.object.sha;
}

export async function createBranch(token: string, branchName: string, fromSha: string): Promise<void> {
  const { owner, repo } = repoFromEnv();
  const res = await gh(token, `/repos/${owner}/${repo}/git/refs`, {
    method: "POST",
    body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha: fromSha }),
  });
  if (!res.ok) throw new Error(`Could not create branch (${res.status}): ${await res.text()}`);
}

export async function commitFile(
  token: string,
  branch: string,
  message: string,
  content: string,
  fileSha: string,
  committer: { name: string; email: string }
): Promise<void> {
  const { owner, repo } = repoFromEnv();
  const res = await gh(token, `/repos/${owner}/${repo}/contents/${CONFIG_PATH}`, {
    method: "PUT",
    body: JSON.stringify({
      message,
      content: Buffer.from(content, "utf8").toString("base64"),
      sha: fileSha,
      branch,
      committer,
      author: committer,
    }),
  });
  if (!res.ok) throw new Error(`Commit failed (${res.status}): ${await res.text()}`);
}

export async function openPullRequest(
  token: string,
  branch: string,
  title: string,
  body: string
): Promise<{ number: number; htmlUrl: string }> {
  const { owner, repo } = repoFromEnv();
  const res = await gh(token, `/repos/${owner}/${repo}/pulls`, {
    method: "POST",
    body: JSON.stringify({ title, body, head: branch, base: baseBranch() }),
  });
  if (!res.ok) throw new Error(`PR create failed (${res.status}): ${await res.text()}`);
  const data = (await res.json()) as { number: number; html_url: string };
  return { number: data.number, htmlUrl: data.html_url };
}

export async function listOpenServiceFeePRs(token: string): Promise<
  { number: number; title: string; htmlUrl: string; user: string }[]
> {
  const { owner, repo } = repoFromEnv();
  const res = await gh(token, `/repos/${owner}/${repo}/pulls?state=open&per_page=50`);
  if (!res.ok) return [];
  const data = (await res.json()) as Array<{
    number: number;
    title: string;
    html_url: string;
    head: { ref: string };
    user: { login: string };
  }>;
  // Heuristic: branch starts with "sf/"
  return data
    .filter((p) => p.head.ref.startsWith("sf/"))
    .map((p) => ({
      number: p.number,
      title: p.title,
      htmlUrl: p.html_url,
      user: p.user.login,
    }));
}

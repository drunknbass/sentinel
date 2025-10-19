/**
 * GitHub metadata secret scanner
 *
 * Scans issues, PRs, review comments, issue comments, commit comments, and releases
 * for commonly leaked secrets (tokens/keys). Produces a JSON report with locations
 * and snippets to help you remove or minimize them.
 *
 * Usage:
 *   GITHUB_TOKEN=ghp_xxx pnpm tsx scripts/scan-github-secrets.ts --owner <owner> --repo <repo>
 *
 * Notes:
 * - Requires a token with repo read access (public_repo for public repos).
 * - Does NOT delete anything; it only reports. Use the suggested gh/api calls
 *   in the output to remove comments if needed.
 */

// Node 18+ has global fetch
type Opts = { owner: string; repo: string };

function parseArgs(): Opts {
  const args = process.argv.slice(2);
  let owner = "";
  let repo = "";
  for (const a of args) {
    const [k, v] = a.split("=");
    if (k === "--owner") owner = v;
    if (k === "--repo") repo = v;
  }
  if (!owner || !repo) {
    console.error("Usage: tsx scripts/scan-github-secrets.ts --owner <owner> --repo <repo>");
    process.exit(1);
  }
  return { owner, repo };
}

const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || process.env.GH_PERSONAL_TOKEN;
if (!TOKEN) {
  console.error("Missing GITHUB_TOKEN. Set GITHUB_TOKEN or GH_TOKEN env var.");
  process.exit(1);
}

const API = "https://api.github.com";

async function fetchAll(path: string, query: Record<string, any> = {}): Promise<any[]> {
  const results: any[] = [];
  let page = 1;
  while (true) {
    const params = new URLSearchParams();
    params.set("per_page", "100");
    params.set("page", String(page));
    for (const [k, v] of Object.entries(query)) params.set(k, String(v));
    const url = `${API}${path}?${params.toString()}`;
    const res = await fetch(url, {
      headers: {
        "Authorization": `token ${TOKEN}`,
        "Accept": "application/vnd.github+json",
        "User-Agent": "sentinel-secret-auditor"
      }
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Request failed ${res.status} ${res.statusText}: ${t}`);
    }
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;
    results.push(...data);
    if (data.length < 100) break;
    page++;
  }
  return results;
}

// Patterns: keep focused; flag severity
type Detector = { name: string; regex: RegExp; severity: "high" | "medium" | "low" };
const detectors: Detector[] = [
  // High – private keys and cloud creds
  { name: "PEM_PRIVATE_KEY", regex: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/, severity: "high" },
  { name: "AWS_ACCESS_KEY_ID", regex: /\bAKIA[0-9A-Z]{16}\b/, severity: "high" },
  { name: "AWS_SECRET_FRAG", regex: /aws_secret|aws_secret_access_key|AWS_SECRET_ACCESS_KEY/i, severity: "high" },
  { name: "GOOGLE_API_KEY", regex: /\bAIza[0-9A-Za-z\-_]{20,}\b/, severity: "high" },
  { name: "GITHUB_PAT", regex: /\bgh[pous]_[A-Za-z0-9_]{20,}\b/, severity: "high" },
  { name: "STRIPE_LIVE_KEY", regex: /\bsk_live_[A-Za-z0-9]{20,}\b/, severity: "high" },
  // Medium – service tokens
  { name: "SLACK_BOT_TOKEN", regex: /\bxoxb-[A-Za-z0-9-]{12,}\b/, severity: "medium" },
  { name: "UPSTASH_TOKEN_HINT", regex: /UPSTASH(_REDIS)?_REST_TOKEN|KV_REST_API_TOKEN/i, severity: "medium" },
  { name: "APPLE_MAPKIT_KEY_HINT", regex: /APPLE_MAPKIT_(TEAM_ID|KEY_ID|PRIVATE_KEY|TEST_TOKEN)/, severity: "medium" },
  // Low – Mapbox public tokens (flag for review)
  { name: "MAPBOX_PUBLIC", regex: /\bpk\.[A-Za-z0-9._-]{10,}\b/, severity: "low" },
];

function detect(body: string | null | undefined) {
  if (!body) return [] as { name: string; match: string }[];
  const out: { name: string; match: string }[] = [];
  for (const d of detectors) {
    const m = body.match(d.regex);
    if (m) out.push({ name: d.name, match: m[0] });
  }
  return out;
}

async function main() {
  const { owner, repo } = parseArgs();
  const report: any[] = [];

  async function scanCollection(label: string, items: any[], getText: (x: any) => string | null | undefined, getUrl: (x: any) => string) {
    for (const it of items) {
      const hits = detect(getText(it));
      if (hits.length > 0) {
        report.push({
          where: label,
          url: getUrl(it),
          id: it.id,
          created_at: it.created_at,
          author: it.user?.login || it.actor?.login || it.author?.login || null,
          hits,
          snippet: (getText(it) || "").slice(0, 300)
        });
      }
    }
  }

  // Issues (includes PRs as issues)
  const issues = await fetchAll(`/repos/${owner}/${repo}/issues`, { state: "all" });
  await scanCollection("issue.body", issues, x => x.body, x => x.html_url);

  // Issue comments
  const issueComments = await fetchAll(`/repos/${owner}/${repo}/issues/comments`);
  await scanCollection("issue.comment", issueComments, x => x.body, x => x.html_url);

  // Pull requests bodies
  const prs = await fetchAll(`/repos/${owner}/${repo}/pulls`, { state: "all" });
  await scanCollection("pull.body", prs, x => x.body, x => x.html_url);

  // PR review comments (code review threads)
  const prReviewComments = await fetchAll(`/repos/${owner}/${repo}/pulls/comments`);
  await scanCollection("pull.review_comment", prReviewComments, x => x.body, x => x.html_url);

  // Commit comments
  const commitComments = await fetchAll(`/repos/${owner}/${repo}/comments`);
  await scanCollection("commit.comment", commitComments, x => x.body, x => x.html_url);

  // Releases
  const releases = await fetchAll(`/repos/${owner}/${repo}/releases`);
  await scanCollection("release.body", releases, x => x.body, x => x.html_url);

  // Output
  const high = report.filter(r => r.hits.some((h: any) => detectors.find(d => d.name === h.name)?.severity === "high"));
  const medium = report.filter(r => r.hits.some((h: any) => detectors.find(d => d.name === h.name)?.severity === "medium"));
  const low = report.filter(r => r.hits.some((h: any) => detectors.find(d => d.name === h.name)?.severity === "low"));

  const summary = { counts: { total: report.length, high: high.length, medium: medium.length, low: low.length } };
  console.log(JSON.stringify(summary, null, 2));
  const out = { summary, findings: report };
  const fs = await import("node:fs");
  fs.writeFileSync("github-secret-audit.json", JSON.stringify(out, null, 2));
  console.log("Wrote github-secret-audit.json");

  if (report.length > 0) {
    console.log("\nRemediation tips:")
    console.log("- Issue comments: gh api -X DELETE repos/:owner/:repo/issues/comments/:comment_id")
    console.log("- PR review comments: gh api -X DELETE repos/:owner/:repo/pulls/comments/:comment_id")
    console.log("- Commit comments: gh api -X DELETE repos/:owner/:repo/comments/:comment_id")
    console.log("- Minimize via GraphQL (optional): https://docs.github.com/en/graphql/reference/mutations#minimizecomment")
  }
}

main().catch((err) => {
  console.error("Scan failed:", err);
  process.exit(1);
});


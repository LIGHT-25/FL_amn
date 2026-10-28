const token = process.env.FACEBOOK_PAGE_TOKEN!;
const pageId = process.env.FACEBOOK_PAGE_ID!;

async function get(path: string, params: Record<string, string> = {}) {
  const url = new URL(`https://graph.facebook.com/v21.0/${path}`);
  url.searchParams.set("access_token", token);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url);
  const json = await res.json();
  console.log("\nGET", path, res.status);
  console.log(JSON.stringify(json, null, 2).slice(0, 1200));
  return json as Record<string, unknown>;
}

await get("me", { fields: "id,name" });
await get("debug_token", {
  input_token: token,
  // debug_token needs an app token sometimes; try with same token first
});
const accounts = await get("me/accounts", { fields: "id,name,access_token,tasks" });
const data = (accounts.data as Array<Record<string, unknown>> | undefined) ?? [];
const match = data.find((p) => String(p.id) === pageId) ?? data[0];
if (match) {
  console.log("\nUsing page:", match.id, match.name);
  console.log("pageTokenPrefix:", String(match.access_token).slice(0, 20));
  // try a text-only feed post with page token
  const body = new URLSearchParams({
    access_token: String(match.access_token),
    message: "FlowForge connectivity check " + new Date().toISOString(),
  });
  const res = await fetch(`https://graph.facebook.com/v21.0/${match.id}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  console.log("\nFEED POST", res.status, await res.text());
} else {
  console.log("No pages returned for this token — need a Page access token with pages_manage_posts.");
}

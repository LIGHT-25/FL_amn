import { NODE_TYPES } from "@flowforge/shared";
import { asString, interpolate } from "./interpolate.js";
import { connectorStrict, publishEnabled, requireSecret, resolveSecret } from "./strict.js";
import type { NodeDefinition } from "./types.js";

type PageAccount = { id: string; name?: string; access_token: string };

async function listManagedPages(userToken: string, signal: AbortSignal): Promise<PageAccount[]> {
  const url = new URL("https://graph.facebook.com/v21.0/me/accounts");
  url.searchParams.set("access_token", userToken);
  url.searchParams.set("fields", "id,name,access_token,tasks");
  const response = await fetch(url, { signal });
  const json = (await response.json()) as {
    data?: PageAccount[];
    error?: { message?: string };
  };
  if (!response.ok) {
    const message = json.error?.message ?? `Facebook me/accounts HTTP ${response.status}`;
    // Page tokens have no /me/accounts — caller should use the token as-is.
    if (/nonexisting field \(accounts\)/i.test(message)) {
      return [];
    }
    throw new Error(message);
  }
  return json.data ?? [];
}

async function resolvePageAuth(params: {
  token: string;
  pageId: string;
  signal: AbortSignal;
}): Promise<{ token: string; pageId: string; pageName?: string }> {
  const pages = await listManagedPages(params.token, params.signal);
  if (pages.length === 0) {
    // Already a Page token (or user token with no pages) — publish with configured id.
    let pageName: string | undefined;
    try {
      const pageUrl = new URL(`https://graph.facebook.com/v21.0/${encodeURIComponent(params.pageId)}`);
      pageUrl.searchParams.set("fields", "id,name");
      pageUrl.searchParams.set("access_token", params.token);
      const pageRes = await fetch(pageUrl, { signal: params.signal });
      const pageJson = (await pageRes.json()) as { id?: string; name?: string; error?: { message?: string } };
      if (pageRes.ok && pageJson.name) {
        pageName = pageJson.name;
      }
    } catch {
      // Best-effort page name only.
    }
    return { token: params.token, pageId: params.pageId, pageName };
  }
  const match =
    pages.find((p) => p.id === params.pageId) ??
    pages.find((p) => p.name?.toLowerCase() === params.pageId.toLowerCase()) ??
    pages[0]!;
  return {
    token: match.access_token,
    pageId: match.id,
    pageName: match.name,
  };
}

function explainFacebookPublishError(message: string): string {
  if (/publish_actions/i.test(message) || /deprecated/i.test(message)) {
    return (
      `${message} — FlowForge publishes to a Facebook *Page*, not a personal profile. ` +
      `In Graph API Explorer get a token with pages_manage_posts + pages_show_list + pages_read_engagement, ` +
      `then call GET /me/accounts, copy that Page's access_token into FACEBOOK_PAGE_TOKEN and the Page id into FACEBOOK_PAGE_ID.`
    );
  }
  if (/expired|Session has expired/i.test(message)) {
    return `${message} — Generate a fresh Page access token and update FACEBOOK_PAGE_TOKEN in .env, then restart the API.`;
  }
  return message;
}

export const facebookPostNode: NodeDefinition = {
  type: NODE_TYPES.FACEBOOK_POST,
  version: 1,
  displayName: "Facebook: Publish Post",
  category: "connector",
  description: "Publish to a Facebook Page via Graph API",
  async execute(ctx) {
    if (!publishEnabled(ctx.env)) {
      const message = interpolate(asString(ctx.config.message), {
        input: ctx.input,
        trigger: ctx.trigger,
        steps: ctx.steps,
        now: ctx.now().toISOString(),
      });
      const imageUrl = interpolate(asString(ctx.config.imageUrl), {
        input: ctx.input,
        trigger: ctx.trigger,
        steps: ctx.steps,
        now: ctx.now().toISOString(),
      });
      return {
        output: {
          id: `demo_skip_fb_${ctx.now().getTime()}`,
          message,
          imageUrl,
          mocked: true,
          skippedPublish: true,
        },
        logs: [
          {
            level: "warn",
            message:
              "Facebook publish skipped on the public demo (DEMO_PUBLISH_ENABLED=false). Earlier steps still ran.",
            at: ctx.now().toISOString(),
          },
        ],
      };
    }
    const interp = {
      input: ctx.input,
      trigger: ctx.trigger,
      steps: ctx.steps,
      now: ctx.now().toISOString(),
    };
    const configuredPageId = resolveSecret(
      ctx.config.pageId,
      ctx.env.FACEBOOK_PAGE_ID,
      ["", "123456789", "mock-page"],
      ctx.env,
    );
    const message = interpolate(asString(ctx.config.message), interp);
    const imageUrl = interpolate(asString(ctx.config.imageUrl), interp);
    const token = requireSecret({
      label: "Facebook Page token",
      value: resolveSecret(ctx.config.credential, ctx.env.FACEBOOK_PAGE_TOKEN, ["", "meta-token"], ctx.env),
      env: ctx.env,
      hint: "Set FACEBOOK_PAGE_TOKEN (Page access token with pages_manage_posts) and FACEBOOK_PAGE_ID in .env",
    });

    if (token && configuredPageId) {
      const auth = await resolvePageAuth({
        token,
        pageId: configuredPageId,
        signal: ctx.signal,
      });

      const body = new URLSearchParams({ access_token: auth.token });
      let endpoint: URL;
      if (imageUrl) {
        endpoint = new URL(`https://graph.facebook.com/v21.0/${encodeURIComponent(auth.pageId)}/photos`);
        body.set("url", imageUrl);
        body.set("caption", message);
      } else {
        endpoint = new URL(`https://graph.facebook.com/v21.0/${encodeURIComponent(auth.pageId)}/feed`);
        body.set("message", message);
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
        signal: ctx.signal,
      });
      const json = (await response.json()) as {
        id?: string;
        post_id?: string;
        error?: { message?: string; code?: number };
      };
      if (!response.ok) {
        throw new Error(explainFacebookPublishError(json.error?.message ?? `Facebook HTTP ${response.status}`));
      }
      const id = json.id ?? json.post_id;
      return {
        output: {
          id,
          pageId: auth.pageId,
          pageName: auth.pageName,
          message,
          imageUrl,
          mocked: false,
        },
        logs: [
          {
            level: "info",
            message: `Published Facebook ${imageUrl ? "photo" : "post"} ${id} on page ${auth.pageName ?? auth.pageId}`,
            at: ctx.now().toISOString(),
          },
        ],
      };
    }

    if (connectorStrict(ctx.env)) {
      throw new Error(
        "Facebook Page token and page ID are required. Set FACEBOOK_PAGE_TOKEN (Page token with pages_manage_posts) and FACEBOOK_PAGE_ID in .env",
      );
    }

    const id = `mock_fb_${ctx.now().getTime()}`;
    return {
      output: { id, pageId: configuredPageId || "mock-page", message, imageUrl, mocked: true },
      logs: [
        {
          level: "warn",
          message: `Facebook post mocked (${id}). Set FACEBOOK_PAGE_TOKEN for live publish.`,
          at: ctx.now().toISOString(),
        },
      ],
    };
  },
};

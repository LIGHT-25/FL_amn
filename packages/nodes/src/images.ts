import { NODE_TYPES } from "@flowforge/shared";
import { asString, interpolate } from "./interpolate.js";
import { connectorStrict, requireSecret, resolveSecret } from "./strict.js";
import type { NodeDefinition } from "./types.js";

type ImageHit = { url: string; tags?: string; photographer?: string; results?: unknown };

/** Unsplash search works better with spaces than comma-lists from the calendar. */
function normalizeQuery(raw: string): string {
  return raw
    .replace(/,/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function searchPexels(params: {
  apiKey: string;
  query: string;
  signal: AbortSignal;
}): Promise<ImageHit> {
  const url = new URL("https://api.pexels.com/v1/search");
  url.searchParams.set("query", params.query);
  url.searchParams.set("per_page", "5");
  url.searchParams.set("orientation", "landscape");
  const response = await fetch(url, {
    headers: { Authorization: params.apiKey },
    signal: params.signal,
  });
  const body = (await response.json()) as {
    photos?: Array<{
      src?: { large?: string; original?: string; medium?: string };
      alt?: string;
      photographer?: string;
    }>;
    error?: string;
  };
  if (!response.ok) {
    throw new Error(body.error ?? `Pexels HTTP ${response.status}`);
  }
  const photo = body.photos?.[0];
  const imageUrl = photo?.src?.large ?? photo?.src?.original ?? photo?.src?.medium ?? "";
  if (!imageUrl) {
    throw new Error(`Pexels returned no images for "${params.query}"`);
  }
  return {
    url: imageUrl,
    tags: photo?.alt,
    photographer: photo?.photographer,
    results: body.photos ?? [],
  };
}

async function searchUnsplash(params: {
  apiKey: string;
  query: string;
  signal: AbortSignal;
}): Promise<ImageHit> {
  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", params.query);
  url.searchParams.set("per_page", "5");
  url.searchParams.set("orientation", "landscape");
  const response = await fetch(url, {
    headers: {
      Authorization: `Client-ID ${params.apiKey}`,
      "Accept-Version": "v1",
    },
    signal: params.signal,
  });
  const body = (await response.json()) as {
    results?: Array<{
      urls?: { regular?: string; full?: string; small?: string };
      alt_description?: string | null;
      description?: string | null;
      user?: { name?: string };
    }>;
    errors?: string[];
  };
  if (!response.ok) {
    throw new Error(body.errors?.join(", ") ?? `Unsplash HTTP ${response.status}`);
  }
  const photo = body.results?.[0];
  const imageUrl = photo?.urls?.regular ?? photo?.urls?.full ?? photo?.urls?.small ?? "";
  if (!imageUrl) {
    throw new Error(`Unsplash returned no images for "${params.query}"`);
  }
  return {
    url: imageUrl,
    tags: photo?.alt_description ?? photo?.description ?? undefined,
    photographer: photo?.user?.name,
    results: body.results ?? [],
  };
}

/** Normalize legacy Pixabay configs onto Unsplash (Pixabay is no longer offered). */
function resolveProvider(raw: string): "Unsplash" | "Pexels" {
  const value = raw.trim() || "Unsplash";
  if (value.toLowerCase() === "pexels") return "Pexels";
  return "Unsplash";
}

export const imagesSearchNode: NodeDefinition = {
  type: NODE_TYPES.IMAGES_SEARCH,
  version: 1,
  displayName: "Unsplash",
  category: "connector",
  description: "Find stock photos via Unsplash (or Pexels)",
  async execute(ctx) {
    const interp = {
      input: ctx.input,
      trigger: ctx.trigger,
      steps: ctx.steps,
      now: ctx.now().toISOString(),
    };
    const configured = asString(ctx.config.provider, "Unsplash");
    const provider = resolveProvider(configured);
    const query = normalizeQuery(
      interpolate(
        asString(ctx.config.query, asString((ctx.input as { keywords?: string })?.keywords, "automation")),
        interp,
      ),
    );

    const envKey = provider === "Unsplash" ? ctx.env.UNSPLASH_ACCESS_KEY : ctx.env.PEXELS_API_KEY;
    const label = provider === "Unsplash" ? "Unsplash access key" : "Pexels API key";
    const hint =
      provider === "Unsplash"
        ? "Set UNSPLASH_ACCESS_KEY in .env (https://unsplash.com/developers)"
        : "Set PEXELS_API_KEY in .env (https://www.pexels.com/api/)";

    const apiKey = requireSecret({
      label,
      value: resolveSecret(
        ctx.config.credential,
        envKey,
        ["", "pixabay-key", "pexels-key", "unsplash-key"],
        ctx.env,
      ),
      env: ctx.env,
      hint,
    });

    if (apiKey) {
      const hit =
        provider === "Unsplash"
          ? await searchUnsplash({ apiKey, query, signal: ctx.signal })
          : await searchPexels({ apiKey, query, signal: ctx.signal });

      return {
        output: {
          provider,
          query,
          url: hit.url,
          imageUrl: hit.url,
          tags: hit.tags,
          photographer: hit.photographer,
          results: hit.results,
          mocked: false,
        },
        logs: [
          {
            level: "info",
            message:
              configured !== provider
                ? `${configured} remapped to ${provider}; returned an image for "${query}"`
                : `${provider} returned an image for "${query}"`,
            at: ctx.now().toISOString(),
          },
        ],
      };
    }

    if (connectorStrict(ctx.env)) {
      throw new Error(`Stock image search requires a key for ${provider}. ${hint}`);
    }

    const url = `https://picsum.photos/seed/${encodeURIComponent(query.slice(0, 40) || "flowforge")}/1200/630`;
    return {
      output: { provider, query, url, imageUrl: url, mocked: true },
      logs: [
        {
          level: "warn",
          message: `Stock image mocked. ${hint}`,
          at: ctx.now().toISOString(),
        },
      ],
    };
  },
};

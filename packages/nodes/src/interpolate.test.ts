import { describe, expect, it } from "vitest";
import {
  deepInterpolate,
  escapeControlCharsInsideJsonStrings,
  interpolateJsonTemplate,
} from "./interpolate.js";

describe("interpolateJsonTemplate", () => {
  it("keeps Status when captions contain quotes and newlines", () => {
    const parsed = interpolateJsonTemplate(
      '{ "Topic": "{{ steps.topics.topic }}", "Caption": "{{ steps.captions.facebook }}", "Status": "approved" }',
      {
        steps: {
          topics: { topic: 'AI "automation" trends' },
          captions: { facebook: 'Line1\nReady to "ship" faster?' },
        },
      },
    );
    expect(parsed).toEqual({
      Topic: 'AI "automation" trends',
      Caption: 'Line1\nReady to "ship" faster?',
      Status: "approved",
    });
  });

  it("survives Gemini-like captions with emoji, tabs, CR, and backslashes", () => {
    const caption =
      "🚀 Ready to transform?\tAI workflow\r\nautomation is here!\nPath: C:\\flows\\demo\n#AI";
    const parsed = interpolateJsonTemplate(
      `{
  "Topic": "{{ steps.topics.topic }}",
  "Keywords": "{{ steps.topics.keywords }}",
  "Caption": "{{ steps.captions.facebook }}",
  "ImageUrl": "{{ steps.images.url }}",
  "Status": "approved"
}`,
      {
        steps: {
          topics: { topic: "AI workflow automation trends", keywords: "ai, automation, no-code" },
          captions: { facebook: caption },
          images: { url: "https://images.unsplash.com/photo-1?q=80&w=1080" },
        },
      },
    );
    expect(parsed).toEqual({
      Topic: "AI workflow automation trends",
      Keywords: "ai, automation, no-code",
      Caption: caption,
      ImageUrl: "https://images.unsplash.com/photo-1?q=80&w=1080",
      Status: "approved",
    });
  });
});

describe("deepInterpolate JSON configs (engine path)", () => {
  it("does not break when engine pre-resolves Sheets values templates", () => {
    const template =
      '{ "Topic": "{{ steps.topics.topic }}", "Caption": "{{ steps.captions.facebook }}", "Status": "approved" }';
    const caption = "Line1\nLine2 with \"quotes\" and 🚀";
    const resolved = deepInterpolate(template, {
      steps: {
        topics: { topic: "AI trends" },
        captions: { facebook: caption },
      },
    });
    expect(resolved).toEqual({
      Topic: "AI trends",
      Caption: caption,
      Status: "approved",
    });
  });

  it("repairs already-broken JSON strings with raw newlines inside values", () => {
    const broken = '{ "Caption": "hello\nworld", "Status": "approved" }';
    expect(() => JSON.parse(broken)).toThrow();
    const fixed = escapeControlCharsInsideJsonStrings(broken);
    expect(JSON.parse(fixed)).toEqual({ Caption: "hello\nworld", Status: "approved" });
    expect(deepInterpolate(broken, { steps: {} })).toEqual({
      Caption: "hello\nworld",
      Status: "approved",
    });
  });
});

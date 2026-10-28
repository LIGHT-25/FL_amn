# Diagnose: Sheets append JSON failure (Content Pipeline)

## Symptom
Test run fails at **Save draft** with:
`Sheets append "values" is not valid JSON after mapping … Bad control character in string literal`

Facebook is never reached.

## Root cause
1. Save draft `values` is a **JSON string template**:
   `{ "Caption": "{{ steps.captions.facebook }}", "Status": "approved", … }`
2. `executeFlow` runs `deepInterpolate(node.config)` **before** the Sheets node.
3. `deepInterpolate` used plain `interpolate()`, which pasted Gemini captions (raw `\n`, emoji text) into the JSON source.
4. Sheets then tried to `JSON.parse` an already-broken string → control-character error.
5. Workflow template itself was fine (186 chars, no control chars). Failure only appears after captions exist.

## Fix
- JSON-looking config strings use `interpolateJsonTemplate` (token → parse → revive).
- Repair path escapes raw control characters inside JSON string literals if needed.
- Live e2e verifies Google Sheets + Facebook.

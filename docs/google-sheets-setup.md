# Google Sheets setup (Content Pipeline)

FlowForge supports **two** Sheets backends:

| Spreadsheet ID | Backend |
|---|---|
| Real Google ID (`docs.google.com/spreadsheets/d/<ID>/edit`) | **Google Sheets API** |
| `content-calendar` (or other short keys) | Local **Postgres** calendar |

## 1. Google Cloud

1. Open [Google Cloud Console](https://console.cloud.google.com/) → create/select a project.
2. Enable **Google Sheets API**.
3. **IAM & Admin → Service Accounts → Create**.
4. Create a JSON key for that service account and download it.

## 2. Spreadsheet

1. Create a Google Sheet.
2. Add tabs named **`Topics`** and **`Drafts`**.
3. On **Topics**, row 1 headers: `Topic`, `Keywords`, `Status`
4. Add topic rows, e.g. `AI workflow automation trends` | `ai, automation, no-code` | `pending`
5. Share the spreadsheet with the **service account email** (`…@….iam.gserviceaccount.com`) as **Editor**.
6. Copy the spreadsheet ID from the URL.

## 3. `.env`

Preferred — save the downloaded key as `google-sa.json` in the repo root (gitignored):

```env
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id_here
GOOGLE_SERVICE_ACCOUNT_FILE=../../google-sa.json
```

Or paste JSON / split email + private key (see `.env.example`).

Restart the API after changing `.env`.

## 4. Run Content Pipeline

1. Explore → **Content Pipeline** → Use template (nodes leave Spreadsheet ID blank so they pick up `GOOGLE_SHEETS_SPREADSHEET_ID`).
2. Or paste the Google ID into each Sheets step.
3. **Test run** — Save draft / Mark published should appear as new rows in the Google Sheet **Drafts** tab.
4. Logs should say `Google Sheets read/append …` (not `Local calendar …`).

## Local fallback

With no Google credentials (or Spreadsheet ID `content-calendar`), the pipeline uses Postgres. Inspect with:

`GET /api/v1/content-calendars/content-calendar`

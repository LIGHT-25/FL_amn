# Facebook Page publish setup

FlowForge posts to a **Facebook Page** only. Personal profile posting via Graph API is deprecated (`publish_actions`).

## What went wrong with the last token

Debug showed:

- Token **type: USER** (not Page)
- `me.id` was a **user** id (`Arka Saha`), stored as `FACEBOOK_PAGE_ID`
- Scopes missing **`pages_manage_posts`**
- `GET /me/accounts` returned **no Pages**

## Fix

1. Create/use a Facebook **Page** (Pages → Create Page), not only a personal profile.
2. In [Graph API Explorer](https://developers.facebook.com/tools/explorer/):
   - App: **flowforge**
   - Permissions: `pages_show_list`, `pages_manage_posts`, `pages_read_engagement`, `pages_manage_metadata`
   - Generate token and complete Login / Page grant
3. Call **`GET /me/accounts`** — you should see your Page with an `access_token` and `id`.
4. Put those into `.env`:

```env
FACEBOOK_PAGE_ID=<page id from /me/accounts>
FACEBOOK_PAGE_TOKEN=<page access_token from /me/accounts>
```

5. Restart the API, then Test run Content Pipeline again.

Optional: exchange for a long-lived Page token so it does not expire in a few hours.

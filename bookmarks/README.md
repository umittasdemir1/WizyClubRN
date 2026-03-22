# Bookmarks Workflow

This folder tracks the Supabase-backed bookmark workflow that is separate from the main WizyClub app tables.

Current target:
- Supabase project: `wizy-club-backend`
- Project ref: `snpckjrjmwxwgqcqghkl`
- Dedicated schema: `bookmarks`

What lives here:
- `schema.sql`: schema, tables, and import function
- `sync-to-supabase.js`: sends local bookmarks JSON into `bookmarks.upsert_x_bookmarks`

Core database objects:
- `bookmarks.items`
- `bookmarks.import_runs`
- `bookmarks.upsert_x_bookmarks(payload jsonb, context jsonb)`
- `public.bookmarks_upsert_x_bookmarks(payload jsonb, context jsonb)` as REST/RPC bridge
- `public.bookmarks_search_bookmarks(search_query text, result_limit int)`
- `public.bookmarks_get_bookmark(target_tweet_id text, target_tweet_url text, target_row_id bigint)`
- `public.bookmarks_list_recent_bookmarks(result_limit int)`

Import flow:
1. Capture bookmarks with `x-bookmarks-local`
2. Run `node bookmarks/sync-to-supabase.js`

This keeps bookmark storage isolated at the schema level without needing a third Supabase project.

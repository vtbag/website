---
name: update-rss
description: 'Update the RSS feed XML file with new entries. Use when asked to update the rss feed.'
user-invocable: true
disable-model-invocation: false
---

# Update RSS Feed

## When to Use
- User asks to update the RSS feed

## Input
none

## Procedure
0. Ask the user whether git is up to date. Stop immediately if the user says no. This is important because the process relies on commit dates for time stamps.

1. Run `npm run build` to update last update dates for all pages. Stop immediately if the build fails.

2. Run `node bin/rss-update.ts` to update the `public/rss.xml` file. The script also creates `src/content/docs/rss.md`, but that file is intentionally out of scope for this workflow and must be left untouched. Only `public/rss.xml` is reviewed and corrected manually. The script reassigns dates to all entries based on file modification times, even if the actual content changes are minor.

3. Run `node .github/skills/update-rss/diff-rss.cjs` to identify which existing entries have changed `pubDate` values versus `HEAD`, and which are brand new.

4. For each entry listed as CHANGED: the `guid` value is the URL of the page; derive the source file path from it (e.g. `https://vtbag.dev/basics/api/` → `src/content/docs/basics/api.mdx`). Check whether the change since the old `pubDate` is minor:
  - Find the commit that was current as of the committed `pubDate`: `git log --before="<committedPubDate>" -1 --format="%H" -- <sourceFile>`
  - Get the diff to the current file: `git --no-pager diff <hash> -- <sourceFile>`
  - A diff is **minor** if the page keeps the same user-facing purpose and technical takeaways, even when wording is expanded or reorganized for clarity.
  - Treat as **minor**: grammar/style fixes, formatting, link updates, readability rewrites, sentence/paragraph reshuffling, and examples or clarifications that do not change recommendations or factual claims.
  - A diff is **substantive** only if it changes what the reader should do or believe: new/removed features, changed compatibility/support statements, changed API semantics, changed recommended patterns, or added/removed constraints/caveats.
  - If uncertain, apply this test: if an experienced reader would keep the same implementation decisions after reading both versions, classify as **minor**.
  - If the change is minor, replace the new `pubDate` in `public/rss.xml` with the old committed values. Do not make any matching edit in `src/content/docs/rss.md`.
  - If the change is substantive, keep the new `pubDate` as is.

5. ADDED entries (new `guid` not in `HEAD`) always keep their new `pubDate` without review.

6. After all `pubDate` adjustments are done, ensure that the `<item>` entries in `public/rss.xml` are sorted by `pubDate` in descending order, with the newest entries first. If reverting a minor change makes an entry older than the items around it, move the whole `<item>` block to its correct position. Do not reorder `src/content/docs/rss.md`.

7. Validate the final result:
  - Run `node .github/skills/update-rss/diff-rss.cjs` again and confirm that only the intended substantive entries still appear under CHANGED.
  - Run `node .github/skills/update-rss/check-rss-sort.cjs` and confirm it prints `RSS_SORT_OK`.

## URL to source file mapping
- `https://vtbag.dev/<path>/` → `src/content/docs/<path>.mdx` (or `.md`)
- Strip the trailing slash and the `https://vtbag.dev` prefix to get the relative path.

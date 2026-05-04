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
- Confirm that git is up to date before starting. This workflow relies on commit history for `pubDate` decisions.

## High-value automation in this skill
- Use scripts for the repetitive, easy-to-get-wrong parts of the workflow: mapping RSS entries back to source files, restoring selected `pubDate` values from `HEAD`, and re-sorting `<item>` blocks after those restores.
- Keep the human review focused on classification only: decide whether each changed page is minor or substantive, then let the scripts apply the mechanical updates.
- Run the generation steps in sequence, not in parallel: `node bin/rss-update.ts` depends on the finished `npm run build` output.

## Procedure
0. Ask the user whether git is up to date. Stop immediately if the user says no. This is important because the process relies on commit dates for time stamps.

1. Run `npm run build` to update last update dates for all pages. Stop immediately if the build fails.

2. After the build completes successfully, run `node bin/rss-update.ts` to update the `public/rss.xml` file. Do not run this in parallel with the build. The script also updates `src/content/docs/recent-updates.md`, and that generated file should be kept as produced by the script. Do not restore `src/content/docs/recent-updates.md` to `HEAD`, and do not manually edit it in this workflow. Only `public/rss.xml` is reviewed and corrected manually. The script reassigns dates to all entries based on file modification times, even if the actual content changes are minor.

3. Run `node .github/skills/update-rss/diff-rss.ts` to identify which existing entries have changed `pubDate` values versus `HEAD`, and which are brand new. The output now includes the source content path for each entry, so do not derive the path manually from the URL unless the script reports an unresolved fallback path.

4. For each entry listed as CHANGED, use the source file path reported by `node .github/skills/update-rss/diff-rss.ts`. Check whether the change since the old `pubDate` is minor:
  - Find the commit that was current as of the committed `pubDate`, following renames: `git log --follow --before="<committedPubDate>" -1 --format="%H" -- <sourceFile>`
  - If that command returns no commit, stop treating it as a routine minor-change candidate. Check for a history gap before proceeding, and if unresolved keep the new `pubDate`.
  - If you need the historical path at that commit, get it with: `git log --follow --before="<committedPubDate>" -1 --name-only --format="" -- <sourceFile>`
  - Get the diff to the current file:
    - If the path is unchanged, use: `git --no-pager diff <hash> -- <sourceFile>`
    - If the file was renamed, compare the historical blob to the current file: `git --no-pager diff <hash>:<historicalPath> -- <sourceFile>`
  - A diff is **minor** if the page keeps the same user-facing purpose and technical takeaways, even when wording is expanded or reorganized for clarity.
  - Treat as **minor**: grammar/style fixes, formatting, link updates, readability rewrites, sentence/paragraph reshuffling, and examples or clarifications that do not change recommendations or factual claims.
  - A diff is **substantive** only if it changes what the reader should do or believe: new/removed features, changed compatibility/support statements, changed API semantics, changed recommended patterns, or added/removed constraints/caveats.
  - If uncertain, apply this test: if an experienced reader would keep the same implementation decisions after reading both versions, classify as **minor**.
  - Keep a list of CHANGED entry `guid` values that you classify as **minor**.
  - If the change is substantive, keep the new `pubDate` as is.

5. ADDED entries (new `guid` not in `HEAD`) always keep their new `pubDate` without review.

6. After classifying all CHANGED entries, restore the old dates for the minor ones with the script instead of editing XML by hand:
  - Inline GUIDs: `node .github/skills/update-rss/apply-rss-date-overrides.ts <guid> <guid> ...`
  - Or use a file with one GUID per line: `node .github/skills/update-rss/apply-rss-date-overrides.ts --guid-file /tmp/minor-rss-guids.txt`
  - The script restores `pubDate` values from `HEAD` only for the selected GUIDs and automatically re-sorts all `<item>` entries in `public/rss.xml` by descending `pubDate`.
  - Do not make any matching edit in `src/content/docs/recent-updates.md`, and do not restore that file to `HEAD`.

7. Validate the final result:
  - Run `node .github/skills/update-rss/diff-rss.ts` again and confirm that only the intended substantive entries still appear under CHANGED.
  - Run `node .github/skills/update-rss/check-rss-sort.ts` and confirm it prints `RSS_SORT_OK`.

## URL to source file mapping
- Normally, do not use this mapping because `diff-rss.ts` already reports the source file path.
- Use this section only as a fallback when the script reports an unresolved path.
- `https://vtbag.dev/<path>/` → `src/content/docs/<path>.mdx` (or `.md`)
- Strip the trailing slash and the `https://vtbag.dev` prefix to get the relative path.

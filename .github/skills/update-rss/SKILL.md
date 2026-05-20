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

## Automation & Workflow
This workflow is **fully scripted except for one critical decision**: classifying changes as minor or substantive. All other steps—identifying changed entries, extracting source paths, diffing files, restoring dates, and re-sorting—are automated.

- All manual git work is replaced by scripts: `diff-rss.ts`, `diff-file-from-last-build-date.ts`, and `apply-rss-date-overrides.ts`.
- The **only human/LLM task** is deciding whether a changed entry is minor (keep old pubDate) or substantive (keep new pubDate).
- This classification directly affects reader discovery: new techniques or capabilities warrant a new `pubDate`; style/grammar fixes do not.

## Procedure

### Pre-flight check
0. Ask the user whether git is up to date. Stop the whole process immediately if the user says no. This is critical because the workflow relies on commit history for timestamps.

### Step 1: Build (automated)
1. Run `npm run build` to update `public/rss.xml`. Stop if the build fails.

### Step 2: Identify changes (automated)
2. Run `node .github/skills/update-rss/diff-rss.ts` to detect:
   - ADDED entries (new GUIDs) → keep new `pubDate`, no review needed
   - CHANGED entries (existing GUIDs with different `pubDate`) → these need your classification

### Step 3: Classify changes (manual — this is the only decision you make)
For each CHANGED entry, **you decide: minor or substantive?**

**To make this decision:**
- Use `node .github/skills/update-rss/diff-file-from-last-build-date.ts <sourceFile>` to see what changed since the last build date.
- **MANDATORY:** Classify only after reviewing the complete diff output for the file.
- Base the decision on the full file diff, not on a shortened or summarized representation.
- Ask: *Would a developer familiar with this topic learn a new technique or capability, or keep the same implementation decisions?*

**Classification rules:**
- **Minor** (keep old `pubDate`): grammar/style fixes, formatting, link updates, readability rewrites, paragraph reshuffling, or clarifications that don't change recommendations or facts.
- **Substantive** (keep new `pubDate`): new/removed features, changed API semantics, changed compatibility statements, changed recommended patterns, new constraints, **or teaches new techniques/capabilities**.


Once you classify all CHANGED entries, record the GUIDs you marked as **minor**.

### Step 4: Apply classifications (automated)
4. Run the script to restore old dates for minor entries:
   - Inline: `node .github/skills/update-rss/apply-rss-date-overrides.ts <guid> <guid> ...`
   - Or from file: `node .github/skills/update-rss/apply-rss-date-overrides.ts --guid-file /tmp/minor-guids.txt` (one GUID per line)
   - The script automatically re-sorts all entries by `pubDate`.

### Step 5: Validate (automated)
5. Run these validation scripts:
   - `node .github/skills/update-rss/diff-rss.ts` → confirm only substantive entries appear under CHANGED

## URL to source file mapping
- Normally, do not use this mapping because `diff-rss.ts` already reports the source file path.
- Use this section only as a fallback when the script reports an unresolved path.
- `https://vtbag.dev/<path>/` → `src/content/docs/<path>.mdx` (or `.md`)
- Strip the trailing slash and the `https://vtbag.dev` prefix to get the relative path.

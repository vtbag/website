import {
  extractTagValue,
  itemsByGuid,
  parseRss,
  readHeadRssFile,
  readRssFile,
} from './rss-utils.ts';

import { execSync } from 'node:child_process';

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function runGit(command: string): string {
  return execSync(command, { encoding: 'utf8' }).trim();
}

function getHeadLastBuildDate(): string {
  const lastBuildDate = extractTagValue(readHeadRssFile(), 'lastBuildDate');
  if (!lastBuildDate) {
    throw new Error('Unable to read <lastBuildDate> from HEAD public/rss.xml');
  }

  return lastBuildDate;
}

const lastBuildDate = getHeadLastBuildDate();
const changedSinceBaselineCache = new Map<string, boolean>();

function changedSinceBaseline(filePath?: string): boolean {
  if (!filePath || filePath.includes('|')) return true;
  if (changedSinceBaselineCache.has(filePath)) {
    return changedSinceBaselineCache.get(filePath) as boolean;
  }

  const commit = runGit(
    `git log --follow --after=${shellQuote(lastBuildDate)} -1 --format=%H -- ${shellQuote(filePath)}`,
  );
  const changed = Boolean(commit);
  changedSinceBaselineCache.set(filePath, changed);

  return changed;
}

const committedEntries = itemsByGuid(parseRss(readHeadRssFile()).items);
const currentEntries = itemsByGuid(parseRss(readRssFile()).items);
const added = [];
const changed = [];

for (const [guid, entry] of currentEntries) {
  if (!committedEntries.has(guid)) {
    added.push({ guid, ...entry });
    continue;
  }

  const committedEntry = committedEntries.get(guid);
  if (committedEntry?.pubDate !== entry.pubDate && changedSinceBaseline(entry.sourcePath)) {
    changed.push({
      guid,
      sourcePath: entry.sourcePath,
      title: entry.title,
      oldPubDate: committedEntry?.pubDate,
      newPubDate: entry.pubDate,
    });
  }
}

console.log(`ADDED ${added.length}`);
for (const entry of added) {
  console.log(`+ ${entry.guid} | ${entry.pubDate} | ${entry.sourcePath ?? 'UNKNOWN_SOURCE'} | ${entry.title}`);
}

console.log(`CHANGED ${changed.length}`);
for (const entry of changed) {
  console.log(`* ${entry.guid} | ${entry.oldPubDate} => ${entry.newPubDate} | ${entry.sourcePath ?? 'UNKNOWN_SOURCE'} | ${entry.title}`);
}
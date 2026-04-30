import {
  itemsByGuid,
  parseRss,
  readHeadRssFile,
  readRssFile,
} from './rss-utils.ts';

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
  if (committedEntry?.pubDate !== entry.pubDate) {
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
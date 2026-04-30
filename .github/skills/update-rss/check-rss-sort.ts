import { parseRss, readRssFile } from './rss-utils.ts';

const items = parseRss(readRssFile()).items;
let previousTimestamp = Number.POSITIVE_INFINITY;
let isSorted = true;

for (const item of items) {
  const { guid, pubDate } = item;
  const timestamp = Date.parse(pubDate ?? '');

  if (Number.isNaN(timestamp)) {
    console.log(`INVALID_DATE ${guid} | ${pubDate}`);
    process.exitCode = 1;
    isSorted = false;
    continue;
  }

  if (timestamp > previousTimestamp) {
    console.log(`OUT_OF_ORDER ${guid} | ${pubDate}`);
    process.exitCode = 1;
    isSorted = false;
  }

  previousTimestamp = timestamp;
}

if (isSorted) {
  console.log('RSS_SORT_OK');
}
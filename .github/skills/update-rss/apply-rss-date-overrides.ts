import fs from 'node:fs';
import {
  itemsByGuid,
  parseRss,
  readHeadRssFile,
  readRssFile,
  replacePubDate,
  serializeRss,
  sortItemsByPubDate,
} from './rss-utils.ts';

function usage(): void {
  console.log('Usage: node .github/skills/update-rss/apply-rss-date-overrides.ts [--guid-file <path>] [--dry-run] <guid> [<guid> ...]');
}

function parseArgs(argv: string[]): { dryRun: boolean; guids: string[] } {
  const guids: string[] = [];
  let guidFile: string | undefined;
  let dryRun = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--guid-file') {
      guidFile = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      usage();
      process.exit(0);
    }

    guids.push(arg);
  }

  if (guidFile) {
    const fileGuids = fs.readFileSync(guidFile, 'utf8')
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);
    guids.push(...fileGuids);
  }

  return {
    dryRun,
    guids: [...new Set(guids)],
  };
}

const { dryRun, guids } = parseArgs(process.argv.slice(2));

if (guids.length === 0) {
  usage();
  console.error('Provide at least one GUID to restore from HEAD.');
  process.exit(1);
}

const parsedCurrent = parseRss(readRssFile());
const currentByGuid = itemsByGuid(parsedCurrent.items);
const committedByGuid = itemsByGuid(parseRss(readHeadRssFile()).items);
const restored = [];

for (const guid of guids) {
  const currentItem = currentByGuid.get(guid);
  if (!currentItem) {
    console.error(`GUID missing in current RSS: ${guid}`);
    process.exit(1);
  }

  const committedItem = committedByGuid.get(guid);
  if (!committedItem?.pubDate) {
    console.error(`GUID missing in HEAD RSS: ${guid}`);
    process.exit(1);
  }

  currentItem.pubDate = committedItem.pubDate;
  currentItem.xml = replacePubDate(currentItem.xml, committedItem.pubDate);
  restored.push({
    guid,
    pubDate: committedItem.pubDate,
    sourcePath: currentItem.sourcePath,
    title: currentItem.title,
  });
}

const sortedItems = sortItemsByPubDate(parsedCurrent.items);
const nextXml = serializeRss({
  prefix: parsedCurrent.prefix,
  items: sortedItems,
  suffix: parsedCurrent.suffix,
});

if (!dryRun) {
  fs.writeFileSync('public/rss.xml', nextXml);
}

console.log(`${dryRun ? 'WOULD_RESTORE' : 'RESTORED'} ${restored.length}`);
for (const entry of restored) {
  console.log(`= ${entry.guid} | ${entry.pubDate} | ${entry.sourcePath ?? 'UNKNOWN_SOURCE'} | ${entry.title}`);
}
console.log(`${dryRun ? 'WOULD_SORT' : 'SORTED'} public/rss.xml`);
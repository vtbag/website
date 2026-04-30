const fs = require('fs');
const { execSync } = require('child_process');

const currentRss = fs.readFileSync('public/rss.xml', 'utf8');
const committedRss = execSync('git show HEAD:public/rss.xml', {
  encoding: 'utf8',
});

function parseItems(xml) {
  const items = [...xml.matchAll(/<item>[\s\S]*?<\/item>/g)].map((match) => match[0]);
  const entries = new Map();

  for (const item of items) {
    const guid = (item.match(/<guid[^>]*>([^<]+)<\/guid>/) || [])[1];
    const pubDate = (item.match(/<pubDate>([^<]+)<\/pubDate>/) || [])[1];
    const title = (item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || [])[1];

    if (guid) {
      entries.set(guid, { pubDate, title });
    }
  }

  return entries;
}

const committedEntries = parseItems(committedRss);
const currentEntries = parseItems(currentRss);
const added = [];
const changed = [];

for (const [guid, entry] of currentEntries) {
  if (!committedEntries.has(guid)) {
    added.push({ guid, ...entry });
    continue;
  }

  const committedEntry = committedEntries.get(guid);
  if (committedEntry.pubDate !== entry.pubDate) {
    changed.push({
      guid,
      title: entry.title,
      oldPubDate: committedEntry.pubDate,
      newPubDate: entry.pubDate,
    });
  }
}

console.log(`ADDED ${added.length}`);
for (const entry of added) {
  console.log(`+ ${entry.guid} | ${entry.pubDate} | ${entry.title}`);
}

console.log(`CHANGED ${changed.length}`);
for (const entry of changed) {
  console.log(`* ${entry.guid} | ${entry.oldPubDate} => ${entry.newPubDate} | ${entry.title}`);
}
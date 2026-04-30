const fs = require('fs');

const xml = fs.readFileSync('public/rss.xml', 'utf8');
const items = [...xml.matchAll(/<item>[\s\S]*?<\/item>/g)].map((match) => match[0]);
let previousTimestamp = Infinity;
let isSorted = true;

for (const item of items) {
  const guid = (item.match(/<guid[^>]*>([^<]+)<\/guid>/) || [])[1];
  const pubDate = (item.match(/<pubDate>([^<]+)<\/pubDate>/) || [])[1];
  const timestamp = Date.parse(pubDate);

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
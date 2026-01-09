
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'node-html-parser';

const SITE_URL = 'https://vtbag.dev/';
const OUTPUT = 'public/feed.xml';

const CONTENT_DIRS = [
  'dist/basics',
  'dist/fwvt',
  'dist/tips',
  'dist/tools',
  'dist/vtbag',
];

type FeedItem = {
  title: string;
  link: string;
  guid: string;
  author: string | undefined;
  lastModifiedStr: string | undefined;
  lastModified: Date | null;
  description?: string;
  image?: string;
};

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    if (entry.isFile() && entry.name.endsWith('.html')) {
      return [fullPath];
    }
    return [];
  });
}

function readHtml(file: string) {
  return parse(fs.readFileSync(file, 'utf8'));
}

function meta(root: ReturnType<typeof parse>, prop: string): string | undefined {
  return root
    .querySelector(`meta[property="${prop}"]`)
    ?.getAttribute('content');
}

function toUrl(file: string): string {
  const rel = file.replace(/^dist/, '');
  return SITE_URL + rel.replace(/index\.html$/, '');
}

function cdata(value: string): string {
  return `<![CDATA[${value.replaceAll(']]>', ']]]]><![CDATA[>')}]]>`;
}

function rfc822(date: Date): string {
  return date.toUTCString();
}

const files = CONTENT_DIRS.flatMap(dir => walk(dir));

const items: FeedItem[] = [];

for (const file of files) {
  const root = readHtml(file);

  const draft = meta(root, 'draft');
  if (draft) continue;

  const title = meta(root, 'og:title') ?? root.querySelector('title')?.text;
  const link = toUrl(file);
  const author = meta(root, 'author');

  const lastModifiedStr = meta(root, 'og:updated_time') || meta(root, 'article:modified_time');
  const lastModified = lastModifiedStr ? new Date(lastModifiedStr) : null;

  if (!title || !lastModified) continue;

  items.push({
    title,
    link,
    guid: link,
    author,
    lastModifiedStr,
    lastModified,
    description: meta(root, 'og:description') ?? "Missing Description",
    image: meta(root, 'og:image') ?? "/social.png",
  });
}

items.sort((a, b) => b.lastModified!.getTime() - a.lastModified!.getTime());

const rssItems = items.map(item => `
  <item>
    <title>${cdata(item.title)}</title>
    <link>${item.link}</link>
    <guid isPermaLink="true">${item.guid}</guid>
    ${item.author ? `<dc:creator>${cdata(item.author)}</dc:creator>` : ''}
    <pubDate>${rfc822(item.lastModified!)}</pubDate>
    ${item.description ? `<description>${cdata(item.description)}</description>` : ''}
    ${item.image ? `<enclosure
        url="${item.image}"
        type="image/jpeg"
      />` : ''}
  </item>
`).join('');

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss 
  version="2.0"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  >
  <channel>
    <title>@vtbag: The Bag of Tricks for View Transitions</title>
    <link>${SITE_URL}</link>
    <description>Tools, Tips, and Tricks to Enhance your Dev Skills with the View Transition API!</description>
    <language>en-us</language>
    <lastBuildDate>${rfc822(new Date())}</lastBuildDate>
    ${rssItems}
  </channel>
</rss>
`;

fs.writeFileSync(OUTPUT, rss.trim() + '\n');

console.log(`RSS written to ${OUTPUT}`);

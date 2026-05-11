
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'node-html-parser';

const SITE_URL = 'https://vtbag.dev';
const OUTPUT = 'public/rss.xml';

const CONTENT_DIRS = [
  'dist/basics',
  'dist/fwvt',
  'dist/tips',
  'dist/tools',
  'dist/vtbag',
  'dist/ai',
  'dist/baglog',
  'dist/recent-updates',
 // 'dist/view-transition-api-assistant'
];

type FeedItem = {
  title: string;
  link: string;
  guid: string;
  author: string | undefined;
  firstPublished: string | undefined;
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
files.push("dist/index.html"); 

const items: FeedItem[] = [];

for (const file of files) {

  const root = readHtml(file);

  const draft = meta(root, 'draft');
  if (draft) continue;

  const title = meta(root, 'og:title') ?? root.querySelector('title')?.text;
  const link = toUrl(file);
  const author = meta(root, 'author');
  const firstPublished = meta(root, 'article:published_time');
  const lastModifiedStr = meta(root, 'og:updated_time') || meta(root, 'article:modified_time') || root.querySelector("footer time")?.getAttribute("datetime");
  const lastModified = lastModifiedStr ? new Date(lastModifiedStr) : null;

  if (!title || !lastModified) continue;

  items.push({
    title,
    link,
    guid: link,
    author,
    firstPublished,
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

// ---------------------------------------------------------------

const MARKDOWN_OUTPUT = 'src/content/docs/recent-updates.md';

const markdownItems = items.map(item => `
- [${item.title}](${item.link})\\
${item.description}\\
<small>First published ${rfc822(new Date(item.firstPublished!))}</small>\\
<small>Last updated ${rfc822(item.lastModified!)}</small>
`).join('');

const markdown = `
---
title: Recent updates
description: Last update dates of all articles on vtbag.dev
---

This list shows last update dates for all articles on vtbag.dev. The list also reflects minor updates, such as fixing typos or improving formatting. If you are interested in major updates only, check the [RSS feed](https://vtbag.dev/rss.xml).
${markdownItems}
`;

fs.writeFileSync(MARKDOWN_OUTPUT, markdown);

console.log(`Markdown written to ${MARKDOWN_OUTPUT}`);

// ---------------------------------------------------------------

const SITEMAP_OUTPUT = 'dist/sitemap-index.xml';

const sitemapItems = items.map(item => `
  <url>
    <loc>${item.link}</loc>
    <lastmod>${item.lastModified!.toISOString()}</lastmod>
  </url>
`).join('');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
    xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
    xmlns:xhtml="http://www.w3.org/1999/xhtml"
    xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
    xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${sitemapItems}
</urlset>
`;

fs.writeFileSync(SITEMAP_OUTPUT, sitemap);

console.log(`Sitemap written to ${SITEMAP_OUTPUT}`);
  
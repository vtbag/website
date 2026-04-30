import fs from 'node:fs';
import { execSync } from 'node:child_process';

export type RssItem = {
  index: number;
  xml: string;
  guid?: string;
  pubDate?: string;
  title?: string;
  sourcePath?: string;
};

export type ParsedRss = {
  prefix: string;
  items: RssItem[];
  suffix: string;
};

export function readRssFile(filePath = 'public/rss.xml'): string {
  return fs.readFileSync(filePath, 'utf8');
}

export function readHeadRssFile(filePath = 'public/rss.xml'): string {
  return execSync(`git show HEAD:${filePath}`, {
    encoding: 'utf8',
  });
}

export function extractTagValue(xml: string, tagName: string): string | undefined {
  const match = xml.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`));
  return match ? match[1].trim() : undefined;
}

export function extractTitle(xml: string): string | undefined {
  const cdataMatch = xml.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/);
  if (cdataMatch) return cdataMatch[1];
  return extractTagValue(xml, 'title');
}

export function guidToSourcePath(guid: string): string | undefined {
  if (!guid.startsWith('https://vtbag.dev/')) return undefined;

  const pathname = new URL(guid).pathname.replace(/\/+$/, '');
  const relativePath = pathname === '' ? 'index' : pathname.slice(1);
  const mdxPath = `src/content/docs/${relativePath}.mdx`;
  const mdPath = `src/content/docs/${relativePath}.md`;

  if (fs.existsSync(mdxPath)) return mdxPath;
  if (fs.existsSync(mdPath)) return mdPath;

  return `${mdxPath} | ${mdPath}`;
}

export function parseRss(xml: string): ParsedRss {
  const itemMatches = [...xml.matchAll(/<item>[\s\S]*?<\/item>/g)];
  const firstItem = itemMatches[0];
  const lastItem = itemMatches.at(-1);
  const prefix = firstItem ? xml.slice(0, firstItem.index) : xml;
  const suffix = firstItem && lastItem
    ? xml.slice(lastItem.index + lastItem[0].length)
    : '';

  const items = itemMatches.map((match, index) => {
    const itemXml = match[0];
    const guid = extractTagValue(itemXml, 'guid');
    const pubDate = extractTagValue(itemXml, 'pubDate');
    const title = extractTitle(itemXml);

    return {
      index,
      xml: itemXml,
      guid,
      pubDate,
      title,
      sourcePath: guid ? guidToSourcePath(guid) : undefined,
    } satisfies RssItem;
  });

  return { prefix, items, suffix };
}

export function itemsByGuid(items: RssItem[]): Map<string, RssItem> {
  return new Map(items.filter(item => item.guid).map(item => [item.guid as string, item]));
}

export function replacePubDate(itemXml: string, pubDate: string): string {
  return itemXml.replace(
    /<pubDate>[\s\S]*?<\/pubDate>/,
    `<pubDate>${pubDate}</pubDate>`,
  );
}

export function sortItemsByPubDate(items: RssItem[]): RssItem[] {
  return [...items].sort((left, right) => {
    const rightTimestamp = Date.parse(right.pubDate ?? '');
    const leftTimestamp = Date.parse(left.pubDate ?? '');

    if (Number.isNaN(leftTimestamp) || Number.isNaN(rightTimestamp)) {
      throw new Error('Cannot sort RSS items with invalid pubDate values.');
    }

    return rightTimestamp - leftTimestamp || left.index - right.index;
  });
}

export function serializeRss({ prefix, items, suffix }: ParsedRss): string {
  if (items.length === 0) return prefix + suffix;
  const itemIndent = prefix.match(/(?:^|\n)([ \t]*)$/)?.[1] ?? '';
  const [firstItem, ...remainingItems] = items;

  return `${prefix}${firstItem.xml}${remainingItems.map(item => `\n\n${itemIndent}${item.xml}`).join('')}${suffix}`;
}
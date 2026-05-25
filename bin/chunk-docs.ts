import fs from 'node:fs';
import path from 'node:path';
import GithubSlugger from 'github-slugger';
import remarkGfm from 'remark-gfm';
import remarkMdx from 'remark-mdx';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

import { decode as decodeEntities } from 'html-entities';

const SITE_URL = 'https://vtbag.dev';
const DOCS_DIR_DEFAULT = 'src/content/docs';
const OUTPUT_ROOT_DEFAULT = 'vtbag.dev';
const MIN_CHARS = 400;
const MAX_CHARS = 1500;
const OVERLAP_CHARS = 150;

function getCliArg(prefix: string): string | undefined {
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

const DOCS_DIR = path.resolve(getCliArg('--docs-dir=') ?? DOCS_DIR_DEFAULT);
const OUTPUT_ROOT = path.resolve(getCliArg('--output-dir=') ?? OUTPUT_ROOT_DEFAULT);

type AstNode = {
  type: string;
  depth?: number;
  value?: string;
  lang?: string | null;
  meta?: string | null;
  alt?: string | null;
  url?: string;
  name?: string;
  ordered?: boolean;
  children?: AstNode[];
  attributes?: Array<{
    type?: string;
    name?: string;
    value?: unknown;
  }>;
};

type Block = {
  text: string;
  isCode: boolean;
  forceOwnChunk?: boolean;
  kind?: 'table';
  tableHeader?: string;
  tableSeparator?: string;
  tableRows?: string[];
};

type Section = {
  sectionSlug: string;
  headingTrail: string[];
  blocks: Block[];
  size: number;
};

type ChunkFile = {
  id: string;
  text: string;
  metadata: {
    sourcePath: string;
    pageUrl: string;
    chunkUrl: string;
    headings: string[];
    sectionSlug: string;
    sequence: number;
    charCount: number;
    split: boolean;
    oversize: boolean;
  };
};

type Manifest = {
  generatedAt: string;
  inputDir: string;
  outputDir: string;
  docs: number;
  chunks: number;
  warnings: string[];
  items: Array<{
    sourcePath: string;
    pageUrl: string;
    chunks: number;
  }>;
};

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      return walk(full);
    }

    if (entry.isSymbolicLink()) {
      try {
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          return walk(full);
        }
        if (stat.isFile() && (entry.name.endsWith('.mdx') || entry.name.endsWith('.md'))) {
          return [full];
        }
      } catch {
        return [];
      }
    }

    if (entry.isFile() && (entry.name.endsWith('.mdx') || entry.name.endsWith('.md'))) {
      return [full];
    }

    return [];
  });
}

function splitFrontmatter(raw: string): { title: string; body: string; } | undefined {
  const frontmatterMatch = raw.match(/^\s*---\n([\s\S]*?)\n---\n?/);
  if (!frontmatterMatch) return { title: '', body: raw };

  const frontmatter = frontmatterMatch[1] ?? '';
  const frontMatterLines = frontmatter.split('\n');
  const draft = frontMatterLines.find((line) => /^draft:\s*true/.test(line));
  if (draft) return undefined;

  let title = get(frontMatterLines, "title");
  const demoTitle = get(frontMatterLines, "demoTitle");
  let demoText = get(frontMatterLines, "demoText");

  if (demoTitle) {
    demoText = `${demoText}\n\n## ${title}\n\n`;
    title = demoTitle;
  }
  return {
    title,
    body: (demoText ? demoText : '') + raw.slice(frontmatterMatch[0].length),
  };

  function get(lines: string[], key: string): string {
    const line = lines.find((line) => line.trim().startsWith(`${key}:`)) ?? '';
    return line.replace(`${key}:`, '').trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
  }
}


function stripHtmlTags(text: string): string {
  return decodeEntities(text.replace(/<[^>]+>/g, ' '));
}

function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ');
}

function normalizeInlineText(text: string): string {
  // Preserve content inside inline code spans while normalizing surrounding whitespace.
  const segments = text.split(/(`[^`]*`)/g);
  return segments
    .map((segment) => {
      if (segment.startsWith('`') && segment.endsWith('`')) return segment;
      return collapseWhitespace(segment);
    })
    .join('')
    .trim();
}

function pathToPageUrl(filePath: string): string {
  const rel = path.relative(DOCS_DIR, filePath).replace(/\\/g, '/');
  const noExt = rel.replace(/\.(mdx|md)$/i, '');
  const route = noExt.replace(/\/index$/i, '');
  if (!route) return `${SITE_URL}/`;
  return `${SITE_URL}/${route}/`;
}

function pathToDocStem(filePath: string): string {
  const rel = path.relative(DOCS_DIR, filePath).replace(/\\/g, '/');
  const noExt = rel.replace(/\.(mdx|md)$/i, '');
  return noExt.replace(/\/index$/i, '') || 'index';
}

function parseTree(body: string): AstNode {
  return unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMdx)
    .parse(body) as AstNode;
}

function getStringAttribute(node: AstNode, attributeName: string): string {
  for (const attribute of node.attributes ?? []) {
    if (attribute.type !== 'mdxJsxAttribute' || attribute.name !== attributeName) continue;
    if (typeof attribute.value === 'string') return normalizeInlineText(attribute.value);
  }
  return '';
}

function isIgnoredElement(name: string | undefined): boolean {
  if (!name) return false;
  return ['image', 'script', 'style', 'svg'].includes(name.toLowerCase());
}

function isUppercaseComponentName(name: string | undefined): boolean {
  return Boolean(name && /^[A-Z]/.test(name));
}

function renderInline(node: AstNode): string {
  switch (node.type) {
    case 'text':
      return decodeEntities(node.value ?? '');
    case 'inlineCode':
      return `\`${node.value ?? ''}\``;
    case 'emphasis':
      return `*${renderInlineChildren(node.children)}*`;
    case 'strong':
      return `**${renderInlineChildren(node.children)}**`;
    case 'delete':
      return `~~${renderInlineChildren(node.children)}~~`;
    case 'break':
      return ' ';
    case 'link': {
      const label = renderInlineChildren(node.children);
      return label || decodeEntities(node.url ?? '');
    }
    case 'image':
      return normalizeInlineText(node.alt ?? '');
    case 'html':
      return normalizeInlineText(stripHtmlTags(node.value ?? ''));
    case 'mdxTextExpression':
    case 'mdxFlowExpression':
    case 'mdxjsEsm':
      return '';
    case 'mdxJsxTextElement':
    case 'mdxJsxFlowElement':
      return renderJsxInline(node);
    default:
      return renderInlineChildren(node.children);
  }
}

function renderInlineChildren(children: AstNode[] | undefined): string {
  if (!children || children.length === 0) return '';
  return normalizeInlineText(children.map((child) => renderInline(child)).join(''));
}

function renderHtmlBlock(node: AstNode): Block[] {
  const raw = (node.value ?? '').trim();
  if (!raw) return [];

  if (/^<\/?(script|style|svg)\b/i.test(raw)) return [];
  if (/^<\/?details\b/i.test(raw)) return [];

  const summaryMatch = raw.match(/^<summary>([\s\S]*?)<\/summary>$/i);
  if (summaryMatch) {
    const summaryText = normalizeInlineText(stripHtmlTags(summaryMatch[1] ?? ''));
    return summaryText ? [{ text: `### ${summaryText}`, isCode: false }] : [];
  }

  const text = normalizeInlineText(stripHtmlTags(raw));
  return text ? [{ text, isCode: false }] : [];
}

function renderCodeBlock(node: AstNode): Block[] {
  const info = [node.lang ?? '', node.meta ?? '']
    .filter(Boolean)
    .join(' ')
    .trim();
  const fence = info ? `\`\`\`${info}` : '```';
  return [{
    text: `${fence}\n${node.value ?? ''}\n\`\`\``,
    isCode: true,
  }];
}

function renderTable(node: AstNode): Block[] {
  const rows = (node.children ?? []).map((row) => {
    const cells = (row.children ?? []).map((cell) => renderInlineChildren(cell.children));
    return cells;
  }).filter((cells) => cells.length > 0);

  if (rows.length === 0) return [];

  const formatRow = (cells: string[]) => `| ${cells.join(' | ')} |`;
  const headerCells = rows[0]!;
  const bodyRows = rows.slice(1);
  const header = formatRow(headerCells);
  const separator = `| ${headerCells.map(() => '---').join(' | ')} |`;
  const tableRows = bodyRows.map((cells) => formatRow(cells));
  const text = [header, separator, ...tableRows].join('\n');

  return [{
    text,
    isCode: false,
    kind: 'table',
    tableHeader: header,
    tableSeparator: separator,
    tableRows,
  }];
}

function renderList(node: AstNode, warnings: string[]): Block[] {
  const ordered = Boolean(node.ordered);
  const blocks: Block[] = [];

  (node.children ?? []).forEach((item, index) => {
    const itemBlocks = renderFlowChildren(item.children, warnings);
    if (itemBlocks.length === 0) return;

    const prefix = ordered ? `${index + 1}. ` : '- ';
    const [firstBlock, ...rest] = itemBlocks;
    if (firstBlock) {
      blocks.push({
        text: `${prefix}${firstBlock.text}`,
        isCode: firstBlock.isCode,
      });
    }
    blocks.push(...rest);
  });

  return blocks;
}

function renderBlockquote(node: AstNode, warnings: string[]): Block[] {
  return renderFlowChildren(node.children, warnings).map((block) => ({
    text: block.text
      .split('\n')
      .map((line) => `> ${line}`)
      .join('\n'),
    isCode: block.isCode,
  }));
}

function renderDetails(node: AstNode, warnings: string[]): Block[] {
  const blocks: Block[] = [];

  for (const child of node.children ?? []) {
    if (child.type === 'paragraph') {
      const paragraphChildren = child.children ?? [];
      const [firstInline, ...remainingInline] = paragraphChildren;

      if (firstInline?.type === 'mdxJsxTextElement' && firstInline.name?.toLowerCase() === 'summary') {
        const summaryText = renderInlineChildren(firstInline.children);
        if (summaryText) blocks.push({ text: `### ${summaryText}`, isCode: false });

        const bodyText = renderInlineChildren(remainingInline);
        if (bodyText) blocks.push({ text: bodyText, isCode: false });
        continue;
      }
    }

    const childName = child.name?.toLowerCase();
    if ((child.type === 'mdxJsxTextElement' || child.type === 'mdxJsxFlowElement') && childName === 'summary') {
      const summaryText = renderInlineChildren(child.children);
      if (summaryText) blocks.push({ text: `### ${summaryText}`, isCode: false });
      continue;
    }
    blocks.push(...renderFlowNode(child, warnings));
  }

  return blocks;
}

function getSummaryHeading(blocks: Block[]): string {
  const firstBlock = blocks[0]?.text ?? '';
  const match = firstBlock.match(/^###\s+(.+)$/);
  return match?.[1]?.trim() ?? '';
}

function renderComponentPropBlocks(node: AstNode): Block[] {
  const values = ['title', 'label', 'heading']
    .map((name) => getStringAttribute(node, name))
    .filter(Boolean);

  return [...new Set(values)].map((value) => ({ text: value, isCode: false }));
}

function renderJsxInline(node: AstNode): string {
  const name = node.name?.toLowerCase();
  if (isIgnoredElement(name)) return '';
  if (name === 'summary') return renderInlineChildren(node.children);
  if (isUppercaseComponentName(node.name)) {
    const propText = ['title', 'label', 'heading']
      .map((attribute) => getStringAttribute(node, attribute))
      .filter(Boolean)
      .join(' ');
    const childText = renderInlineChildren(node.children);
    return normalizeInlineText([propText, childText].filter(Boolean).join(' '));
  }
  return renderInlineChildren(node.children);
}

function renderFlowNode(node: AstNode, warnings: string[]): Block[] {
  switch (node.type) {
    case 'paragraph': {
      const text = renderInlineChildren(node.children);
      return text ? [{ text, isCode: false }] : [];
    }
    case 'code':
      return renderCodeBlock(node);
    case 'list':
      return renderList(node, warnings);
    case 'blockquote':
      return renderBlockquote(node, warnings);
    case 'table':
      return renderTable(node);
    case 'html':
      return renderHtmlBlock(node);
    case 'mdxFlowExpression':
    case 'mdxjsEsm':
      return [];
    case 'mdxJsxTextElement': {
      const text = renderJsxInline(node);
      return text ? [{ text, isCode: false }] : [];
    }
    case 'mdxJsxFlowElement': {
      const name = node.name?.toLowerCase();
      if (isIgnoredElement(name)) return [];
      if (name === 'details') return renderDetails(node, warnings);
      if (name === 'summary') {
        const summaryText = renderInlineChildren(node.children);
        return summaryText ? [{ text: `### ${summaryText}`, isCode: false }] : [];
      }

      const propBlocks = isUppercaseComponentName(node.name) ? renderComponentPropBlocks(node) : [];
      const childBlocks = renderFlowChildren(node.children, warnings);
      return [...propBlocks, ...childBlocks];
    }
    case 'heading': {
      const text = renderInlineChildren(node.children);
      if (!text) return [];
      return [{ text: `${'#'.repeat(node.depth ?? 2)} ${text}`, isCode: false }];
    }
    default:
      return renderFlowChildren(node.children, warnings);
  }
}

function renderFlowChildren(children: AstNode[] | undefined, warnings: string[]): Block[] {
  if (!children || children.length === 0) return [];
  return children.flatMap((child) => renderFlowNode(child, warnings));
}

function joinBlocks(blocks: Block[]): string {
  return blocks.map((block) => block.text.trim()).filter(Boolean).join('\n\n').trim();
}

function splitOversizedTableBlock(block: Block): Block[] {
  if (block.kind !== 'table' || !block.tableHeader || !block.tableSeparator || !block.tableRows) {
    return [block];
  }

  if (block.text.length <= MAX_CHARS) return [block];

  const tableHeader = block.tableHeader;
  const tableSeparator = block.tableSeparator;
  const tableRows = block.tableRows;

  return tableRows.map((row) => ({
    text: [tableHeader, tableSeparator, row].join('\n'),
    isCode: false,
    forceOwnChunk: true,
    kind: 'table',
    tableHeader,
    tableSeparator,
    tableRows: [row],
  }));
}

function expandBlocksForChunking(blocks: Block[]): Block[] {
  return blocks.flatMap((block) => splitOversizedTableBlock(block));
}

function buildSectionChunks(blocks: Block[]): Array<{ text: string; oversize: boolean; }> {
  const expandedBlocks = expandBlocksForChunking(blocks);
  const fullText = joinBlocks(expandedBlocks);
  if (!fullText) return [];
  if (fullText.length <= MAX_CHARS) {
    return [{ text: fullText, oversize: false }];
  }

  const result: Array<{ text: string; oversize: boolean; }> = [];
  let chunkBlocks: Block[] = [];
  let previousBlocksForOverlap: Block[] = [];

  const chunkLength = (items: Block[]) => joinBlocks(items).length;

  const pushChunk = () => {
    if (chunkBlocks.length === 0) return;
    const text = joinBlocks(chunkBlocks);
    if (!text) return;
    result.push({ text, oversize: text.length > MAX_CHARS });
    previousBlocksForOverlap = [...chunkBlocks];
    chunkBlocks = [];
  };

  for (const block of expandedBlocks) {
    if (block.forceOwnChunk) {
      pushChunk();
      result.push({ text: block.text, oversize: block.text.length > MAX_CHARS });
      previousBlocksForOverlap = [block];
      continue;
    }

    if (block.text.length > MAX_CHARS) {
      pushChunk();
      result.push({ text: block.text, oversize: true });
      previousBlocksForOverlap = [block];
      continue;
    }

    const candidateBlocks = [...chunkBlocks, block];
    if (chunkLength(candidateBlocks) <= MAX_CHARS) {
      chunkBlocks = candidateBlocks;
      continue;
    }

    pushChunk();

    const overlapBlocks: Block[] = [];
    let overlapLength = 0;
    for (let index = previousBlocksForOverlap.length - 1; index >= 0; index -= 1) {
      const candidate = previousBlocksForOverlap[index]!;
      if (candidate.isCode) continue;
      overlapBlocks.unshift(candidate);
      overlapLength += candidate.text.length;
      if (overlapLength >= OVERLAP_CHARS) break;
    }

    chunkBlocks = [...overlapBlocks, block];
  }

  pushChunk();
  return result;
}

function parseSections(filePath: string, warnings: string[]): { title: string; sections: Section[]; } | undefined {
  const raw = fs.readFileSync(filePath, 'utf8');
  const split = splitFrontmatter(raw);
  if (!split) return undefined;
  const { title, body } = split;
  const tree = parseTree(body);
  const slugger = new GithubSlugger();

  let currentHeadingTrail = title ? [title] : [];
  let currentSectionSlug = 'top';
  let currentSectionBlocks: Block[] = [];
  const sections: Section[] = [];

  const flushSection = () => {
    const content = joinBlocks(currentSectionBlocks);
    if (!content) {
      currentSectionBlocks = [];
      return;
    }
    sections.push({
      sectionSlug: currentSectionSlug,
      headingTrail: [...currentHeadingTrail],
      blocks: currentSectionBlocks,
      size: content.length,
    });
    currentSectionBlocks = [];
  };

  for (const child of tree.children ?? []) {
    if (child.type === 'mdxJsxFlowElement' && child.name?.toLowerCase() === 'details') {
      const detailBlocks = renderDetails(child, warnings);
      const summaryHeading = getSummaryHeading(detailBlocks);
      if (summaryHeading) {
        flushSection();
        const detailHeadingTrail = [...currentHeadingTrail, summaryHeading];
        let detailSectionSlug = slugger.slug(summaryHeading);
        let detailSectionHeadingTrail = [...detailHeadingTrail];
        let detailSectionBlocks: Block[] = [];

        const flushDetailSection = () => {
          const content = joinBlocks(detailSectionBlocks);
          if (!content) {
            detailSectionBlocks = [];
            return;
          }
          sections.push({
            sectionSlug: detailSectionSlug,
            headingTrail: [...detailSectionHeadingTrail],
            blocks: detailSectionBlocks,
            size: content.length,
          });
          detailSectionBlocks = [];
        };

        for (const block of detailBlocks.slice(1)) {
          const headingMatch = !block.isCode ? block.text.match(/^(#{2,6})\s+(.+)$/) : null;
          if (!headingMatch) {
            detailSectionBlocks.push(block);
            continue;
          }

          flushDetailSection();
          const headingText = headingMatch[2]?.trim() ?? '';
          if (!headingText) continue;
          detailSectionSlug = slugger.slug(headingText);
          detailSectionHeadingTrail = [...detailHeadingTrail, headingText];
        }

        flushDetailSection();
        continue;
      }
    }

    if (child.type === 'heading') {
      const headingText = renderInlineChildren(child.children);
      const depth = child.depth!;

      if (depth === 1) {
        if (!title && headingText) {
          currentHeadingTrail = [headingText];
        } else if (headingText) {
          currentSectionBlocks.push({ text: `# ${headingText}`, isCode: false });
        }
        continue;
      }

      if (depth >= 2 && headingText) {
        flushSection();
        while (currentHeadingTrail.length >= depth) {
          currentHeadingTrail.pop();
        }
        currentHeadingTrail.push(headingText);
        currentSectionSlug = slugger.slug(headingText);
        continue;
      }
    }

    currentSectionBlocks.push(...renderFlowNode(child, warnings));
  }

  flushSection();

  return {
    title,
    sections,
  };
}

function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath: string, data: unknown): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function sanitizeFilename(input: string): string {
  return input.replace(/[^a-zA-Z0-9._-]/g, '-');
}

function maybeCleanOutput(): void {
  if (!process.argv.includes('--clean')) return;
  fs.rmSync(OUTPUT_ROOT, { recursive: true, force: true });
}

function ensureDemoSymlink(): boolean {
  const linkPath = path.resolve(DOCS_DIR, 'demo');
  const targetPath = path.resolve('src/pages/demo-explainer');
  const relativeTarget = path.relative(path.dirname(linkPath), targetPath);

  try {
    const stat = fs.lstatSync(linkPath);
    if (stat.isSymbolicLink()) {
      const existingTarget = fs.readlinkSync(linkPath);
      if (existingTarget === relativeTarget || path.resolve(path.dirname(linkPath), existingTarget) === targetPath) {
        return false;
      }
    }
    fs.rmSync(linkPath, { recursive: true, force: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }

  fs.symlinkSync(relativeTarget, linkPath, 'dir');
  return true;
}

function removeDemoSymlink(): void {
  const linkPath = path.resolve(DOCS_DIR, 'demo');
  const targetPath = path.resolve('src/pages/demo-explainer');
  const relativeTarget = path.relative(path.dirname(linkPath), targetPath);

  try {
    const stat = fs.lstatSync(linkPath);
    if (!stat.isSymbolicLink()) return;

    const existingTarget = fs.readlinkSync(linkPath);
    if (existingTarget !== relativeTarget && path.resolve(path.dirname(linkPath), existingTarget) !== targetPath) {
      return;
    }

    fs.rmSync(linkPath, { force: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}



function buildFiles(files: string[]): void {
  maybeCleanOutput();
  ensureDir(OUTPUT_ROOT);

  const onlyArg = process.argv.find((arg) => arg.startsWith('--only='));
  const onlyValues = (onlyArg?.slice('--only='.length) ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const warnings: string[] = [];
  const manifestItems: Manifest['items'] = [];
  let totalChunks = 0;
  let processedDocs = 0;

  for (const file of files) {
    const rel = path.relative(DOCS_DIR, file).replace(/\\/g, '/');
    if (onlyValues.length > 0 && !onlyValues.includes(rel)) continue;

    processedDocs += 1;
    const pageUrl = pathToPageUrl(file);
    const docStem = pathToDocStem(file);
    const parsedSections = parseSections(file, warnings);
    if (!parsedSections) continue;
    const { sections } = parsedSections;

    let j = 0;
    for (let i = 1; i < sections.length; ++i) {
      const previous = sections[j]!;
      const current = sections[i]!;
      const heading = `${'#'.repeat(current.headingTrail.length)} ${current.headingTrail.slice(-1)[0]}`;
      const size = previous.size + current.size + 2 + heading.length;
      if (previous.headingTrail.length === current.headingTrail.length - 1 && size < MIN_CHARS) {
        previous.blocks.push({ text: heading, isCode: false });
        previous.blocks.push(...current.blocks);
        previous.size = size;
        current.blocks = [];
        current.size = 0;
        console.log(`${rel}: Merged section "${current.headingTrail.slice(-1)[0]}" into previous section due to small size (${size} chars)`);
      } else {
        j = i;
      }
    }
    let docChunkCount = 0;

    for (const section of sections) {
      const sectionChunks = buildSectionChunks(section.blocks);
      const split = sectionChunks.length > 1;

      sectionChunks.forEach((chunk, index) => {
        const sequence = index + 1;
        const headingsPrefix = section.headingTrail.map((heading, depth) => `${'#'.repeat(depth + 1)} ${heading}`).join('\n');
        const text = `${headingsPrefix}\n\n${chunk.text}`.trim();
        const page = split ? `${pageUrl}?s=${sequence}` : pageUrl;
        const chunkUrl = section.sectionSlug === 'top' ? page : `${page}#${section.sectionSlug}`;

        const id = `${docStem}::${section.sectionSlug}::${sequence}`;
        const json: ChunkFile = {
          id,
          text,
          metadata: {
            sourcePath: rel,
            pageUrl,
            chunkUrl,
            headings: section.headingTrail,
            sectionSlug: section.sectionSlug,
            sequence,
            charCount: text.length,
            split,
            oversize: chunk.oversize,
          },
        };

        if (chunk.oversize) {
          warnings.push(`oversize chunk: ${id} (${text.length} chars)`);
        }

        const sequenceSuffix = split ? `-${String(sequence).padStart(2, '0')}` : '';
        const outFile = path.join(
          OUTPUT_ROOT,
          sanitizeFilename(docStem),
          `${sanitizeFilename(section.sectionSlug)}${sequenceSuffix}.json`,
        );

        writeJson(outFile, json);
        docChunkCount += 1;
        totalChunks += 1;
      });
    }

    manifestItems.push({ sourcePath: rel, pageUrl, chunks: docChunkCount });
  }

  const manifest: Manifest = {
    generatedAt: new Date().toISOString(),
    inputDir: path.relative(process.cwd(), DOCS_DIR),
    outputDir: path.relative(process.cwd(), OUTPUT_ROOT),
    docs: processedDocs,
    chunks: totalChunks,
    warnings,
    items: manifestItems,
  };

  writeJson(path.join(OUTPUT_ROOT, 'manifest.jsonc'), manifest);

  console.log(`Chunk generation complete. docs=${processedDocs}, chunks=${totalChunks}`);
  if (warnings.length > 0) {
    console.log(`Warnings (${warnings.length}):`);
    for (const warning of warnings.slice(0, 20)) {
      console.log(`- ${warning}`);
    }
    if (warnings.length > 20) {
      console.log(`...and ${warnings.length - 20} more`);
    }
  }
}


const createdDemoSymlink = ensureDemoSymlink();

try {
  const allFiles = walk(DOCS_DIR).filter((file) => !(
    file.endsWith("/404.md")
    || file.endsWith("/baglog.mdx")
    || file.endsWith("/BasicAC.mdx")
    || file.endsWith("/BasicC.mdx")
    || file.endsWith("/BasicMC.mdx")
    || file.endsWith("/BasicAC2.mdx")
    || file.endsWith("/BasicC2.mdx")
    || file.endsWith("/BasicMC2.mdx")
  ));
  console.log(allFiles);
  buildFiles(allFiles);
} finally {
  if (createdDemoSymlink) {
    removeDemoSymlink();
  }
}

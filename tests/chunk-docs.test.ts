import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import test from 'node:test';

function createTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `${prefix}-`));
}

function writeFile(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function runChunkDocs(options: { docsDir: string; outputDir: string; only?: string; }): void {
  const args = [
    'bin/chunk-docs.ts',
    `--docs-dir=${options.docsDir}`,
    `--output-dir=${options.outputDir}`,
    '--clean',
  ];

  if (options.only) {
    args.push(`--only=${options.only}`);
  }

  execFileSync('node', args, {
    cwd: process.cwd(),
    stdio: 'pipe',
  });
}

function readJson(filePath: string): any {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

test('keeps normal section chunks with heading trail metadata', () => {
  const docsDir = createTempDir('chunk-docs-fixture');
  const outputDir = createTempDir('chunk-docs-output');

  writeFile(path.join(docsDir, 'article.mdx'), `---
title: Fixture Article
---
## Alpha

Alpha body paragraph.

## Beta

Beta body paragraph.
`);

  runChunkDocs({ docsDir, outputDir, only: 'article.mdx' });

  const alpha = readJson(path.join(outputDir, 'article', 'alpha.json'));
  const beta = readJson(path.join(outputDir, 'article', 'beta.json'));

  assert.equal(alpha.metadata.sectionSlug, 'alpha');
  assert.deepEqual(alpha.metadata.headings, ['Fixture Article', 'Alpha']);
  assert.match(alpha.text, /# Fixture Article/);
  assert.match(alpha.text, /## Alpha/);
  assert.match(alpha.text, /Alpha body paragraph\./);

  assert.equal(beta.metadata.sectionSlug, 'beta');
  assert.deepEqual(beta.metadata.headings, ['Fixture Article', 'Beta']);
  assert.match(beta.text, /## Beta/);
  assert.match(beta.text, /Beta body paragraph\./);
});

test('splits oversized tables into one-row chunks with copied headers', () => {
  const docsDir = createTempDir('chunk-docs-fixture');
  const outputDir = createTempDir('chunk-docs-output');

  const rows = Array.from({ length: 40 }, (_, index) => {
    const suffix = String(index + 1).padStart(2, '0');
    return `| row-${suffix} | value-${suffix} ${'lorem ipsum dolor sit amet '.repeat(2)}|`;
  }).join('\n');

  writeFile(path.join(docsDir, 'tables.mdx'), `---
title: Tables Fixture
---

# Tables Fixture

## Big Table

| Name | Value |
|---|---|
${rows}
`);

  runChunkDocs({ docsDir, outputDir, only: 'tables.mdx' });

  const tableFiles = fs.readdirSync(path.join(outputDir, 'tables')).filter((file) => file.startsWith('big-table'));
  assert.ok(tableFiles.length > 1, 'expected oversized table to split into multiple chunks');

  for (const file of tableFiles) {
    const json = readJson(path.join(outputDir, 'tables', file));
    if (!json.text.includes('| Name | Value |')) continue;

    const lines = json.text.split('\n').filter(Boolean);
    const tableRows = lines.filter((line: string) => line.startsWith('|'));
    assert.equal(tableRows[0], '| Name | Value |');
    assert.equal(tableRows[1], '| --- | --- |');
    assert.equal(tableRows.length, 3, `expected one table body row in ${file}`);
  }
});

test('keeps oversized code blocks intact in a single chunk', () => {
  const docsDir = createTempDir('chunk-docs-fixture');
  const outputDir = createTempDir('chunk-docs-output');

  const codeBody = Array.from({ length: 260 }, (_, index) => `const value${index} = ${index};`).join('\n');

  writeFile(path.join(docsDir, 'code.mdx'), `---
title: Code Fixture
---

# Code Fixture

## Big Code

\`\`\`ts
${codeBody}
\`\`\`
`);

  runChunkDocs({ docsDir, outputDir, only: 'code.mdx' });

  const codeChunk = readJson(path.join(outputDir, 'code', 'big-code.json'));
  assert.match(codeChunk.text, /```ts/);
  assert.match(codeChunk.text, /const value0 = 0;/);
  assert.match(codeChunk.text, /const value259 = 259;/);
  assert.equal(codeChunk.metadata.split, false);
  assert.equal(codeChunk.metadata.oversize, true);
});

test('preserves inline markdown styling and backticked angle-bracket literals', () => {
  const docsDir = createTempDir('chunk-docs-fixture');
  const outputDir = createTempDir('chunk-docs-output');

  writeFile(path.join(docsDir, 'inline-style.mdx'), `---
title: Inline Style Fixture
---

## Preserve Inline

This keeps *emphasis*, **strong**, ~~deleted~~ and \`<head>\` intact.
`);

  runChunkDocs({ docsDir, outputDir, only: 'inline-style.mdx' });

  const chunk = readJson(path.join(outputDir, 'inline-style', 'preserve-inline.json'));
  assert.match(chunk.text, /\*emphasis\*/);
  assert.match(chunk.text, /\*\*strong\*\*/);
  assert.match(chunk.text, /~~deleted~~/);
  assert.match(chunk.text, /`<head>`/);
});
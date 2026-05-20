import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { extractTagValue, readHeadRssFile } from './rss-utils.ts';

function usage(): void {
  console.log('Usage: node .github/skills/update-rss/diff-file-from-last-build-date.ts <file>');
}

function runGit(command: string): string {
  return execSync(command, { encoding: 'utf8' }).trim();
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function parseArgs(argv: string[]): { filePath?: string } {
  let filePath: string | undefined;

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') {
      usage();
      process.exit(0);
    }

    if (!filePath) {
      filePath = arg;
      continue;
    }

    console.error(`Unexpected argument: ${arg}`);
    usage();
    process.exit(1);
  }

  return { filePath };
}

function getHeadLastBuildDate(): string {
  const headRss = readHeadRssFile();
  const lastBuildDate = extractTagValue(headRss, 'lastBuildDate');

  if (!lastBuildDate) {
    throw new Error('Unable to read <lastBuildDate> from HEAD public/rss.xml');
  }
  console.log(`HEAD RSS lastBuildDate: ${lastBuildDate}`);
  return lastBuildDate;
}

function resolveHistoricalCommit(filePath: string, beforeDate: string): string {
  const commit = runGit(
    `git log --follow --before=${shellQuote(beforeDate)} -1 --format=%H -- ${shellQuote(filePath)}`,
  );

  if (!commit) {
    throw new Error(`No commit found for ${filePath} at or before ${beforeDate}`);
  }

  return commit;
}

function resolveHistoricalPath(filePath: string, commit: string): string {
  const lines = runGit(
    `git log --follow --name-only --format=%H -- ${shellQuote(filePath)}`,
  )
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  let currentCommit = '';
  for (const line of lines) {
    if (/^[0-9a-f]{40}$/.test(line)) {
      currentCommit = line;
      continue;
    }

    if (currentCommit === commit) {
      return line;
    }
  }

  throw new Error(`Unable to resolve historical path for ${filePath} at ${commit}`);
}

const { filePath } = parseArgs(process.argv.slice(2));

if (!filePath) {
  usage();
  process.exit(1);
}

if (!fs.existsSync(filePath)) {
  console.error(`File does not exist: ${filePath}`);
  process.exit(1);
}

const lastBuildDate = getHeadLastBuildDate();
const historicalCommit = resolveHistoricalCommit(filePath, lastBuildDate);
const historicalPath = resolveHistoricalPath(filePath, historicalCommit);

console.log(`HEAD_RSS_LAST_BUILD_DATE ${lastBuildDate}`);
console.log(`FILE ${filePath}`);
console.log(`BASE_COMMIT ${historicalCommit}`);
console.log(`BASE_PATH ${historicalPath}`);

const diffCommand = historicalPath === filePath
  ? `git --no-pager diff ${historicalCommit} -- ${shellQuote(filePath)}`
  : `git --no-pager diff ${shellQuote(`${historicalCommit}:${historicalPath}`)} -- ${shellQuote(filePath)}`;

const diffOutput = execSync(diffCommand, { encoding: 'utf8' });
if (diffOutput.trim()) {
  process.stdout.write(diffOutput);
} else {
  console.log('NO_DIFF');
}
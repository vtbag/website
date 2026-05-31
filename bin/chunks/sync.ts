#!/usr/bin/env npx tsx

import * as fs from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";

// ─── Configuration ───────────────────────────────────────────────────────────

const CONFIG = {
  accountId: process.env.ACCOUNT_ID!,
  apiToken: process.env.API_TOKEN!,
  namespace: process.env.CF_AI_SEARCH_NAMESPACE || "default",
  kvNamespaceId: process.env.CF_KV_NAMESPACE_ID!,
  instanceName: "flat-sky-3b86",
  chunksRoot: "./vtbag.dev",
  concurrency: 5,
};

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChunkFile {
  text: string;
  metadata: Record<string, any>;
}

interface LocalChunk {
  localId: string;       // relative path from root, e.g. "docs/support/password-reset.json"
  text: string;
  metadata: Record<string, any>;
  checksum: string;      // hash of content
  filePath: string;      // absolute path on disk
}

interface RemoteItem {
  id: string;            // AI Search item ID
  filename: string;
  status: string;
  metadata: {
    local_id?: string;
    checksum?: string;
    [key: string]: any;
  };
}

// ─── API Helpers ─────────────────────────────────────────────────────────────

const BASE_URL = `https://api.cloudflare.com/client/v4/accounts/${CONFIG.accountId}/ai-search/namespaces/${CONFIG.namespace}/instances/${CONFIG.instanceName}`;

const headers = () => ({
  Authorization: `Bearer ${CONFIG.apiToken}`,
});

async function apiRequest(
  method: string,
  urlPath: string,
  options?: { body?: any; contentType?: string; rawBody?: boolean; }
): Promise<any> {

  const url = urlPath.startsWith("http") ? urlPath : `${BASE_URL}${urlPath}`;

  const fetchOptions: RequestInit = {
    method,
    headers: { ...headers() } as any,
  };

  if (options?.body !== undefined) {
    if (options.rawBody) {
      fetchOptions.body = options.body as any;
      (fetchOptions.headers as any)["Content-Type"] = options.contentType!;
    } else {
      fetchOptions.body = JSON.stringify(options.body);
      (fetchOptions.headers as any)["Content-Type"] = "application/json";
    }
  }

  const resp = await fetch(url, fetchOptions);
  const data = await resp.json() as any;

  if (!data.success) {
    throw new Error(
      `API error ${resp.status}: ${JSON.stringify(data.errors)}`
    );
  }

  return data;
}

// ─── List all remote items (paginated) ──────────────────────────────────────

async function listAllRemoteItems(): Promise<RemoteItem[]> {
  const allItems: RemoteItem[] = [];
  let page = 1;
  const perPage = 50;
  let hasMore = true;

  while (hasMore) {
    const data = await apiRequest(
      "GET",
      `/items?per_page=${perPage}&page=${page}`
    );
    allItems.push(...data.result);
    hasMore = data.result.length === perPage;
    page++;
  }

  return allItems;
}

// ─── Upload a chunk as a new item ───────────────────────────────────────────

async function uploadItem(chunk: LocalChunk): Promise<void> {
  const boundary = `----FormBoundary${Date.now()}`;
  const filename = chunk.localId.replace(/\/$/, "").replace(/\/\?s=/, ".").replace(/https:\/\/vtbag.dev\//, '').replace(/[\/\?\#]/g, ".") + ".md"; // flatten path for filename

  const metadata = {
    chunk_url: chunk.localId,
    checksum: chunk.checksum,
    adjacent: `${chunk.metadata.previous || ""} | ${chunk.metadata.parent || ""} | ${chunk.metadata.next || ""}`,
    //   ...chunk.metadata,
  };

  // Build multipart/form-data body
  const parts: string[] = [];

  // Metadata part
  parts.push(
    `--${boundary}`,
    `Content-Disposition: form-data; name="metadata"`,
    `Content-Type: application/json`,
    ``,
    JSON.stringify(metadata)
  );

  // File part
  parts.push(
    `--${boundary}`,
    `Content-Disposition: form-data; name="file"; filename="${filename}"`,
    `Content-Type: text/markdown`,
    ``,
    chunk.text,
    `--${boundary}--`
  );

  const body = parts.join("\r\n");

  await apiRequest("POST", "/items", {
    body,
    contentType: `multipart/form-data; boundary=${boundary}`,
    rawBody: true,
  });
}

// ─── Delete a remote item ───────────────────────────────────────────────────

async function deleteItem(itemId: string): Promise<void> {
  await apiRequest("DELETE", `/items/${itemId}`);
}

// ─── Local file scanning ────────────────────────────────────────────────────

function computeChecksum(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

function readChunkFile(filePath: string): LocalChunk {
  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed: ChunkFile = JSON.parse(raw);

  if (!parsed.text || typeof parsed.text !== "string") {
    throw new Error(`Missing or invalid "text" field in ${filePath}`);
  }

  const localId = parsed.metadata.chunkUrl;

  const checksum = computeChecksum(parsed.text);

  return {
    localId,
    text: parsed.text,
    metadata: parsed.metadata || {},
    checksum,
    filePath,
  };
}

function scanLocalChunks(rootDir: string): LocalChunk[] {
  const chunks: LocalChunk[] = [];

  function walk(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".json")) {
        chunks.push(readChunkFile(fullPath));
      }
    }
  }

  walk(rootDir);
  return chunks;
}

// ─── Concurrency helper ─────────────────────────────────────────────────────

async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number
): Promise<T[]> {
  const results: T[] = [];
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      const i = index++;
      results[i] = await tasks[i]!();
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, tasks.length) },
    () => worker()
  );
  await Promise.all(workers);
  return results;
}

interface SyncPlan {
  toCreate: LocalChunk[];
  toUpdate: { local: LocalChunk; remote: RemoteItem; }[];
  toDelete: RemoteItem[];
  unchanged: number;
}

async function buildSyncPlan(): Promise<SyncPlan> {
  console.log("Scanning local chunks...");
  const localChunks = scanLocalChunks(CONFIG.chunksRoot);
  const localMap = new Map(localChunks.map((c) => [c.localId, c]));
  console.log(`Found ${localChunks.length} local chunks`);

  console.log("Fetching remote items...");
  const remoteItems = await listAllRemoteItems();
  const remoteMap = new Map(
    remoteItems.filter((item) => item.metadata?.chunk_url).map((item) => [item.metadata.chunk_url!, item])
  );
  console.log(`Found ${remoteItems.length} remote items (${remoteMap.size} with chunk_url)`);

  const toCreate: LocalChunk[] = [];
  const toUpdate: { local: LocalChunk; remote: RemoteItem; }[] = [];
  const toDelete: RemoteItem[] = [];

  for (const chunk of localChunks) {
    const remote = remoteMap.get(chunk.localId);
    if (!remote) {
      toCreate.push(chunk);
    } else if (remote.metadata.checksum !== chunk.checksum) {
      toUpdate.push({ local: chunk, remote });
    }
  }

  for (const [localId, remote] of remoteMap) {
    if (!localMap.has(localId)) {
      toDelete.push(remote);
    }
  }

  const unchanged = localChunks.length - toCreate.length - toUpdate.length;

  return {
    toCreate,
    toUpdate,
    toDelete,
    unchanged,
  };
}

function logSyncPlanSummary(plan: SyncPlan): void {
  console.log("\nSync plan:");
  console.log(`  CREATE:  ${plan.toCreate.length}`);
  console.log(`  UPDATE:  ${plan.toUpdate.length}`);
  console.log(`  DELETE:  ${plan.toDelete.length}`);
  console.log(`  SKIP:    ${plan.unchanged}`);
}

// ─── Main sync logic ────────────────────────────────────────────────────────

async function sync() {
  const plan = await buildSyncPlan();
  logSyncPlanSummary(plan);

  if (
    plan.toCreate.length + plan.toUpdate.length + plan.toDelete.length ===
    0
  ) {
    console.log("\nEverything is in sync. Nothing to do.");
    return;
  }

  // Execute deletes first (frees up item slots)
  if (plan.toDelete.length > 0) {
    console.log("\nDeleting removed chunks...");
    await runWithConcurrency(
      plan.toDelete.map((item, index) => async () => {
        await deleteItem(item.id);
        await kvDelete(item.metadata.chunk_url!);          // ← add
        console.log(`${index + 1}  DELETED: ${item.metadata.chunk_url}`);
      }),
      CONFIG.concurrency
    );
  }

  // Execute updates (delete old + upload new)
  if (plan.toUpdate.length > 0) {
    console.log("\nUpdating changed chunks...");
    await runWithConcurrency(
      plan.toUpdate.map(({ local, remote }, index) => async () => {
        await deleteItem(remote.id);
        await uploadItem(local);
        await kvPut(local.localId, local.text);        // ← add
        console.log(`${index + 1}  UPDATED: ${local.localId}`);
      }),
      CONFIG.concurrency
    );
  }

  // Execute creates
  if (plan.toCreate.length > 0) {
    console.log("\nCreating new chunks...");
    await runWithConcurrency(
      plan.toCreate.map((chunk, index) => async () => {
        await uploadItem(chunk);
        await kvPut(chunk.localId, chunk.text);        // ← add
        console.log(`${index + 1}  CREATED: ${chunk.localId}`);
      }),
      CONFIG.concurrency
    );
  }

  console.log("\nSync complete!");
}

// ─── Dry run mode ────────────────────────────────────────────────────────────

async function dryRun() {
  console.log("=== DRY RUN ===\n");
  const plan = await buildSyncPlan();
  logSyncPlanSummary(plan);

  if (plan.toCreate.length > 0) {
    console.log("\n  Would CREATE:");
    plan.toCreate.forEach((c) => console.log(`    + ${c.localId}`));
  }
  if (plan.toUpdate.length > 0) {
    console.log("\n  Would UPDATE:");
    plan.toUpdate.forEach(({ local, remote }) =>
      console.log(
        `    ~ ${local.localId} (remote checksum: ${remote.metadata.checksum} → local: ${local.checksum})`
      )
    );
  }
  if (plan.toDelete.length > 0) {
    console.log("\n  Would DELETE:");
    plan.toDelete.forEach((r) => console.log(`    - ${r.metadata.local_id} (item: ${r.id})`));
  }
}

// ─── KV Helpers 

async function kvPut(key: string, value: string): Promise<void> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${CONFIG.accountId}/storage/kv/namespaces/${CONFIG.kvNamespaceId}/values/${encodeURIComponent(key)}`;
  const resp = await fetch(url, {
    method: "PUT",
    headers: { Authorization: `Bearer ${CONFIG.apiToken}` },
    body: value,
  });
  const data = await resp.json() as any;
  if (!data.success) {
    throw new Error(`KV PUT error: ${JSON.stringify(data.errors)}`);
  }
}

async function kvDelete(key: string): Promise<void> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${CONFIG.accountId}/storage/kv/namespaces/${CONFIG.kvNamespaceId}/values/${encodeURIComponent(key)}`;
  const resp = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${CONFIG.apiToken}` },
  });
  const data = await resp.json() as any;
  if (!data.success) {
    throw new Error(`KV DELETE error: ${JSON.stringify(data.errors)}`);
  }
}


// ─── CLI entry point ────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");

// Validate config
const missing = Object.entries(CONFIG)
  .filter(([, v]) => !v)
  .map(([k]) => k);
if (missing.length > 0) {
  console.error(
    `Missing configuration. Set these environment variables:\n  ${missing
      .map((k) => `${k}=...`)
      .join("\n  ")}`
  );
  process.exit(1);
}

if (!fs.existsSync(CONFIG.chunksRoot)) {
  console.error(`Chunks root directory not found: ${CONFIG.chunksRoot}`);
  process.exit(1);
}

if (isDryRun) {
  dryRun().catch((err) => {
    console.error("Dry run failed:", err);
    process.exit(1);
  });
} else {
  sync().catch((err) => {
    console.error("Sync failed:", err);
    process.exit(1);
  });
}

import {
  createReadStream,
  createWriteStream,
  mkdirSync,
  readdirSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { BigQuery } from "@google-cloud/bigquery";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");
const BATCH_SIZE = 100_000;
const CONCURRENCY = 5;
const STAGGER_MS = 2000;
const BASE_RETRY_MS = 5000;

const HN_BATCH_REGEX = /hn-(\d+)\.ndjson/;
const bigquery = new BigQuery({ projectId: "matthew-blode" });

interface HNItem {
  id: number;
  type: string;
  by: string;
  time: number;
  title: string;
  url: string;
  text: string;
  score: number;
  descendants: number;
  parent: number;
  kids: number[];
  dead: boolean;
  deleted: boolean;
}

interface IdRange {
  minId: number;
  maxId: number;
  batchIndex: number;
}

async function getRowCount(): Promise<number> {
  const [rows] = await bigquery.query({
    query:
      "SELECT COUNT(*) as count FROM `bigquery-public-data.hacker_news.full`",
    location: "US",
  });
  return Number(rows[0].count);
}

async function getIdBoundaries(numBuckets: number): Promise<number[]> {
  console.log("Computing ID range boundaries...");
  const [rows] = await bigquery.query({
    query: `SELECT APPROX_QUANTILES(id, ${numBuckets}) as boundaries FROM \`bigquery-public-data.hacker_news.full\``,
    location: "US",
  });
  return rows[0].boundaries.map(Number);
}

async function countFileLines(filePath: string): Promise<number> {
  let count = 0;
  const rl = createInterface({
    input: createReadStream(filePath),
    crlfDelay: Number.POSITIVE_INFINITY,
  });
  for await (const line of rl) {
    if (line.trim()) {
      count++;
    }
  }
  return count;
}

async function findResumePoint(): Promise<{
  completedBatches: Set<number>;
  existingRows: number;
}> {
  let files: string[];
  try {
    files = readdirSync(DATA_DIR)
      .filter((f) => f.startsWith("hn-") && f.endsWith(".ndjson"))
      .sort();
  } catch {
    return { completedBatches: new Set(), existingRows: 0 };
  }

  if (files.length === 0) {
    return { completedBatches: new Set(), existingRows: 0 };
  }

  // Count lines in all files in parallel
  const counts = await Promise.all(
    files.map((file) => countFileLines(join(DATA_DIR, file)))
  );

  const completedBatches = new Set<number>();
  let existingRows = 0;
  for (let i = 0; i < files.length; i++) {
    const match = files[i].match(HN_BATCH_REGEX);
    if (match) {
      completedBatches.add(Number(match[1]));
      existingRows += counts[i];
    }
  }

  return { completedBatches, existingRows };
}

function isRateLimitError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) {
    return false;
  }
  const error = err as { code?: number; errors?: { reason?: string }[] };
  if (error.code === 403 || error.code === 429) {
    return true;
  }
  return error.errors?.some((e) => e.reason === "rateLimitExceeded") ?? false;
}

async function downloadRange(range: IdRange, retries = 5): Promise<number> {
  const outputPath = join(
    DATA_DIR,
    `hn-${String(range.batchIndex).padStart(4, "0")}.ndjson`
  );
  const writeStream = createWriteStream(outputPath);

  const query = `
    SELECT
      id, type, \`by\`, time, title, url, text, score,
      descendants, parent, dead, deleted
    FROM \`bigquery-public-data.hacker_news.full\`
    WHERE id > ${range.minId} AND id <= ${range.maxId}
    ORDER BY id
  `;

  const [job] = await bigquery.createQueryJob({
    query,
    location: "US",
  });

  let rowCount = 0;

  return new Promise((resolve, reject) => {
    job
      .getQueryResultsStream()
      .on("data", (row: HNItem) => {
        writeStream.write(`${JSON.stringify(row)}\n`);
        rowCount++;
      })
      .on("end", () => {
        writeStream.end(() => {
          resolve(rowCount);
        });
      })
      .on("error", async (err: Error) => {
        writeStream.end();
        if (retries > 0) {
          const attempt = 5 - retries;
          const backoff = isRateLimitError(err)
            ? BASE_RETRY_MS * 2 ** attempt + Math.random() * 1000
            : BASE_RETRY_MS + Math.random() * 1000;
          console.log(
            `  Batch ${range.batchIndex + 1} failed (${isRateLimitError(err) ? "rate limited" : "error"}), retrying in ${(backoff / 1000).toFixed(1)}s (${retries} left)...`
          );
          await new Promise((r) => setTimeout(r, backoff));
          try {
            const count = await downloadRange(range, retries - 1);
            resolve(count);
          } catch (retryErr) {
            reject(retryErr);
          }
        } else {
          reject(err);
        }
      });
  });
}

async function runPool(
  ranges: IdRange[],
  totalRows: number,
  startingRows: number
) {
  let completedCount = 0;
  let downloadedRows = startingRows;
  const total = ranges.length;
  let nextIndex = 0;

  async function runNext(): Promise<void> {
    while (nextIndex < ranges.length) {
      const range = ranges[nextIndex];
      nextIndex++;
      const startTime = Date.now();

      try {
        const count = await downloadRange(range);
        downloadedRows += count;
        completedCount++;

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const progress = ((downloadedRows / totalRows) * 100).toFixed(1);

        console.log(
          `Batch ${range.batchIndex + 1} done: ${count.toLocaleString()} rows in ${elapsed}s (${progress}% complete, ${completedCount}/${total} batches)`
        );
      } catch (error) {
        console.error(
          `Batch ${range.batchIndex + 1} failed permanently:`,
          error
        );
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, (_, i) =>
    new Promise((r) => setTimeout(r, i * STAGGER_MS)).then(() => runNext())
  );
  await Promise.all(workers);

  return downloadedRows;
}

async function main() {
  mkdirSync(DATA_DIR, { recursive: true });

  console.log(
    "Counting total rows in bigquery-public-data.hacker_news.full..."
  );
  const totalRows = await getRowCount();
  console.log(`Total rows: ${totalRows.toLocaleString()}`);

  const totalBatches = Math.ceil(totalRows / BATCH_SIZE);

  // Get approximate ID boundaries to enable parallel downloads
  const boundaries = await getIdBoundaries(totalBatches);
  console.log(`Computed ${boundaries.length} ID boundaries`);

  // Build ranges from boundaries
  const allRanges: IdRange[] = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    allRanges.push({
      minId: boundaries[i],
      maxId: boundaries[i + 1],
      batchIndex: i,
    });
  }

  // Find already-downloaded batches
  const { completedBatches, existingRows } = await findResumePoint();
  const pendingRanges = allRanges.filter(
    (r) => !completedBatches.has(r.batchIndex)
  );

  if (completedBatches.size > 0) {
    console.log(
      `Resuming: ${completedBatches.size}/${allRanges.length} batches already done (${existingRows.toLocaleString()} rows). ${pendingRanges.length} remaining.\n`
    );
  } else {
    console.log(
      `Downloading ${allRanges.length} batches with concurrency ${CONCURRENCY}\n`
    );
  }

  if (pendingRanges.length === 0) {
    console.log("All batches already downloaded!");
    return;
  }

  const downloadedRows = await runPool(pendingRanges, totalRows, existingRows);

  console.log(
    `\nDone! Downloaded ${downloadedRows.toLocaleString()} rows to ${DATA_DIR}`
  );
}

main().catch(console.error);

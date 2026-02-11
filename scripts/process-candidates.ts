import { createReadStream, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import type { CandidateStory } from "../lib/types";

const __dirname = dirname(fileURLToPath(import.meta.url));

const DATA_DIR = resolve(__dirname, "../data");
const OUTPUT_PATH = resolve(__dirname, "../lib/candidates.json");
const MIN_SCORE = 10;
const TOP_N = 200;

interface RawItem {
  id: number;
  type: string;
  by: string | null;
  time: number;
  title: string | null;
  url: string | null;
  score: number | null;
  descendants: number | null;
  dead: boolean | null;
  deleted: boolean | null;
}

const isValidStory = (item: RawItem): boolean =>
  item.type === "story" &&
  !item.dead &&
  !item.deleted &&
  !!item.title &&
  (item.score ?? 0) >= MIN_SCORE;

const processFile = async (
  filePath: string,
  candidates: CandidateStory[],
  minScore: number
): Promise<void> => {
  const rl = createInterface({
    input: createReadStream(filePath, { encoding: "utf-8" }),
    crlfDelay: Number.POSITIVE_INFINITY,
  });

  for await (const line of rl) {
    if (!line.trim()) {
      continue;
    }

    let item: RawItem;
    try {
      item = JSON.parse(line);
    } catch {
      continue;
    }

    if (!isValidStory(item)) {
      continue;
    }

    const score = item.score ?? 0;

    if (candidates.length < TOP_N || score > minScore) {
      candidates.push({
        id: item.id,
        title: item.title as string,
        url: item.url ?? null,
        by: item.by as string,
        time: item.time,
        score,
        descendants: item.descendants ?? 0,
      });
    }
  }
};

const main = async () => {
  const files = readdirSync(DATA_DIR)
    .filter((f) => f.startsWith("hn-") && f.endsWith(".ndjson"))
    .sort()
    .map((f) => join(DATA_DIR, f));

  console.log(`Found ${files.length} NDJSON files`);

  const candidates: CandidateStory[] = [];
  let minScore = MIN_SCORE;

  for (const file of files) {
    console.log(`Processing ${file}...`);
    await processFile(file, candidates, minScore);

    if (candidates.length > TOP_N * 2) {
      candidates.sort((a, b) => b.score - a.score);
      candidates.length = TOP_N;
      minScore = candidates.at(-1)?.score ?? MIN_SCORE;
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  candidates.length = Math.min(candidates.length, TOP_N);

  console.log(
    `Writing ${candidates.length} candidates (scores ${candidates[0].score} - ${candidates.at(-1)?.score})`
  );

  writeFileSync(OUTPUT_PATH, JSON.stringify(candidates, null, 2), "utf-8");
  console.log(`Written to ${OUTPUT_PATH}`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import { SESSION_START } from "@/lib/events";
import { classifyTopics } from "@/lib/topics";
import type { CandidateStory, UserEvent } from "@/lib/types";

const WWW_PREFIX_REGEX = /^www\./;
const KEYWORD_SPLIT_REGEX = /[^a-z0-9]+/;

export const extractDomain = (url: string | null): string | undefined => {
  if (!url) {
    return undefined;
  }
  try {
    return new URL(url).hostname.replace(WWW_PREFIX_REGEX, "");
  } catch {
    return undefined;
  }
};

const HALF_LIFE_MS = 600_000; // 10 minutes
const DIVERSITY_INTERVAL = 5;
const SHORT_DWELL_MS = 2000;
const MAX_DWELL_NORMALIZATION_MS = 10_000;

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "are",
  "but",
  "not",
  "you",
  "all",
  "can",
  "was",
  "has",
  "had",
  "its",
  "our",
  "who",
  "how",
  "why",
  "what",
  "this",
  "that",
  "with",
  "from",
  "have",
  "will",
  "been",
  "than",
  "them",
  "your",
  "just",
  "about",
]);

export const extractKeywords = (title: string): string[] =>
  title
    .toLowerCase()
    .split(KEYWORD_SPLIT_REGEX)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));

interface RankingSignals {
  avgLikedScore: number;
  likedAuthorWeight: Map<string, number>;
  likedDomainWeight: Map<string, number>;
  skippedPostIds: Set<number>;
  keywordWeight: Map<string, number>;
  topicWeight: Map<string, number>;
  shortDwellAuthors: Set<string>;
  shortDwellDomains: Set<string>;
  highDwellAuthors: Set<string>;
  highDwellDomains: Set<string>;
}

interface RankingAccumulators {
  likedAuthorWeight: Map<string, number>;
  likedDomainWeight: Map<string, number>;
  skippedPostIds: Set<number>;
  dwellTimes: number[];
  dwellAuthors: Map<string, number[]>;
  dwellDomains: Map<string, number[]>;
  shortDwellAuthors: Set<string>;
  shortDwellDomains: Set<string>;
  keywordWeight: Map<string, number>;
  topicWeight: Map<string, number>;
  likedScoreSum: number;
  likedScoreWeightSum: number;
}

const POSITIVE_EVENT_MULTIPLIER: Partial<Record<UserEvent["type"], number>> = {
  like: 1.0,
  click: 1.2,
  bookmark: 1.5,
};

const createDecay = (now: number) => (timestamp: number) => {
  const base = 0.5 ** ((now - timestamp) / HALF_LIFE_MS);
  return timestamp >= SESSION_START ? base * 2 : base;
};

const createAccumulators = (): RankingAccumulators => ({
  likedAuthorWeight: new Map<string, number>(),
  likedDomainWeight: new Map<string, number>(),
  skippedPostIds: new Set<number>(),
  dwellTimes: [],
  dwellAuthors: new Map<string, number[]>(),
  dwellDomains: new Map<string, number[]>(),
  shortDwellAuthors: new Set<string>(),
  shortDwellDomains: new Set<string>(),
  keywordWeight: new Map<string, number>(),
  topicWeight: new Map<string, number>(),
  likedScoreSum: 0,
  likedScoreWeightSum: 0,
});

const average = (values: number[]): number => {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const resolveAuthor = (
  event: UserEvent,
  candidateMap: Map<number, CandidateStory>
): string | undefined => event.by ?? candidateMap.get(event.postId)?.by;

const resolveDomain = (
  event: UserEvent,
  candidateMap: Map<number, CandidateStory>
): string | undefined =>
  event.domain ?? extractDomain(candidateMap.get(event.postId)?.url ?? null);

const addWeightedValue = (
  map: Map<string, number>,
  key: string | undefined,
  weight: number
) => {
  if (!key) {
    return;
  }
  map.set(key, (map.get(key) ?? 0) + weight);
};

const addKeywordsWeight = (
  title: string | undefined,
  keywordWeight: Map<string, number>,
  weight: number
) => {
  if (!title) {
    return;
  }
  for (const keyword of extractKeywords(title)) {
    addWeightedValue(keywordWeight, keyword, weight);
  }
};

const addTopicsWeight = (
  topics: string[] | undefined,
  topicWeight: Map<string, number>,
  weight: number
) => {
  if (!topics) {
    return;
  }
  for (const topic of topics) {
    addWeightedValue(topicWeight, topic, weight);
  }
};

const addSample = (
  map: Map<string, number[]>,
  key: string | undefined,
  value: number
) => {
  if (!key) {
    return;
  }
  const samples = map.get(key) ?? [];
  samples.push(value);
  map.set(key, samples);
};

const deriveHighDwellSet = (
  dwellSamples: Map<string, number[]>,
  avgDwellMs: number
): Set<string> =>
  new Set(
    [...dwellSamples.entries()]
      .filter(([, samples]) => average(samples) > avgDwellMs)
      .map(([value]) => value)
  );

const applyPositiveEvent = (
  event: UserEvent,
  multiplier: number,
  accumulators: RankingAccumulators,
  candidateMap: Map<number, CandidateStory>,
  decay: (timestamp: number) => number
) => {
  const author = resolveAuthor(event, candidateMap);
  const domain = resolveDomain(event, candidateMap);
  const weight = decay(event.timestamp) * multiplier;

  addWeightedValue(accumulators.likedAuthorWeight, author, weight);
  addWeightedValue(accumulators.likedDomainWeight, domain, weight);
  addKeywordsWeight(event.title, accumulators.keywordWeight, weight);
  addTopicsWeight(event.topics, accumulators.topicWeight, weight);

  accumulators.likedScoreSum += event.score * weight;
  accumulators.likedScoreWeightSum += weight;
};

const applyDwellEvent = (
  event: UserEvent,
  accumulators: RankingAccumulators,
  candidateMap: Map<number, CandidateStory>,
  decay: (timestamp: number) => number
) => {
  if (event.dwellMs == null) {
    return;
  }

  const author = resolveAuthor(event, candidateMap);
  const domain = resolveDomain(event, candidateMap);
  const dwellMs = event.dwellMs;

  accumulators.dwellTimes.push(dwellMs);

  const dwellFactor =
    dwellMs < SHORT_DWELL_MS
      ? -0.3
      : Math.min(dwellMs / MAX_DWELL_NORMALIZATION_MS, 1.0) * 0.5;
  addKeywordsWeight(
    event.title,
    accumulators.keywordWeight,
    decay(event.timestamp) * dwellFactor
  );

  if (dwellMs < SHORT_DWELL_MS) {
    if (author) {
      accumulators.shortDwellAuthors.add(author);
    }
    if (domain) {
      accumulators.shortDwellDomains.add(domain);
    }
  }

  addSample(accumulators.dwellAuthors, author, dwellMs);
  addSample(accumulators.dwellDomains, domain, dwellMs);
};

const buildRankingSignals = (
  events: UserEvent[],
  candidateMap: Map<number, CandidateStory>,
  decay: (timestamp: number) => number
): RankingSignals => {
  const accumulators = createAccumulators();

  for (const event of events) {
    const multiplier = POSITIVE_EVENT_MULTIPLIER[event.type];
    if (multiplier != null) {
      applyPositiveEvent(event, multiplier, accumulators, candidateMap, decay);
      continue;
    }

    if (event.type === "skip") {
      accumulators.skippedPostIds.add(event.postId);
      continue;
    }

    if (event.type === "dwell") {
      applyDwellEvent(event, accumulators, candidateMap, decay);
    }
  }

  const avgLikedScore =
    accumulators.likedScoreWeightSum > 0
      ? accumulators.likedScoreSum / accumulators.likedScoreWeightSum
      : 0;
  const avgDwellMs = average(accumulators.dwellTimes);

  return {
    avgLikedScore,
    likedAuthorWeight: accumulators.likedAuthorWeight,
    likedDomainWeight: accumulators.likedDomainWeight,
    skippedPostIds: accumulators.skippedPostIds,
    keywordWeight: accumulators.keywordWeight,
    topicWeight: accumulators.topicWeight,
    shortDwellAuthors: accumulators.shortDwellAuthors,
    shortDwellDomains: accumulators.shortDwellDomains,
    highDwellAuthors: deriveHighDwellSet(accumulators.dwellAuthors, avgDwellMs),
    highDwellDomains: deriveHighDwellSet(accumulators.dwellDomains, avgDwellMs),
  };
};

const scoreRangeBoost = (score: number, avgLikedScore: number): number => {
  if (avgLikedScore <= 0) {
    return 0;
  }
  const lower = avgLikedScore * 0.5;
  const upper = avgLikedScore * 1.5;
  return score >= lower && score <= upper ? score * 0.3 : 0;
};

const hasMapWeightAboveThreshold = (
  map: Map<string, number>,
  key: string | undefined,
  threshold: number
): boolean => (key ? (map.get(key) ?? 0) > threshold : false);

const setContains = (set: Set<string>, key: string | undefined): boolean =>
  key ? set.has(key) : false;

const keywordOverlapBoost = (
  title: string,
  score: number,
  keywordWeight: Map<string, number>
): number => {
  if (keywordWeight.size === 0) {
    return 0;
  }

  const overlap = extractKeywords(title).reduce(
    (sum, keyword) => sum + (keywordWeight.get(keyword) ?? 0),
    0
  );

  return overlap > 0 ? score * Math.min(overlap / 3, 0.4) : 0;
};

const topicAffinityBoost = (
  title: string,
  domain: string | undefined,
  score: number,
  topicWeight: Map<string, number>
): number => {
  if (topicWeight.size === 0) {
    return 0;
  }

  const storyTopics = classifyTopics(title, domain);
  const topicSum = storyTopics.reduce(
    (sum, topic) => sum + (topicWeight.get(topic) ?? 0),
    0
  );

  return topicSum > 0.3 ? score * Math.min(topicSum / 3, 0.35) : 0;
};

const computeWeight = (
  story: CandidateStory,
  signals: RankingSignals
): number => {
  const domain = extractDomain(story.url);
  let weight = story.score;

  weight += scoreRangeBoost(story.score, signals.avgLikedScore);
  weight += hasMapWeightAboveThreshold(signals.likedAuthorWeight, story.by, 0.3)
    ? story.score * 0.5
    : 0;
  weight += hasMapWeightAboveThreshold(signals.likedDomainWeight, domain, 0.3)
    ? story.score * 0.25
    : 0;
  weight += setContains(signals.highDwellAuthors, story.by)
    ? story.score * 0.2
    : 0;
  weight += setContains(signals.highDwellDomains, domain)
    ? story.score * 0.15
    : 0;
  weight -= setContains(signals.shortDwellAuthors, story.by)
    ? story.score * 0.1
    : 0;
  weight -= setContains(signals.shortDwellDomains, domain)
    ? story.score * 0.1
    : 0;
  weight += keywordOverlapBoost(
    story.title,
    story.score,
    signals.keywordWeight
  );
  weight += topicAffinityBoost(
    story.title,
    domain,
    story.score,
    signals.topicWeight
  );
  weight -= signals.skippedPostIds.has(story.id) ? story.score * 0.3 : 0;

  return weight;
};

const injectDiversity = (sorted: CandidateStory[]): CandidateStory[] => {
  const recentAuthors = new Set<string>();
  const recentDomains = new Set<string>();
  const result: CandidateStory[] = [];
  const pool = [...sorted];

  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && i % DIVERSITY_INTERVAL === 0 && pool.length > 0) {
      const diverseIdx = pool.findIndex((p) => {
        const d = extractDomain(p.url);
        return !(recentAuthors.has(p.by) || (d && recentDomains.has(d)));
      });
      if (diverseIdx !== -1) {
        const pick = pool.splice(diverseIdx, 1)[0];
        result.push(pick);
        recentAuthors.clear();
        recentDomains.clear();
        recentAuthors.add(pick.by);
        const d = extractDomain(pick.url);
        if (d) {
          recentDomains.add(d);
        }
        continue;
      }
    }

    if (pool.length > 0) {
      const next = pool.shift();
      if (!next) {
        continue;
      }
      result.push(next);
      recentAuthors.add(next.by);
      const d = extractDomain(next.url);
      if (d) {
        recentDomains.add(d);
      }
    }
  }

  return result;
};

export const rankCandidates = (
  candidates: CandidateStory[],
  events: UserEvent[]
): CandidateStory[] => {
  if (events.length === 0) {
    return injectDiversity(candidates.toSorted((a, b) => b.score - a.score));
  }

  const decay = createDecay(Date.now());
  const candidateMap = new Map(candidates.map((c) => [c.id, c]));
  const signals = buildRankingSignals(events, candidateMap, decay);
  const storyWeight = new Map(
    candidates.map((story) => [story.id, computeWeight(story, signals)])
  );

  const sorted = candidates.toSorted(
    (a, b) => (storyWeight.get(b.id) ?? 0) - (storyWeight.get(a.id) ?? 0)
  );

  return injectDiversity(sorted);
};

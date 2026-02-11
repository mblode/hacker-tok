import { SESSION_START } from "@/lib/events";
import { classifyTopics } from "@/lib/topics";
import type { CandidateStory, UserEvent } from "@/lib/types";

export const extractDomain = (url: string | null): string | undefined => {
  if (!url) {
    return undefined;
  }
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
};

const HALF_LIFE_MS = 600_000; // 10 minutes
const DIVERSITY_INTERVAL = 5;

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
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));

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
      const next = pool.shift()!;
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

  const now = Date.now();
  const decay = (ts: number) => {
    const base = 0.5 ** ((now - ts) / HALF_LIFE_MS);
    return ts >= SESSION_START ? base * 2 : base;
  };

  const candidateMap = new Map(candidates.map((c) => [c.id, c]));
  const resolveAuthor = (e: UserEvent) =>
    e.by ?? candidateMap.get(e.postId)?.by;
  const resolveDomain = (e: UserEvent) =>
    e.domain ?? extractDomain(candidateMap.get(e.postId)?.url ?? null);

  // Decay-weighted author/domain affinity
  const likedAuthorWeight = new Map<string, number>();
  const likedDomainWeight = new Map<string, number>();
  const skippedPostIds = new Set<number>();
  const dwellTimes: number[] = [];
  const dwellAuthors = new Map<string, number[]>();
  const dwellDomains = new Map<string, number[]>();
  const shortDwellAuthors = new Set<string>();
  const shortDwellDomains = new Set<string>();
  const keywordWeight = new Map<string, number>();
  const topicWeight = new Map<string, number>();
  let likedScoreSum = 0;
  let likedScoreWeightSum = 0;

  const processPositiveSignal = (e: UserEvent, multiplier: number) => {
    const author = resolveAuthor(e);
    const domain = resolveDomain(e);
    const w = decay(e.timestamp) * multiplier;
    if (author) {
      likedAuthorWeight.set(author, (likedAuthorWeight.get(author) ?? 0) + w);
    }
    if (domain) {
      likedDomainWeight.set(domain, (likedDomainWeight.get(domain) ?? 0) + w);
    }
    if (e.title) {
      for (const kw of extractKeywords(e.title)) {
        keywordWeight.set(kw, (keywordWeight.get(kw) ?? 0) + w);
      }
    }
    if (e.topics) {
      for (const topic of e.topics) {
        topicWeight.set(topic, (topicWeight.get(topic) ?? 0) + w);
      }
    }
    likedScoreSum += e.score * w;
    likedScoreWeightSum += w;
  };

  for (const e of events) {
    const author = resolveAuthor(e);
    const domain = resolveDomain(e);
    if (e.type === "like") {
      processPositiveSignal(e, 1.0);
    } else if (e.type === "click") {
      processPositiveSignal(e, 1.2);
    } else if (e.type === "bookmark") {
      processPositiveSignal(e, 1.5);
    } else if (e.type === "skip") {
      skippedPostIds.add(e.postId);
    } else if (e.type === "dwell" && e.dwellMs != null) {
      dwellTimes.push(e.dwellMs);
      const dwellFactor =
        e.dwellMs < 2000 ? -0.3 : Math.min(e.dwellMs / 10_000, 1.0) * 0.5;
      if (e.title) {
        const w = decay(e.timestamp) * dwellFactor;
        for (const kw of extractKeywords(e.title)) {
          keywordWeight.set(kw, (keywordWeight.get(kw) ?? 0) + w);
        }
      }
      if (e.dwellMs < 2000) {
        if (author) {
          shortDwellAuthors.add(author);
        }
        if (domain) {
          shortDwellDomains.add(domain);
        }
      }
      if (author) {
        const arr = dwellAuthors.get(author) ?? [];
        arr.push(e.dwellMs);
        dwellAuthors.set(author, arr);
      }
      if (domain) {
        const arr = dwellDomains.get(domain) ?? [];
        arr.push(e.dwellMs);
        dwellDomains.set(domain, arr);
      }
    }
  }

  const avgLikedScore =
    likedScoreWeightSum > 0 ? likedScoreSum / likedScoreWeightSum : 0;
  const avgDwellMs =
    dwellTimes.length > 0
      ? dwellTimes.reduce((a, b) => a + b, 0) / dwellTimes.length
      : 0;

  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

  const highDwellAuthors = new Set(
    [...dwellAuthors.entries()]
      .filter(([, times]) => avg(times) > avgDwellMs)
      .map(([author]) => author)
  );

  const highDwellDomains = new Set(
    [...dwellDomains.entries()]
      .filter(([, times]) => avg(times) > avgDwellMs)
      .map(([domain]) => domain)
  );

  const computeWeight = (story: CandidateStory): number => {
    let weight = story.score;
    const domain = extractDomain(story.url);

    // +30% if score near avg liked score
    if (avgLikedScore > 0) {
      const lower = avgLikedScore * 0.5;
      const upper = avgLikedScore * 1.5;
      if (story.score >= lower && story.score <= upper) {
        weight += story.score * 0.3;
      }
    }

    // +50% if by a liked author (decay-weighted, threshold 0.3)
    if ((likedAuthorWeight.get(story.by) ?? 0) > 0.3) {
      weight += story.score * 0.5;
    }

    // +25% if from a liked domain (decay-weighted, threshold 0.3)
    if (domain && (likedDomainWeight.get(domain) ?? 0) > 0.3) {
      weight += story.score * 0.25;
    }

    // +20% if by an author the user dwelled on above average
    if (highDwellAuthors.has(story.by)) {
      weight += story.score * 0.2;
    }

    // +15% if from a domain the user dwelled on above average
    if (domain && highDwellDomains.has(domain)) {
      weight += story.score * 0.15;
    }

    // -10% if by an author/domain the user quickly skipped past
    if (shortDwellAuthors.has(story.by)) {
      weight -= story.score * 0.1;
    }
    if (domain && shortDwellDomains.has(domain)) {
      weight -= story.score * 0.1;
    }

    // +up to 40% from keyword overlap with liked/dwelled titles
    if (keywordWeight.size > 0) {
      const keywords = extractKeywords(story.title);
      let overlap = 0;
      for (const kw of keywords) {
        overlap += keywordWeight.get(kw) ?? 0;
      }
      if (overlap > 0) {
        weight += story.score * Math.min(overlap / 3, 0.4);
      }
    }

    // +up to 35% from topic affinity
    if (topicWeight.size > 0) {
      const storyTopics = classifyTopics(story.title, domain ?? undefined);
      let topicSum = 0;
      for (const t of storyTopics) {
        topicSum += topicWeight.get(t) ?? 0;
      }
      if (topicSum > 0.3) {
        weight += story.score * Math.min(topicSum / 3, 0.35);
      }
    }

    // -30% if this post was previously skipped
    if (skippedPostIds.has(story.id)) {
      weight -= story.score * 0.3;
    }

    return weight;
  };

  // Sort by weight
  const sorted = candidates.toSorted(
    (a, b) => computeWeight(b) - computeWeight(a)
  );

  return injectDiversity(sorted);
};

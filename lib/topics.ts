export type Topic =
  | "ai-ml"
  | "programming"
  | "security"
  | "startups"
  | "science"
  | "hardware"
  | "web-dev"
  | "systems"
  | "culture"
  | "finance"
  | "other";

interface TopicRule {
  topic: Topic;
  keywords: string[];
  domains: string[];
}

const TOPIC_RULES: TopicRule[] = [
  {
    topic: "ai-ml",
    keywords: [
      "ai",
      "machine",
      "learning",
      "neural",
      "gpt",
      "llm",
      "model",
      "transformer",
      "diffusion",
      "openai",
      "anthropic",
      "deepmind",
      "training",
      "inference",
      "embedding",
      "chatbot",
      "generative",
      "deep",
    ],
    domains: [
      "openai.com",
      "anthropic.com",
      "deepmind.google",
      "huggingface.co",
    ],
  },
  {
    topic: "programming",
    keywords: [
      "rust",
      "python",
      "javascript",
      "typescript",
      "golang",
      "compiler",
      "language",
      "syntax",
      "library",
      "framework",
      "programming",
      "developer",
      "code",
      "debug",
      "refactor",
    ],
    domains: ["github.com", "gitlab.com", "dev.to"],
  },
  {
    topic: "security",
    keywords: [
      "security",
      "vulnerability",
      "exploit",
      "hack",
      "breach",
      "encryption",
      "malware",
      "ransomware",
      "phishing",
      "cybersecurity",
      "zero-day",
      "auth",
      "authentication",
    ],
    domains: ["krebsonsecurity.com", "schneier.com", "thehackernews.com"],
  },
  {
    topic: "startups",
    keywords: [
      "startup",
      "founder",
      "funding",
      "venture",
      "seed",
      "series",
      "valuation",
      "acquisition",
      "ipo",
      "pitch",
      "accelerator",
      "yc",
      "ycombinator",
    ],
    domains: ["techcrunch.com", "crunchbase.com", "ycombinator.com"],
  },
  {
    topic: "science",
    keywords: [
      "research",
      "study",
      "discovery",
      "physics",
      "biology",
      "chemistry",
      "space",
      "quantum",
      "genome",
      "climate",
      "nasa",
      "nature",
      "experiment",
    ],
    domains: ["nature.com", "science.org", "arxiv.org", "nasa.gov"],
  },
  {
    topic: "hardware",
    keywords: [
      "chip",
      "processor",
      "cpu",
      "gpu",
      "silicon",
      "semiconductor",
      "fpga",
      "arduino",
      "raspberry",
      "hardware",
      "circuit",
      "manufacturing",
      "intel",
      "amd",
      "nvidia",
      "apple",
    ],
    domains: ["anandtech.com", "tomshardware.com", "semianalysis.com"],
  },
  {
    topic: "web-dev",
    keywords: [
      "react",
      "nextjs",
      "css",
      "html",
      "browser",
      "frontend",
      "backend",
      "api",
      "rest",
      "graphql",
      "webpack",
      "vite",
      "tailwind",
      "dom",
      "http",
      "web",
    ],
    domains: ["mdn.io", "web.dev", "css-tricks.com", "smashingmagazine.com"],
  },
  {
    topic: "systems",
    keywords: [
      "linux",
      "kernel",
      "os",
      "database",
      "postgres",
      "redis",
      "docker",
      "kubernetes",
      "distributed",
      "networking",
      "tcp",
      "dns",
      "storage",
      "filesystem",
      "cloud",
      "aws",
    ],
    domains: ["lwn.net", "kernel.org", "aws.amazon.com"],
  },
  {
    topic: "culture",
    keywords: [
      "culture",
      "remote",
      "hiring",
      "interview",
      "management",
      "career",
      "salary",
      "burnout",
      "productivity",
      "work",
      "team",
      "leadership",
    ],
    domains: [],
  },
  {
    topic: "finance",
    keywords: [
      "bitcoin",
      "crypto",
      "blockchain",
      "trading",
      "market",
      "stock",
      "fintech",
      "bank",
      "payment",
      "defi",
      "ethereum",
      "price",
    ],
    domains: ["coindesk.com", "bloomberg.com", "ft.com"],
  },
];

// Pre-build a keyword-to-topic lookup for fast classification
const KEYWORD_MAP = new Map<string, Topic[]>();
for (const rule of TOPIC_RULES) {
  for (const kw of rule.keywords) {
    const existing = KEYWORD_MAP.get(kw);
    if (existing) {
      existing.push(rule.topic);
    } else {
      KEYWORD_MAP.set(kw, [rule.topic]);
    }
  }
}

const DOMAIN_MAP = new Map<string, Topic[]>();
for (const rule of TOPIC_RULES) {
  for (const d of rule.domains) {
    const existing = DOMAIN_MAP.get(d);
    if (existing) {
      existing.push(rule.topic);
    } else {
      DOMAIN_MAP.set(d, [rule.topic]);
    }
  }
}

const WORD_SPLIT_RE = /[^a-z0-9-]+/;
const WWW_PREFIX_RE = /^www\./;

export const classifyTopics = (title: string, domain?: string): Topic[] => {
  const scores = new Map<Topic, number>();

  // Score from title keywords
  const words = title.toLowerCase().split(WORD_SPLIT_RE);
  for (const word of words) {
    const topics = KEYWORD_MAP.get(word);
    if (topics) {
      for (const t of topics) {
        scores.set(t, (scores.get(t) ?? 0) + 1);
      }
    }
  }

  // Score from domain (domain match = 3 keyword matches)
  if (domain) {
    const normalized = domain.replace(WWW_PREFIX_RE, "");
    const topics = DOMAIN_MAP.get(normalized);
    if (topics) {
      for (const t of topics) {
        scores.set(t, (scores.get(t) ?? 0) + 3);
      }
    }
  }

  // Return topics with score >= 2
  const matched: Topic[] = [];
  for (const [topic, score] of scores) {
    if (score >= 2) {
      matched.push(topic);
    }
  }

  return matched.length > 0 ? matched : ["other"];
};

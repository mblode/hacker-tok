import { load } from "cheerio";

const HN_BASE = "https://news.ycombinator.com";
const FETCH_TIMEOUT_MS = 10_000;

const USER_COOKIE_RE = /user=([^;]+)/;
const AUTH_PARAM_RE = /auth=([^&]+)/;

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "text/html",
};

function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, { ...init, signal: controller.signal }).finally(() =>
    clearTimeout(timeout)
  );
}

interface LoginResult {
  success: boolean;
  cookie?: string;
  error?: string;
}

interface AuthTokens {
  upvoteAuth?: string;
  fnid?: string;
}

interface UserInfo {
  username: string;
  karma: number;
}

export async function hnLogin(
  username: string,
  password: string
): Promise<LoginResult> {
  const body = new URLSearchParams({
    acct: username,
    pw: password,
    goto: "news",
  });

  const response = await fetchWithTimeout(`${HN_BASE}/login`, {
    method: "POST",
    headers: {
      ...HEADERS,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
    redirect: "manual",
  });

  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) {
    const text = await response.text();
    if (text.includes("Bad login")) {
      return { success: false, error: "Invalid username or password." };
    }
    return { success: false, error: "Login failed. Please try again." };
  }

  const match = USER_COOKIE_RE.exec(setCookie);
  if (!match) {
    return { success: false, error: "Login failed. No session received." };
  }

  return { success: true, cookie: match[1] };
}

export async function hnFetchCurrentUser(
  sessionCookie: string
): Promise<UserInfo | null> {
  const response = await fetchWithTimeout(`${HN_BASE}/news`, {
    headers: { ...HEADERS, Cookie: `user=${sessionCookie}` },
    redirect: "manual",
  });

  if (!response.ok && response.status !== 302) {
    return null;
  }

  const html = await response.text();
  const $ = load(html);

  const userLink = $("a#me");
  if (!userLink.length) {
    return null;
  }

  const username = userLink.text().trim();
  if (!username) {
    return null;
  }

  const karmaEl = $("span#karma");
  const karma = karmaEl.length
    ? Number.parseInt(karmaEl.text().trim(), 10) || 0
    : 0;

  return { username, karma };
}

export async function hnFetchAuthTokens(
  itemId: number,
  sessionCookie: string
): Promise<AuthTokens> {
  const response = await fetchWithTimeout(`${HN_BASE}/item?id=${itemId}`, {
    headers: { ...HEADERS, Cookie: `user=${sessionCookie}` },
  });

  if (!response.ok) {
    return {};
  }

  const html = await response.text();
  const $ = load(html);

  const tokens: AuthTokens = {};

  const voteLink = $(`a#up_${itemId}`).attr("href");
  if (voteLink) {
    const authMatch = AUTH_PARAM_RE.exec(voteLink);
    if (authMatch) {
      tokens.upvoteAuth = authMatch[1];
    }
  }

  const fnidInput = $('input[name="hmac"]').first();
  if (fnidInput.length) {
    tokens.fnid = fnidInput.attr("value");
  } else {
    const fnidAlt = $('input[name="fnid"]').first();
    if (fnidAlt.length) {
      tokens.fnid = fnidAlt.attr("value");
    }
  }

  return tokens;
}

export async function hnVote(
  itemId: number,
  direction: "up" | "down",
  auth: string,
  sessionCookie: string
): Promise<{ success: boolean }> {
  const url = `${HN_BASE}/vote?id=${itemId}&how=${direction}&auth=${auth}`;

  const response = await fetchWithTimeout(url, {
    headers: { ...HEADERS, Cookie: `user=${sessionCookie}` },
    redirect: "manual",
  });

  return { success: response.status === 302 || response.ok };
}

export async function hnPostComment(
  parentId: number,
  text: string,
  hmac: string,
  sessionCookie: string
): Promise<{ success: boolean; error?: string }> {
  const body = new URLSearchParams({
    parent: String(parentId),
    text,
    hmac,
    goto: `item?id=${parentId}`,
  });

  const response = await fetchWithTimeout(`${HN_BASE}/comment`, {
    method: "POST",
    headers: {
      ...HEADERS,
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: `user=${sessionCookie}`,
    },
    body: body.toString(),
    redirect: "manual",
  });

  if (response.status === 302 || response.ok) {
    return { success: true };
  }

  const html = await response.text();
  if (html.includes("too fast")) {
    return {
      success: false,
      error: "You're posting too fast. Please wait a bit.",
    };
  }
  return { success: false, error: "Failed to post comment." };
}

export async function hnFetchSubmitToken(
  sessionCookie: string
): Promise<string | null> {
  const response = await fetchWithTimeout(`${HN_BASE}/submit`, {
    headers: { ...HEADERS, Cookie: `user=${sessionCookie}` },
  });

  if (!response.ok) {
    return null;
  }

  const html = await response.text();
  const $ = load(html);

  const fnid = $('input[name="fnid"]').first().attr("value");
  return fnid ?? null;
}

export async function hnSubmitStory(
  title: string,
  urlOrText: { url: string } | { text: string },
  fnid: string,
  sessionCookie: string
): Promise<{ success: boolean; error?: string }> {
  const params: Record<string, string> = {
    fnid,
    fnop: "submit-page",
    title,
  };

  if ("url" in urlOrText) {
    params.url = urlOrText.url;
  } else {
    params.text = urlOrText.text;
  }

  const body = new URLSearchParams(params);

  const response = await fetchWithTimeout(`${HN_BASE}/r`, {
    method: "POST",
    headers: {
      ...HEADERS,
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: `user=${sessionCookie}`,
    },
    body: body.toString(),
    redirect: "manual",
  });

  if (response.status === 302 || response.ok) {
    return { success: true };
  }

  const html = await response.text();
  if (html.includes("too fast")) {
    return {
      success: false,
      error: "You're submitting too fast. Please wait.",
    };
  }
  return { success: false, error: "Failed to submit story." };
}

import {
  Application,
  Context,
  isHttpError,
  Router,
} from "https://deno.land/x/oak/mod.ts";
import { oakCors } from "https://deno.land/x/cors/mod.ts";

const app = new Application();
const router = new Router();

// --- Per-user TTL cache ---
// With only 30 requests/hour on the free plan, we must cache aggressively.
interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

const CACHE_TTL = {
  workspace: 60 * 60 * 1000, // 1 hour - workspace ID rarely changes
  projects: 30 * 60 * 1000, // 30 min - projects rarely change
  currentEntry: 2 * 60 * 1000, // 2 min - current timer changes often
  timeEntries: 5 * 60 * 1000, // 5 min - historical entries
  dailyEntries: 5 * 60 * 1000, // 5 min - historical entries
};

function getCached(key: string): unknown | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return entry.data;
}

function setCache(key: string, data: unknown, ttlMs: number) {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

// Build a cache key from auth header + endpoint-specific params
function cacheKey(authHeader: string, endpoint: string, params?: string): string {
  return `${authHeader}:${endpoint}${params ? `:${params}` : ""}`;
}

// --- Workspace ID lookup (cached) ---
async function getWorkspaceId(authHeader: string): Promise<number> {
  const key = cacheKey(authHeader, "workspace");
  const cached = getCached(key);
  if (cached !== undefined) return cached as number;

  // deno-lint-ignore no-explicit-any
  const me = await fetchWithAuth(
    "https://api.track.toggl.com/api/v9/me",
    authHeader,
  ) as any;
  const id = me.default_workspace_id;
  setCache(key, id, CACHE_TTL.workspace);
  return id;
}

// --- Rate limiter: 1 request per second to Toggl ---
let lastRequestTime = 0;

async function rateLimitedFetch(
  url: string,
  options: RequestInit,
): Promise<Response> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < 1000) {
    await new Promise((resolve) =>
      setTimeout(resolve, 1000 - timeSinceLastRequest)
    );
  }
  lastRequestTime = Date.now();
  return fetch(url, options);
}

// --- Fetch with auth, retry on 402/429/5xx ---
async function fetchWithAuth(
  url: string,
  authHeader: string,
  method = "GET",
  body?: unknown,
): Promise<unknown> {
  const headers = new Headers();
  headers.set("Authorization", authHeader);

  const requestOptions: RequestInit = {
    method,
    headers,
  };

  if (body) {
    headers.set("Content-Type", "application/json");
    requestOptions.body = JSON.stringify(body);
  }

  const maxRetries = 4;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await rateLimitedFetch(url, requestOptions);

    if (response.ok) {
      const text = await response.text();
      if (!text || text === "null") return null;
      try {
        return JSON.parse(text);
      } catch {
        return null;
      }
    }

    // 402 = Toggl's rate limit exceeded, 429 = general rate limit
    if (
      (response.status === 402 || response.status === 429) &&
      attempt < maxRetries
    ) {
      const backoffMs = Math.pow(2, attempt + 1) * 1000;
      console.warn(
        `Rate limited (${response.status}) on ${method} ${url}, retrying in ${backoffMs}ms (attempt ${attempt + 1}/${maxRetries})`,
      );
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
      continue;
    }

    if (response.status >= 500 && attempt < maxRetries) {
      const backoffMs = Math.pow(2, attempt + 1) * 1000;
      console.warn(
        `Server error (${response.status}) on ${method} ${url}, retrying in ${backoffMs}ms (attempt ${attempt + 1}/${maxRetries})`,
      );
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
      continue;
    }

    const errorBody = await response.text().catch(() => "");
    console.error(
      `Request ${method} ${url} failed: ${response.status} ${response.statusText}`,
    );
    console.error(`Response body: ${errorBody}`);
    throw new Error(`${response.status} ${response.statusText}`);
  }

  throw new Error(`Max retries exceeded for ${method} ${url}`);
}

// --- Paginated fetch for Reports API v3 detailed reports ---
async function fetchAllTimeEntries(
  url: string,
  authHeader: string,
  body: Record<string, unknown>,
): Promise<unknown[]> {
  const allEntries: unknown[] = [];
  let firstRowNumber: number | undefined;
  let firstId: number | undefined;

  while (true) {
    const requestBody: Record<string, unknown> = { ...body };
    if (firstRowNumber !== undefined) {
      requestBody.first_row_number = firstRowNumber;
    }
    if (firstId !== undefined) {
      requestBody.first_id = firstId;
    }

    const headers = new Headers();
    headers.set("Authorization", authHeader);
    headers.set("Content-Type", "application/json");

    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < 1000) {
      await new Promise((resolve) =>
        setTimeout(resolve, 1000 - timeSinceLastRequest)
      );
    }
    lastRequestTime = Date.now();

    let response: Response | null = null;
    const maxRetries = 4;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      });

      if (response.ok) break;

      if (
        (response.status === 402 || response.status === 429 ||
          response.status >= 500) &&
        attempt < maxRetries
      ) {
        const backoffMs = Math.pow(2, attempt + 1) * 1000;
        console.warn(
          `${response.status} on POST ${url}, retrying in ${backoffMs}ms`,
        );
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        lastRequestTime = Date.now();
        continue;
      }

      const errorBody = await response.text().catch(() => "");
      console.error(
        `POST ${url} failed: ${response.status} ${response.statusText}`,
      );
      console.error(`Response body: ${errorBody}`);
      throw new Error(`${response.status} ${response.statusText}`);
    }

    if (!response || !response.ok) {
      throw new Error(`Failed to fetch time entries from ${url}`);
    }

    const data = await response.json();
    if (Array.isArray(data)) {
      allEntries.push(...data);
    }

    const nextRowNumber = response.headers.get("X-Next-Row-Number");
    const nextId = response.headers.get("X-Next-ID");

    if (nextRowNumber && nextId) {
      firstRowNumber = parseInt(nextRowNumber, 10);
      firstId = parseInt(nextId, 10);
    } else {
      break;
    }
  }

  return allEntries;
}

// --- Error handler middleware ---
async function errorHandler(ctx: Context, next: () => Promise<unknown>) {
  try {
    await next();
  } catch (err) {
    console.error("Error:", err);
    if (isHttpError(err)) {
      ctx.response.status = err.status;
      ctx.response.body = { error: err.message };
    } else {
      ctx.response.status = 500;
      ctx.response.body = { error: "Internal Server Error" };
    }
  }
}

// --- Routes ---
router
  .get("/api/projects", async (ctx) => {
    const authHeader = ctx.request.headers.get("Authorization")!;
    const key = cacheKey(authHeader, "projects");
    const cached = getCached(key);
    if (cached !== undefined) {
      ctx.response.body = cached;
      return;
    }

    const workspaceId = await getWorkspaceId(authHeader);
    const projects = await fetchWithAuth(
      `https://api.track.toggl.com/api/v9/workspaces/${workspaceId}/projects`,
      authHeader,
    );
    setCache(key, projects, CACHE_TTL.projects);
    ctx.response.body = projects;
  })
  .get("/api/current_time_entry", async (ctx) => {
    const authHeader = ctx.request.headers.get("Authorization")!;
    const key = cacheKey(authHeader, "current_time_entry");
    const cached = getCached(key);
    if (cached !== undefined) {
      ctx.response.body = cached;
      return;
    }

    const currentTimeEntry = await fetchWithAuth(
      "https://api.track.toggl.com/api/v9/me/time_entries/current",
      authHeader,
    );
    setCache(key, currentTimeEntry, CACHE_TTL.currentEntry);
    ctx.response.body = currentTimeEntry;
  })
  .post("/api/time_entries", async (ctx) => {
    const authHeader = ctx.request.headers.get("Authorization")!;
    const body = await ctx.request.body().value;
    const { start_date, end_date, project_id } = body as {
      start_date: string;
      end_date: string;
      project_id: number;
    };

    const key = cacheKey(
      authHeader,
      "time_entries",
      `${start_date}:${end_date}:${project_id}`,
    );
    const cached = getCached(key);
    if (cached !== undefined) {
      ctx.response.body = cached;
      return;
    }

    const workspaceId = await getWorkspaceId(authHeader);
    const entries = await fetchAllTimeEntries(
      `https://api.track.toggl.com/reports/api/v3/workspace/${workspaceId}/search/time_entries`,
      authHeader,
      { start_date, end_date, project_ids: [project_id] },
    );

    // deno-lint-ignore no-explicit-any
    const result = entries.flatMap((item: any) => item.time_entries);
    setCache(key, result, CACHE_TTL.timeEntries);
    ctx.response.body = result;
  })
  .post("/api/daily_entries", async (ctx) => {
    const authHeader = ctx.request.headers.get("Authorization")!;
    const body = await ctx.request.body().value;
    const { start_date, end_date, project_id } = body as {
      start_date: string;
      end_date: string;
      project_id: number;
    };

    const key = cacheKey(
      authHeader,
      "daily_entries",
      `${start_date}:${end_date}:${project_id}`,
    );
    const cached = getCached(key);
    if (cached !== undefined) {
      ctx.response.body = cached;
      return;
    }

    const workspaceId = await getWorkspaceId(authHeader);
    const response = await fetchWithAuth(
      `https://api.track.toggl.com/reports/api/v3/workspace/${workspaceId}/weekly/time_entries`,
      authHeader,
      "POST",
      { start_date, end_date, project_ids: [project_id] },
    );

    // deno-lint-ignore no-explicit-any
    const result = (response as any[]).flatMap((item: any) => item.seconds);
    setCache(key, result, CACHE_TTL.dailyEntries);
    ctx.response.body = result;
  })
  .post("/webhook", async (ctx) => {
    console.log(await ctx.request.body().value);
    ctx.response.status = 200;
  });

app.use(
  oakCors({
    origin:
      /^(https?:\/\/localhost:(1234|3000)|https?:\/\/(david5590\.github\.io|timebalancer\.david5590\.deno\.net|masume5590\.gitlab\.io))$/,
    optionsSuccessStatus: 200,
  }),
);

app.use(errorHandler);
app.use(router.routes());
app.use(router.allowedMethods());

console.log("Server is running on port 8000");
await app.listen({ port: 8000 });

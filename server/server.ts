import {
  Application,
  Context,
  isHttpError,
  Router,
} from "https://deno.land/x/oak/mod.ts";
import { oakCors } from "https://deno.land/x/cors/mod.ts";

const app = new Application();
const router = new Router();
const workspaces: Record<string, number> = {};

async function getWorkspaceId(authHeader: string) {
  if (workspaces[authHeader]) {
    return workspaces[authHeader];
  }

  const me = await fetchWithAuth(
    "https://api.track.toggl.com/api/v9/me",
    authHeader,
  );
  workspaces[authHeader] = me.default_workspace_id;
  return me.default_workspace_id;
}

// Simple rate limiter: ensures at least 1 second between Toggl API requests
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

  // Retry with exponential backoff for rate limiting (429) and server errors
  const maxRetries = 4;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await rateLimitedFetch(url, requestOptions);

    if (response.ok) {
      // Handle empty responses (e.g., current time entry when nothing is running)
      const text = await response.text();
      if (!text || text === "null") return null;
      try {
        return JSON.parse(text);
      } catch {
        return null;
      }
    }

    if (response.status === 429 && attempt < maxRetries) {
      // Rate limited - back off exponentially
      const backoffMs = Math.pow(2, attempt + 1) * 1000; // 2s, 4s, 8s, 16s
      console.warn(
        `Rate limited (429) on ${method} ${url}, retrying in ${backoffMs}ms (attempt ${attempt + 1}/${maxRetries})`,
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

// Paginated fetch for Toggl Reports API v3 detailed reports
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

    // We need the raw response for pagination headers, so do this manually
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
        (response.status === 429 || response.status >= 500) &&
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

    // Check for pagination headers
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
router
  .get("/api/projects", async (ctx) => {
    const authHeader = ctx.request.headers.get("Authorization")!;
    const workspaceId = await getWorkspaceId(authHeader);

    const projects = await fetchWithAuth(
      `https://api.track.toggl.com/api/v9/workspaces/${workspaceId}/projects`,
      authHeader,
    );
    ctx.response.body = projects;
  })
  .get("/api/current_time_entry", async (ctx) => {
    const authHeader = ctx.request.headers.get("Authorization")!;
    const currentTimeEntry = await fetchWithAuth(
      "https://api.track.toggl.com/api/v9/me/time_entries/current",
      authHeader,
    );
    ctx.response.body = currentTimeEntry;
  })
  .post("/api/time_entries", async (ctx) => {
    const authHeader = ctx.request.headers.get("Authorization")!;
    const workspaceId = await getWorkspaceId(authHeader);
    const body = await ctx.request.body().value;
    const { start_date, end_date, project_id } = body as {
      start_date: string;
      end_date: string;
      project_id: number;
    };

    const entries = await fetchAllTimeEntries(
      `https://api.track.toggl.com/reports/api/v3/workspace/${workspaceId}/search/time_entries`,
      authHeader,
      { start_date, end_date, project_ids: [project_id] },
    );

    // deno-lint-ignore no-explicit-any
    ctx.response.body = entries.flatMap((item: any) => item.time_entries);
  })
  .post("/api/daily_entries", async (ctx) => {
    const authHeader = ctx.request.headers.get("Authorization")!;
    const workspaceId = await getWorkspaceId(authHeader);
    const body = await ctx.request.body().value;
    const { start_date, end_date, project_id } = body as {
      start_date: string;
      end_date: string;
      project_id: number;
    };

    const response = await fetchWithAuth(
      `https://api.track.toggl.com/reports/api/v3/workspace/${workspaceId}/weekly/time_entries`,
      authHeader,
      "POST",
      { start_date, end_date, project_ids: [project_id] },
    );

    // deno-lint-ignore no-explicit-any
    ctx.response.body = (response as any[]).flatMap((item: any) =>
      item.seconds
    );
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

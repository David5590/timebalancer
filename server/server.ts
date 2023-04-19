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

async function fetchWithAuth(
  url: string,
  authHeader: string,
  method = "GET",
  body?: any,
) {
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

  const response = await fetch(url, requestOptions);
  if (!response.ok) {
    console.error(
      `Request ${method} ${url} failed: ${response.status} ${response.statusText}`,
    );
    console.error(`Body: ${JSON.stringify(body)}`);
    console.error(`auth header: ${authHeader}`);
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.json();
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
    const { start_date, end_date, project_id } = await ctx.request.body().value;

    const response = await fetchWithAuth(
      `https://api.track.toggl.com/reports/api/v3/workspace/${workspaceId}/search/time_entries`,
      authHeader,
      "POST",
      { start_date, end_date, project_ids: [project_id] },
    );

    ctx.response.body = response.flatMap((item) => item.time_entries);
  })
  .post("/api/daily_entries", async (ctx) => {
    const authHeader = ctx.request.headers.get("Authorization")!;
    const workspaceId = await getWorkspaceId(authHeader);
    const { start_date, end_date, project_id } = await ctx.request.body().value;

    const response = await fetchWithAuth(
      `https://api.track.toggl.com/reports/api/v3/workspace/${workspaceId}/weekly/time_entries`,
      authHeader,
      "POST",
      { start_date, end_date, project_ids: [project_id] },
    );

    ctx.response.body = response.flatMap((item) => item.seconds);
  })
  .post("/webhook", async (ctx) => {
    console.log(await ctx.request.body().value);
    ctx.response.status = 200;
  });

app.use(
  oakCors({
    origin:
      /^(https?:\/\/localhost:(1234|3000)|https?:\/\/masume5590\.gitlab\.io)$/,
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
  }),
);

app.use(errorHandler);
app.use(router.routes());
app.use(router.allowedMethods());

console.log("Server is running on port 8000");
await app.listen({ port: 8000 });

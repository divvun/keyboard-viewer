import { App, staticFiles } from "fresh";
import { define, type State } from "./utils.ts";

export const app = new App<State>();

// Check for GitHub token on startup
const githubToken = Deno.env.get("GITHUB_TOKEN");
if (!githubToken) {
  console.warn(
    "\n⚠️  WARNING: No GITHUB_TOKEN found in environment variables.\n" +
      "   GitHub API requests will be rate-limited (60 requests/hour).\n" +
      "   Create a .env file with GITHUB_TOKEN=your_token to increase limits.\n" +
      "   See .env.example for details.\n",
  );
} else {
  const maskedToken = `${githubToken.slice(0, 4)}...${githubToken.slice(-4)}`;
  console.log(`✓ GitHub token found (${maskedToken}) - authenticated API requests enabled`);
}

app.use(staticFiles());

// Pass a shared value from a middleware
app.use(async (ctx) => {
  ctx.state.shared = "hello";
  return await ctx.next();
});

// this is the same as the /api/:name route defined via a file. feel free to delete this!
app.get("/api2/:name", (ctx) => {
  const name = ctx.params.name;
  return new Response(
    `Hello, ${name.charAt(0).toUpperCase() + name.slice(1)}!`,
  );
});

// this can also be defined via a file. feel free to delete this!
const exampleLoggerMiddleware = define.middleware((ctx) => {
  console.log(`${ctx.req.method} ${ctx.req.url}`);
  return ctx.next();
});
app.use(exampleLoggerMiddleware);

// Include file-system based routes here
app.fsRoutes();

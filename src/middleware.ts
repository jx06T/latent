import { defineMiddleware } from "astro:middleware";

const CACHE_RULES: { pattern: RegExp; value: string }[] = [
  {
    // static content pages: change extremely rarely
    pattern: /^\/(?:about|contact|privacy|terms|copyright)$/,
    value: "public, s-maxage=86400, stale-while-revalidate=604800",
  },
  {
    // user profile pages: show live project list, must not be stale
    pattern: /^\/@[^/]+$/,
    value: "no-store",
  },
];

export const onRequest = defineMiddleware(async ({ url }, next) => {
  const response = await next();
  const rule = CACHE_RULES.find((r) => r.pattern.test(url.pathname));
  if (rule) {
    response.headers.set("Cache-Control", rule.value);
  }
  return response;
});

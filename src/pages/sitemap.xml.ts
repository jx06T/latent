import type { APIRoute } from "astro";
import { supabase } from "@/lib/supabase";

const SITE = "https://exhibit.ckefgisc.org";

const STATIC_PAGES = [
  { url: "/", priority: "1.0", changefreq: "weekly" },
  { url: "/about", priority: "0.7", changefreq: "monthly" },
  { url: "/projects", priority: "0.9", changefreq: "weekly" },
  { url: "/projects/2026", priority: "0.9", changefreq: "daily" },
  { url: "/contact", priority: "0.5", changefreq: "monthly" },

  { url: "/privacy", priority: "0.3", changefreq: "yearly" },
  { url: "/terms", priority: "0.3", changefreq: "yearly" },
  { url: "/copyright", priority: "0.3", changefreq: "yearly" },
];

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export const GET: APIRoute = async () => {
  const { data: projects } = await supabase
    .from("projects")
    .select("slug, year, updated_at, created_at, author_handle")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  const staticEntries = STATIC_PAGES.map(
    ({ url, priority, changefreq }) => `
  <url>
    <loc>${SITE}${url}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`,
  ).join("");

  const uniqueHandles = [...new Set((projects ?? []).map((p) => p.author_handle))];
  const handleEntries = uniqueHandles
    .map((handle) => {
      const loc = escapeXml(`${SITE}/@${handle}`);
      return `
  <url>
    <loc>${loc}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
    })
    .join("");

  const projectEntries = (projects ?? [])
    .map((p) => {
      const lastmod = new Date(p.updated_at ?? p.created_at)
        .toISOString()
        .split("T")[0];
      const loc = escapeXml(`${SITE}/projects/${p.year}/${p.slug}`);
      return `
  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${staticEntries}${handleEntries}${projectEntries}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
};

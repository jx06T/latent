// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';

import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import vercel from '@astrojs/vercel';
import rehypeExternalLinks from 'rehype-external-links';

// https://astro.build/config
export default defineConfig({
  site: 'https://example.com',
  integrations: [mdx(), react(), sitemap()],
  output: "server",
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: ['astro/runtime/client/dev-toolbar/entrypoint.js'],
    },
  },
  markdown: {
    rehypePlugins: [
      [
        rehypeExternalLinks,
        {
          // 自動幫所有外部連結加上屬性
          target: '_blank',
          rel: ['noopener', 'noreferrer']
        }
      ]
    ]
  },
  adapter: vercel(),
});
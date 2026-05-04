// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';

import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import rehypeExternalLinks from 'rehype-external-links';

// 引入兩種 Adapter
import netlify from '@astrojs/netlify';
import vercel from '@astrojs/vercel/serverless'; // Vercel 的 SSR Adapter

// 動態判斷部署環境
const getAdapter = () => {
  if (process.env.VERCEL) {
    console.log('🚀 偵測到 Vercel 環境，使用 @astrojs/vercel');
    return vercel();
  }
  
  if (process.env.NETLIFY) {
    console.log('🚀 偵測到 Netlify 環境，使用 @astrojs/netlify');
    return netlify();
  }

  // 本地開發或其他環境的預設值 (保留你原本的 Netlify)
  console.log('💻 本地/未識別環境，使用預設 Netlify Adapter');
  return netlify();
};

// https://astro.build/config
export default defineConfig({
  site: 'https://example.com', // 之後記得改回你真實的網域
  integrations: [mdx(), react(), sitemap()],
  output: "server", // 保持 SSR 模式
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
  adapter: getAdapter(), // 自動注入對應的 Adapter
});
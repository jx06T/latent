// @ts-check

import mdx from '@astrojs/mdx';
import react from '@astrojs/react';

import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import rehypeExternalLinks from 'rehype-external-links';

// 引入兩種 Adapter
import netlify from '@astrojs/netlify';
import vercel from '@astrojs/vercel'; 

// 動態判斷部署環境
const getAdapter = () => {
  if (process.env.VERCEL) {
    console.log('偵測到 Vercel 環境，使用 @astrojs/vercel');
    return vercel();
  }

  if (process.env.NETLIFY) {
    console.log('偵測到 Netlify 環境，使用 @astrojs/netlify');
    return netlify();
  }

  // 本地開發或其他環境的預設值
  console.log('本地/未識別環境，使用預設 Netlify Adapter');
  return netlify();
};

// https://astro.build/config
export default defineConfig({
  site: 'https://exhibit.ckefgisc.org',
  integrations: [mdx(), react()],
  output: "server", // 這裡已經宣告了 SSR 模式，Vercel Adapter 會自動配合
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      include: ['astro/runtime/client/dev-toolbar/entrypoint.js'],
    },
  },
  markdown: {
    rehypePlugins: [
      [
        rehypeExternalLinks,
        {
          target: '_blank',
          rel: ['noopener', 'noreferrer']
        }
      ]
    ]
  },
  adapter: getAdapter(),
  security: {
    checkOrigin: false, 
  },
});
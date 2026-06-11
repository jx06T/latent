// src/pages/api/stats.json.ts
import type { APIRoute } from 'astro';
import { createServiceClient } from '@/lib/supabase-server';

export const GET: APIRoute = async () => {
  try {
    // 使用你已經封裝好的 Server Client (通常帶有 Service Role Key)
    const db = createServiceClient();

    // 一次抓取所有 stats 裡面的資料
    // 我們預期會拿到類似 [{ key: 'total_views', value: 8457 }, { key: 'total_visitors', value: 1026 }]
    const { data, error } = await db
      .from('stats')
      .select('key, value');

    if (error) {
      throw new Error(`Supabase query failed: ${error.message}`);
    }

    // 將陣列格式轉換回原本前端預期的物件格式
    // 預設給個 0，避免表格如果是空的會出錯
    let total_views = 0;
    let total_visitors = 0;

    if (data) {
      for (const row of data) {
        if (row.key === 'total_views') {
          total_views = row.value;
        } else if (row.key === 'total_visitors') {
          total_visitors = row.value;
        }
      }
    }

    // 回傳乾淨的 JSON 格式
    return new Response(
      JSON.stringify({
        total_views,
        total_visitors,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          // 加上快取控制，避免每次頁面加載都去戳 Supabase 消耗配額
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('[stats GET] Failed to fetch stats from Supabase:', error);
    
    return new Response(
      JSON.stringify({ 
        total_views: 8457, 
        total_visitors: 1026 
      }),
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
};
// src/pages/api/stats.json.ts
import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const token = import.meta.env.UMAMI_API_CLIENT_TOKEN;
  const websiteId = import.meta.env.UMAMI_WEBSITE_ID;
  const apiEndpoint = import.meta.env.UMAMI_API_ENDPOINT;

  const startAt = 0;
  const endAt = Date.now();

  const url = `${apiEndpoint}/websites/${websiteId}/stats?startAt=${startAt}&endAt=${endAt}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error(`Umami API error: ${response.status}`);
    }

    const data = await response.json();

    // 直接回傳最乾淨的 JSON 格式
    return new Response(
      JSON.stringify({
        total_views: data.pageviews,
        total_visitors: data.visitors,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          // 建議加上快取控制，避免每次刷新網頁都去操 Umami API
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate',
        },
      }
    );
  } catch (error) {
    console.log(error)
    return new Response(
      JSON.stringify({ error: '無法取得統計數據' }),
      { status: 500 }
    );
  }
};
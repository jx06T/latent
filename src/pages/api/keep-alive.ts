import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  try {
    const response = await fetch(`${import.meta.env.PUBLIC_SUPABASE_URL}/rest/v1/projects?select=id&limit=1`, {
      headers: {
        apikey: import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${import.meta.env.PUBLIC_SUPABASE_ANON_KEY}`,
      },
    });

    if (!response.ok) {
      // 把 Supabase 的拒絕理由抓出來
      const errorText = await response.text(); 
      console.error("Supabase Ping Error:", response.status, errorText);
      
      return new Response(JSON.stringify({ status: "error", details: errorText }), { status: 500 });
    }

    return new Response(JSON.stringify({ status: "alive" }), { status: 200 });
    
  } catch (err) {
    // 捕捉 fetch 本身的崩潰 (例如網址是 undefined)
    console.error("Fetch Crash:", err);
    return new Response(JSON.stringify({ status: "crash" }), { status: 500 });
  }
};
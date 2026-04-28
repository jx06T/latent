import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
    const response = await fetch(`${import.meta.env.PUBLIC_SUPABASE_URL}/rest/v1/projects?select=id&limit=1`, {
        headers: {
            apikey: import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${import.meta.env.PUBLIC_SUPABASE_ANON_KEY}`,
        },
    });

    if (!response.ok) {
        return new Response(JSON.stringify({ status: "error" }), { status: 500 });
    }

    return new Response(JSON.stringify({ status: "alive" }), { status: 200 });
};
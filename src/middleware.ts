import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async (context, next) => {
    const response = await next();
    if (response.status === 403) {
        const page = await fetch(new URL("/403", context.url));
        const html = await page.text();

        return new Response(html, {
            status: 403,
            headers: { "Content-Type": "text/html" },
        });
    }

    return response;
});
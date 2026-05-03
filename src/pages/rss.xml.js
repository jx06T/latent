import rss from '@astrojs/rss';
import { supabase } from '../lib/supabase';
import { SITE_TITLE, SITE_DESCRIPTION } from '../consts';

export async function GET(context) {
	// 1. 從 Supabase 抓取已發佈的專題資料
	const { data: projects, error } = await supabase
		.from('projects')
		.select('title, description, created_at, slug, year')
		.eq('status', 'published') // 只抓已發佈的
		.order('created_at', { ascending: false })
		.limit(20); // 通常 RSS 只提供最新的 20 筆

	if (error) {
		return new Response(JSON.stringify({ error: error.message }), { status: 500 });
	}

	// 2. 生成 RSS XML
	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: context.site,
		items: projects.map((project) => ({
			title: project.title,
			pubDate: new Date(project.created_at),
			description: project.description,
			// 根據你的路由結構生成連結
			link: `/projects/${project.year}/${project.slug}/`,
		})),
	});
}
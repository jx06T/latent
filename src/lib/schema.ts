import { z } from 'zod';

export const ProjectSchema = z.object({
  id: z.string().uuid(),
  created_at: z.string(),
  year: z.number().int(),
  slug: z.string(),

  title: z.string(),
  subtitle: z.string().nullable().optional(),
  author_handle: z.string(),
  author_id: z.string().uuid().nullable().optional(),

  description: z.string().nullable().optional(),
  content: z.string().nullable().optional(), // Markdown 正文

  // category_main: z.number().int(),
  category_main: z.number().int().transform((val): CategoryId => {
    return (val in CATEGORIES ? val : 0) as CategoryId;
  }),

  category_sub: z.array(z.number()).default([]), // 子分類 ID 陣列
  keywords: z.array(z.string()).default([]),
  tech_stack: z.array(z.string()).default([]),

  links: z.record(z.string(), z.string().nullable().optional()).default({}), //存 demo, github 等

  cover_image: z.string().url().nullable().optional(),
  screenshots: z.array(z.string().url()).default([]),
  poster_url: z.string().url().nullable().optional(),

  status: z.enum(['pending', 'published', 'rejected']).default('pending'),
  like_count: z.number().int().default(0),
});

export type Project = z.infer<typeof ProjectSchema>;

// 分類定義（建議放在這裡方便全站引用）
export const CATEGORIES = {
  0: "未分類",
  1: "人工智慧",
  2: "系統與網站開發",
  3: "互動與遊戲",
  4: "資料分析與視覺化",
  5: "工具與自動化",
  6: "硬體"
} as const;

type CategoryId = keyof typeof CATEGORIES;

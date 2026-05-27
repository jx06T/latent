import { z } from 'zod';

export const ProjectSchema = z.object({
  id: z.string().uuid(),
  created_at: z.string(),
  updated_at: z.string().nullable().optional(),
  first_published_at: z.string().nullable().optional(),
  year: z.number().int(),
  slug: z.string(),

  title: z.string(),
  subtitle: z.string().nullable().optional().transform(v => v ?? ""),
  author_handle: z.string(),
  author_id: z.string().uuid(),

  description: z.string().nullable().optional().transform(v => v ?? ""),
  content: z.string().nullable().optional(),

  category_main: z.number().int().transform((val): CategoryId => {
    return (val in CATEGORIES ? val : 0) as CategoryId;
  }),

  category_sub: z.array(z.number()).nullable().transform(v => v ?? []),
  keywords: z.array(z.string()).nullable().transform(v => v ?? []),
  tech_stack: z.array(z.string()).nullable().transform(v => v ?? []),

  links: z.record(z.string(), z.string().nullable().optional()).nullable().transform(v => v ?? {}),

  cover_image_id: z.uuid().nullable().optional(),
  poster_url: z.url().nullable().optional().catch(null),

  status: z.enum(['draft', 'published', 'processing']).default('draft'),

  like_count: z.number().int().default(0),
  comment_count: z.number().int().default(0),

  is_official: z.boolean().default(false),
  is_exhibition: z.boolean().default(false),
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

export type CategoryId = keyof typeof CATEGORIES;

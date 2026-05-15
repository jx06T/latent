export const SURVEY_QUESTIONS = [
  {
    id: 'age_group' as const,
    label: '年齡區間',
    options: ['15 歲以下', '15–17 歲', '18–20 歲', '21–23 歲', '24 歲以上'] as const,
  },
  {
    id: 'referral_source' as const,
    label: '你從哪裡知道 Latent？',
    options: ['社群媒體', '朋友介紹', '社團公告', '學校課程', '其他'] as const,
  },
  {
    id: 'gender' as const,
    label: '性別',
    options: ['男', '女', '不願透漏'] as const,
  },
  {
    id: 'exhibition_plan' as const,
    label: '是否有計畫參與實體展覽？',
    options: ['是', '否 — 交通不便', '否 — 另有安排', '否 — 吸引力不夠'] as const,
  },
] as const

export type QuestionId = (typeof SURVEY_QUESTIONS)[number]['id']
export type SurveyAnswers = Partial<Record<QuestionId, string>>

export const QUESTION_COUNT = SURVEY_QUESTIONS.length
export const TOTAL_STEPS = QUESTION_COUNT + 1

export const SURVEY_DONE_KEY = 'latent:survey:done'

import { useState } from 'react'
import { CATEGORIES } from '@/lib/schema'
import { isValidSlug, toSlugSuggestion } from '@/lib/slug'
import type { CategoryId } from '@/lib/schema'

export interface FormState {
  title: string
  subtitle: string
  slug: string
  description: string
  content: string
  category_main: number
  category_sub: number[]
  keywords: string[]
  tech_stack: string[]
  links: Record<string, string>
  cover_image_id: string | null
}

interface Props {
  data: FormState
  onChange: <K extends keyof FormState>(field: K, value: FormState[K]) => void
  isSlugLocked: boolean
  slugError: string | null
}

const inputCls =
  'w-full bg-bg-surface border border-line text-ink font-mono text-xs px-2.5 py-1.5 outline-none focus:border-line-active placeholder:text-ink-disabled disabled:opacity-50 disabled:cursor-not-allowed'

const labelCls = 'block text-[10px] uppercase tracking-wider text-ink-muted mb-1 font-mono'

const LINK_KEYS = ['demo', 'github', 'report', 'slides']

export default function MetadataForm({ data, onChange, isSlugLocked, slugError }: Props) {
  const [slugTouched, setSlugTouched] = useState(false)

  const handleTitleChange = (title: string) => {
    onChange('title', title)
    if (!slugTouched && !isSlugLocked) {
      const suggestion = toSlugSuggestion(title)
      if (suggestion) onChange('slug', suggestion)
    }
  }

  const handleSlugChange = (slug: string) => {
    setSlugTouched(true)
    onChange('slug', slug.toLowerCase())
  }

  const handleTagInput = (field: 'keywords' | 'tech_stack', raw: string) => {
    const tags = raw.split(',').map(s => s.trim()).filter(Boolean)
    onChange(field, tags)
  }

  const handleSubCategoryToggle = (id: number) => {
    const current = data.category_sub
    const next = current.includes(id) ? current.filter(x => x !== id) : [...current, id]
    onChange('category_sub', next)
  }

  const handleLinkChange = (key: string, val: string) => {
    onChange('links', { ...data.links, [key]: val })
  }

  const slugValid = !data.slug || isValidSlug(data.slug)

  return (
    <div className="p-4 space-y-4 font-mono">
      {/* ── Row 1: Title + Subtitle ── */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Title *</label>
          <input
            className={inputCls}
            value={data.title}
            onChange={e => handleTitleChange(e.target.value)}
            placeholder="Project title"
          />
        </div>
        <div>
          <label className={labelCls}>Subtitle</label>
          <input
            className={inputCls}
            value={data.subtitle}
            onChange={e => onChange('subtitle', e.target.value)}
            placeholder="Optional subtitle"
          />
        </div>
      </div>

      {/* ── Row 2: Slug ── */}
      <div>
        <label className={labelCls}>
          Slug *
          {isSlugLocked && <span className="ml-2 text-danger/70">🔒 locked after publish</span>}
        </label>
        <input
          className={`${inputCls} ${(!slugValid || slugError) ? 'border-danger' : ''}`}
          value={data.slug}
          onChange={e => handleSlugChange(e.target.value)}
          disabled={isSlugLocked}
          placeholder="my-project-slug"
          spellCheck={false}
        />
        {slugError && (
          <p className="text-[10px] text-danger mt-0.5">{slugError}</p>
        )}
        {!slugError && !slugValid && data.slug && (
          <p className="text-[10px] text-warning mt-0.5">
            3-60 chars, lowercase letters, numbers and hyphens only
          </p>
        )}
        <p className="text-[9px] text-ink-disabled mt-0.5">
          URL: /projects/2026/{data.slug || '…'}
        </p>
      </div>

      {/* ── Row 3: Description ── */}
      <div>
        <label className={labelCls}>Description</label>
        <textarea
          className={`${inputCls} resize-none`}
          rows={2}
          value={data.description}
          onChange={e => onChange('description', e.target.value)}
          placeholder="Short description (shown in project cards)"
        />
      </div>

      {/* ── Row 4: Category ── */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Main Category</label>
          <select
            className={`${inputCls} cursor-pointer`}
            value={data.category_main}
            onChange={e => onChange('category_main', Number(e.target.value))}
          >
            {Object.entries(CATEGORIES).map(([id, label]) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Sub-categories</label>
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {Object.entries(CATEGORIES)
              .filter(([id]) => Number(id) !== 0)
              .map(([id, label]) => {
                const numId = Number(id) as CategoryId
                const active = data.category_sub.includes(numId)
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleSubCategoryToggle(numId)}
                    className={`text-[9px] px-1.5 py-0.5 border transition-colors ${active
                      ? 'border-accent-500 text-accent-500 bg-accent-500/10'
                      : 'border-line text-ink-disabled hover:border-line-active hover:text-ink-muted'
                      }`}
                  >
                    {label}
                  </button>
                )
              })}
          </div>
        </div>
      </div>

      {/* ── Row 5: Keywords + Tech Stack ── */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Keywords</label>
          <input
            className={inputCls}
            value={data.keywords.join(', ')}
            onChange={e => handleTagInput('keywords', e.target.value)}
            placeholder="ai, web, design (comma-separated)"
          />
        </div>
        <div>
          <label className={labelCls}>Tech Stack</label>
          <input
            className={inputCls}
            value={data.tech_stack.join(', ')}
            onChange={e => handleTagInput('tech_stack', e.target.value)}
            placeholder="React, TypeScript (comma-separated)"
          />
        </div>
      </div>

      {/* ── Row 6: Links ── */}
      <details className="group">
        <summary className="cursor-pointer text-[10px] uppercase tracking-wider text-ink-muted select-none hover:text-ink transition-colors">
          Links ▾
        </summary>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {LINK_KEYS.map(key => (
            <div key={key}>
              <label className={labelCls}>{key}</label>
              <input
                className={inputCls}
                value={data.links[key] ?? ''}
                onChange={e => handleLinkChange(key, e.target.value)}
                placeholder={key === 'demo' ? 'https://…' : key === 'github' ? 'https://github.com/…' : ''}
                type="url"
              />
            </div>
          ))}
        </div>
      </details>
    </div>
  )
}

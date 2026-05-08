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
  disabled?: boolean
}

const LINK_KEYS = ['demo', 'github', 'report', 'slides']

const field =
  'w-full bg-bg-surface border border-line text-ink font-mono text-xs px-2.5 py-1.5 outline-none focus:border-line-active placeholder:text-ink-disabled disabled:opacity-50 disabled:cursor-not-allowed transition-colors'

const label = 'block text-xs uppercase tracking-wider text-ink-dim mb-1 font-mono select-none'

export default function MetadataForm({ data, onChange, isSlugLocked, slugError, disabled }: Props) {
  const [slugTouched, setSlugTouched] = useState(false)

  // ── Slug auto-suggest ──────────────────────────────────────────────────
  const handleTitleChange = (v: string) => {
    onChange('title', v)
    if (!slugTouched && !isSlugLocked) {
      const s = toSlugSuggestion(v)
      if (s) onChange('slug', s)
    }
  }

  const handleSlugChange = (v: string) => {
    setSlugTouched(true)
    onChange('slug', v.toLowerCase())
  }

  // ── Tag helpers ────────────────────────────────────────────────────────
  const handleTagInput = (f: 'keywords' | 'tech_stack', raw: string) =>
    onChange(f, raw.split(',').map(s => s.trim()).filter(Boolean))

  const toggleSubCat = (id: number) => {
    const next = data.category_sub.includes(id)
      ? data.category_sub.filter(x => x !== id)
      : [...data.category_sub, id]
    onChange('category_sub', next)
  }

  const slugValid = !data.slug || isValidSlug(data.slug)

  return (
    <div className="font-mono px-5 py-4 space-y-5">

      {/* ── A: 標題 ──────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <input
          className="w-full bg-transparent text-ink text-xl font-mono outline-none placeholder:text-ink-disabled border-b border-transparent focus:border-line pb-0.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          value={data.title}
          onChange={e => handleTitleChange(e.target.value)}
          placeholder="Project title"
          disabled={disabled}
        />
        <input
          className="w-full bg-transparent text-ink-muted text-sm font-mono outline-none placeholder:text-ink-disabled border-b border-transparent focus:border-line pb-0.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          value={data.subtitle}
          onChange={e => onChange('subtitle', e.target.value)}
          placeholder="Subtitle (optional)"
          disabled={disabled}
        />
      </div>

      {/* ── B: Slug + 主分類 ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 items-start">
        <div>
          <label className={label}>
            Slug{isSlugLocked && <span className="ml-1.5 text-danger/70">[published]</span>}
          </label>
          <input
            className={`${field} ${(!slugValid || slugError) ? 'border-danger focus:border-danger' : ''}`}
            value={data.slug}
            onChange={e => handleSlugChange(e.target.value)}
            disabled={isSlugLocked || disabled}
            placeholder="my-project-slug"
            spellCheck={false}
          />
          {slugError
            ? <p className="text-xs text-danger mt-0.5">{slugError}</p>
            : !slugValid && data.slug
              ? <p className="text-xs text-warning mt-0.5">3–60 chars · a–z 0–9 hyphens</p>
              : <p className="text-xs text-ink-ddim mt-0.5">/projects/2026/{data.slug || '…'}</p>
          }
        </div>

        <div>
          <label className={label}>Category</label>
          <select
            className={`${field} cursor-pointer`}
            value={data.category_main}
            onChange={e => onChange('category_main', Number(e.target.value))}
            disabled={disabled}
          >
            {Object.entries(CATEGORIES).map(([id, lbl]) => (
              <option key={id} value={id}>{lbl}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── C: 描述 ──────────────────────────────────────────────────── */}
      <div>
        <label className={label}>Description</label>
        <textarea
          className={`${field} resize-y min-h-[80px] placeholder:text-ink-disabled `}
          rows={4}
          value={data.description}
          onChange={e => onChange('description', e.target.value)}
          placeholder="A brief description shown on project cards and the overview section…"
          disabled={disabled}
        />
      </div>

      {/* ── D: 標籤 (折疊) ───────────────────────────────────────────── */}
      <details open>
        <summary className="cursor-pointer text-xs uppercase tracking-wider text-ink-muted hover:text-ink transition-colors select-none">
          Tags &amp; Classification
        </summary>
        <div className="mt-3 space-y-3">
          <div>
            <label className={label}>Sub-categories</label>
            <div className="flex flex-wrap gap-1">
              {Object.entries(CATEGORIES)
                .filter(([id]) => Number(id) !== 0)
                .map(([id, lbl]) => {
                  const nid = Number(id) as CategoryId
                  const active = data.category_sub.includes(nid)
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggleSubCat(nid)}
                      className={`text-xs px-1.5 py-0.5 border transition-colors ${
                        active
                          ? 'border-accent-500 text-accent-500 bg-accent-500/10'
                          : 'border-line text-ink-muted hover:border-line-active hover:text-ink'
                      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={disabled}
                    >
                      {lbl}
                    </button>
                  )
                })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Keywords [Comma-separated]</label>
              <input
                className={field}
                value={data.keywords.join(', ')}
                onChange={e => handleTagInput('keywords', e.target.value)}
                placeholder="ai, design, interactive"
                disabled={disabled}
              />
            </div>
            <div>
              <label className={label}>Tech Stack</label>
              <input
                className={field}
                value={data.tech_stack.join(', ')}
                onChange={e => handleTagInput('tech_stack', e.target.value)}
                placeholder="React, Python, Three.js"
                disabled={disabled}
              />
            </div>
          </div>
        </div>
      </details>

      {/* ── E: 連結 (折疊) ───────────────────────────────────────────── */}
      <details>
        <summary className="cursor-pointer text-xs uppercase tracking-wider text-ink-muted hover:text-ink transition-colors select-none">
          Links
        </summary>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {LINK_KEYS.map(key => (
            <div key={key}>
              <label className={label}>{key}</label>
              <input
                className={field}
                value={data.links[key] ?? ''}
                onChange={e => onChange('links', { ...data.links, [key]: e.target.value })}
                placeholder={key === 'demo' ? 'https://…' : key === 'github' ? 'github.com/…' : ''}
                type="url"
                disabled={disabled}
              />
            </div>
          ))}
        </div>
      </details>

    </div>
  )
}

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { isValidSlug, toSlugSuggestion } from '@/lib/slug'
import { Button } from '@/components/ui/Button'
import { CATEGORIES } from '@/lib/schema'

const CURRENT_YEAR = 2026

interface Props {
  userId: string
  userHandle: string
  onCreated: (projectId: string) => void
  onClose: () => void
}

const inputCls =
  'w-full bg-bg-surface border border-line text-ink font-mono text-xs px-2.5 py-1.5 outline-none focus:border-line-active placeholder:text-ink-disabled'
const labelCls = 'block text-[10px] uppercase tracking-wider text-ink-muted mb-1 font-mono'

export default function NewProjectModal({ userId, userHandle, onCreated, onClose }: Props) {
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [category, setCategory] = useState(0)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-suggest slug from title when not manually edited
  useEffect(() => {
    if (!slugTouched) {
      const suggestion = toSlugSuggestion(title)
      setSlug(suggestion)
    }
  }, [title, slugTouched])

  const handleSlugChange = (raw: string) => {
    setSlugTouched(true)
    setSlug(raw.toLowerCase())
  }

  const slugValid = isValidSlug(slug)

  const handleCreate = async () => {
    setError(null)
    if (!slugValid) {
      setError('Invalid slug: 3-60 chars, lowercase letters/numbers/hyphens, no leading/trailing/double hyphens')
      return
    }
    if (!title.trim()) {
      setError('Title is required')
      return
    }

    setIsCreating(true)
    const { data, error: dbErr } = await supabase
      .from('projects')
      .insert({
        title: title.trim(),
        slug,
        author_id: userId,
        author_handle: userHandle,
        category_main: category,
        year: CURRENT_YEAR,
      })
      .select('id')
      .single()

    if (dbErr || !data) {
      setError(dbErr?.message ?? 'Failed to create project')
      setIsCreating(false)
      return
    }

    onCreated(data.id)
  }

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 backdrop-blur-sm">
      <div
        className="bg-bg-elevated border border-line w-full max-w-md mx-4 font-mono"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-line">
          <span className="text-xs uppercase tracking-widest text-ink">New Project</span>
          <button
            onClick={onClose}
            className="text-ink-muted hover:text-ink transition-colors text-sm"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          {/* Title */}
          <div>
            <label className={labelCls}>Title *</label>
            <input
              className={inputCls}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="My awesome project"
              autoFocus
            />
          </div>

          {/* Slug */}
          <div>
            <label className={labelCls}>Slug * (URL identifier)</label>
            <input
              className={`${inputCls} ${slug && !slugValid ? 'border-danger' : ''}`}
              value={slug}
              onChange={e => handleSlugChange(e.target.value)}
              placeholder="my-awesome-project"
              spellCheck={false}
            />
            {slug && !slugValid && (
              <p className="text-[9px] text-danger mt-0.5">
                3-60 chars · lowercase letters, numbers, hyphens only
              </p>
            )}
            <p className="text-[9px] text-ink-disabled mt-0.5">
              /projects/{CURRENT_YEAR}/{slug || '…'}
            </p>
          </div>

          {/* Category */}
          <div>
            <label className={labelCls}>Category</label>
            <select
              className={`${inputCls} cursor-pointer`}
              value={category}
              onChange={e => setCategory(Number(e.target.value))}
            >
              {Object.entries(CATEGORIES).map(([id, label]) => (
                <option key={id} value={id}>{label}</option>
              ))}
            </select>
          </div>

          {/* Error */}
          {error && (
            <p className="text-[10px] text-danger border border-danger/30 px-2 py-1.5 bg-danger-ghost">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-line">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={handleCreate}
            disabled={isCreating || !title.trim() || !slugValid}
          >
            {isCreating ? 'Creating…' : 'Create →'}
          </Button>
        </div>
      </div>
    </div>
  )
}

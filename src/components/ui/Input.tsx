import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

export type InputVariant = 'default' | 'terminal' | 'underline'
export type InputSize    = 'sm' | 'md'
export type InputAs      = 'input' | 'textarea' | 'select'

// ─── Style constants ──────────────────────────────────────────────────────────

const sizes: Record<InputSize, string> = {
  sm: 'px-2.5 py-1.5 text-sm',
  md: 'px-3 py-2 text-base',
}

const defaultBase =
  'w-full bg-bg-surface border border-line text-ink font-mono outline-none focus:border-line-active placeholder:text-ink-disabled disabled:opacity-50 disabled:cursor-not-allowed transition-colors'

const underlineBase =
  'w-full bg-transparent font-mono outline-none border-b border-transparent focus:border-line placeholder:text-ink-disabled disabled:opacity-50 disabled:cursor-not-allowed transition-colors pb-0.5'

const terminalWrap =
  'terminal-input group flex gap-3 bg-bg-surface border border-line p-3 transition-all duration-300 focus-within:border-primary-500 focus-within:shadow-primary-sm'
const terminalPrompt = 'font-mono text-primary-500 select-none shrink-0'
const terminalField  =
  'bg-transparent border-none outline-none text-ink w-full font-mono placeholder:text-ink-disabled resize-none text-base'

// ─── Props ────────────────────────────────────────────────────────────────────
// Index signature allows all native HTML input/textarea/select attributes to
// pass through without fighting TypeScript's conflicting 'size' attribute types.

export interface InputProps {
  variant?:         InputVariant
  size?:            InputSize
  as?:              InputAs
  className?:       string
  /** Applied to the wrapper div in terminal variant */
  wrapperClassName?: string
  children?:        ReactNode
  [key: string]:    unknown
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Input({
  variant = 'default',
  size = 'sm',
  as = 'input',
  wrapperClassName,
  className,
  children,
  ...rest
}: InputProps) {

  // ── terminal ────────────────────────────────────────────────────────────
  if (variant === 'terminal') {
    return (
      <div className={cn(terminalWrap, wrapperClassName)}>
        <div className={terminalPrompt}>
          <span>&gt;</span>
          <span className="animate-cursor">_</span>
        </div>
        {as === 'textarea'
          ? <textarea className={cn(terminalField, className)} {...(rest as any)} />
          : <input    className={cn(terminalField, className)} {...(rest as any)} />
        }
      </div>
    )
  }

  // ── underline ───────────────────────────────────────────────────────────
  if (variant === 'underline') {
    if (as === 'textarea') {
      return <textarea className={cn(underlineBase, className)} {...(rest as any)} />
    }
    return <input className={cn(underlineBase, className)} {...(rest as any)} />
  }

  // ── default ─────────────────────────────────────────────────────────────
  if (as === 'textarea') {
    return (
      <textarea
        className={cn(defaultBase, sizes[size], className)}
        {...(rest as any)}
      />
    )
  }
  if (as === 'select') {
    return (
      <select
        className={cn(defaultBase, sizes[size], 'cursor-pointer leading-tight', className)}
        {...(rest as any)}
      >
        {children}
      </select>
    )
  }
  return (
    <input
      className={cn(defaultBase, sizes[size], className)}
      {...(rest as any)}
    />
  )
}

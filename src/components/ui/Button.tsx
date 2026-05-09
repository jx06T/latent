import { cn } from '@/lib/utils'
import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'plain'
export type ButtonSize   = 'xs' | 'sm' | 'md' | 'lg'

// Sizes — xs: tiny tags, sm: editor default (backward compat), md: form/modal, lg: landing page CTA
const sizes: Record<ButtonSize, string> = {
  xs: 'px-1.5 py-0.5 text-[10px] tracking-wider',
  sm: 'px-2.5 py-1.5   text-xs tracking-wider',
  md: 'px-3.5 py-2   text-sm     tracking-widest',
  lg: 'px-3.5 py-2   text-lg     tracking-widest',
}

const decoratedBase =
  'inline-flex items-center justify-center gap-1.5 border font-mono uppercase transition-colors duration-150 cursor-pointer disabled:opacity-40 disabled:pointer-events-none'

const plainBase =
  'inline-flex items-center cursor-pointer font-mono text-sm transition-colors duration-150 text-ink-dim hover:text-ink disabled:opacity-40 disabled:pointer-events-none'

const variantStyles: Record<Exclude<ButtonVariant, 'plain'>, string> = {
  primary:   'bg-accent-500 text-bg border-accent-500 hover:bg-accent-400',
  secondary: 'bg-bg-elevated text-ink border-line-strong hover:border-line-active',
  outline:   'text-ink-muted border-line hover:border-line-active hover:text-ink',
  danger:    'text-danger border-danger/40 hover:bg-danger-ghost',
  ghost:     'text-ink-muted border-transparent hover:text-ink',
}

// Active-state overrides for toggle buttons (outline is the primary use case)
const activeStyles: Partial<Record<ButtonVariant, string>> = {
  outline:   'border-accent-500 text-accent-500 bg-accent-500/10 hover:border-accent-500 hover:text-accent-500',
  secondary: 'border-line-active',
  ghost:     'text-ink',
}

function BracketWrap({ children }: { children: ReactNode }) {
  return (
    <>
      <span className="mr-1.5 opacity-70 group-hover:opacity-100 group-hover:-translate-x-0.5 transition-transform" aria-hidden="true">[</span>
      <span>{children}</span>
      <span className="ml-1.5 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-transform" aria-hidden="true">]</span>
    </>
  )
}

// ─── Button ───────────────────────────────────────────────────────────────────

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Render [ ] brackets with hover animation — used for landing page CTA buttons */
  bracket?: boolean
  /** Toggle-button selected state — overrides colour for outline/secondary/ghost */
  active?: boolean
  children: ReactNode
}

export function Button({
  variant = 'outline',
  size = 'sm',
  bracket,
  active,
  children,
  className,
  ...rest
}: BtnProps) {
  if (variant === 'plain') {
    return <button className={cn(plainBase, className)} {...rest}>{children}</button>
  }
  return (
    <button
      className={cn(
        decoratedBase,
        sizes[size],
        variantStyles[variant],
        active && activeStyles[variant],
        bracket && 'group btn-bracket',
        className,
      )}
      {...rest}
    >
      {bracket ? <BracketWrap>{children}</BracketWrap> : children}
    </button>
  )
}

// ─── LinkButton ───────────────────────────────────────────────────────────────

interface LinkBtnProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  bracket?: boolean
  active?: boolean
  children: ReactNode
}

export function LinkButton({
  variant = 'outline',
  size = 'sm',
  bracket,
  active,
  children,
  className,
  ...rest
}: LinkBtnProps) {
  if (variant === 'plain') {
    return <a className={cn(plainBase, className)} {...rest}>{children}</a>
  }
  return (
    <a
      className={cn(
        decoratedBase,
        sizes[size],
        variantStyles[variant],
        active && activeStyles[variant],
        bracket && 'group btn-bracket',
        className,
      )}
      {...rest}
    >
      {bracket ? <BracketWrap>{children}</BracketWrap> : children}
    </a>
  )
}

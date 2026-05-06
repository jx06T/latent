import { cn } from '@/lib/utils'
import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost'

const base =
  'inline-flex items-center justify-center gap-1.5 border font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 transition-colors duration-150 cursor-pointer disabled:opacity-40 disabled:pointer-events-none'

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-accent-500 text-bg border-accent-500 hover:bg-accent-400',
  secondary: 'bg-bg-elevated text-ink border-line-strong hover:border-line-active',
  outline: 'text-ink-muted border-line hover:border-line-active hover:text-ink',
  danger: 'text-danger border-danger/40 hover:bg-danger-ghost',
  ghost: 'text-ink-muted border-transparent hover:text-ink',
}

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  children: ReactNode
}

export function Button({ variant = 'outline', children, className, ...rest }: BtnProps) {
  return (
    <button className={cn(base, variants[variant], className)} {...rest}>
      {children}
    </button>
  )
}

interface LinkBtnProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: ButtonVariant
  children: ReactNode
}

export function LinkButton({ variant = 'outline', children, className, ...rest }: LinkBtnProps) {
  return (
    <a className={cn(base, variants[variant], className)} {...rest}>
      {children}
    </a>
  )
}

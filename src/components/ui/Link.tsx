import { ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AnchorHTMLAttributes } from 'react'

interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  text?: string
  href: string
  showIcon?: boolean
  isExternal?: boolean
  underLine?: boolean
}

export default function Link({
  text,
  href,
  showIcon,
  isExternal,
  underLine = true,
  className,
  children,
  ...rest
}: LinkProps) {
  const externalProps = isExternal
    ? { target: '_blank', rel: 'noopener noreferrer' }
    : {}

  return (
    <a
      className={cn(
        'inline-block cursor-pointer items-center text-primary-400 hover:text-accent-400 transition-colors duration-200 group mx-0.5',
        className,
      )}
      href={href}
      {...rest}
      {...externalProps}
    >
      <span className={cn(underLine && 'underline underline-offset-3', 'inline-block')}>
        {text ?? children}
      </span>
      {showIcon && <ArrowUpRight className="inline-block -ml-0.5" />}
    </a>
  )
}

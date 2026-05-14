import { cn } from '@/lib/utils'

interface Props {
  text: string
  className?: string
}

export default function CommentLabel({ text, className }: Props) {
  return (
    <div className={cn('font-mono text-base uppercase text-ink-dim/90 mb-2 tracking-tighter', className)}>
      // {text}
    </div>
  )
}

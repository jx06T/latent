import { ArrowUpRight } from 'lucide-react'
import CommentLabel from '@/components/ui/CommentLabel'
import Link from '../ui/Link'
import { CATEGORIES } from '@/lib/schema'
import type { CategoryId } from '@/lib/schema'

export interface ProjectCardProps {
  slug: string
  year: number
  title: string
  subtitle?: string | null
  author_handle: string
  category_main: number
  cover_image?: string | null
  tech_stack: string[]
  like_count: number
}

export default function ProjectCard({
  slug, year, title, subtitle, author_handle,
  category_main, cover_image, tech_stack, like_count,
}: ProjectCardProps) {
  const categoryLabel = CATEGORIES[category_main as CategoryId] ?? CATEGORIES[0]

  return (
    <article className="group flex flex-col bg-bg-surface border border-line hover:border-line-active transition-colors duration-300 hover:shadow-primary-sm relative">
      {/* Cover image */}
      <div className="w-full aspect-video bg-bg-elevated overflow-hidden border-b border-line block" aria-hidden="true">
        {cover_image ? (
          <img
            loading="lazy" src={cover_image} alt=""
            className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
          />
        ) : (
          <div className="w-full h-full p-[10%] group-hover:scale-105 transition-all duration-500">
            <div className="w-full h-full border-dashed-cyber flex items-center justify-center">
              <span className="text-center font-mono text-xs text-ink-ddim">// NO_COVER_SIGNAL</span>
            </div>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="p-2 w-full pt-1">
        <div className="flex flex-col flex-1 p-2">
          <Link showIcon className="text-ink text-xl hover:text-accent-500" href={`/projects/${year}/${slug}`}>
            {title}
          </Link>
          <CommentLabel text={subtitle ?? 'NO_SUBTITLE'} />

          <div className="flex flex-wrap gap-1.5 mt-2">
            {tech_stack.slice(0, 3).map((t) => (
              <span key={t} className="inline-block px-2 py-0.5 pt-1 text-xs border text-ink-dim hover:border-solid-cyber transition-colors">
                {t}
              </span>
            ))}
            {tech_stack.length > 3 && (
              <span className="inline-block px-2 py-0.5 pt-1 text-xs border text-ink-dim">
                +{tech_stack.length - 3}
              </span>
            )}
          </div>
        </div>

        <span className="inline-block px-2 py-0.5 pt-1 text-sm w-full mt-3 bg-accent-500 text-bg shadow-accent-sm">
          <span className="text-[10px] inline-block mr-1">■</span>{categoryLabel}
        </span>
      </div>

      {/* Card footer */}
      <footer className="flex justify-between items-center px-4 py-2.5 border-t border-line font-mono text-xs text-ink-dim">
        <Link href={`/@${author_handle}`} className="text-ink-dim">
          @{author_handle}
        </Link>
        <span className="text-accent-500">♦ {like_count}</span>
      </footer>

      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 border-t-2 border-r-2 border-accent-500 opacity-0 group-hover:opacity-100 transition-opacity duration-700" aria-hidden="true" />
      <span className="absolute -bottom-0.5 -left-0.5 w-4 h-4 border-b-2 border-l-2 border-accent-500 opacity-0 group-hover:opacity-100 transition-opacity duration-700" aria-hidden="true" />
    </article>
  )
}

import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { supabase } from '@/lib/supabase'
import { publishedUrl, toCdnUrl, draftKey } from '@/lib/image-paths'
import ProjectCard, { type ProjectCardProps } from '@/components/modules/ProjectCard'
import { LinkButton } from '@/components/ui/Button'
import ScrambleText from '@/components/ui/ScrambleText'
import CommentLabel from '../ui/CommentLabel'


gsap.registerPlugin(ScrollTrigger)

function getCoverUrl(img: any): string | null {
  if (!img) return null
  try {
    if (img.status === 'published' && img.published_ext && img.available_sizes?.length)
      return publishedUrl(img, 'md')
    if (img.status === 'draft' && img.source_ext)
      return toCdnUrl(draftKey(img.project_id, img.id, img.source_ext))
  } catch { /* ignore */ }
  return null
}

export default function TopProjects() {
  const [projects, setProjects] = useState<ProjectCardProps[]>([])
  const [loading, setLoading] = useState(true)
  const sectionRef = useRef<HTMLElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase
      .from('projects')
      .select(`
        slug, year, title, subtitle, category_main, like_count, tech_stack, author_handle,
        cover_image:project_images!projects_cover_image_id_fkey(id, project_id, status, published_ext, available_sizes, source_ext)
      `)
      .eq('status', 'published')
      .order('like_count', { ascending: false })
      .limit(3)
      .then(({ data }) => {
        const mapped: ProjectCardProps[] = (data ?? []).map((p: any) => ({
          slug: p.slug,
          year: p.year ?? 2026,
          title: p.title,
          subtitle: p.subtitle ?? null,
          author_handle: p.author_handle ?? 'unknown',
          category_main: p.category_main,
          cover_image: getCoverUrl(p.cover_image),
          tech_stack: (p.tech_stack as string[] | null) ?? [],
          like_count: p.like_count ?? 0,
        }))
        setProjects(mapped)
        setLoading(false)
      })
  }, [])

  // GSAP — fires after projects are rendered
  useEffect(() => {
    if (!projects.length) return
    const section = sectionRef.current
    if (!section) return

    const ctx = gsap.context(() => {
      const controllers = section.querySelectorAll<HTMLElement>('.card-gsap-controller')
      if (controllers.length < 3) return

      const mm = gsap.matchMedia()
      mm.add(
        { isDesktop: '(min-width: 768px)', isMobile: '(max-width: 767px)' },
        (context) => {
          const { isDesktop } = context.conditions as { isDesktop: boolean }
          const spreadAmount = isDesktop
            ? Math.min(window.innerWidth * 0.28, 340)
            : window.innerWidth * 0.1

          gsap.set(controllers[0], { x: 0, xPercent: -55, yPercent: -50, rotation: -4 })
          gsap.set(controllers[1], { x: 0, xPercent: -50, yPercent: -56, rotation: 0 })
          gsap.set(controllers[2], { x: 0, xPercent: -45, yPercent: -50, rotation: 4 })

          const finalRotations = [-8, 0, 8]
          controllers.forEach((card, i) => {
            gsap.to(card, {
              x: (i - 1) * spreadAmount,
              y: isDesktop ? 0 : i === 1 ? -40 : i === 2 ? 40 : 120,
              rotation: finalRotations[i],
              ease: 'power2.out',
              scrollTrigger: {
                trigger: section,
                start: 'top 75%',
                end: 'center center',
                scrub: true,
                invalidateOnRefresh: true,
              },
            })
          })

          if (!isDesktop) {
            const container = containerRef.current
            const zStages = [[1, 3, 2], [1, 2, 3], [3, 2, 1]] as const
            ScrollTrigger.create({
              trigger: container,
              start: 'top 55%',
              end: 'top -10%',
              onUpdate(self) {
                const stage = self.progress < 0.5 ? 0 : self.progress < 0.95 ? 1 : 2
                controllers.forEach((card, i) => {
                  card.style.zIndex = String(zStages[stage][i])
                })
              },
            })
          }
        },
      )
    }, section)

    return () => ctx.revert()
  }, [projects])

  return (
    <section
      id="top-projects"
      ref={sectionRef}
      className="py-24 overflow-hidden bg-bg border-t border-line"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="mb-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-ink text-glow-primary mt-2 font-mono">
            <ScrambleText text="[ TOP_PROJECTS ]" />
          </h2>
          <div className="font-mono text-base uppercase text-ink-dim/90 mb-2 tracking-tighter">
            <CommentLabel text="本屆最受矚目的三件專題" />
          </div>
        </div>

        <div ref={containerRef} id="cards-container" className="relative w-full h-145 md:h-120">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="font-mono text-xs text-ink-dim animate-pulse">// LOADING_TOP_PROJECTS</p>
            </div>
          ) : (
            projects.map((project, i) => (
              <div
                key={project.slug}
                className="hover-top card-gsap-controller absolute left-1/2 top-1/2 will-change-transform"
                data-index={i}
                style={{ zIndex: [1, 3, 2][i] }}
              >
                <div className="card-hover-target relative w-70 sm:w-[320px] group transition-z duration-200 hover:z-50 cursor-pointer">
                  <ProjectCard {...project} />
                </div>
              </div>
            ))
          )}
        </div>

        <div className="text-center mt-12">
          <LinkButton href="/projects/2026" variant="outline" size="lg" bracket>
            VIEW_ALL_PROJECTS
          </LinkButton>
        </div>
      </div>
    </section>
  )
}

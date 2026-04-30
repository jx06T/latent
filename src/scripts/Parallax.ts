import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export function initParallax(): void {
  // ─── 等 DOM 就緒 ───────────────────────────────────────────
  const hero = document.querySelector<HTMLElement>('[data-hero]')
  if (!hero) return

  const paper = hero.querySelector<HTMLElement>('[data-hero-paper]')
  const title = hero.querySelector<HTMLElement>('[data-parallax-layer="title"]')
  const overlay = hero.querySelector<HTMLElement>('[data-parallax-layer="overlay"]')
  const lines = hero.querySelector<HTMLElement>('[data-parallax-layer="lines"]')
  const pixels = hero.querySelector<HTMLElement>('[data-parallax-layer="pixels"]')
  const scrollHint = hero.querySelector<HTMLElement>('[data-scroll-hint]')

  // ─── 1. 進場動畫（頁面載入時） ────────────────────────────
  initEntranceAnimation({ title, overlay, lines })

  // ─── 2. 視差捲動 ──────────────────────────────────────────
  if (paper) initScrollParallax({ paper, title, overlay, lines, pixels })

  // ─── 3. Wave 幕布向下滑走 ─────────────────────────────────
  const wave = hero.querySelector<HTMLElement>('.wave-section--hero')
  if (wave && paper) initWaveCurtain(wave, paper)

  // ─── 4. Log Console 逐行出現（頁面載入時觸發） ────────────
  initLogConsole()

  // ─── 5. 像素 mask 跟著橘框 ────────────────────────────────
  initPixelMask()

  // ─── 6. scroll hint 淡出 ──────────────────────────────────
  if (scrollHint) initScrollHint(scrollHint)
}

// ──────────────────────────────────────────────────────────────
// 進場動畫
// ──────────────────────────────────────────────────────────────
function initEntranceAnimation({
  title,
  overlay,
  lines,
}: {
  title: HTMLElement | null
  overlay: HTMLElement | null
  lines: HTMLElement | null
}) {
  const tl = gsap.timeline({ defaults: { ease: 'power3.out', markers: true } })

  // 線稿先淡入
  if (lines) {
    tl.fromTo(lines,
      { opacity: 0 },
      { opacity: 1, duration: 1.2 },
      0
    )
  }

  // 標題從略下方升起
  if (title) {
    const titleText = title.querySelector('h1')
    tl.fromTo(titleText,
      { opacity: 0, y: 16 },
      { opacity: 0.88, y: 0, duration: 1, ease: 'power2.out' },
      0.3
    )
  }

  // 偵測框：各群組依序 fade in
  if (overlay) {
    const groups = overlay.querySelectorAll<SVGGElement>('.scan-group')
    tl.to(groups,
      {
        opacity: 1,
        duration: 0.5,
        stagger: 0.25,
        ease: 'power2.inOut',
      },
      0.8
    )
  }
}

// ──────────────────────────────────────────────────────────────
// 捲動視差
// ──────────────────────────────────────────────────────────────
function initScrollParallax({
  paper,
  title,
  overlay,
  lines,
  pixels,
}: {
  paper: HTMLElement
  title: HTMLElement | null
  overlay: HTMLElement | null
  lines: HTMLElement | null
  pixels: HTMLElement | null
}) {
  /*
    視差速度邏輯（數字愈大位移愈多）：
    - 線稿 BG1：0.2（幾乎不動，像遠景）
    - 像素 BG2：0.2（與 BG1 同步，保持對齊）
    - 偵測框：0.35（中速，產生「框在底圖上滑動」的掃描感）
    - 標題：0.6（最快，快速往上消失）

    實作方式：
    ScrollTrigger 監聽 hero section 的滾動，
    計算 progress (0→1)，乘以偏移量更新 translateY
  */

  const vh = window.innerHeight

  ScrollTrigger.create({
    trigger: paper,
    start: 'top top',
    end: `+=${vh * 1.2}`,
    scrub: 0.6,  // 0.6 = 輕微慣性，不是硬跟
    onUpdate: (self) => {
      const p = self.progress  // 0 → 1

      // if (lines) gsap.set(lines, { y: -p * vh * 0.2 })
      // if (pixels) gsap.set(pixels, { y: -p * vh * 0.2 })
      // if (overlay) gsap.set(overlay, { y: -p * vh * 0.35 })
      // if (title) gsap.set(title, { y: -p * vh * 0.6 })
    },
  })
}

// ──────────────────────────────────────────────────────────────
// Wave 幕布：隨滾動向下滑走，露出後方 hero paper
// ──────────────────────────────────────────────────────────────
function initWaveCurtain(wave: HTMLElement, paper: HTMLElement) {
  const vh = window.innerHeight
  const topOffset = vh * 0.50  // 初始頂部留出 12% 空間
  const endY = vh * 2.2        // 結束時 wave top 在視窗底部以下 1.2vh，確保完全離開

  gsap.set(wave, { y: topOffset })

  ScrollTrigger.create({
    trigger: paper,
    start: 'top top',
    end: `+=${vh}`,
    scrub: 0.8,
    onUpdate: (self) => {
      gsap.set(wave, { y: topOffset + self.progress * (endY - topOffset) })
    },
  })
}

// ──────────────────────────────────────────────────────────────
// Log Console：頁面載入時觸發逐行顯示（幕布初始可見，無需 scroll）
// ──────────────────────────────────────────────────────────────
function initLogConsole() {
  const consoleEl = document.querySelector<HTMLElement>('[data-log-console]')
  if (!consoleEl) return

  const entries = consoleEl.querySelectorAll<HTMLElement>('.log-entry')
  const cursor = consoleEl.querySelector<HTMLElement>('.log-cursor')

  // 幕布初始即可見，頁面載入後直接開始動畫
  const baseDelay = 0.5

  if (cursor) {
    gsap.to(cursor, { opacity: 1, duration: 0.1, delay: baseDelay })
  }

  entries.forEach((entry) => {
    const delay = parseInt(entry.dataset.logDelay || '0') / 1000
    gsap.to(entry, {
      opacity: 1,
      x: 0,
      duration: 0.3,
      delay: baseDelay + delay,
      ease: 'power2.out',
    })
  })
}

// ──────────────────────────────────────────────────────────────
// 像素 mask：將 SVG clipPath 應用到 BackgroundPixels
// ──────────────────────────────────────────────────────────────
function initPixelMask() {
  /*
    clipPath 使用 clipPathUnits="objectBoundingBox"
    座標 0~1 直接對應 .bg-pixels 的寬高，不需要任何換算

    與 DetectionOverlay viewBox="0 0 1 1" 完全對齊，只需套上去即可
  */
  const bgPixels = document.querySelector<HTMLElement>('.bg-pixels')
  if (!bgPixels) return

  bgPixels.style.clipPath = 'url(#pixel-clip)'

  /*
    若日後想讓 overlay 速度不同產生「框在底圖上掃過」的掃描感：
    在 initScrollParallax 的 onUpdate 裡，對 #pixel-clip 內的 <rect>
    補償兩層 translateY 的差值即可
  */
}

// ──────────────────────────────────────────────────────────────
// Scroll Hint：開始滾動後淡出
// ──────────────────────────────────────────────────────────────
function initScrollHint(hint: HTMLElement) {
  ScrollTrigger.create({
    trigger: document.body,
    start: 'top -60px',
    once: true,
    onEnter: () => {
      gsap.to(hint, { opacity: 0, duration: 0.4, ease: 'power2.in' })
    },
  })
}

// ──────────────────────────────────────────────────────────────
// 清理（Astro View Transitions 用）
// ──────────────────────────────────────────────────────────────
export function cleanupParallax(): void {
  ScrollTrigger.getAll().forEach((st) => st.kill())
}
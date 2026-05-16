import { Marked, type Tokens } from 'marked'
import { markedHighlight } from 'marked-highlight'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import css from 'highlight.js/lib/languages/css'
import xml from 'highlight.js/lib/languages/xml'
import bash from 'highlight.js/lib/languages/bash'
import json from 'highlight.js/lib/languages/json'
import markdown from 'highlight.js/lib/languages/markdown'
import rust from 'highlight.js/lib/languages/rust'
import go from 'highlight.js/lib/languages/go'
import sql from 'highlight.js/lib/languages/sql'
import yaml from 'highlight.js/lib/languages/yaml'
import c from 'highlight.js/lib/languages/c'
import cpp from 'highlight.js/lib/languages/cpp'
import csharp from 'highlight.js/lib/languages/csharp'

hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('js', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('ts', typescript)
hljs.registerLanguage('python', python)
hljs.registerLanguage('py', python)
hljs.registerLanguage('css', css)
hljs.registerLanguage('html', xml)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('sh', bash)
hljs.registerLanguage('json', json)
hljs.registerLanguage('markdown', markdown)
hljs.registerLanguage('md', markdown)
hljs.registerLanguage('rust', rust)
hljs.registerLanguage('go', go)
hljs.registerLanguage('sql', sql)
hljs.registerLanguage('yaml', yaml)
hljs.registerLanguage('yml', yaml)
hljs.registerLanguage('c', c)
hljs.registerLanguage('cpp', cpp)
hljs.registerLanguage('c++', cpp)
hljs.registerLanguage('csharp', csharp)
hljs.registerLanguage('cs', csharp)
hljs.registerLanguage('c#', csharp)

function slugify(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}\-_]/gu, '')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const renderer = {
  link(token: Tokens.Link) {
    const { href, title, text } = token
    const isExternal = href && href.startsWith('http')
    const target = isExternal ? ' target="_blank" rel="noopener noreferrer"' : ''
    const titleAttr = title ? ` title="${title}"` : ''
    const aClass = 'inline-block cursor-pointer items-center text-primary-400 hover:text-accent-400 transition-colors duration-200 group mx-0.5'
    const spanClass = 'inline-block underline underline-offset-3'
    const iconHtml = isExternal
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-up-right inline-block -ml-0.5 " aria-hidden="true"><path d="M7 7h10v10"></path><path d="M7 17 17 7"></path></svg>`
      : ''
    return `<a href="${href}" class="${aClass}"${titleAttr}${target}><span class="${spanClass}"><span>${text}</span></span>${iconHtml}</a>`
  },

  image(token: Tokens.Image) {
    const { href, title, text } = token
    const titleAttr = title ? ` title="${title}"` : ''
    return `<img src="${href}" alt="${text}"${titleAttr} loading="lazy" class="rounded-md" data-morph-key="${href}" />`
  },
}

// Base instance used to render callout bodies — no callout extension to avoid recursion
const _bodyParser = new Marked()
_bodyParser.use({ renderer, breaks: true })

const CALLOUT_ICONS: Record<string, string> = {
  note: '◆', tip: '✦', warning: '◭', caution: '✗', danger: '✗', important: '★',
}

const calloutExtension = {
  name: 'callout',
  level: 'block' as const,

  start(src: string) {
    return src.match(/^> \[!/)?.index
  },

  tokenizer(src: string) {
    const match = src.match(/^((?:> [^\n]*\n?)+)/)
    if (!match) return
    const lines = match[1].split('\n').filter(Boolean)
    const firstLine = lines[0].replace(/^> /, '').trim()
    const typeMatch = firstLine.match(/^\[!(NOTE|TIP|WARNING|CAUTION|DANGER|IMPORTANT)\](.*)$/i)
    if (!typeMatch) return
    return {
      type: 'callout',
      raw: match[0],
      calloutType: typeMatch[1].toLowerCase(),
      title: typeMatch[2].trim(),
      body: lines.slice(1).map((l: string) => l.replace(/^> ?/, '')).join('\n'),
    }
  },

  renderer(token: any) {
    const bodyHtml = _bodyParser.parse(token.body || '') as string
    const icon = CALLOUT_ICONS[token.calloutType] ?? 'ℹ'
    const label = token.title || token.calloutType.toUpperCase()
    return `<div class="callout callout-${token.calloutType}"><div class="callout-title"><span class="callout-icon">${icon}</span><span>${label}</span></div><div class="callout-body">${bodyHtml}</div></div>`
  },
}

function escapeHtml(code: string): string {
  return code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const highlight = markedHighlight({
  langPrefix: 'hljs language-',
  highlight(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(code, { language: lang }).value
      } catch {}
    }
    return escapeHtml(code)
  },
})

export function createMarkedInstance(): Marked {
  const instance = new Marked()
  instance.use(highlight)
  instance.use({ extensions: [calloutExtension] })
  instance.use({ renderer, breaks: true })

  const usedIds = new Map<string, number>()
  instance.use({
    hooks: {
      preprocess(src: string) { usedIds.clear(); return src },
    },
    renderer: {
      heading({ text, depth }: Tokens.Heading) {
        const base = slugify(text)
        const count = usedIds.get(base) ?? 0
        usedIds.set(base, count + 1)
        const id = (count === 0 ? base : `${base}-${count}`) || `h${depth}-${count}`
        return `<h${depth} id="${id}">${text}</h${depth}>`
      },
    },
  })

  return instance
}

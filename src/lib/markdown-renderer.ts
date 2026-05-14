import { Marked, type Tokens } from 'marked'

const renderer = {
  link(token: Tokens.Link) {
    const { href, title, text } = token
    const isExternal = href && href.startsWith('http')
    const target = isExternal ? ' target="_blank" rel="noopener noreferrer"' : ''
    const titleAttr = title ? ` title="${title}"` : ''
    const aClass = 'inline-block cursor-pointer items-center text-primary-400 hover:text-accent-400 transition-colors duration-200 group mx-0.5'
    const spanClass = 'inline-block underline underline-offset-3'
    const iconHtml = isExternal
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-up-right inline-block" aria-hidden="true"><path d="M7 7h10v10"></path><path d="M7 17 17 7"></path></svg>`
      : ''
    return `<a href="${href}" class="${aClass}"${titleAttr}${target}><span class="${spanClass}"><span>${text}</span></span>${iconHtml}</a>`
  },

  image(token: Tokens.Image) {
    const { href, title, text } = token
    const titleAttr = title ? ` title="${title}"` : ''
    return `<img src="${href}" alt="${text}"${titleAttr} loading="lazy" class="rounded-md" />`
  },
}

export function createMarkedInstance(): Marked {
  const instance = new Marked()
  instance.use({ renderer })
  return instance
}

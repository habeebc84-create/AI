const origin = 'https://focused-ai.vercel.app'
export const pagePaths = ['/', '/features', '/how-it-works', '/about', '/contact', '/login', '/register', '/privacy', '/terms']

function canonicalUrl(pathname: string) {
  const path = pathname.replace(/\/+$/, '') || (pathname ? '/' : '')
  return pagePaths.includes(path) ? origin + path : null
}

// Vite supplies the entry HTML after rewriting its asset URLs.
export function renderRouteHead(html: string, pathname: string) {
  const url = canonicalUrl(pathname)
  const canonical = '<link rel="canonical" href="' + origin + '/" />'
  const openGraph = '<meta property="og:url" content="' + origin + '/" />'
  const robots = '<meta name="robots" content="index, follow" />'
  for (const expected of [canonical, openGraph, robots]) {
    if (!html.includes(expected)) throw new Error('Missing expected SEO tag: ' + expected)
  }
  return html
    .replace(canonical, url ? '<link rel="canonical" href="' + url + '" />' : '')
    .replace(openGraph, url ? '<meta property="og:url" content="' + url + '" />' : '')
    .replace(robots, url ? robots : '<meta name="robots" content="noindex, follow" />')
}

export function syncRouteMetadata(doc: Document, pathname: string) {
  const url = canonicalUrl(pathname)
  const canonical = doc.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  const openGraph = doc.head.querySelector<HTMLMetaElement>('meta[property="og:url"]')
  const robots = doc.head.querySelector<HTMLMetaElement>('meta[name="robots"]')
  if (robots) robots.content = url ? 'index, follow' : 'noindex, follow'
  if (!url) {
    canonical?.remove()
    openGraph?.remove()
    return
  }
  const link = canonical ?? doc.head.appendChild(doc.createElement('link'))
  link.rel = 'canonical'
  link.href = url
  const meta = openGraph ?? doc.head.appendChild(doc.createElement('meta'))
  meta.setAttribute('property', 'og:url')
  meta.content = url
}

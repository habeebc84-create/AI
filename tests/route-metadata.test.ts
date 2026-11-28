import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { pagePaths, renderRouteHead, syncRouteMetadata } from '../src/lib/route-metadata'

const entry = readFileSync('index.html', 'utf8')
const sitemap = readFileSync('public/sitemap.xml', 'utf8')
const config = JSON.parse(readFileSync('vercel.json', 'utf8'))
const urls = Array.from(sitemap.matchAll(/<loc>([^<]+)<\/loc>/g), match => new URL(match[1]))

describe('route metadata', () => {
  it('serves a matching static head for every URL in the sitemap', () => {
    expect(pagePaths).toEqual(urls.map(url => url.pathname))
    const routing = config.rewrites.find((rule: { destination: string }) => rule.destination === '/route-pages/:page.html')
    expect(routing.source).toBe('/:page(' + pagePaths.filter(path => path !== '/').map(path => path.slice(1)).join('|') + ')')
    for (const url of urls) {
      const doc = new DOMParser().parseFromString(renderRouteHead(entry, url.pathname), 'text/html')
      expect(doc.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(url.href)
      expect(doc.querySelector('meta[property="og:url"]')?.getAttribute('content')).toBe(url.href)
    }
  })

  it('updates one set of tags on navigation, including return from a private or missing page', () => {
    const doc = new DOMParser().parseFromString(renderRouteHead(entry, ''), 'text/html')
    expect(doc.querySelector('link[rel="canonical"]')).toBeNull()
    for (const path of ['/features/', '/student/dashboard', '/about', '/missing', '/', '/']) {
      syncRouteMetadata(doc, path)
      const url = urls.find(url => url.pathname === (path.replace(/\/+$/, '') || '/'))
      const links = doc.querySelectorAll('link[rel="canonical"]')
      const social = doc.querySelectorAll('meta[property="og:url"]')
      expect(links.length).toBe(url ? 1 : 0)
      expect(social.length).toBe(links.length)
      expect(links[0]?.getAttribute('href')).toBe(url?.href)
      expect(social[0]?.getAttribute('content')).toBe(url?.href)
      expect(doc.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(url ? 'index, follow' : 'noindex, follow')
    }
  })
})

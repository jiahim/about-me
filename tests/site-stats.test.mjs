import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { before, test } from 'node:test'

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const homeHtml = join(projectRoot, 'docs/.vitepress/dist/index.html')
const siteStatsHtml = join(projectRoot, 'docs/.vitepress/dist/my-site.html')
const zhHomeHtml = join(projectRoot, 'docs/.vitepress/dist/zh/index.html')

function findLink(html, href, text) {
  return html
    .match(/<a\b[^>]*>[\s\S]*?<\/a>/g)
    ?.find(anchor =>
      anchor.includes(`href="${href}"`) &&
      anchor.replace(/<[^>]*>/g, '').trim() === text
    )
}

before(() => {
  const build = spawnSync('pnpm', ['build'], {
    cwd: projectRoot,
    encoding: 'utf8'
  })

  assert.equal(build.status, 0, `${build.stdout}\n${build.stderr}`)
})

test('the site stats route embeds the public dashboard accessibly', () => {
  assert.equal(existsSync(siteStatsHtml), true, 'expected /my-site to be generated')

  const html = readFileSync(siteStatsHtml, 'utf8')
  const iframe = html.match(/<iframe\b[^>]*>/)?.[0]

  assert.ok(iframe, 'expected an analytics iframe')
  assert.match(iframe, /src="https:\/\/analytics\.xiexin\.dev\/share\/oiCVlG0wGFzDogKY"/)
  assert.match(iframe, /title="网站数据分析面板"/)
  assert.match(iframe, /loading="lazy"/)
  assert.doesNotMatch(iframe, /target="_blank"/)
})

test('the homepage does not promote site stats in the hero actions', () => {
  const html = readFileSync(homeHtml, 'utf8')
  const hero = html.match(/<div\b[^>]*class="[^"]*VPHero[^"]*"[\s\S]*?<div\b[^>]*class="[^"]*VPFeatures/)?.[0] ?? ''
  const link = findLink(hero, '/my-site', '网站数据')

  assert.equal(link, undefined, 'did not expect a 网站数据 hero action')
})

test('the Chinese homepage does not promote site stats in the hero actions', () => {
  const html = readFileSync(zhHomeHtml, 'utf8')
  const hero = html.match(/<div\b[^>]*class="[^"]*VPHero[^"]*"[\s\S]*?<div\b[^>]*class="[^"]*VPFeatures/)?.[0] ?? ''
  const link = findLink(hero, '/my-site', '网站数据')

  assert.equal(link, undefined, 'did not expect a 网站数据 hero action')
})

test('the primary navigation does not promote site stats', () => {
  const html = readFileSync(siteStatsHtml, 'utf8')
  const navigation = html.match(/<nav\b[^>]*aria-labelledby="main-nav-aria-label"[\s\S]*?<\/nav>/)?.[0] ?? ''
  const link = findLink(navigation, '/my-site', '数据')

  assert.equal(link, undefined, 'did not expect a 数据 primary-navigation link')
})

test('the embedded dashboard fills the available page width at a usable height', () => {
  const html = readFileSync(siteStatsHtml, 'utf8')
  const iframe = html.match(/<iframe\b[^>]*>/)?.[0]
  const styles = [...html.matchAll(/<link\b[^>]*href="(\/assets\/[^\"]+\.css)"[^>]*>/g)]
    .map(([, href]) => readFileSync(join(projectRoot, 'docs/.vitepress/dist', href.slice(1)), 'utf8'))
    .join('\n')

  assert.match(iframe ?? '', /class="site-stats__frame"/)

  const frameRule = styles.match(/\.site-stats__frame\{([^}]*)\}/)?.[1]
  assert.ok(frameRule, 'expected responsive styles for the analytics iframe')
  assert.match(frameRule, /(?:^|;)display:block(?:;|$)/)
  assert.match(frameRule, /(?:^|;)width:100%(?:;|$)/)
  assert.match(frameRule, /(?:^|;)min-height:720px(?:;|$)/)
})

test('the footer exposes site stats as a low-priority internal link', () => {
  const html = readFileSync(homeHtml, 'utf8')
  const footer = html.match(/<footer\b[\s\S]*?<\/footer>/)?.[0] ?? ''
  const link = findLink(footer, '/my-site', '网站数据')

  assert.ok(link, 'expected a 网站数据 link in the footer')
  assert.doesNotMatch(link, /target="_blank"/)
})

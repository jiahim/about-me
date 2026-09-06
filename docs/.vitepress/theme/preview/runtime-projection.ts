import type { SettingsPreviewModel } from '@jiahim/site-schema'

import { SETTINGS_PREVIEW_FOCUS_TARGETS, SETTINGS_PREVIEW_TARGET_SELECTORS, type SettingsPreviewTarget } from './focus-targets'

function rememberAttribute(cleanups: Array<() => void>, element: Element, name: string, value: string): void {
  const previous = element.getAttribute(name)
  element.setAttribute(name, value)
  cleanups.push(() => previous === null ? element.removeAttribute(name) : element.setAttribute(name, previous))
}

function rememberText(cleanups: Array<() => void>, element: Element | null, value: string): void {
  if (!element) return
  const previous = element.textContent
  element.textContent = value
  cleanups.push(() => { element.textContent = previous })
}

function markTargets(document: Document, cleanups: Array<() => void>): void {
  for (const [target, selectors] of Object.entries(SETTINGS_PREVIEW_TARGET_SELECTORS) as Array<[SettingsPreviewTarget, string]>) {
    for (const element of document.querySelectorAll(selectors)) {
      rememberAttribute(cleanups, element, 'data-settings-preview-target', target)
    }
  }
}

function applyContent(document: Document, model: SettingsPreviewModel, cleanups: Array<() => void>): void {
  rememberText(cleanups, document.querySelector('.VPNavBarTitle .title'), model.site.name)

  const navigationLinks = [...document.querySelectorAll('.VPNavBarMenuLink')]
  model.navigation.forEach((item, index) => rememberText(cleanups, navigationLinks[index] ?? null, item.label))

  const hero = model.homepage.modules.find((module) => module.type === 'hero' && module.visible)
  if (hero?.type === 'hero') {
    rememberText(cleanups, document.querySelector('.VPHero .name'), hero.name)
    rememberText(cleanups, document.querySelector('.VPHero .text'), hero.text)
    rememberText(cleanups, document.querySelector('.VPHero .tagline'), hero.tagline)
    const image = document.querySelector<HTMLImageElement>('.VPHero .image-src')
    if (image) {
      rememberAttribute(cleanups, image, 'src', hero.image.src)
      rememberAttribute(cleanups, image, 'alt', hero.image.alt)
    }
  }

  const featureItems = model.homepage.modules
    .filter((module) => module.type === 'features' && module.visible)
    .flatMap((module) => module.type === 'features' ? module.items : [])
  const featureCards = [...document.querySelectorAll('.VPFeature')]
  featureItems.forEach((item, index) => {
    const card = featureCards[index]
    if (!card) return
    rememberText(cleanups, card.querySelector('.title'), item.title)
    rememberText(cleanups, card.querySelector('.details'), item.details)
  })

  rememberText(cleanups, document.querySelector('.article-meta > span'), `作者：${model.author.name}`)
  rememberText(cleanups, document.querySelector('.VPFooter .message'), model.footer.notice)
  rememberText(
    cleanups,
    document.querySelector('.VPFooter .copyright'),
    `Copyright © ${model.footer.copyright.startYear}-${new Date().getFullYear()} ${model.footer.copyright.holder}`
  )
}

export function applySettingsPreviewModel(document: Document, model: SettingsPreviewModel): () => void {
  const cleanups: Array<() => void> = []
  const root = document.documentElement
  const body = document.body
  const previousAccent = root.style.getPropertyValue('--site-accent-color')
  const previousLayout = root.getAttribute('data-content-layout')

  root.style.setProperty('--site-accent-color', model.appearance.accentColor)
  root.dataset.contentLayout = model.appearance.contentLayout
  body.classList.add('settings-preview-active')
  cleanups.push(() => {
    if (previousAccent) root.style.setProperty('--site-accent-color', previousAccent)
    else root.style.removeProperty('--site-accent-color')
    if (previousLayout === null) root.removeAttribute('data-content-layout')
    else root.setAttribute('data-content-layout', previousLayout)
    body.classList.remove('settings-preview-active')
  })

  markTargets(document, cleanups)
  applyContent(document, model, cleanups)

  const focusTarget = SETTINGS_PREVIEW_FOCUS_TARGETS[model.group]
  if (focusTarget) {
    const focused = document.querySelector(`[data-settings-preview-target="${focusTarget}"]`)
    if (focused) {
      focused.classList.add('settings-preview-focus')
      focused.scrollIntoView({ block: 'center' })
      cleanups.push(() => focused.classList.remove('settings-preview-focus'))
    }
  }

  return () => {
    for (const cleanup of cleanups.reverse()) cleanup()
  }
}

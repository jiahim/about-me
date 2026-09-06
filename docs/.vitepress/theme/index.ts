import { defineComponent, h, onBeforeUnmount, onMounted } from 'vue'
import { useData } from 'vitepress'
import Theme from 'vitepress/theme'
import DotGridBackground from './components/DotGridBackground.vue'
import GiscusComment from './components/GiscusComment.vue'
import ArticleMeta from './components/ArticleMeta.vue'
import { applySiteAppearance, type SiteAppearanceSettings } from './appearance'
import './css/custom.css'

const SiteLayout = defineComponent({
  name: 'SiteLayout',
  setup() {
    const { isDark, theme } = useData<{ siteAppearance?: SiteAppearanceSettings }>()
    let cleanup: (() => void) | undefined
    let previewCleanup: (() => void) | undefined
    onMounted(() => {
      if (theme.value.siteAppearance) {
        cleanup = applySiteAppearance({
          settings: theme.value.siteAppearance,
          document,
          storage: localStorage,
          isDark
        })
      }
      if (import.meta.env.DEV) {
        void import('./preview/bridge').then(({ activateSettingsPreviewBridge }) => {
          previewCleanup = activateSettingsPreviewBridge()
        })
      }
    })
    onBeforeUnmount(() => {
      cleanup?.()
      previewCleanup?.()
    })
    return () => h(Theme.Layout, null, {
      'layout-top': () => h(DotGridBackground),
      'doc-before': () => h(ArticleMeta),
      'doc-after': () => h(GiscusComment)
    })
  }
})

export default {
  ...Theme,
  Layout: SiteLayout
}

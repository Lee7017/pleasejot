import type { Theme } from 'vitepress'
import { h, onMounted, watch } from 'vue'
import { useData } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import HomeLanding from './components/HomeLanding.vue'
import DownloadCards from './components/DownloadCards.vue'
import IosSupport from './components/IosSupport.vue'
import DemoNotice from './components/DemoNotice.vue'
import ScreenshotPage from './components/ScreenshotPage.vue'
import InviteRequest from './components/InviteRequest.vue'
import BackToTop from './components/BackToTop.vue'
import FeedbackForm from './components/FeedbackForm.vue'
import './custom.css'
import './styles/apple-colors.css'
import './styles/visual-refresh.css'
import './styles/apple-color-usage.css'

export default {
  extends: DefaultTheme,
  Layout: () => h(DefaultTheme.Layout, null, {
    'layout-bottom': () => h(BackToTop)
  }),
  setup() {
    // VitePress 1.6.4 的 force-auto 使用系统媒体查询，但动态切换
    // 不负责维护 html.dark；保留首屏脚本，再监听系统设置实时更新类名。
    const { isDark } = useData()
    onMounted(() => {
      watch(isDark, enabled => {
        document.documentElement.classList.toggle('dark', enabled)
      }, { immediate: true })
    })
  },
  enhanceApp({ app }) {
    app.component('HomeLanding', HomeLanding)
    app.component('DownloadCards', DownloadCards)
    app.component('IosSupport', IosSupport)
    app.component('DemoNotice', DemoNotice)
    app.component('ScreenshotPage', ScreenshotPage)
    app.component('InviteRequest', InviteRequest)
    app.component('FeedbackForm', FeedbackForm)
  }
} satisfies Theme

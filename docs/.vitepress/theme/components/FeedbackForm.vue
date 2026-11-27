<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vitepress'
import { Clock3, MessageSquareText, ShieldCheck } from 'lucide-vue-next'
import { tencentQuestionnaireEmbedSrc } from '../data/feedback'

// 仅接受腾讯问卷官方 HTTPS 域名，防止误贴其他网站或不安全的链接。
const embedSrc = (() => {
  const input = tencentQuestionnaireEmbedSrc.trim()
  if (!input) return ''
  try {
    const url = new URL(input)
    const host = url.hostname.toLowerCase()
    const isTencentQuestionnaire =
      host === 'wj.qq.com' || host.endsWith('.wj.qq.com') ||
      host === 'wesurvey.com' || host.endsWith('.wesurvey.com')
    return url.protocol === 'https:' && isTencentQuestionnaire ? url.href : ''
  } catch {
    return ''
  }
})()

// 仅在当前反馈路由启用：手机端禁止官网外层滚动，离开路由即恢复。
const immersiveClass = 'feedback-immersive'
const route = useRoute()
const isFeedbackRoute = (path: string) => /(?:^|\/)feedback\/?(?:index\.html)?$/.test(path)
const syncImmersiveMode = (path: string) => {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle(immersiveClass, Boolean(embedSrc) && isFeedbackRoute(path))
}

// VitePress 会先更新 URL，再切换页面组件。立即监听路由，防止外层滚动锁
// 在切换去“首页”“下载”等页面的短暂过渡中残留。
watch(() => route.path, syncImmersiveMode, { flush: 'sync' })
onMounted(() => syncImmersiveMode(route.path))
onUnmounted(() => document.documentElement.classList.remove(immersiveClass))
</script>

<template>
  <main class="page-design section-width feedback-page">
    <header class="feedback-intro">
      <span class="feedback-eyebrow"><MessageSquareText :size="15" /> 帮助我们把 PleaseJot 做得更好</span>
      <h1>用户反馈</h1>
      <p>遇到问题、发现 Bug，或是有想要的功能？欢迎告诉我们。</p>
    </header>

    <section class="feedback-panel" aria-label="用户反馈问卷">
      <div class="feedback-panel-head">
        <div>
          <h2>意见与建议</h2>
          <p>填写后将直接提交至腾讯问卷。</p>
        </div>
        <span class="pj-feedback-provider"><ShieldCheck :size="15" aria-hidden="true"/> 腾讯问卷</span>
      </div>

      <div v-if="embedSrc" class="feedback-frame">
        <iframe
          :src="embedSrc"
          title="PleaseJot 用户反馈问卷（腾讯问卷）"
          loading="eager"
          scrolling="auto"
          referrerpolicy="strict-origin-when-cross-origin"
        ></iframe>
      </div>
      <div v-else class="feedback-empty" role="status">
        <Clock3 :size="29" :stroke-width="1.7" aria-hidden="true" />
        <h2>反馈问卷尚未开放</h2>
        <p>我们正在配置腾讯问卷。完成后你就可以在这里直接提交反馈。</p>
      </div>
    </section>

    <p class="feedback-privacy">
      <ShieldCheck :size="16" aria-hidden="true" />
      <span>问卷启用后，提交的内容将由腾讯问卷接收和保存。请勿填写密码、验证码等敏感信息。</span>
    </p>
  </main>
</template>

<style scoped>
.feedback-page {
  padding: 48px 28px 76px;
  max-width: 1040px;
}
.feedback-intro {
  margin: 0 auto 28px;
  text-align: center;
}
.feedback-eyebrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--xs-muted);
  font-size: 12px;
  font-weight: 650;
  letter-spacing: .01em;
}
.feedback-intro h1 {
  margin: 14px 0 10px;
  color: var(--xs-ink);
  font-size: clamp(29px, 3.6vw, 41px);
  font-weight: 780;
  letter-spacing: -.055em;
  line-height: 1.25;
}
.feedback-intro > p {
  color: var(--xs-muted);
  font-size: 14px;
  line-height: 1.8;
}
.feedback-panel {
  overflow: hidden;
  border: 1px solid var(--xs-border);
  border-radius: 22px;
  background: var(--xs-frost-strong);
  box-shadow: var(--xs-shadow), inset 0 1px var(--xs-glow);
  -webkit-backdrop-filter: blur(20px) saturate(130%);
  backdrop-filter: blur(20px) saturate(130%);
}
.feedback-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 21px 24px;
  border-bottom: 1px solid var(--xs-rule);
}
.feedback-panel-head h2 {
  margin: 0 0 5px;
  font-size: 17px;
  line-height: 1.4;
  font-weight: 720;
  color: var(--xs-ink);
}
.feedback-panel-head p {
  margin: 0;
  color: var(--xs-muted);
  font-size: 12px;
  line-height: 1.7;
}
.feedback-frame {
  padding: 14px;
  background: var(--xs-soft);
}
.feedback-frame iframe {
  display: block;
  width: 100%;
  height: clamp(620px, calc(100dvh - 280px), 850px);
  border: 0;
  border-radius: 12px;
  background: #fff;
  color-scheme: light;
}
.feedback-empty {
  min-height: 350px;
  padding: 64px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 13px;
  color: var(--xs-muted);
}
.feedback-empty h2 {
  margin: 3px 0 0;
  font-size: 18px;
  font-weight: 710;
  color: var(--xs-ink);
}
.feedback-empty p {
  margin: 0;
  max-width: 350px;
  font-size: 13px;
  line-height: 1.8;
}
.feedback-privacy {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 8px;
  margin: 17px 0 0;
  color: var(--xs-muted);
  font-size: 11px;
  line-height: 1.8;
}
.feedback-privacy svg { flex: none; margin-top: 1px; }

/* 手机、触屏小屏：顶部保留官网导航 + 一行标题，问卷占满剩余可见区域。
   只滚动腾讯问卷 iframe，禁止外层滚动；不再猜测问卷总高度。 */
@media (max-width: 767px), (pointer: coarse) and (max-width: 1023px) {
  .feedback-page {
    position: fixed;
    z-index: 1;
    inset: var(--vp-nav-height, 64px) 0 0;
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: none;
    height: auto;
    min-height: 0;
    margin: 0;
    padding: 0;
    overflow: hidden;
    background: var(--vp-c-bg);
  }
  .feedback-intro {
    display: flex;
    flex: 0 0 44px;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 44px;
    margin: 0;
    padding: 0 14px;
    border-bottom: 1px solid var(--xs-rule);
    background: var(--vp-c-bg);
  }
  .feedback-eyebrow, .feedback-intro > p, .feedback-panel-head, .feedback-privacy { display: none; }
  .feedback-intro h1 {
    margin: 0;
    font-size: 16px;
    font-weight: 720;
    letter-spacing: -.025em;
    line-height: 1.4;
  }
  .feedback-panel {
    display: flex;
    flex: 1 1 auto;
    min-height: 0;
    width: 100%;
    margin: 0;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: #fff;
    box-shadow: none;
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }
  .feedback-frame {
    display: flex;
    flex: 1 1 auto;
    width: 100%;
    min-height: 0;
    margin: 0;
    padding: 0;
    background: #fff;
  }
  .feedback-frame iframe {
    flex: 1 1 auto;
    width: 100%;
    height: 100%;
    min-height: 0;
    margin: 0;
    border: 0;
    border-radius: 0;
    overflow: auto;
    background: #fff;
  }
  .feedback-empty {
    flex: 1 1 auto;
    min-height: 0;
    padding: 30px 18px;
  }
}
</style>

<style>
/* 必须是全局选择器：禁止滚动的是 html/body，不是 Vue 组件容器。
   路由切换时 onUnmounted 会移除 class，不影响网站其他页面。 */
@media (max-width: 767px), (pointer: coarse) and (max-width: 1023px) {
  html.feedback-immersive,
  html.feedback-immersive body {
    height: 100%;
    overflow: hidden !important;
    overscroll-behavior: none;
    scrollbar-gutter: auto;
  }
  html.feedback-immersive .Layout .VPFooter,
  html.feedback-immersive .xs-back-to-top {
    display: none !important;
  }
}
</style>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { Monitor, Tablet, Smartphone, ChevronLeft, ChevronRight, Pause, Play, FolderOpen, FileText, PencilLine, NotebookPen } from 'lucide-vue-next'
const root = ref<HTMLElement | null>(null)
const viewport = ref<HTMLElement | null>(null)
const ready = ref(false)
const reduced = ref(false)
const moving = ref(false)
const userPaused = ref(false)
const activeIndex = ref(0)
const slots = ref([0, 1, 2])
const cardWidth = ref(634)
const offset = ref(40)
const transition = ref(false)
const cards = [
  { title: '大屏 · 集中整理', note: '文件树与 Markdown 工作区', description: '在 Windows、macOS 等桌面设备上整理目录与长篇资料。', icon: Monitor, detail: FolderOpen, kind: 'desktop' },
  { title: '中屏 · 阅读与手写', note: '笔记与手写画布', description: '面向平板场景，阅读资料、整理笔记与记录灵感。', icon: Tablet, detail: PencilLine, kind: 'tablet' },
  { title: '小屏 · 随手记录', note: '随身携带的个人笔记', description: '面向手机场景，让日常记录与资料查看更方便。', icon: Smartphone, detail: NotebookPen, kind: 'phone' }
]
const DURATION = 1800, GAP = 16, FIRST = 4000, INTERVAL = 3000
let timer = 0, done = 0, raf1 = 0, raf2 = 0
let focusInside = false, inView = false
let media: MediaQueryList | undefined
let sizeObserver: ResizeObserver | undefined
let viewObserver: IntersectionObserver | undefined
function measure() {
  if (!viewport.value) return
  const width = viewport.value.clientWidth
  cardWidth.value = Math.min(634, Math.max(160, width - 32))
  offset.value = width >= 768 ? 40 : 16
}
function cancelTimer() { window.clearTimeout(timer) }
function schedule(delay = INTERVAL) {
  cancelTimer()
  if (reduced.value || userPaused.value || focusInside || document.hidden || !inView || moving.value) return
  timer = window.setTimeout(() => go(-1), delay)
}
function go(dir: number) {
  if (moving.value) return
  cancelTimer()
  moving.value = true
  transition.value = false
  const n = cards.length
  slots.value = slots.value.map(slot => {
    let s = slot
    if (dir < 0) { while (s < 0) s += n }
    else { while (s > n - 1) s -= n; if (s === n - 1) s = -1 }
    return s
  })
  const shift = () => {
    transition.value = !reduced.value
    slots.value = slots.value.map(s => s + dir)
    activeIndex.value = slots.value.indexOf(0)
    done = window.setTimeout(() => {
      moving.value = false
      transition.value = false
      schedule()
    }, reduced.value ? 0 : DURATION)
  }
  if (reduced.value) shift()
  else raf1 = requestAnimationFrame(() => { raf2 = requestAnimationFrame(shift) })
}
function onPreference() {
  reduced.value = !!media?.matches
  if (reduced.value) {
    transition.value = false
    cancelTimer()
  } else schedule(FIRST)
}
function onFocusIn() { focusInside = true; cancelTimer() }
function onFocusOut(e: FocusEvent) {
  if (root.value?.contains(e.relatedTarget as Node | null)) return
  focusInside = false; schedule()
}
function togglePause() { userPaused.value = !userPaused.value; schedule(FIRST) }
function onVisibility() { schedule() }
onMounted(() => {
  media = matchMedia('(prefers-reduced-motion: reduce)')
  media.addEventListener('change', onPreference)
  onPreference()
  measure()
  ready.value = true
  if ('ResizeObserver' in window && viewport.value) {
    sizeObserver = new ResizeObserver(measure); sizeObserver.observe(viewport.value)
  } else window.addEventListener('resize', measure)
  if ('IntersectionObserver' in window && root.value) {
    viewObserver = new IntersectionObserver(entries => {
      inView = entries.some(e => e.isIntersecting)
      schedule(FIRST)
    }, { threshold: .2 })
    viewObserver.observe(root.value)
  } else { inView = true; schedule(FIRST) }
  document.addEventListener('visibilitychange', onVisibility)
})
onBeforeUnmount(() => {
  cancelTimer(); window.clearTimeout(done)
  cancelAnimationFrame(raf1); cancelAnimationFrame(raf2)
  sizeObserver?.disconnect(); viewObserver?.disconnect()
  media?.removeEventListener('change', onPreference)
  window.removeEventListener('resize', measure)
  document.removeEventListener('visibilitychange', onVisibility)
})
</script>

<template>
  <section ref="root" class="pj-carousel section-width" aria-labelledby="pj-platform-title" @focusin="onFocusIn" @focusout="onFocusOut" :data-active-index="activeIndex">
    <div class="pj-carousel-heading">
      <span class="eyebrow">多端体验</span>
      <h2 id="pj-platform-title">不同尺寸，同一份记录</h2>
      <p>面向桌面、平板和手机的使用场景。实际开放平台以发布信息为准。</p>
    </div>
    <div ref="viewport" class="pj-carousel-viewport" :class="{ 'is-ready': ready }" :style="ready ? { height: Math.max(240, Math.round(cardWidth * 300 / 634)) + 'px' } : {}">
      <article v-for="(card, i) in cards" :key="card.kind" class="pj-carousel-card" :class="'pj-carousel-' + card.kind" :style="ready ? { width: cardWidth + 'px', transform: 'translateX(' + (offset + slots[i] * (cardWidth + GAP)) + 'px)', transition: transition ? 'transform 1800ms cubic-bezier(.16,1,.3,1)' : 'none' } : {}">
        <div class="pj-carousel-art" aria-hidden="true">
          <component :is="card.icon" :size="76" :stroke-width="1.05" />
          <div class="pj-carousel-mini"><component :is="card.detail" :size="20" /><span/><span/><span/></div>
        </div>
        <div class="pj-carousel-copy">
          <p class="pj-carousel-note">{{ card.note }}</p>
          <h3>{{ card.title }}</h3>
          <p>{{ card.description }}</p>
        </div>
      </article>
    </div>
    <div class="pj-carousel-controls" v-if="ready">
      <button type="button" aria-label="上一张卡片" :aria-disabled="moving" @click="go(1)"><ChevronLeft :size="24"/></button>
      <button type="button" aria-label="下一张卡片" :aria-disabled="moving" @click="go(-1)"><ChevronRight :size="24"/></button>
      <button v-if="!reduced" type="button" :aria-label="userPaused ? '继续自动轮播' : '暂停自动轮播'" :aria-pressed="userPaused" @click="togglePause"><Play v-if="userPaused" :size="19"/><Pause v-else :size="19"/></button>
    </div>
  </section>
</template>

<style scoped>
.pj-carousel { padding: 80px 0 88px; }
.pj-carousel-heading { padding: 0 24px 32px; text-align: center; }
.pj-carousel-heading h2 { font-size: clamp(28px, 3.5vw, 44px); font-weight: 550; margin: 16px 0; }
.pj-carousel-heading p { font-size: 15px; line-height: 1.75; color: var(--xs-muted); }
.pj-carousel-viewport { position: relative; display: flex; gap: 16px; overflow: hidden; padding-inline: 16px; }
.pj-carousel-viewport.is-ready { display: block; padding: 0; }
.pj-carousel-card {
  flex: 0 0 min(634px, calc(100% - 32px)); min-height: 240px; padding: 32px;
  display: flex; flex-direction: column; justify-content: space-between; gap: 12px;
  border-radius: 16px; border: 1px solid var(--pj-hairline); background: var(--pj-surface);
}
.is-ready .pj-carousel-card { position: absolute; inset: 0 auto 0 0; }
.pj-carousel-art { display: flex; align-items: center; gap: 18px; color: var(--xs-ink); }
.pj-carousel-mini { width: 100px; display: grid; grid-template-columns: 20px 1fr; align-items: center; gap: 6px; padding: 12px; background: var(--pj-panel); border: 1px solid var(--pj-hairline); border-radius: 12px; }
.pj-carousel-mini span { height: 4px; background: currentColor; opacity: .2; border-radius: 4px; }
.pj-carousel-mini span:nth-child(n+3) { grid-column: 1 / -1; }
.pj-carousel-copy h3 { font-size: clamp(21px, 3vw, 28px); font-weight: 550; margin: 7px 0 8px; }
.pj-carousel-copy p { color: var(--xs-muted); font-size: 14px; line-height: 1.6; }
.pj-carousel-copy .pj-carousel-note { font-size: 12px; }
.pj-carousel-controls { display: flex; justify-content: center; gap: 16px; margin-top: 24px; }
.pj-carousel-controls button { width: 52px; height: 52px; border-radius: 50%; display: grid; place-items: center; border: 1px solid var(--pj-hairline); background: var(--pj-surface); color: var(--xs-ink); cursor: pointer; transition: background .2s, transform .2s; }
.pj-carousel-controls button[aria-disabled=true] { opacity: .5; cursor: default; }
.pj-carousel-controls button:hover:not([aria-disabled=true]) { background: var(--xs-soft); }
.pj-carousel-controls button:active:not([aria-disabled=true]) { transform: scale(.95); }
@media(max-width: 680px) {
  .pj-carousel { padding: 56px 0; }
  .pj-carousel-card { padding: 20px; }
  .pj-carousel-art { gap: 12px; }
  .pj-carousel-art > svg { width: 58px; height: 58px; }
  .pj-carousel-copy p { font-size: 13px; }
}
</style>

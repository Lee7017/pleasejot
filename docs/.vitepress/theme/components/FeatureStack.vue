<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

const outer = ref<HTMLElement | null>(null)
const stage = ref<HTMLElement | null>(null)
const active = ref(false)
const TOP = 96, GAP = 40, HEIGHT = 500, STEP = HEIGHT + 24
let media: MediaQueryList | undefined
let raf = 0
let cards: HTMLElement[] = []
const clamp = (x: number, low = 0, high = 1) => Math.max(low, Math.min(high, x))
function clear() {
  active.value = false
  outer.value?.style.removeProperty('height')
  cards.forEach(card => {
    card.style.removeProperty('transform')
    card.style.removeProperty('z-index')
  })
}
function render() {
  raf = 0
  if (!outer.value || !active.value) return
  const travel = (STEP - GAP) * (cards.length - 1)
  const p = clamp((TOP - outer.value.getBoundingClientRect().top) / travel) * (cards.length - 1)
  cards.forEach((card, i) => {
    let pull = 0
    for (let j = 0; j < i; j++) pull += clamp(p - j)
    card.style.transform = 'translateY(' + (STEP * i - (STEP - GAP) * pull).toFixed(2) + 'px)'
    card.style.zIndex = String(i + 1)
  })
}
function schedule() {
  if (!raf && active.value) raf = requestAnimationFrame(render)
}
function configure() {
  if (!outer.value || !stage.value) return
  cards = Array.from(stage.value.querySelectorAll<HTMLElement>(':scope > .feature-section'))
  clear()
  if (!media?.matches || cards.length < 2) return
  active.value = true
  outer.value.style.height = (HEIGHT + GAP * (cards.length - 1) + (STEP - GAP) * (cards.length - 1)) + 'px'
  schedule()
}
function onFocus(event: FocusEvent) {
  if (!active.value || !outer.value) return
  const target = event.target as HTMLElement
  const index = cards.findIndex(card => card.contains(target))
  if (index < 0) return
  const bounds = target.getBoundingClientRect()
  const hit = document.elementFromPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2)
  if (hit && target.contains(hit)) return
  const desired = window.scrollY + outer.value.getBoundingClientRect().top - TOP + index * (STEP - GAP)
  // Keyboard focus must not remain underneath an overlapping card.
  window.scrollTo({ top: desired, behavior: 'instant' })
  schedule()
}
onMounted(() => {
  media = matchMedia('(min-width: 1100px) and (min-height: 720px) and (prefers-reduced-motion: no-preference)')
  media.addEventListener('change', configure)
  window.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', configure, { passive: true })
  configure()
})
onBeforeUnmount(() => {
  media?.removeEventListener('change', configure)
  window.removeEventListener('scroll', schedule)
  window.removeEventListener('resize', configure)
  if (raf) cancelAnimationFrame(raf)
  clear()
})
</script>

<template>
  <div ref="outer" class="pj-stack section-width" :class="{ 'pj-stack-active': active }">
    <div ref="stage" class="pj-stack-stage" @focusin="onFocus"><slot /></div>
  </div>
</template>

<style scoped>
.pj-stack { position: relative; }
.pj-stack-active { padding-inline: 24px; }
.pj-stack-active .pj-stack-stage {
  position: sticky; top: 96px; height: 580px; overflow: hidden;
}
.pj-stack-active :deep(.feature-section) {
  position: absolute; inset: 0 0 auto; height: 500px; width: 100%;
  padding: 48px 32px 24px; gap: 32px; margin: 0;
  border: 1px solid var(--pj-hairline); border-radius: 20px;
  background: var(--pj-panel); box-shadow: inset 0 1px 0 var(--pj-hairline);
  transition: transform 50ms linear; will-change: transform;
  overflow: hidden;
}
.pj-stack-active :deep(.feature-section::before) {
  content: attr(data-stack-label); position: absolute; top: 0; left: 0; right: 0;
  height: 40px; display: flex; align-items: center; padding: 0 24px;
  font-size: 12px; font-weight: 600; color: var(--xs-muted);
  border-bottom: 1px solid var(--pj-hairline); background: var(--pj-surface);
}
.pj-stack-active :deep(.feature-visual) { min-height: 0; padding: 16px; }
.pj-stack-active :deep(.feature-index) { display: none; }
.pj-stack-active :deep(.feature-copy) { min-width: 0; }
@media (prefers-reduced-motion: reduce) {
  .pj-stack-active :deep(.feature-section) { transition: none; }
}
</style>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ArrowUpRight, HeartHandshake } from 'lucide-vue-next'

interface PublicSupporter {
  name: string
  amount: number
}
interface IosSupportSnapshot {
  status: 'unconfigured' | 'live'
  target: number
  raised: number | null
  supporterCount: number | null
  syncedAt: string | null
  supportUrl: string | null
  supporters: PublicSupporter[]
}

const SUPPORT_URL = 'https://afdian.com/item/d9aa8642e2b411f181af52540025c377'
const snapshot = ref<IosSupportSnapshot | null>(null)
const error = ref('')
const money = new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', minimumFractionDigits: 2 })

const configured = computed(() => snapshot.value?.status === 'live')
const target = computed(() => snapshot.value?.target ?? 750)
const raised = computed(() => configured.value ? snapshot.value?.raised ?? null : null)
const percent = computed(() => raised.value === null || target.value <= 0
  ? 0 : Math.min(100, Math.max(0, raised.value / target.value * 100)))
const supporters = computed(() => configured.value ? snapshot.value?.supporters ?? [] : [])
const syncedText = computed(() => {
  if (!snapshot.value) return error.value ? '读取失败' : '正在获取'
  if (!snapshot.value.syncedAt || !configured.value) return '尚未同步'
  const date = new Date(snapshot.value.syncedAt)
  if (Number.isNaN(date.getTime())) return '时间未知'
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Shanghai', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).formatToParts(date)
  const part = (type: 'month' | 'day' | 'hour' | 'minute') =>
    parts.find(item => item.type === type)?.value ?? '--'
  return `${part('month')}/${part('day')} ${part('hour')}:${part('minute')}`
})

// 按真实授权支持者分配弹幕轨道。复制可见内容仅用于无缝循环，不增加统计人数。
const desktopLanes = computed(() => Array.from({ length: 3 }, (_, row) =>
  supporters.value.filter((_, index) => index % 3 === row)))
const mobileLanes = computed(() => Array.from({ length: 2 }, (_, row) =>
  supporters.value.filter((_, index) => index % 2 === row)))

function parseSnapshot(value: unknown): IosSupportSnapshot {
  if (!value || typeof value !== 'object') throw new Error('数据格式不正确')
  const data = value as Record<string, unknown>
  if (data.status !== 'live' && data.status !== 'unconfigured') throw new Error('数据状态不正确')
  if (typeof data.target !== 'number' || !Number.isFinite(data.target) || data.target <= 0) throw new Error('筹集目标无效')
  if (data.status === 'live' && (
    typeof data.raised !== 'number' || !Number.isFinite(data.raised) || data.raised < 0 ||
    typeof data.supporterCount !== 'number' || !Number.isSafeInteger(data.supporterCount) || data.supporterCount < 0 ||
    typeof data.syncedAt !== 'string' || Number.isNaN(Date.parse(data.syncedAt))
  )) throw new Error('统计数据无效')
  const raw = Array.isArray(data.supporters) ? data.supporters : []
  const publicSupporters = raw.filter((item): item is PublicSupporter =>
    !!item && typeof item === 'object' && typeof item.name === 'string' &&
    item.name.trim().length > 0 && typeof item.amount === 'number' &&
    Number.isFinite(item.amount) && item.amount >= 0)
    .slice(0, 30)
  return {
    status: data.status,
    target: data.target,
    raised: data.status === 'live' ? data.raised as number : null,
    supporterCount: data.status === 'live' ? data.supporterCount as number : null,
    syncedAt: data.status === 'live' ? data.syncedAt as string : null,
    supportUrl: typeof data.supportUrl === 'string' ? data.supportUrl : null,
    supporters: publicSupporters
  }
}

// 公开统计数据放在独立的 OTA 仓库，官网只读取已发布 JSON，不执行爱发电 API 查询。
// GitHub 定时同步可能延迟或漏跑；页面只显示真实的最近成功同步时间。
const snapshotRawUrl = 'https://raw.githubusercontent.com/Lee7017/pleasejot-ota/main/support/ios.json'
const snapshotApiUrl = 'https://api.github.com/repos/Lee7017/pleasejot-ota/contents/support/ios.json'

function decodeGitHubContent(value: unknown): unknown {
  if (!value || typeof value !== 'object') throw new Error('GitHub API 返回格式错误')
  const file = value as Record<string, unknown>
  if (file.encoding !== 'base64' || typeof file.content !== 'string') throw new Error('GitHub API 数据编码错误')
  const bytes = Uint8Array.from(atob(file.content.replace(/\s/g, '')), char => char.charCodeAt(0))
  return JSON.parse(new TextDecoder().decode(bytes))
}

async function fetchPublicJson(url: string): Promise<unknown> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)
  try {
    const res = await fetch(url, { cache: 'no-store', signal: controller.signal })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    return await res.json()
  } finally {
    clearTimeout(timeout)
  }
}

async function loadSnapshot() {
  error.value = ''
  let rawUnconfigured: IosSupportSnapshot | null = null
  for (const source of ['api', 'raw'] as const) {
    try {
      const url = (source === 'api' ? snapshotApiUrl : snapshotRawUrl) + '?v=' + Date.now()
      const json = await fetchPublicJson(url)
      const data = parseSnapshot(source === 'raw' ? json : decodeGitHubContent(json))
      if (data.status === 'unconfigured') {
        rawUnconfigured = data
        continue
      }
      snapshot.value = data
      return
    } catch (reason) {
      console.warn('PleaseJot iOS 支持数据读取失败：' + source, reason)
    }
  }
  if (rawUnconfigured) {
    snapshot.value = rawUnconfigured
    return
  }
  error.value = '进度数据读取失败，请检查网络后重新打开页面。'
}

onMounted(loadSnapshot)
</script>

<template>
  <article id="ios-support" class="download-card ios-support-card" aria-labelledby="ios-support-title">
    <div class="ios-card-heading">
      <div class="ios-card-intro">
        <div class="platform-icon ios-card-icon"><HeartHandshake :size="27" stroke-width="1.6" /></div>
        <div class="ios-card-title">
          <span>iOS / iPadOS</span>
          <h2 id="ios-support-title">iOS 开发者支持计划</h2>
        </div>
      </div>
      <a :href="SUPPORT_URL" class="ios-support-link" target="_blank" rel="noopener noreferrer">
        <span>前往支持</span>
        <span class="ios-support-link-arrow"><ArrowUpRight :size="14" stroke-width="2" /></span>
      </a>
    </div>

    <div class="ios-funding" aria-live="polite">
      <div class="ios-funding-row">
        <span>筹集进度 · 目标 {{ money.format(target) }}</span>
        <strong>{{ configured ? percent.toFixed(1) + '%' : '—' }}</strong>
      </div>
      <div class="ios-progress-track" role="progressbar" :aria-valuemin="0" :aria-valuemax="100"
        :aria-valuenow="configured ? Math.round(percent) : undefined"
        :aria-valuetext="configured ? percent.toFixed(1) + '%' : (snapshot ? '尚未同步' : (error ? '读取失败' : '正在获取'))">
        <div class="ios-progress-fill" :style="{ width: percent + '%' }"></div>
      </div>
    </div>

    <div class="ios-sync">
      <div class="ios-sync-line">
        <span>最近同步：{{ syncedText }}</span>
        <span>每隔数小时更新</span>
      </div>
      <p v-if="error" class="ios-error" role="status">{{ error }}</p>
    </div>

    <div class="ios-carousel" role="region" aria-label="公开支持者弹幕">
      <div class="ios-danmaku-panel">
        <template v-if="supporters.length">
          <div class="ios-danmaku-layout ios-danmaku-layout--desktop">
            <div v-for="(lane, row) in desktopLanes" :key="'desktop-' + row" class="ios-danmaku-lane">
              <div v-if="lane.length" class="ios-danmaku-track"
                :style="{ '--scroll-duration': (lane.length * 8 + 4) + 's', '--scroll-delay': -(row * 2.5) + 's' }">
                <div v-for="copy in 4" :key="copy" class="ios-danmaku-batch" :aria-hidden="copy > 1 ? 'true' : undefined">
                  <span v-for="(supporter, index) in lane" :key="index" class="ios-danmaku-chip">
                    <span class="ios-danmaku-name">{{ supporter.name }}</span>
                    <span class="ios-danmaku-amount">{{ money.format(supporter.amount) }}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div class="ios-danmaku-layout ios-danmaku-layout--mobile">
            <div v-for="(lane, row) in mobileLanes" :key="'mobile-' + row" class="ios-danmaku-lane">
              <div v-if="lane.length" class="ios-danmaku-track"
                :style="{ '--scroll-duration': (lane.length * 8 + 4) + 's', '--scroll-delay': -(row * 3.1) + 's' }">
                <div v-for="copy in 4" :key="copy" class="ios-danmaku-batch" :aria-hidden="copy > 1 ? 'true' : undefined">
                  <span v-for="(supporter, index) in lane" :key="index" class="ios-danmaku-chip">
                    <span class="ios-danmaku-name">{{ supporter.name }}</span>
                    <span class="ios-danmaku-amount">{{ money.format(supporter.amount) }}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </template>
        <div v-else class="ios-danmaku-empty">暂无已授权公开的支持者</div>
      </div>
    </div>
  </article>
</template>

<style scoped>
.ios-support-card { min-width:0; scroll-margin-top:105px; gap:0; }
.ios-card-heading { display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:center; gap:10px; min-width:0; }
.ios-card-intro { display:flex; align-items:center; gap:10px; min-width:0; }
.ios-card-icon { width:45px; height:45px; flex:none; margin:0; border-radius:13px; }
.ios-card-title { min-width:0; }
.ios-support-link { display:inline-flex; align-items:center; justify-content:center; flex:none; min-height:32px; height:32px; padding:0 10px 0 12px; gap:6px; margin:0; color:var(--xs-ink)!important; border:1px solid var(--xs-rule); border-radius:999px; background:var(--xs-frost-strong); font-size:11px; font-weight:680; line-height:1; white-space:nowrap; text-decoration:none!important; box-shadow:0 2px 6px rgba(15,18,25,.035),inset 0 1px var(--xs-glow); transition:background-color .16s ease,border-color .16s ease,box-shadow .16s ease; }
.ios-support-link:hover { color:var(--xs-ink)!important; border-color:var(--xs-border); background:var(--xs-soft); box-shadow:0 3px 9px rgba(15,18,25,.06); }
.ios-support-link-arrow { display:grid; place-items:center; width:14px; height:14px; flex:none; transition:transform .16s ease; }
.ios-support-link:hover .ios-support-link-arrow { transform:translate(1px,-1px); }
.ios-support-link:focus-visible { outline:2px solid var(--xs-ink); outline-offset:3px; }
.ios-card-title>span { display:block; color:var(--xs-muted); font-size:11px; margin-bottom:4px; }
.ios-card-title h2 { font-size:19px; line-height:1.25; letter-spacing:-.035em; overflow-wrap:anywhere; }
.ios-funding { margin-top:21px; }
.ios-funding-row { display:flex; align-items:baseline; justify-content:space-between; gap:10px; }
.ios-funding-row>span { color:var(--xs-muted); font-size:11px; }
.ios-funding-row>strong { font-size:14px; font-weight:760; font-variant-numeric:tabular-nums; white-space:nowrap; }
.ios-progress-track { height:9px; margin-top:11px; border-radius:999px; overflow:hidden; background:var(--xs-rule); }
.ios-progress-fill { height:100%; background:var(--xs-ink); border-radius:inherit; transition:width .4s ease; }
.ios-sync { margin-top:17px; }
.ios-sync-line { display:flex; align-items:center; justify-content:space-between; gap:8px; white-space:nowrap; color:var(--xs-muted); font-size:11px; line-height:1.65; }
.ios-error { margin:7px 0 0!important; color:var(--xs-muted); font-size:11px!important; }
.ios-carousel { margin-top:20px; min-width:0; }
.ios-danmaku-panel { position:relative; overflow:hidden; height:145px; min-width:0; isolation:isolate; border:1px solid var(--xs-rule); border-radius:14px; background:var(--xs-soft); }
.ios-danmaku-panel::before,.ios-danmaku-panel::after { content:''; position:absolute; top:0; bottom:0; width:20px; z-index:2; pointer-events:none; }
.ios-danmaku-panel::before { left:0; background:linear-gradient(to right,var(--xs-soft),transparent); }
.ios-danmaku-panel::after { right:0; background:linear-gradient(to left,var(--xs-soft),transparent); }
.ios-danmaku-layout { position:absolute; inset:0; display:flex; flex-direction:column; justify-content:space-evenly; }
.ios-danmaku-layout--mobile { display:none; }
.ios-danmaku-lane { position:relative; overflow:hidden; height:32px; min-width:0; flex:none; }
.ios-danmaku-track { display:flex; align-items:center; gap:14px; width:max-content; height:32px; animation:ios-danmaku-flow var(--scroll-duration) linear infinite; animation-delay:var(--scroll-delay); will-change:transform; }
.ios-danmaku-batch { display:flex; align-items:center; gap:14px; flex:none; }
.ios-danmaku-chip { display:inline-flex; align-items:center; gap:11px; height:32px; max-width:240px; flex:none; padding:0 13px; border:1px solid var(--xs-rule); border-radius:999px; color:var(--xs-ink); background:var(--xs-frost-strong); box-shadow:0 2px 8px rgba(15,18,28,.055),inset 0 1px var(--xs-glow); white-space:nowrap; font-size:11px; }
.ios-danmaku-name { min-width:0; max-width:140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:700; }
.ios-danmaku-amount { color:var(--xs-muted); font-size:10px; font-variant-numeric:tabular-nums; white-space:nowrap; }
@keyframes ios-danmaku-flow { from { transform:translateX(0); } to { transform:translateX(calc(-25% - 3.5px)); } }
.ios-danmaku-panel:hover .ios-danmaku-track,.ios-danmaku-panel:focus-within .ios-danmaku-track { animation-play-state:paused; }
.ios-danmaku-empty { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; color:var(--xs-muted); font-size:11px; }
@media (max-width:680px) {
  .ios-sync-line { font-size:10px; flex-wrap:nowrap; white-space:nowrap; }
  .ios-card-title h2 { font-size:17px; }
  .ios-support-link { padding:0 9px 0 10px; }
  .ios-funding { margin-top:17px; }
  .ios-carousel { margin-top:17px; }
  .ios-danmaku-panel { height:105px; }
  .ios-danmaku-layout--desktop { display:none; }
  .ios-danmaku-layout--mobile { display:flex; }
}
@media (max-width:380px) { .ios-sync-line { font-size:9px; gap:4px; } }
@media (prefers-reduced-motion:reduce) {
  .ios-progress-fill,.ios-support-link-arrow { transition:none; }
  .ios-danmaku-panel { overflow:auto; }
  .ios-danmaku-layout { position:static; inset:auto; gap:8px; padding:11px; }
  .ios-danmaku-lane { height:auto; min-height:32px; }
  .ios-danmaku-track { width:max-content; animation:none; transform:none; }
  .ios-danmaku-batch:not(:first-child) { display:none; }
}

/* 以整行信息和文字轨道代替密集的小卡片。 */
.ios-support-card {
  padding: 25px 0 23px;
  border: 0;
  border-top: 1px solid var(--xs-rule);
  border-bottom: 1px solid var(--xs-rule);
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}
.ios-card-icon {
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}
.ios-danmaku-panel {
  height: 124px;
  border: 0;
  border-top: 1px solid var(--xs-rule);
  border-bottom: 1px solid var(--xs-rule);
  border-radius: 0;
  background: transparent;
}
.ios-danmaku-panel::before,
.ios-danmaku-panel::after { display: none; }
.ios-danmaku-track,
.ios-danmaku-batch { gap: 12px; }
.ios-danmaku-chip {
  height: 32px;
  padding: 0 3px;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}
.ios-danmaku-name { font-weight: 620; }
.ios-danmaku-amount { font-size: 10px; }
@media (max-width:680px) {
  .ios-support-card { padding: 21px 0; }
  .ios-danmaku-panel { height: 105px; }
}
</style>

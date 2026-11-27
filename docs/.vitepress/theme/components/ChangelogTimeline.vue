<script setup lang="ts">
import { computed } from 'vue'
import { useData, withBase, type DefaultTheme } from 'vitepress'
import { ArrowRight, Package, History } from 'lucide-vue-next'
const { theme } = useData<DefaultTheme.Config>()
const releases = computed(() => {
  const sidebar = theme.value.sidebar
  const groups = Array.isArray(sidebar) ? sidebar : sidebar?.['/changelog/'] ?? []
  if (!Array.isArray(groups)) return []
  return groups.flatMap(group => group.items ?? []).flatMap(item => {
    const match = item.link?.match(/\/changelog\/releases\/(\d{4}-\d{2}-\d{2})-(v[^/]+)\.html$/)
    if (!match || !item.link) return []
    return [{ date:match[1], version:match[2], href:item.link }]
  })
})
</script>

<template>
  <div class="pj-release-list">
    <a v-if="releases[0]" class="pj-release-latest" :href="withBase(releases[0].href)" data-hue="green">
      <span class="pj-page-icon"><Package :size="29" :stroke-width="1.6" aria-hidden="true"/></span>
      <span class="pj-release-latest-copy"><span class="pj-release-badge">最新版本</span><strong>{{ releases[0].version }}</strong><time :datetime="releases[0].date">{{ releases[0].date }}</time></span>
      <span class="pj-release-open">阅读发布说明 <ArrowRight :size="17" aria-hidden="true"/></span>
    </a>
    <div v-if="releases.length > 1" class="pj-release-history" aria-label="历史版本">
      <div class="pj-release-history-label"><History :size="17" aria-hidden="true"/> 历史版本</div>
      <a v-for="release in releases.slice(1)" :key="release.href" class="pj-release-row" :href="withBase(release.href)">
        <span class="pj-release-dot" aria-hidden="true"/><strong>{{ release.version }}</strong><time :datetime="release.date">{{ release.date }}</time><ArrowRight :size="16" aria-hidden="true"/>
      </a>
    </div>
    <p v-if="!releases.length" class="pj-release-empty">暂无已发布版本。</p>
  </div>
</template>

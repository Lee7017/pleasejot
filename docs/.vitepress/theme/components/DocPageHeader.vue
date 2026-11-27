<script setup lang="ts">
import { computed } from 'vue'
import { useData, withBase } from 'vitepress'
import { BookOpen, Download, NotebookPen, FileCode2, Paperclip, FolderTree, HardDrive, ArrowLeftRight, CircleHelp, History, Package, Info, HeartHandshake, Scale, Settings, ChevronRight } from 'lucide-vue-next'

const { page } = useData()
const guides = {
  'index': ['使用文档', '快速开始', BookOpen, 'blue'],
  'install': ['下载安装', '快速开始', Download, 'blue'],
  'getting-started': ['创建第一篇笔记', '快速开始', NotebookPen, 'green'],
  'markdown': ['Markdown 编辑', '笔记编辑', FileCode2, 'purple'],
  'attachments': ['手写与多格式附件', '笔记编辑', Paperclip, 'purple'],
  'folders': ['文件树管理', '笔记编辑', FolderTree, 'orange'],
  'saving': ['本地保存', '数据与同步', HardDrive, 'green'],
  'sync': ['局域网同步', '数据与同步', ArrowLeftRight, 'cyan'],
  'faq': ['常见问题', '帮助', CircleHelp, 'yellow']
} as const
const meta = computed(() => {
  const path = page.value.relativePath
  if (path.startsWith('guide/')) {
    const key = path.split('/').at(-1)?.replace(/\.md$/, '') as keyof typeof guides
    const [title, group, Icon, hue] = guides[key] ?? guides.index
    return { kind: 'guide', title, group, Icon, hue, parent: key === 'index' ? undefined : { label: '使用文档', href: '/guide/' } }
  }
  if (path.startsWith('changelog/releases/')) return { kind:'release', title:page.value.title, group:'正式发布', Icon:Package, hue:'green', parent:{label:'更新日志',href:'/changelog/'} }
  if (path.startsWith('changelog/')) return { kind:'changelog', title:'更新日志', group:'版本历史', Icon:History, hue:'green' }
  if (path.startsWith('about/')) return { kind:'about', title:'关于 PleaseJot', group:'产品信息', Icon:Info, hue:'cyan' }
  if (path.startsWith('acknowledgements/')) return { kind:'credits', title:'开源致谢', group:'开源社区', Icon:HeartHandshake, hue:'pink', parent:{label:'关于',href:'/about/'} }
  if (path.startsWith('licenses/')) return { kind:'licenses', title:'第三方许可证', group:'许可声明', Icon:Scale, hue:'orange', parent:{label:'关于',href:'/about/'} }
  if (path === 'support-setup.md') return { kind:'support', title:page.value.title, group:'维护说明', Icon:Settings, hue:'purple' }
  return { kind:'article', title:page.value.title, group:'文档', Icon:BookOpen, hue:'blue' }
})
</script>

<template>
  <header class="pj-doc-header" :data-pj-doc-kind="meta.kind" :data-hue="meta.hue">
    <nav class="pj-doc-crumbs" aria-label="当前位置">
      <a :href="withBase('/')">首页</a>
      <ChevronRight :size="13" aria-hidden="true"/>
      <template v-if="meta.parent">
        <a :href="withBase(meta.parent.href)">{{ meta.parent.label }}</a>
        <ChevronRight :size="13" aria-hidden="true"/>
      </template>
      <span aria-current="page">{{ meta.title }}</span>
    </nav>
    <div class="pj-doc-section">
      <span class="pj-page-icon"><component :is="meta.Icon" :size="23" :stroke-width="1.7" aria-hidden="true"/></span>
      <span class="pj-doc-category">{{ meta.group }}</span>
    </div>
  </header>
</template>

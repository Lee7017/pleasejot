<script setup lang="ts">
import { computed } from 'vue'
import { withBase } from 'vitepress'
import { Download, NotebookPen, FileCode2, Paperclip, FolderTree, HardDrive, ArrowLeftRight, CircleHelp, HeartHandshake, Scale, BookOpen, MessageSquareText, ArrowUpRight } from 'lucide-vue-next'
const props = defineProps<{ kind: 'guide' | 'about' }>()
const guide = [
  { title:'下载安装', desc:'了解软件的分发方式。', href:'/guide/install.html', Icon:Download, hue:'blue', category:'快速开始' },
  { title:'创建第一篇笔记', desc:'了解基本操作流程。', href:'/guide/getting-started.html', Icon:NotebookPen, hue:'green', category:'快速开始' },
  { title:'Markdown 编辑', desc:'熟悉常用 Markdown 语法。', href:'/guide/markdown.html', Icon:FileCode2, hue:'purple', category:'笔记编辑' },
  { title:'手写与多格式附件', desc:'了解可支持的内容和附件类型。', href:'/guide/attachments.html', Icon:Paperclip, hue:'pink', category:'笔记编辑' },
  { title:'首页文件树', desc:'管理多篇笔记与目录。', href:'/guide/folders.html', Icon:FolderTree, hue:'orange', category:'笔记编辑' },
  { title:'本地保存', desc:'了解本地笔记和资料的保存方式。', href:'/guide/saving.html', Icon:HardDrive, hue:'green', category:'数据与同步' },
  { title:'局域网同步', desc:'了解设备配对与主动同步流程。', href:'/guide/sync.html', Icon:ArrowLeftRight, hue:'cyan', category:'数据与同步' },
  { title:'常见问题', desc:'查看常见操作与功能问题。', href:'/guide/faq.html', Icon:CircleHelp, hue:'yellow', category:'帮助' }
]
const about = [
  { title:'开源致谢', desc:'感谢开源社区与贡献者。', href:'/acknowledgements/', Icon:HeartHandshake, hue:'pink', category:'开源社区' },
  { title:'第三方许可证', desc:'了解依赖清单与许可声明。', href:'/licenses/', Icon:Scale, hue:'orange', category:'许可声明' },
  { title:'使用文档', desc:'查看软件功能与使用教程。', href:'/guide/', Icon:BookOpen, hue:'blue', category:'帮助文档' },
  { title:'用户反馈', desc:'反馈问题或提出功能建议。', href:'/feedback/', Icon:MessageSquareText, hue:'green', category:'联系我们' }
]
const cards = computed(() => props.kind === 'guide' ? guide : about)
</script>

<template>
  <div class="pj-doc-link-grid" :data-link-kind="kind">
    <a v-for="card in cards" :key="card.href" :href="withBase(card.href)" class="pj-doc-link-card" :data-hue="card.hue">
      <span class="pj-page-icon"><component :is="card.Icon" :size="22" :stroke-width="1.7" aria-hidden="true"/></span>
      <span class="pj-doc-link-content"><span class="pj-card-category">{{ card.category }}</span><strong>{{ card.title }}</strong><span class="pj-card-desc">{{ card.desc }}</span></span>
      <ArrowUpRight class="pj-card-arrow" :size="17" aria-hidden="true"/>
    </a>
  </div>
</template>

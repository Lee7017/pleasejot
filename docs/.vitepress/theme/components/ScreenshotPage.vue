<script setup lang="ts">
import { Image, Monitor, Smartphone, Tablet, ArrowRight, ImagePlus } from 'lucide-vue-next'
import { withBase } from 'vitepress'
const slots = [
  { title: '桌面端主界面', desc: '首页文件树、Markdown 编辑与多笔记管理', Icon: Monitor, hue: 'blue', shape: 'desktop' },
  { title: '平板与手写', desc: '展示中等屏幕的手写、阅读与操作布局', Icon: Tablet, hue: 'purple', shape: 'tablet' },
  { title: '移动端界面', desc: '展示小屏笔记管理与适配效果', Icon: Smartphone, hue: 'cyan', shape: 'phone' }
]
</script>
<template>
  <main class="page-design section-width screenshots-page">
    <div class="page-intro"><span class="eyebrow">产品界面</span><h1>软件截图</h1><p>此版本保留了截图布局位置，正式发布前替换为实际应用截图，不使用假造的软件界面冒充真实运行效果。</p></div>
    <div class="screenshots-grid">
      <section v-for="slot in slots" :key="slot.title" :data-hue="slot.hue">
        <div class="screenshot-placeholder" :data-shape="slot.shape">
          <div class="pj-shot-frame"><ImagePlus :size="30" :stroke-width="1.35" aria-hidden="true"/><span>待放置真实截图</span></div>
        </div>
        <div class="pj-shot-title"><component :is="slot.Icon" :size="20" :stroke-width="1.6" aria-hidden="true"/><h2>{{ slot.title }}</h2></div>
        <p>{{ slot.desc }}</p>
      </section>
    </div>
    <a class="text-link" :href="withBase('/')">返回产品首页 <ArrowRight :size="17"/></a>
  </main>
</template>

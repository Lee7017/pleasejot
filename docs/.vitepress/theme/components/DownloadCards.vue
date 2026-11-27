<script setup lang="ts">
import { withBase } from 'vitepress'
import { Download, Monitor, Smartphone, Laptop, Tablet, Github, ShieldCheck, ArrowRight } from 'lucide-vue-next'
import { releasePlatforms, releasesPageUrl } from '../data/releases'
const iconMap = { monitor: Monitor, smartphone: Smartphone, laptop: Laptop, tablet: Tablet }
const downloadPlatforms = releasePlatforms.filter(item => item.name !== 'iOS / iPadOS')
</script>

<template>
  <main class="page-design download-page section-width">
    <div class="page-intro">
      <span class="eyebrow">软件下载</span>
      <h1>下载 PleaseJot</h1>
      <p>选择适合你设备的安装版本。页面只提供实际发布的 GitHub Releases 资源。</p>
    </div>
    <section class="invite-banner" aria-labelledby="download-invite-title">
      <div>
        <h2 id="download-invite-title">申请内测邀请码</h2>
        <p>希望提前体验？填写手机号和昵称，直接发送短信申请内测邀请码。</p>
      </div>
      <a class="xs-button secondary" :href="withBase('/invite/')">申请邀请码 <ArrowRight :size="17" /></a>
    </section>
    <div class="download-grid">
      <article v-for="item in downloadPlatforms" :key="item.name" class="download-card" :data-platform="item.name">
        <div class="platform-icon"><component :is="iconMap[item.icon]" :size="30" stroke-width="1.55"/></div>
        <div class="download-card-heading"><h2>{{ item.name }}</h2><span :class="item.status === '已发布' ? 'tag live' : 'tag'">{{ item.status }}</span></div>
        <p>{{ item.description }}</p>
        <div class="download-meta">{{ item.format }}<template v-if="item.version"> · {{ item.version }}</template></div>
        <a v-if="item.status === '已发布' && item.url" class="xs-button primary download-action" :href="item.url" target="_blank" rel="noopener noreferrer"><Download :size="16"/>下载 {{ item.name }}</a>
        <span v-else class="xs-button disabled download-action" aria-disabled="true">尚未开放下载</span>
      </article>
      <IosSupport />
    </div>
    <div class="download-note">
      <Github :size="23"/>
      <div><strong>统一使用 GitHub Releases 发布安装包</strong><p>下载当前版本的安装包，或查看历史版本、Windows MSI 安装包与文件校验值。</p>
      <a v-if="releasesPageUrl" class="text-link" :href="releasesPageUrl" target="_blank" rel="noopener noreferrer">查看所有历史版本 <ArrowRight :size="17"/></a></div>
    </div>
    <div class="download-support"><ShieldCheck :size="18"/><span>正式下载前请核对发行者、版本号和文件来源。Apple 平台须按实际签名及分发流程处理。</span></div>
    <div class="subpage-actions"><a class="xs-button secondary" :href="withBase('/changelog/')">阅读更新日志 <ArrowRight :size="17"/></a><a class="xs-button secondary" :href="withBase('/guide/install.html')">查看安装教程 <ArrowRight :size="17"/></a></div>
  </main>
</template>

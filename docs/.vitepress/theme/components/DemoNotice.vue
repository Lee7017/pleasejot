<script setup lang="ts">
import { withBase } from 'vitepress'
import { MonitorPlay, HardDrive, RefreshCcw, ShieldOff, ArrowUpRight, NotebookPen, FolderTree, FileText, Play } from 'lucide-vue-next'
</script>
<template>
  <main class="page-design demo-page section-width" data-pj-demo-launch>
    <div class="page-intro">
      <span class="eyebrow">浏览器体验</span>
      <h1>在线体验 PleaseJot</h1>
      <p>无需下载安装，在浏览器中体验独立的 React + Vditor Web Mock。演示中的数据与正式软件分离。</p>
    </div>
    <section class="demo-panel pj-demo-launch" aria-labelledby="pj-demo-title">
      <div class="demo-panel-top"><span><MonitorPlay :size="19"/> Web Mock</span><span class="tag live">浏览器演示</span></div>
      <div class="pj-demo-launch-body">
        <div class="pj-demo-launch-copy">
          <span class="pj-demo-kicker"><span class="status-dot"/> 独立运行 · 模拟数据</span>
          <h2 id="pj-demo-title">打开你的演示工作区</h2>
          <p>体验笔记编辑、文件树和已接入的模拟操作。正式软件的功能与平台支持以当前发布版本为准。</p>
          <a class="xs-button primary pj-demo-open" :href="withBase('/demo/app.html')" target="_blank" rel="noopener noreferrer"><Play :size="16"/>启动在线演示<ArrowUpRight :size="15"/></a>
          <p class="pj-demo-note">在新标签页打开，官网与演示独立运行。</p>
        </div>
        <div class="pj-demo-art" aria-hidden="true">
          <div class="pj-demo-window"><span class="browser-dots"><i/><i/><i/></span><span>PleaseJot · Web Mock</span></div>
          <div class="pj-demo-illustration"><div data-hue="orange"><span class="pj-page-icon"><FolderTree :size="26"/></span><span>文件树</span></div><div data-hue="purple"><span class="pj-page-icon"><FileText :size="26"/></span><span>Markdown</span></div><div data-hue="green"><span class="pj-page-icon"><NotebookPen :size="26"/></span><span>笔记</span></div></div>
          <div class="pj-demo-art-caption">功能示意 · 非软件截图</div>
        </div>
      </div>
    </section>
    <div class="demo-rules">
      <div data-hue="green"><HardDrive :size="22"/><h3>内存模拟</h3><p>不访问用户真实文件系统。</p></div>
      <div data-hue="blue"><RefreshCcw :size="22"/><h3>刷新重置</h3><p>刷新页面回到预置测试数据。</p></div>
      <div data-hue="orange"><ShieldOff :size="22"/><h3>同步仅模拟</h3><p>不执行真实设备配对或文件同步。</p></div>
    </div>
  </main>
</template>

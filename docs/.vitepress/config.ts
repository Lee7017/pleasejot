import { defineConfig } from 'vitepress'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createChangelogSidebar } from './changelogSidebar'

const base = process.env.SITE_BASE || '/'
const demoSource = fileURLToPath(new URL('../public/demo/index.html', import.meta.url))
async function readDemoEntry() {
  const html = await readFile(demoSource, 'utf8')
  if (!html.includes('id="root"')) throw new Error('Expected the independent React Web Mock HTML entry')
  // The app publisher owns this input. Keep its bundles untouched and only
  // adapt the HTML asset URLs to the Pages base.
  return html.replaceAll('/pleasejot/demo/', base + 'demo/')
}

export default defineConfig({
  lang: 'zh-CN',
  title: 'PleaseJot',
  description: 'PleaseJot— 局域网同步、文件树管理与 Super MarkDown',
  base,
  // GitHub Pages 无法保证扩展名省略后的直访行为，使用 .html 文档路由
  cleanUrls: false,
  lastUpdated: true,
  // The Vue launcher and the React application must never share one output URL.
  // Preserve the existing publisher's public/demo/index.html input contract.
  async buildEnd(siteConfig) {
    const launcher = await readFile(resolve(siteConfig.outDir, 'demo/index.html'), 'utf8')
    if (!launcher.includes('data-pj-demo-launch')) throw new Error('Vue demo launcher was overwritten during build')
    await writeFile(resolve(siteConfig.outDir, 'demo/app.html'), await readDemoEntry(), 'utf8')
  },
  vite: {
    plugins: [{
      name: 'pleasejot-demo-dev-entry',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (!/(?:^|\/)demo\/app\.html(?:\?|$)/.test(req.url || '')) return next()
          readDemoEntry().then(html => {
            res.setHeader('Content-Type', 'text/html; charset=utf-8')
            res.end(html)
          }).catch(next)
        })
      }
    }]
  },
  // 始终跟随系统深浅色：VitePress 不渲染电脑和手机的外观切换控件。
  appearance: 'force-auto',
  ...(process.env.SITE_URL ? { sitemap: { hostname: process.env.SITE_URL } } : {}),
  head: [
    ['link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: `${base}favicon-32x32.png` }],
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${base}logo.svg` }],
    ['link', { rel: 'apple-touch-icon', sizes: '180x180', href: `${base}apple-touch-icon.png` }],
    ['meta', { name: 'theme-color', content: '#ffffff', media: '(prefers-color-scheme: light)' }],
    ['meta', { name: 'theme-color', content: '#000000', media: '(prefers-color-scheme: dark)' }],
    ['meta', { name: 'description', content: 'PleaseJot— 本地优先的 Markdown 笔记与资料管理工具' }]
  ],
  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'PleaseJot',
    nav: [
      { text: '首页', link: '/' },
      { text: '下载', link: '/download/' },
      { text: '使用文档', link: '/guide/' },
      { text: '在线体验', link: '/demo/', target: '_self' },
      { text: '更新日志', link: '/changelog/' },
      { text: '关于', link: '/about/' },
      { text: '用户反馈', link: '/feedback/' }
    ],
    sidebar: {
      '/guide/': [
        { text: '快速开始', items: [
          { text: '使用文档首页', link: '/guide/' },
          { text: '下载安装', link: '/guide/install.html' },
          { text: '创建第一篇笔记', link: '/guide/getting-started.html' }
        ] },
        { text: '笔记编辑', items: [
          { text: 'Markdown 编辑', link: '/guide/markdown.html' },
          { text: '手写与多格式附件', link: '/guide/attachments.html' },
          { text: '文件树管理', link: '/guide/folders.html' }
        ] },
        { text: '数据与同步', items: [
          { text: '本地保存', link: '/guide/saving.html' },
          { text: '局域网同步', link: '/guide/sync.html' }
        ] },
        { text: '帮助', items: [
          { text: '常见问题', link: '/guide/faq.html' }
        ] }
      ],
      // 更新日志使用独立侧边栏；版本列表由实际已发布的 Markdown 文件自动生成。
      '/changelog/': createChangelogSidebar()
    },
    outline: { level: [2, 3], label: '本页目录' },
    docFooter: { prev: '上一篇', next: '下一篇' },
    lastUpdated: { text: '最后更新', formatOptions: { dateStyle: 'short', timeStyle: 'short' } },
    returnToTopLabel: '返回顶部',
    sidebarMenuLabel: '目录',
    footer: { copyright: 'Copyright © 2026 PleaseJot. All rights reserved.' }
  }
})

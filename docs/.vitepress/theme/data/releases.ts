/**
 * 将发布状态与真实 GitHub Release 资源地址填入这里。
 * 空 URL 一律展示“尚未开放下载”，避免官网给出假下载入口。
 * Apple 平台需遵守实际签名与分发要求，不能假设可直接发 .ipa。
 */
export interface ReleasePlatform {
  name: string
  icon: 'monitor' | 'smartphone' | 'laptop' | 'tablet'
  description: string
  format: string
  status: '未开放' | '已发布'
  url: string
  version: string
}

export const releasePlatforms: ReleasePlatform[] = [
  { name: 'Windows', icon: 'monitor', description: 'Windows 10 / 11 · 64 位', format: 'EXE / MSI', status: "已发布", url: "https://github.com/Lee7017/pleasejot/releases/download/v0.1.1/pleasejot-windows-x86_64.exe", version: "0.1.1" },
  { name: 'Android', icon: 'smartphone', description: 'Android 7.0 及以上 · ARM64', format: 'APK', status: "已发布", url: "https://github.com/Lee7017/pleasejot/releases/download/v0.1.1/pleasejot-android-aarch64.apk", version: "0.1.1" },
  { name: 'macOS', icon: 'laptop', description: 'Mac 安装程序', format: 'DMG / PKG', status: '未开放', url: '', version: '' },
  { name: 'iOS / iPadOS', icon: 'tablet', description: '须符合 Apple 分发要求', format: '实际分发渠道待确定', status: '未开放', url: '', version: '' }
]

// 从构建环境读取当前仓库地址，仓库改名后无需更改网站源码。
// 本地未配置 VITE_GITHUB_REPOSITORY 时，从站点 base 推导仓库名称。
const repository = import.meta.env.VITE_GITHUB_REPOSITORY
  || `Lee7017/${import.meta.env.BASE_URL.split('/').filter(Boolean)[0] || 'pleasejot'}`
export const releasesPageUrl = `https://github.com/${repository}/releases`


# PleaseJot 官网 · VitePress + Vue 源码

本项目依据对话中确认的官网结构，实现可编辑、可部署的 VitePress 网站。它不是 ChatGPT 内置组件的直接代码导出，而是用真实 Vue 单文件组件重新实现该布局。

## 视觉风格 · 浅色极简分栏

官网采用浅灰背景、清晰的白色内容区、细分割线和整行列表组织信息。首页功能介绍、软件下载、文档入口、截图与演示说明优先使用连续区块和列表行，减少重复的小卡片；只保留必要的大型软件界面预览和主要操作区域。整体以黑白灰为主，状态和功能图标使用克制的颜色提示。

- 默认跟随系统浅色 / 深色外观；保留 VitePress 原生导航、目录和响应式交互。
- 文字、表格和代码块保持清晰对比度，不使用影响阅读的半透明正文面板。
- 支持手机、平板和桌面，并尊重系统减少动画设置；保持页面路径、文章目录和版本导航不变。网站搜索入口已按需求移除。
- 基础主题样式位于 `docs/.vitepress/theme/custom.css`，列表化排版规则位于 `docs/.vitepress/theme/styles/row-layout.css`。

## 设计与边界

- **顶部导航**：首页、下载、使用文档、在线体验、更新日志、关于（包含开源致谢和第三方许可证）。
- **独立侧边栏**：使用文档显示教程目录；更新日志显示按年份和版本整理的版本导航。首页、下载、在线体验、关于等页面不显示左侧栏。
- **全站版权页脚**：使用 VitePress 原生 Footer，显示 `Copyright © 2026 PleaseJot. All rights reserved.`；教程上一篇／下一篇属于独立的文档导航。
- **首页三个重点**：局域网 P2P 同步；首页文件树；Super MarkDown（手写/音视频/Office/PDF，Office 仅渲染）。
- **唯一下载来源**：GitHub Releases。没有 123 云盘备用下载或公开分享。
- **123 云盘**：仅作为软件内云端同步的未来规划，未实现时不宣传为已支持。
- **Web 在线体验**：`/demo/` 使用独立的 React + Vditor 演示构建，内存数据刷新重置，不访问真实认证服务器、文件系统或设备同步。
- **真实截图**：首页的应用画面是排版示意，已明确标注，正式版需替换。不同操作系统的下载状态默认“未开放”。

## 本地启动

需要 Node.js 20 及以上。进入本目录运行：

```bash
npm install --no-audit --no-fund
npm run dev
```

默认开发地址通常为 `http://localhost:5173`。随后可执行：

```bash
npm run build
npm run preview
```

静态产物在 `docs/.vitepress/dist/`。

## 配置下载地址

打开 `docs/.vitepress/theme/data/releases.ts`，填写**自己实际上传**的 GitHub Release 资产 URL、版本号，并将相应平台的 `status` 改为 `已发布`。

URL 空缺时按钮保持禁用，不会生成假的下载链接。iOS/iPadOS 的实际分发方式需要遵守 Apple 平台要求。

## 配置 GitHub Pages

本仓库自带 `.github/workflows/deploy.yml`。推送到 `main` 后，在 GitHub 仓库 Settings → Pages → Build and deployment 中选择 **GitHub Actions**。

- 项目地址 `https://USER.github.io/REPO/`：默认使用 `/${REPO}/` 作为 VitePress `base`。
- 自定义根域名 `https://docs.example.com/`：在仓库 Settings → Secrets and variables → Actions → Variables 设置 `SITE_BASE=/`，并正确配置 DNS / Pages 自定义域名。
- `SITE_URL` 为可选的最终完整站点地址，用于生成 sitemap；没配置时不会写入虚构地址。

本项目当前没有随包提供 `package-lock.json`（执行环境无法连接 npm 包仓库生成锁文件）。工作流已关闭依赖锁文件的 `setup-node` npm 缓存功能，避免首次构建因此直接失败。首次在可联网电脑上运行 `npm install --no-audit --no-fund` 会生成锁文件；建议提交锁文件，并将工作流安装命令改为 `npm ci`、再启用 npm 缓存，以确保可复现构建。

本项目生成普通 `.html` 文档路径，避免在 GitHub Pages 上依赖服务器 URL Rewrite。所有首页按钮均为真实站内链接；文档侧边栏链接对应实际文件。

## 将现有 Web Mock 接入 `/demo/`

应用项目已提供 `npm run build:demo`，使用独立的 demo 构建模式与内存 Mock API，跳过真实账号认证。**不可把 Native 或普通登录构建放入官网演示。**

接入步骤：

1. 在应用仓库执行 `npm run build:demo`，产物在 `tmp/web-demo/`；默认 base 为 `/pleasejot/demo/`，可通过 `PLEASEJOT_DEMO_BASE` 调整。
2. 运行 `node apps/tauri/scripts/web-demo-regression.mjs`，验证桌面/移动布局、Vditor 子路径资源、编辑保存和刷新重置。
3. 把 `tmp/web-demo/` 直接复制到官网仓库的 `docs/public/demo/`，随官网提交部署；不再生成 demo ZIP 或 `demo.json`，也不作为 Release 附件。
4. 官网使用 `npm run build`，VitePress 会把 `docs/public/demo/` 原样复制到输出；发布脚本会清理上一版遗留文件。

`/demo/` 的演示环境应明确提示内存 Mock、刷新重置、设备同步仅模拟，不接入账号认证服务器、文件系统和真实局域网同步。

## 更新日志的独立侧边栏

`/changelog/` 和 `/guide/` 现在分别使用自己的 VitePress 侧边栏：教程侧栏不变；更新日志左侧始终显示「全部更新」，正式发布过的版本会按年份分组，按日期倒序排列。

**目前没有填写真实的发布记录**，所以左栏先显示「暂无已发布版本」，不会虚构版本号。今后每次发布可按以下步骤维护：

1. 确认对应版本已经在 GitHub Releases 实际发布。
2. 将 `templates/changelog-release.md` 复制到 `docs/changelog/releases/`，按 `YYYY-MM-DD-v版本号.md` 命名（例如 `2026-11-02-v1.0.0.md` 只是文件名格式示例）。
3. 将模板中的版本号、日期、新增、改进、修复替换为实际信息。
4. 重新构建或部署，侧栏自动识别新文件，不需要在 `config.ts` 手动添加链接。

版本说明页面使用默认右侧文章目录；更新日志首页保留 `aside: false`，只显示左侧版本导航。所有页面底部统一显示版权声明。

## 内容维护

| 内容 | 位置 |
|---|---|
| 首页布局与三大亮点 | `docs/.vitepress/theme/components/HomeLanding.vue` |
| 样式与响应式 | `docs/.vitepress/theme/custom.css` |
| 下载卡片 | `docs/.vitepress/theme/components/DownloadCards.vue` |
| Release 下载地址和状态 | `docs/.vitepress/theme/data/releases.ts` |
| 顶部导航、文档目录、站点标题和版权声明 | `docs/.vitepress/config.ts` |
| 使用文档 | `docs/guide/*.md` |
| 更新日志首页 | `docs/changelog/index.md` |
| 版本发布说明 | `docs/changelog/releases/YYYY-MM-DD-v版本号.md` |
| 更新日志侧边栏（自动生成） | `docs/.vitepress/changelogSidebar.ts` |
| 发布说明模板 | `templates/changelog-release.md` |
| 开源致谢与许可证 | `docs/acknowledgements/` 与 `docs/licenses/` |

正式上线前，还需要核对实际发布版本、准确截图、第三方许可证、项目正式 GitHub 仓库名、DNS 及所有平台下载链接。

## PleaseJot 品牌与官网地址

- 产品名称统一使用 **PleaseJot**，包括网站标题、SEO 描述、首页、下载、文档、内测申请和页脚。
- **官网主仓库：** `Lee7017/pleasejot`；**OTA 仓库：** `Lee7017/pleasejot-ota`。
- **官网地址：** `https://lee7017.github.io/pleasejot/`。
- 发布工作流根据 `github.event.repository.name` 设置 Pages 路径，下载页面由 `VITE_GITHUB_REPOSITORY` 生成 Releases 链接；iOS 支持公开数据由 OTA 仓库 `pleasejot-ota/main/support/ios.json` 维护，GitHub Actions 最短每 5 分钟尝试同步。官网直接读取 OTA JSON，无需重新构建；页面保守显示「每隔数小时更新」。配置方式见 `docs/support-setup.md`。
- 如果在 GitHub Actions 设置中自定义了 `SITE_BASE`，请确保其值对应官网当前部署路径；原生客户端的 OTA 更新地址须在客户端项目中另行核对。
- 原图形标识暂时沿用；SVG 的无障碍名称已更新。确认新的图标后，再同时替换 `docs/public/logo.svg` 和对应 PNG 图标。

## 构建与浏览器检查

- GitHub Actions 在推送 `main` 后执行 VitePress 构建及 Pages 部署。
- `.github/workflows/visual-review.yml` 使用 Playwright + Chromium 进行桌面/手机、浅色/深色、导航、按钮、邀请码复制等回归检查，并保存截图。
- 官网使用的测试下载图片仅供界面检查，不是正式安装包。

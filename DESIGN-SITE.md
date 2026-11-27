# PleaseJot 官网设计规范
- 黑白为主、七彩为辅，不设置固定品牌色。Apple HIG 动态色板集中维护于 `docs/.vitepress/theme/styles/apple-colors.css`；可读性不足的文本使用同色系高对比度衍生色。
- 首页使用品牌图标、逐字入场、滚动堆叠及轮播；下载页以平台卡片与真实发布状态为主；产品截图页只显示真实截图或明确标注的占位。
- 文档、版本历史、关于、致谢和许可证共用 VitePress 原生导航、文章目录与 Markdown 渲染。每页按用途使用独立的彩色图标和面包屑；教程首页和版本首页有实际链接卡片。
- 反馈保留腾讯问卷独立 iframe，手机端保持原有单独滚动；邀请码保留短信、复制、手机号校验和紧凑布局。
- /demo/ 是 Vue 启动页；/demo/app.html 为单独的 React Mock 入口。构建后复制入口，原发布流程仍写 public/demo/index.html，React bundle 不修改。
- 所有 Markdown 路由由 scripts/all-pages-regression.mjs 自动发现，以 390、768、1440px × 深浅色进行全页截图及基本布局检查，并验证 React 入口。原有导航、反馈、动效、下载、目录等回归继续运行。
- 减弱动态效果时停止宣传动画，不影响任何正文、按钮或表单。技术文档及功能表单不做复杂滚动动画。

# routes 目录规则

- 路由文件只负责文件路由声明、页面装配和必要的 `validateSearch`。
- 后台页面统一挂在 `/_authenticated` 下，由后台布局提供共享 header、搜索栏和 sidebar。
- 后台页面不要在各自 feature 中重复渲染 `Header`；如需扩展 header，只通过 `useAuthenticatedHeader` 声明。
- 顶层全页页面直接放在 `src/routes`，例如 `/settings`、错误页等，不复用后台 sidebar 壳体。
- 404、500 等错误页保留为独立顶层路由，同时根路由继续使用 `notFoundComponent` 和 `errorComponent` 兜底。
- 删除示例页面时，优先删对应 route 文件，`routeTree.gen.ts` 不手改，通过构建自动生成。

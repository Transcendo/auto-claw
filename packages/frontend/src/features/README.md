# features 目录规则

- `features` 只承载页面主体和业务片段，不负责注册路由。
- 后台页 feature 默认只输出主内容区，不自行挂载共享 header、搜索栏或 sidebar。
- 顶层全页 feature 用于无后台壳体的独立页面，例如独立的 `/settings`。
- 不再保留 auth、permission、Clerk 等示例实现；后续新增页面直接从最小模板继续扩展。
- 需要复用的布局能力优先放到 `components/layout` 或 `context`，避免页面 feature 彼此耦合。

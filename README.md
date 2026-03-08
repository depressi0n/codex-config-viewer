# Codex Config Viewer

基于 OpenAI Codex 官方 sample config 的可视化配置管理器，支持：

- 双语界面：`zh-CN` / `en`
- 可视化编辑 Codex 常用配置
- 导入已有 `config.toml` 并回填表单
- 保留未支持字段到高级 TOML 区域
- 实时生成、复制、下载 `config.toml`

## 参考来源

- 官方参考链接：[https://developers.openai.com/codex/config-sample/](https://developers.openai.com/codex/config-sample/)
- 当前项目声明基于该 sample 的审核时间：`2026-03-08`
- Vercel Deploy Button 参考文档：[Working with the Deploy Button](https://vercel.com/docs/deployments/deploy-button)

说明：

- 页面 UI 中已展示参考链接与声明日期
- 生成的 `config.toml` 文件头部也会自动写入参考链接与声明日期注释

## 一键部署到 Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fdepressi0n%2Fcodex-config-viewer&project-name=codex-config-viewer&repository-name=codex-config-viewer)

如果你更喜欢直接打开部署入口，也可以访问：

- [Deploy with Vercel](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fdepressi0n%2Fcodex-config-viewer&project-name=codex-config-viewer&repository-name=codex-config-viewer)

当前仓库的一键部署配置说明：

- 源仓库：`https://github.com/depressi0n/codex-config-viewer`
- Vercel 会从这个公开仓库拉起导入流程
- 当前项目不需要额外环境变量即可完成部署
- 由于仓库包含 `pnpm-lock.yaml` 且使用 `Next.js`，Vercel 会自动识别框架与安装命令

## 技术栈

- `Next.js` App Router
- `React`
- `TypeScript`
- `Tailwind CSS`
- `smol-toml`
- `Vitest` + Testing Library

## 本地启动

### 1. 安装依赖

```bash
pnpm install
```

### 2. 启动开发环境

```bash
pnpm dev
```

启动后访问：

- [http://localhost:3000](http://localhost:3000)

根路径会根据浏览器语言自动跳转：

- 中文：`/zh-CN`
- 英文：`/en`

## 常用命令

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm typecheck
pnpm test
```

## 使用说明

### 1. 从官方 sample 开始

页面默认会载入一份基于官方 sample 的本地快照，你也可以点击：

- `Reset to sample` / `重置为 sample`

来恢复默认配置。

### 2. 通过表单编辑配置

左侧按配置分组组织，主要包含：

- General
- History
- Features
- Sandbox
- Shell Environment
- Tools
- Model Providers
- MCP Servers
- Profiles
- Projects
- Advanced

适合表单化的字段会直接映射为输入框、下拉框、开关或动态列表。

### 3. 导入已有 `config.toml`

点击：

- `Import config.toml` / `导入 config.toml`

导入后系统会：

- 解析已支持字段并回填到表单
- 将当前版本尚未可视化支持的字段保留到高级 TOML 区域
- 在解析失败时返回明确错误

### 4. 处理未支持字段

`Advanced unsupported TOML` / `高级未支持 TOML` 区域用于保留未覆盖的 TOML 片段。

规则如下：

- 这里只应放“未支持片段”
- 如果高级区与表单编辑了同一路径，最终以表单值为准
- 这样可以避免长尾字段在导入/导出时丢失

### 5. 预览与导出

右侧会实时显示生成后的 TOML 预览，并提供：

- `Copy TOML`
- `Download config.toml`

下载出的文件会附带头部注释，例如：

```toml
# Reference: https://developers.openai.com/codex/config-sample/
# Declared against official sample on 2026-03-08
```

## API 说明

项目包含两个轻量接口：

### `POST /api/config/parse`

输入：

```json
{
  "toml": "..."
}
```

输出：

- `draft`
- `unsupportedToml`
- `warnings`

### `POST /api/config/generate`

输入：

```json
{
  "draft": {},
  "unsupportedToml": "..."
}
```

输出：

- `toml`
- `warnings`

## 当前实现边界

- 不做账号系统
- 不做服务端草稿持久化
- 不做分享链接
- 不保留原始 TOML 注释和原始排版
- 目标是保证配置语义正确、结构清晰、可继续编辑

## 验证

提交前可运行：

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## 项目结构

```text
src/app/                  路由、页面、API
src/components/           编辑器与表单组件
src/lib/config/           配置 schema、默认值、TOML 转换
src/lib/i18n/             双语字典与 locale 配置
src/test/                 测试初始化
```

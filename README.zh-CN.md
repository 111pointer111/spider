# Spider（蜘蛛图谱）

[![GitHub release (latest)](https://img.shields.io/github/v/release/111pointer111/spider?style=flat-square)](https://github.com/111pointer111/spider/releases/latest)
[![GitHub downloads](https://img.shields.io/github/downloads/111pointer111/spider/total?style=flat-square)](https://github.com/111pointer111/spider/releases)
[![License](https://img.shields.io/github/license/111pointer111/spider?style=flat-square)](LICENSE)
[![Obsidian min version](https://img.shields.io/badge/Obsidian-%E2%89%A5%201.8.7-blueviolet?style=flat-square)](https://obsidian.md)
[![Obsidian Community](https://img.shields.io/badge/Obsidian-Community-blueviolet?style=flat-square)](https://community.obsidian.md/plugins/spider)

> 🌏 **其他语言**: [English](README.md)

**AI 对话像蛛网一样自然展开——按 `Tab` 键从任意回答拉出新分支，让追问、对比、回溯成为肌肉记忆。**

一个 Obsidian 插件，把 ChatGPT / Claude / DeepSeek / 任何 OpenAI 兼容 API 的对话装进**可分支的节点图**。读完 AI 回答、遇到不熟的术语，选中文字按 `Tab`，自动生成子节点继续追问——无限深度、随时回退、最终一键导出为 Obsidian Canvas / Markdown / Mermaid 思维导图。

![spider screenshot](.github/screenshot.png)

[更新说明](CHANGELOG.md) · [提问统计说明](docs/usage-statistics.md)

> 首次安装时 Spider 会跟随 Obsidian 的界面语言，也可以随时在设置中切换中文或 English。

---

## 🤔 为什么需要 Spider？

| 场景 | 普通 AI 对话 | Spider |
|---|---|---|
| 读到一半想深入追问一个术语 | 复制粘贴 → 新开窗口 → 丢失原对话线索 | 选中文字 → `Tab` → 子节点自动带上下文 |
| 同一个问题想对比几种提问方式 | 开 N 个标签页来回切 | 同一节点下挂多个子节点，左右对照 |
| 探索完想把对话留作笔记 | 复制粘贴到笔记里，链接断裂 | 给节点写个人笔记，再导出 Markdown + Canvas |
| 想让 AI 回答像 Notion AI 一样嵌在文档里 | 切窗口来回复制 | 全程不离开 Obsidian |

## ⚡ 30 秒上手

1. **安装**：设置 → 第三方插件 → 浏览 → 搜索 `Spider` → 安装 → 启用
2. **配置 API Key**：Settings → Spider → 填 `apiBaseUrl` + `apiKey` + `model`（任何 OpenAI 兼容端点都行）
3. **新建一张图**：点击 Spider ribbon 图标（或运行命令 `Spider: 新建 Spider 图谱`）→ 开始聊天
4. **试试 Tab 分支**：AI 回答里选中一段文字，按 `Tab` —— 就这么简单

---

## ✨ 核心特性

### 🌳 无限分支的对话
- **没有深度上限**：想追问多深就追问多深，图会跟着长
- **父上下文自动带入**：子节点的问题发到 AI 时，自动带上父节点的标题/摘要/锚点
- **流式响应**：打字机式的实时渲染，Markdown / 代码块同步高亮
- **选中即分支**：AI 回答里高亮任意文字 → `Tab` → 子节点的"原文锚点"就是这段高亮
- **就地提示**：选中 AI 正文后显示「Tab 创建分支」，也可以直接点击；取消选择即隐藏
- **回到原句**：返回父节点或点击路径导航时恢复阅读位置，并短暂高亮分支的来源；普通节点切换也保留本次会话的阅读位置
- **辅助动作**：重试、总结、AI 自动起标题

### 📚 教学风格与随记
- 设置 → 学习方式：循序渐进、启发提问、简明要点，或自定义系统提示词；下一次提问生效
- 选中 AI 回答 → `Enter`：保存到当前节点的个人随记，原有笔记会保留
- 输入框上方显示两行「个人随记」预览；展开阅读 Markdown，点击「编辑随记」补充自己的理解；自动保存
- 导出包的 `notes.md` 汇总随记，保留节点标题、完整路径、层级和原节点链接

### 🕸️ 交互式知识图谱
- **全标签页画布**（React Flow 驱动）
- **点击节点切换上下文**，右侧聊天面板自动跟随
- **折叠 / 展开子树**：大图也能保持清爽
- **自动布局**（Dagre 算法），路径自动高亮
- **拖拽节点**：位置持久化，下次打开还是你摆的样子
- **节点个人笔记**：悬停铅笔预览，点击固定编辑，并自动保存

### 📦 一键导出完整包

```
Spider Maps/
  ├── index.md                  # Obsidian 入口笔记
  ├── brief.md                  # 关键结论、待研究问题与进度
  ├── notes.md                  # 带节点路径和层级的随记汇总
  ├── nodes/                    # 每个节点一份独立 md
  ├── map.canvas                # 可编辑知识图谱
  └── map.svg                   # 可缩放、可分享的知识图谱图片
```

- Canvas 节点带颜色编码（紫色=根 / 绿色=已理解 / 灰色=已归档 / 蓝色=进行中）
- Canvas 直接展示概念标题、短摘要和完整笔记链接，节点之间预留清晰间距
- 沿箭头阅读分支，原文锚点保留在笔记中，避免长标签遮挡图谱
- SVG 保留同样的疏朗布局，缩小时仍显示标题和摘要，放大不失真
- 重复导出会新建带序号的快照目录，保留之前的导出和手写补充
- Markdown 之间双向链接 + 回链，构建完整思考链

### 🔌 兼容任何 OpenAI 兼容 API
- **官方 OpenAI**（`https://api.openai.com/v1`）
- **DeepSeek / Moonshot / 通义千问 / 智谱 GLM**（OpenAI 兼容模式）
- **OpenRouter / Together / Groq**（聚合 API）
- **本地 LLM**：Ollama、vLLM、LM Studio 的 OpenAI 兼容模式
- **通过代理的 Anthropic Claude**

> 💡 鉴于是 OpenAI 兼容端点，你只需要填 base URL 和 key，model 填你想用的那个。

### 🔐 隐私 & 网络声明
- 插件**需要联网**才能调用 AI，但你完全掌控调用哪个端点
- **API key 仅存本地**（Obsidian 插件的 data.json），不上传任何地方
- **不读取无关笔记**：AI 请求只包含当前分支，以及你主动开启的上下文内容
- **图谱数据 100% 本地**：所有地图存为 `.spider/maps/*.json`，可被 Obsidian 同步
- **离线可用**：知识图谱、导航、导出、查看历史全部不依赖网络，只有"发送消息"需要

### 🌐 中英双语
首次安装时跟随 Obsidian 的界面语言，也可以随时切换中文 / English；新生成的导出文件使用当前 Spider 界面语言。

---

## ⌨️ 快捷键速查

| 按键 | 作用 |
|---|---|
| `Tab` | 在 AI 回答里选中文字后创建分支；图谱画布获得焦点时创建空分支 |
| `Shift + Tab` | 图谱画布获得焦点时返回父节点 |
| `← →` | 图谱画布获得焦点时在父节点与第一个子节点间移动 |
| `↑ ↓` | 图谱画布获得焦点时在兄弟节点之间移动 |
| `Enter` | 选中 AI 正文时加入节点随记；在输入框中发送消息 |
| `Shift + Enter` | 换行（在输入框） |
| `Esc` | 清除当前选区 |
| `Delete` / `Backspace` | 图谱画布获得焦点时删除当前非根节点 |

---

## ⚙️ 配置项

| 设置 | 说明 | 默认值 |
|---|---|---|
| API Base URL | OpenAI 兼容端点 | `https://api.openai.com/v1` |
| API Key | 你的 API key（密码输入框，本地存储） | — |
| Model | 该端点支持的任意模型名 | `gpt-4o-mini` |
| Teaching style | 内置教学模板或自定义系统提示词，仅作用于对话回答 | 默认 |
| Interface Language | 中文 / English | 跟随 Obsidian |
| Include parent context | 子节点请求是否带父节点的标题/摘要/锚点 | ✅ 开 |
| Include full context | 把图谱中其他分支也作为参考（更费 token） | ❌ 关 |
| Stream responses | 流式响应 | ✅ 开 |
| Tab to create child nodes | Tab 键开关 | ✅ 开 |
| Auto-summarize nodes | AI 自动给节点生成摘要 | ❌ 关 |
| Default export folder | 导出包目录 | `Spider Maps` |

---

## 📥 安装

### 从社区插件市场安装（推荐）

打开 **设置 → 第三方插件 → 浏览**，搜索 `Spider`，点击 **安装 → 启用**，然后在 **设置 → Spider** 中配置 API key 和 model。

### 从 GitHub Release 手动安装
1. 从最新 [Release](https://github.com/111pointer111/spider/releases/latest) 下载 `main.js`、`manifest.json` 和 `styles.css`
2. 创建 `<vault>/.obsidian/plugins/spider/`
3. 把三个文件复制到该目录
4. 重启 Obsidian，在 **Settings → Community plugins** 中启用 Spider，然后配置 API key 和 model

### 从源码安装（开发）
```bash
git clone https://github.com/111pointer111/spider
cd spider
npm install
npm run build
# 把 main.js, manifest.json, styles.css 复制到
# <vault>/.obsidian/plugins/spider/
# 然后在 Obsidian 里启用插件
```

或者用 `npm run link` 自动建 symlink 到你的 vault，配合 `npm run dev` 实现改代码即生效。

---

## 🛠 开发

```bash
npm install        # 安装依赖
npm run dev        # watch 模式（esbuild）
npm run build      # 生产构建（含 tsc --noEmit 类型检查）
npm test           # 跑 vitest 测试
npm run test:browser # 打开本地地址，点击 Run source navigation checks 验证真实浏览器交互（模拟 Obsidian API，不读写笔记库）
npm run link       # 把构建产物 symlink 到 vault
```

### 项目结构

```
src/
  ai/          OpenAI 兼容 API provider（流式 + 同步 + summarize）
  domain/      ChatMap 不可变工厂 + 树操作 + 守卫 + Dagre 布局
  export/      Markdown / Mermaid / Canvas / SVG / JSON 格式导出
  state/       多视图会话管理 + 单会话 ViewState
  storage/     Vault 内 JSON 持久化（兼容旧目录）
  ui/          React 组件（图、聊天面板、画廊、弹窗）
  utils/       ID 生成、路径处理、activeDocument 兼容垫片
tests/         vitest 单测（领域层 + 导出层 + AI 层）
__mocks__/     Obsidian API 的桩模块（让 vitest 跑得起来）
```

## 🧭 路线图（想到就写）

- [ ] 多选节点 + 批量操作
- [ ] 节点引用 / 反向链接（自动追踪"哪个节点引用了我"）
- [x] 自定义 system prompt 与教学风格模板
- [ ] 导出时可选附 AI 摘要

---

## 📜 许可证

[MIT](LICENSE)

---

## 🙏 致谢

- [Obsidian](https://obsidian.md) — 这个疯狂可扩展的笔记应用
- [React Flow (@xyflow/react)](https://reactflow.dev/) — 画布引擎
- [@dagrejs/dagre](https://github.com/dagrejs/dagre) — 自动布局
- [费曼学习法](https://en.wikipedia.org/wiki/Feynman_technique) — 用"能给别人讲清楚"作为理解标准

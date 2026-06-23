# spider

**spider** turns AI conversations into expandable knowledge maps. Read an AI answer, meet an unfamiliar concept — press `Tab` to branch into a deep-dive chat. Keep branching. Build a map.

![spider screenshot](https://github.com/111pointer111/spider/raw/main/.github/screenshot.png)

## How It Works

```
Chat → Tab → Child Chat → Tab → Deeper → Shift+Tab → Back
```

Every AI response is a **node** in a graph. Press `Tab` to drill into any concept. The graph grows on the left, the current conversation lives on the right. No depth limit.

- **← → ↑ ↓** — navigate between sibling and parent/child nodes
- **Tab** — create a child node from the current question, or from selected text
- **Shift+Tab** — return to the parent node
- **Enter** — send a message | **Shift+Enter** — newline

## Features

### 🧠 Branching AI Chat
- Infinite depth: drill down on any concept without losing context
- Optional parent context included in AI requests
- Streaming responses with real-time markdown rendering
- Select any text in a response and press `Tab` to create a focused child node
- Retry, summarize, and auto-title nodes with AI

### 🕸️ Interactive Knowledge Graph
- Full-tab canvas powered by React Flow
- Click nodes to switch context; the chat panel follows
- Collapse/expand subtrees
- Auto-layout with Dagre
- Active and ancestor path highlighting

### 📦 Structured Exports
One-click export produces a complete package:

```
Spider Maps/
  ├── README.md                 # Package overview
  ├── index.md                   # Obsidian entry point
  ├── nodes/                     # Per-node chat histories
  ├── diagrams/mindmap.mermaid.md
  ├── canvas/map.canvas          # Visual knowledge map
  └── data/map.json              # Raw data
```

Canvas exports include colored node states, arrow labels, and inline file previews. Markdown files link to parent, child, and index — backlinks connect the thinking chain.

### 🔐 Privacy & Network Disclosure
- This plugin **requires network access** to function. It connects to the AI API endpoint you configure (default: `api.openai.com`). You must provide your own API key.
- AI requests include: current node messages, optional parent context and selected anchor text
- Your API key stays in local Obsidian plugin data on your device
- No vault-wide scanning. Only current node context is sent
- All maps and plugin features (graph, navigation, exports) work fully offline without AI
- All maps are stored as local JSON files in `.spider/maps`

### 🌐 Multi-Language
Interface available in **Chinese** and **English**. Switch anytime in settings.

## Installation

1. Open Obsidian → **Settings** → **Community plugins**
2. Browse → search "**spider**"
3. Install, then enable it
4. Configure your **API key** and **model** in spider settings

### From source (development)

```bash
npm install
npm run build
```

Copy `main.js`, `manifest.json`, `styles.css` to your vault's `.obsidian/plugins/spider/` and reload.

## Configuration

| Setting | Description |
|---|---|
| API Base URL | OpenAI-compatible endpoint (default: `https://api.openai.com/v1`) |
| API Key | Your API key (stored locally) |
| Model | Any model your endpoint supports (e.g. `gpt-4o-mini`) |
| Interface Language | Chinese / English |

## Compatibility

- Obsidian v1.5.0+
- Desktop & mobile
- Any OpenAI-compatible API (OpenAI, DeepSeek, Anthropic via proxy, local LLMs)

## Project Structure

```
src/
  ai/          OpenAI-compatible API provider
  domain/      Chat map mutations, guards, layout algorithms
  export/      Markdown, Mermaid, Canvas, and JSON exporters
  state/       Per-view state management
  storage/     Vault-backed JSON persistence
  ui/          React components (graph, chat, gallery)
  utils/       ID and text helpers
```

## Development

```bash
npm install       # Install dependencies
npm run dev       # Watch mode (esbuild)
npm run build     # Production build
npm test          # Run tests
```

## License

MIT

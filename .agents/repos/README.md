# GitHub Repositories Tham Khảo

Danh sách các repo GitHub hữu ích, phân loại theo lĩnh vực.

---

## 📺 IPTV (Xem TV Toàn Cầu)

| Repo | Stars | Mô tả | Link |
|------|-------|-------|------|
| iptv-org/iptv | 132k | Collection IPTV channels 200+ quốc gia | https://github.com/iptv-org/iptv |
| iptv-org/awesome-iptv | 11k | Danh sách apps, providers, EPG | https://github.com/iptv-org/awesome-iptv |
| 4gray/iptvnator | - | Cross-platform IPTV player | https://github.com/4gray/iptvnator |
| EdenwareApps/Megacubo | - | IPTV streaming app | https://github.com/EdenwareApps/Megacubo |

### Playlists
```
Tất cả channels: https://iptv-org.github.io/iptv/index.m3u
Theo quốc gia: https://iptv-org.github.io/iptv/index.country.m3u
Theo ngôn ngữ: https://iptv-org.github.io/iptv/index.language.m3u
Việt Nam: https://iptv-org.github.io/iptv/countries/vn.m3u
```

---

## 🗣️ TTS (Text-to-Speech) Tiếng Việt

| Repo | Stars | Mô tả | Link |
|------|-------|-------|------|
| tronghieuit/valtec-tts | 360 | Vietnamese TTS nhẹ nhất (74.8M params) | https://github.com/tronghieuit/valtec-tts |
| nguyenvulebinh/VietVoice-TTS | 105 | Vietnamese TTS + voice cloning | https://github.com/nguyenvulebinh/VietVoice-TTS |
| dangvansam/viet-tts | - | VietTTS (OpenAI API compatible) | https://github.com/dangvansam/viet-tts |
| nghimestudio/nghitts | 139 | Browser-based TTS (VI/EN/ID) | https://github.com/nghimestudio/nghitts |
| k2-fsa/OmniVoice | 8k | 600+ languages TTS | https://github.com/k2-fsa/OmniVoice |
| SparkAudio/Spark-TTS | 11k | LLM-based TTS | https://github.com/SparkAudio/Spark-TTS |
| canopyai/Orpheus-TTS | 6k | Human-like speech | https://github.com/canopyai/Orpheus-TTS |
| OpenMOSS/MOSS-TTS | 3.8k | Speech generation family | https://github.com/OpenMOSS/MOSS-TTS |
| kyutai-labs/pocket-tts | - | CPU-only TTS, 100M params, voice cloning | https://github.com/kyutai-labs/pocket-tts |

### Pocket TTS Features
- ✅ Runs on CPU (no GPU needed)
- ✅ 100M parameters (tiny!)
- ✅ Audio streaming, ~200ms latency
- ✅ 6x real-time on MacBook Air M4
- ✅ Voice cloning
- ✅ Multi-language: EN, FR, DE, PT, IT, ES

---

## 🎨 AI Art & Image Generation

| Repo | Stars | Mô tả | Link |
|------|-------|-------|------|
| Haidra-Org/artbot | - | Frontend GUI for AI Horde (distributed Stable Diffusion) | https://github.com/Haidra-Org/artbot |
| Nutlope/logocreator | - | Free AI logo generator (Flux on Together AI) | https://github.com/Nutlope/logocreator |

---

## 🆓 Free LLM / Free AI APIs

| Repo | Stars | Mô tả | Link |
|------|-------|-------|------|
| mnfst/awesome-free-llm-apis | 5.9k | 381+ free LLM APIs | https://github.com/mnfst/awesome-free-llm-apis |
| 12britz/awesome-free-models | - | Free AI models, APIs, tools | https://github.com/12britz/awesome-free-models |
| abbosaliboev/free-ai-bible | 84 | 700+ free AI tools | https://github.com/abbosaliboev/free-ai-bible |
| cheahjs/free-llm-api-resources | - | Free LLM API resources | https://github.com/cheahjs/free-llm-api-resources |
| alvinreal/awesome-opensource-ai | 4.2k | Open-source AI projects | https://github.com/alvinreal/awesome-opensource-ai |

### Free API Providers
| Provider | Free Models | Link |
|----------|-------------|------|
| Google Gemini | 14 | https://aistudio.google.com/ |
| Groq | 12 | https://console.groq.com/ |
| GitHub Models | 13 | https://github.com/marketplace/models |
| NVIDIA NIM | 121 | https://build.nvidia.com/ |
| OpenRouter | 20 free | https://openrouter.ai/ |

---

## 🕵️ Anti-Detect & Stealth Browsers

| Repo | Stars | Mô tả | Link |
|------|-------|-------|------|
| CloakHQ/CloakBrowser | 29k | Stealth Chromium - 71 C++ patches, passes 30+ bot detection tests | https://github.com/CloakHQ/CloakBrowser |

### CloakBrowser Features
- ✅ 71 source-level C++ patches (canvas, WebGL, fonts, GPU...)
- ✅ reCAPTCHA v3 score: 0.9 (human-level)
- ✅ Passes Cloudflare Turnstile, FingerprintJS, BrowserScan
- ✅ `humanize=True` - human-like mouse/keyboard/scroll
- ✅ Drop-in Playwright/Puppeteer replacement
- ✅ Works: browser-use, Crawl4AI, Scrapling, Stagehand, LangChain

### Install
```bash
pip install cloakbrowser
npm install cloakbrowser
```

---

## 🔀 AI API Proxy & Gateway

| Repo | Stars | Mô tả | Link |
|------|-------|-------|------|
| router-for-me/CLIProxyAPI | - | Wrap CLI (Claude Code, Codex, Gemini) thành OpenAI/Gemini/Claude API | https://github.com/router-for-me/CLIProxyAPI |

### CLIProxyAPI Features
- ✅ Free Gemini 3.1 Pro, GPT 5.5, Grok 4.3, Claude qua API
- ✅ OpenAI/Gemini/Claude compatible endpoints
- ✅ OAuth login (Claude Code, Codex, Grok Build)
- ✅ Multi-account round-robin load balancing
- ✅ Streaming, function calling, multimodal
- ✅ Dashboard: https://github.com/itsmylife44/cliproxyapi-dashboard

### Supported Models
| Provider | Models |
|----------|--------|
| Kimi | K3, K2.7 Code |
| OpenAI | GPT 5.6, GPT 5.5 |
| Anthropic | Claude Fable, Opus, Sonnet |
| Google | Gemini 3.5 Flash, 3.1 Pro |
| xAI | Grok 4.5, Composer 2.5 |

### Install
```bash
# Download from releases
https://github.com/router-for-me/CLIProxyAPI/releases
```

---

## 🤖 AI Coding Agents

| Repo | Stars | Mô tả | Link |
|------|-------|-------|------|
| MoonshotAI/kimi-code | 5k | AI coding agent CLI - Kimi K3, K2.7 Code models | https://github.com/MoonshotAI/kimi-code |

### Kimi Code Features
- ✅ Terminal AI coding agent
- ✅ Subagents (coder, explore, plan)
- ✅ MCP configuration via chat
- ✅ Editor integration (Zed, JetBrains) via ACP
- ✅ Single-binary distribution
- ✅ Models: Kimi K3, K2.7 Code

### Install
```bash
npm i -g @moonshot-ai/kimi-code
```

---

## 📚 Programming Learning

| Repo | Stars | Mô tả | Link |
|------|-------|-------|------|
| codecrafters-io/build-your-own-x | 523k | Master programming by recreating technologies from scratch | https://github.com/codecrafters-io/build-your-own-x |

### Topics covered
- Build your own Database, Docker, Git, Blockchain, Neural Network, Operating System, Web Server...

---

## 🧠 AI Agent Memory

| Repo | Stars | Mô tả | Link |
|------|-------|-------|------|
| MemMachine/MemMachine | 4k | Long-term memory layer for AI agents (episodic, profile, working memory) | https://github.com/MemMachine/MemMachine |

### MemMachine Features
- ✅ Episodic Memory: Graph-based conversational context
- ✅ Profile Memory: Long-term user facts (SQL)
- ✅ Working Memory: Short-term context
- ✅ Python SDK, REST API, TypeScript SDK, MCP Server
- ✅ Self-hosted or Cloud
- ✅ Works: OpenAI, Anthropic, Bedrock, Ollama

---

## 🎨 Design Tools (Open Source)

| Repo | Stars | Mô tả | Link |
|------|-------|-------|------|
| hyscaler/HyCanvas | 25 | Free Canva alternative - self-hostable, AI-native design platform | https://github.com/hyscaler/HyCanvas |

### HyCanvas Features
- ✅ Social graphics, presentations, videos, whiteboards, docs
- ✅ No paywalls, no watermarks
- ✅ BYOK AI layer
- ✅ Single binary deployment (Go + embedded frontend)
- ✅ PostgreSQL backend
- ✅ Self-hosted

### Install
```bash
# Download từ GitHub releases
https://github.com/hyscaler/HyCanvas/releases
```

---

## 🎬 AI Video & Animation

| Repo | Stars | Mô tả | Link |
|------|-------|-------|------|
| HBAI-Ltd/Toonflow-app | 12k | AI short drama factory - tiểu thuyết → phim hoạt hình | https://github.com/HBAI-Ltd/Toonflow-app |
| Vincentwei1021/video-shotcraft | - | AI video skill: cinematic product videos with Remotion | https://github.com/Vincentwei1021/video-shotcraft |
| calesthio/OpenMontage | 42k | Open-source agentic video production system (12 pipelines, 100+ tools) | https://github.com/calesthio/OpenMontage |
| heygen-com/hyperframes | 37k | HTML → video renderer, built for agents | https://github.com/heygen-com/hyperframes |
| anil-matcha/open-generative-ai | 24k | Unrestricted AI video platform (400+ models: Flux, Kling, Sora, Veo) | https://github.com/anil-matcha/open-generative-ai |
| OpenDemon/Pilipili-AutoVideo | - | Fully automated AI video agent - one sentence to final cut | https://github.com/OpenDemon/Pilipili-AutoVideo |
| code2mp4/code2mp4 | - | Agent-native video production pipeline | https://github.com/code2mp4/code2mp4 |

### video-shotcraft Features
- ✅ 106 shot recipe cards
- ✅ 161 motion previews
- ✅ 162 styles
- ✅ Remotion implementation (React-based video)
- ✅ 2.5D camera moves, beat-synced cuts
- ✅ Works with Claude Code & Codex

### Install
```bash
npx skills add Vincentwei1021/video-shotcraft
```

### ToonFlow Features
- ✅ AI Scriptwriting - tự动生成 kịch bản
- ✅ Storyboard generation - phân cảnh tự động
- ✅ Character generation - tạo nhân vật từ text
- ✅ Video composition - ghép video AI
- ✅ Infinite canvas workbench
- ✅ Cross-platform desktop (Electron)
- ✅ Supports: Tencent, Gemini, Veo, Kling

### Install
```bash
# Download từ GitHub releases
https://github.com/HBAI-Ltd/Toonflow-app/releases
```

---

## 📡 WiFi Sensing & Spatial Intelligence

| Repo | Stars | Mô tả | Link |
|------|-------|-------|------|
| ruvnet/RuView | 86k | WiFi sensing - detect people, vital signs, through walls (no cameras) | https://github.com/ruvnet/ruview |

### RuView Features
- ✅ Through-wall presence detection
- ✅ Vital signs monitoring (breathing, heart rate)
- ✅ Movement tracking
- ✅ Fall detection
- ✅ Multi-person tracking
- ✅ $9 ESP32 sensors (no expensive hardware)
- ✅ Privacy-first: no cameras, no wearables
- ✅ Runs on edge (no cloud required)

### Hardware
| Component | Price | Capability |
|-----------|-------|------------|
| ESP32-S3 | ~$9 | Presence, motion, breathing |
| ESP32-S3 + Cognitum Seed | ~$140 | Full: vital signs, fall detection, multi-person |

---

## 🌐 AI Browsers & Agentic Web

| Repo | Stars | Mô tả | Link |
|------|-------|-------|------|
| browseros-ai/BrowserOS | 12k | Open-source Chromium fork với AI agent built-in (privacy-first) | https://github.com/browseros-ai/BrowserOS |

### BrowserOS Features
- ✅ 53+ browser automation tools
- ✅ MCP Server - control từ Claude Code, Cursor
- ✅ Cowork - browser + file operations
- ✅ Scheduled Tasks - chạy agent tự động
- ✅ 40+ app integrations (Gmail, Slack, GitHub, Notion...)
- ✅ BYOK: Claude, OpenAI, Gemini, Ollama (local)
- ✅ uBlock Origin ad blocking

### Install
```bash
# macOS
curl -fsSL https://files.browseros.com/download/BrowserOS.dmg
# Windows
curl -fsSL https://files.browseros.com/download/BrowserOS_installer.exe
# Linux
curl -fsSL https://files.browseros.com/download/BrowserOS.AppImage
```

---

## 🛡️ AI Agent Safety

| Repo | Stars | Mô tả | Link |
|------|-------|-------|------|
| Dicklesworthstone/destructive_command_guard | 5k | Block destructive commands from AI agents (git reset, rm -rf...) | https://github.com/Dicklesworthstone/destructive_command_guard |

---

## 🖥️ Desktop Control & MCP

| Repo | Stars | Mô tả | Link |
|------|-------|-------|------|
| wonderwhy-er/DesktopCommanderMCP | - | MCP server: file system, terminal, process management | https://github.com/wonderwhy-er/DesktopCommanderMCP |

---

## 🔄 Workflow Orchestration

| Repo | Stars | Mô tả | Link |
|------|-------|-------|------|
| PrefectHQ/prefect | 23k | Workflow orchestration framework for Python data pipelines | https://github.com/PrefectHQ/prefect |

---

## 🤖 AI Agent Apps & RAG

| Repo | Stars | Mô tả | Link |
|------|-------|-------|------|
| Shubhamsaboo/awesome-llm-apps | 120k | 100+ AI Agent & RAG apps (clone, customize, ship) | https://github.com/Shubhamsaboo/awesome-llm-apps |

---

## 🎯 Prompt Optimization

| Repo | Stars | Mô tả | Link |
|------|-------|-------|------|
| linshenkx/prompt-optimizer | - | AI prompt optimizer (web, desktop, Chrome, Docker) | https://github.com/linshenkx/prompt-optimizer |
| meta-llama/prompt-ops | - | LLM prompt optimization for Llama models | https://github.com/meta-llama/prompt-ops |
| Sherin-SEF-AI/prompt-optimizer | - | A/B testing framework for LLM prompts | https://github.com/Sherin-SEF-AI/prompt-optimizer |

---

## 🎨 Anti-AI-Slop Design

| Repo | Stars | Mô tả | Link |
|------|-------|-------|------|
| Nutlope/hallmark | 13k | Anti-AI-slop design skill (Claude Code, Cursor, Codex) | https://github.com/Nutlope/hallmark |

### Hallmark Features
- ✅ 20 themes (macrostructure + style)
- ✅ 57 slop-test gates (chống AI design)
- ✅ 4 verbs: build, audit, redesign, study
- ✅ Extract DNA from designs you admire
- ✅ Works with Claude Code, Cursor, Codex
- ✅ MIT License

### Install
```bash
npx skills add nutlope/hallmark
```

### Verbs
| Verb | Mô tả |
|------|-------|
| `hallmark` | Build new UI (default) |
| `hallmark audit <target>` | Score existing code, detect AI-slop |
| `hallmark redesign <target>` | Rebuild with different fingerprint |
| `hallmark study <screenshot\|URL>` | Extract design DNA |

---

## 🎬 Animation & Motion

| Repo | Stars | Mô tả | Link |
|------|-------|-------|------|
| juliangarnier/anime | 71k | JavaScript animation engine (CSS, SVG, DOM, JS) | https://github.com/juliangarnier/anime |

---

## ⚛️ React Components

| Repo | Stars | Mô tả | Link |
|------|-------|-------|------|
| DavidHDev/react-bits | 44k | 140+ animated React components (text, backgrounds, UI) | https://github.com/DavidHDev/react-bits |

---

## 🖥️ GUI Automation & Agents

| Repo | Stars | Mô tả | Link |
|------|-------|-------|------|
| Mininglamp-AI/Mano-P | - | Local GUI-VLA agent for edge devices (Mac mini) | https://github.com/Mininglamp-AI/Mano-P |

---

## 🔍 Search Infrastructure

| Repo | Stars | Mô tả | Link |
|------|-------|-------|------|
| anysearch-ai/anysearch-skill | 4.7k | Unified real-time search engine skill for AI agents | https://github.com/anysearch-ai/anysearch-skill |

---

## 🎨 Open Design (Claude Design Alternative)

| Repo | Stars | Mô tả | Link |
|------|-------|-------|------|
| nexu-io/open-design | - | Open-source Claude Design alternative (desktop app, BYOK) | https://github.com/nexu-io/open-design |

---

## 🔎 Web Intelligence (Local-first)

| Repo | Stars | Mô tả | Link |
|------|-------|-------|------|
| KnockOutEZ/wigolo | 3.5k | Local-first web intelligence - search, fetch, crawl, extract, cache, research - no API keys | https://github.com/KnockOutEZ/wigolo |

### Wigolo Features
- ✅ 10 tools: search, fetch, crawl, extract, cache, find_similar, research, agent, diff, watch
- ✅ 18 search adapters, ML reranking
- ✅ Headless browser on anti-bot challenges
- ✅ MCP + REST + SDK
- ✅ No API keys for core tools
- ✅ Works with Claude Code, Cursor, Codex, Gemini CLI, VS Code

### Install
```bash
npx wigolo init --agents=claude-code,cursor,codex
```

---

## 🎬 Slides & Presentation

| Repo | Stars | Mô tả | Link |
|------|-------|-------|------|
| 1weiho/open-slide | - | React slide framework for AI agents (Claude Code skills) | https://github.com/1weiho/open-slide |

### Open-Slide Features
- ✅ Scaffold: `npx @open-slide/cli init my-slide`
- ✅ Claude Code skills preconfigured (create-slide, apply-comments)
- ✅ 1920×1080 canvas, React + Vite
- ✅ MIT License

---

## 🎬 Video Generation (HTML → Video)

| Repo | Stars | Mô tả | Link |
|------|-------|-------|------|
| heygen-com/hyperframes | - | HTML → MP4 video framework for agents (19 skills) | https://github.com/heygen-com/hyperframes |

### HyperFrames Features
- ✅ HTML/CSS → deterministic MP4 video
- ✅ 19 agent skills (code-diff, code-scroll, flowchart, data-chart...)
- ✅ CLI: init, lint, preview, render, publish
- ✅ AWS Lambda distributed rendering
- ✅ WebGL shader transitions
- ✅ Works with Claude Code, Cursor, Codex

---

## 🎬 Video Editor (Open Source)

| Repo | Stars | Mô tả | Link |
|------|-------|-------|------|
| OpenCut-app/OpenCut | 30k+ | Open-source CapCut alternative (Web + Desktop + Mobile) | https://github.com/OpenCut-app/OpenCut |
| Ekaanth/OpenCut-AI | 160 | AI video editor: transcribe, edit by text, clone voices | https://github.com/Ekaanth/OpenCut-AI |
| floomhq/opencut | - | Code-driven video production (React + Remotion + Whisper) | https://github.com/floomhq/opencut |

### OpenCut Features
- ✅ Timeline-based editing, multi-track support
- ✅ Real-time preview, no watermarks
- ✅ Cross-platform (Web, Desktop, Mobile)
- ✅ MIT License
- ✅ AI version: edit video by text, voice cloning, filler removal

---

## 🎨 Design & Anti-Slop

| Repo | Stars | Mô tả | Link |
|------|-------|-------|------|
| Nutlope/hallmark | 13k | Anti-AI-slop design skill | https://github.com/Nutlope/hallmark |
| pbakaus/impeccable | - | Design language, commands, hooks, anti-patterns | https://github.com/pbakaus/impeccable |
| Leonxlnx/taste-skill | 65k | Gives AI good taste - stops boring/generic slop | https://github.com/Leonxlnx/taste-skill |

---

## 🎬 Video Generation

| Repo | Stars | Mô tả | Link |
|------|-------|-------|------|
| Tencent-Hunyuan/HunyuanVideo | 12k | Video foundation model 13B | https://github.com/Tencent-Hunyuan/HunyuanVideo |
| Lightricks/LTX-Video | 10k | DiT-based video gen (4K) | https://github.com/Lightricks/LTX-Video |
| meituan-longcat/LongCat-Video | 5k | Text-to-Video | https://github.com/meituan-longcat/LongCat-Video |
| bytedance/Bernini | 1.1k | Video generation/editing | https://github.com/bytedance/Bernini |
| Orkas-AI/Orkas-VideoStudio | 530 | Video studio agent | https://github.com/Orkas-AI/Orkas-VideoStudio |
| coderXcode/video-forger | 11 | Text → animated MP4 | https://github.com/coderXcode/video-forger |
| OpenDemon/Pilipili-AutoVideo | - | Auto video agent | https://github.com/OpenDemon/Pilipili-AutoVideo |

---

## 🤖 AI Agent Frameworks (Top Ranked)

| Repo | Stars | Mô tả | Link |
|------|-------|-------|------|
| obra/superpowers | 257k | Agentic skills framework & software dev methodology | https://github.com/obra/superpowers |
| affaan-m/everything-claude-code | 231k | Agent harness performance optimization system | https://github.com/affaan-m/everything-claude-code |
| NousResearch/hermes-agent | 217k | Self-improving AI agent with learning loop | https://github.com/NousResearch/hermes-agent |
| garrytan/gstack | 121k | Garry Tan's Claude Code setup (23 specialists) | https://github.com/garrytan/gstack |
| Shubhamsaboo/awesome-llm-apps | 124k | 100+ AI Agent & RAG apps | https://github.com/Shubhamsaboo/awesome-llm-apps |
| langchain-ai/langchain | 142k | LLM framework | https://github.com/langchain-ai/langchain |
| microsoft/autogen | 59k | Multi-agent framework | https://github.com/microsoft/autogen |
| crewAIInc/crewAI | 55k | Multi-agent orchestration | https://github.com/crewAIInc/crewAI |
| openai/openai-agents-python | 28k | OpenAI Agents SDK | https://github.com/openai/openai-agents-python |
| earendil-works/pi | 73k | AI agent toolkit: unified LLM API, agent loop, TUI | https://github.com/earendil-works/pi |
| HKUDS/nanobot | 46k | Lightweight AI agent for tools, chats, workflows | https://github.com/HKUDS/nanobot |
| lsdefine/GenericAgent | 13k | Minimal self-evolving autonomous agent (~3K lines) | https://github.com/lsdefine/GenericAgent |
| stablyai/orca | - | Desktop workspace for parallel coding agents | https://github.com/stablyai/orca |

---

## 🛠️ AI Dev Kits & Skills

| Repo | Stars | Mô tả | Link |
|------|-------|-------|------|
| openai/skills | 24k | Skills Catalog for Codex (deprecated → use openai/plugins) | https://github.com/openai/skills |
| addyosmani/agent-skills | 80k | Production-grade engineering skills (24 skills, 8 slash commands) | https://github.com/addyosmani/agent-skills |
| vudovn/ag-kit | 8k | 🇻🇳 AI Agent templates: 20 agents, 47 skills, 13 workflows (Vietnamese dev) | https://github.com/vudovn/ag-kit |
| noah-sheldon/ai-dev-kit | 13 | 59 skills, 33 agents for Claude Code/Codex/Gemini | https://github.com/noah-sheldon/ai-dev-kit |

| Repo | Stars | Mô tả | Link |
|------|-------|-------|------|
| noah-sheldon/ai-dev-kit | 13 | 59 skills, 33 agents for Claude Code/Codex/Gemini | https://github.com/noah-sheldon/ai-dev-kit |
| viknesh20-20/claude-code-tool-kit | 5 | 200+ skills, 45+ MCP servers, 14 plugins | https://github.com/viknesh20-20/claude-code-tool-kit |
| addyosmani/agent-skills | 79k | Production-grade engineering skills for AI agents | https://github.com/addyosmani/agent-skills |
| Leonxlnx/taste-skill | 65k | Anti-AI-slop design skill | https://github.com/Leonxlnx/taste-skill |
| ruvnet/ruflo | 65k | Agent meta-harness - deploy intelligent multi-player swarms | https://github.com/ruvnet/ruflo |
| thedotmack/claude-mem | 87k | Persistent context across sessions for every agent | https://github.com/thedotmack/claude-mem |
| DietrichGebert/ponytail | 86k | Makes AI agent think like laziest senior dev | https://github.com/DietrichGebert/ponytail |

---

## 🌐 Browser Automation & Web Intelligence

| Repo | Stars | Mô tả | Link |
|------|-------|-------|------|
| microsoft/Webwright | 5.8k | SOTA browser agent framework (terminal-based) | https://github.com/microsoft/Webwright |
| browser-use/browser-use | 86k | Make websites accessible for AI agents | https://github.com/browser-use/browser-use |
| firecrawl/firecrawl | - | Web scraping for AI agents | https://github.com/firecrawl/firecrawl |
| Panniantong/Agent-Reach | 58k | Give AI agent eyes to see entire internet | https://github.com/Panniantong/Agent-Reach |

---

## 🔒 Security & Sandboxing

| Repo | Stars | Mô tả | Link |
|------|-------|-------|------|
| TencentCloud/CubeSandbox | - | Hardware-isolated sandboxes for agent execution | https://github.com/TencentCloud/CubeSandbox |
| destructive_command_guard | - | Blocks dangerous shell/git/database commands | https://github.com/search?q=destructive+command+guard |
| agentshield | - | Security auditor for AI agent configs | https://github.com/affaan-m/everything-claude-code#agentshield |

---

## 🧠 Memory & Context

| Repo | Stars | Mô tả | Link |
|------|-------|-------|------|
| mem0ai/mem0 | 61k | Universal memory layer for AI agents | https://github.com/mem0ai/mem0 |
| thedotmack/claude-mem | 87k | Persistent context across sessions | https://github.com/thedotmack/claude-mem |
| shareAI-lab/learn-claude-code | 71k | Nano claude code-like agent harness | https://github.com/shareAI-lab/learn-claude-code |

---

## 📚 AI From Scratch / Learning

| Repo | Stars | Mô tả | Link |
|------|-------|-------|------|
| rohitg00/ai-engineering-from-scratch | 41k | 503 lessons, 20 phases, learn AI end-to-end | https://github.com/rohitg00/ai-engineering-from-scratch |
| angelos-p/llm-from-scratch | 3k | Train your own LLM from scratch (workshop) | https://github.com/angelos-p/llm-from-scratch |
| viralcode/superGPT | 12 | Train LLM with GPT-4/DeepSeek innovations | https://github.com/viralcode/superGPT |

## 📝 Grammar & Writing

| Repo | Stars | Mô tả | Link |
|------|-------|-------|------|
| Automattic/harper | 11k | Offline, privacy-first grammar checker (Rust) | https://github.com/Automattic/harper |
| hekko.ai | - | AI notetaker for students | https://hekko.ai |

## 🔍 Code Intelligence

| Repo | Stars | Mô tả | Link |
|------|-------|-------|------|
| tirth8205/code-review-graph | 25k | Local-first code graph for AI review | https://github.com/tirth8205/code-review-graph |
| alibaba/open-code-review | 11k | AI code review CLI (Alibaba) | https://github.com/alibaba/open-code-review |

## 🗄️ Databases & Analytics

| Repo | Stars | Mô tả | Link |
|------|-------|-------|------|
| duckdb/duckdb | 39k | Analytical in-process SQL database | https://github.com/duckdb/duckdb |

## 🔒 Security & Pentesting

| Repo | Stars | Mô tả | Link |
|------|-------|-------|------|
| usestrix/strix | 43k | AI pentesting - autonomous AI hackers find & fix vulnerabilities | https://github.com/usestrix/strix |

### Strix Features
- ✅ Autonomous AI penetration testing
- ✅ Validates findings with PoCs
- ✅ One-click autofix (AI-generated PRs)
- ✅ GitHub Actions / CI/CD integration
- ✅ Works with GitHub, GitLab, Bitbucket

---

## 🎬 Video Editing (AI)

| Repo | Stars | Mô tả | Link |
|------|-------|-------|------|
| Phalanyx/stitch | - | AI video editing - natural language → edit timeline | https://github.com/Phalanyx/stitch |
| floomhq/opencut | - | Code-driven video production (React + Remotion) | https://github.com/floomhq/opencut |

### Stitch Features
- ✅ Natural language video editing
- ✅ Lilo Agent - AI modifies timeline
- ✅ Semantic video search (Twelve Labs)
- ✅ AI-generated transitions (VEO)
- ✅ Text-to-Speech narration (ElevenLabs)

---

## 📧 Email & Marketing

| Repo | Stars | Mô tả | Link |
|------|-------|-------|------|
| Billionmail/BillionMail | 14k | Open-source MailServer + NewsLetter + Email Marketing (self-hosted) | https://github.com/Billionmail/BillionMail |

---

## 🛠️ AI Dev Kits & Skills

| Repo | Stars | Mô tả | Link |
|------|-------|-------|------|
| RapidThoughtLabs/heku | 23 | Dynamic MCP server (lazy tool discovery) | https://github.com/RapidThoughtLabs/heku |
| DeusData/codebase-memory-mcp | 32k | Persistent code knowledge graph for AI agents | https://github.com/DeusData/codebase-memory-mcp |
| tirth8205/code-review-graph | 25k | Local-first code graph for AI review | https://github.com/tirth8205/code-review-graph |
| rtk-ai/rtk | - | CLI proxy cuts LLM tokens 60-90% (Rust) | https://github.com/rtk-ai/rtk |
| chiennv2000/orthrus | 429 | Lossless LLM inference via dual-view diffusion (7.8x speedup) | https://github.com/chiennv2000/orthrus |
| dottxt-ai/outlines | - | Structured outputs for constrained LLM generation | https://github.com/dottxt-ai/outlines |

---

## 🖥️ Office & Document Automation

| Repo | Stars | Mô tả | Link |
|------|-------|-------|------|
| iOfficeAI/OfficeCLI | 20k | Single binary: read/write/render DOCX/XLSX/PPTX (no Office needed) | https://github.com/iOfficeAI/OfficeCLI |

---

## 🚀 Deployment & Sandboxing

| Repo | Stars | Mô tả | Link |
|------|-------|-------|------|
| oblien/openship | - | Self-hosted deployment platform | https://github.com/oblien/openship |
| TencentCloud/CubeSandbox | - | Hardware-isolated sandboxes for agent execution | https://github.com/TencentCloud/CubeSandbox |
| ogulcancelik/herdr | - | Terminal multiplexer for multiple agents | https://github.com/ogulcancelik/herdr |
| stablyai/orca | 25k | Desktop workspace for parallel coding agents | https://github.com/stablyai/orca |

---

## 🧠 Codebase Analysis & Knowledge Graph

| Repo | Stars | Mô tả | Link |
|------|-------|-------|------|
| Egonex-AI/Understand-Anything | 75k | Turn codebase into interactive knowledge graph (Claude Code plugin) | https://github.com/Egonex-AI/Understand-Anything |

### Understand Anything Features
- ✅ Multi-agent pipeline: 5-7 agents phân tích codebase
- ✅ Interactive knowledge graph dashboard
- ✅ Guided tours - học codebase theo thứ tự
- ✅ Fuzzy & semantic search
- ✅ Diff impact analysis
- ✅ Works: Claude Code, Codex, Cursor, Copilot, Gemini CLI...

### Install
```bash
/plugin marketplace add Egonex-AI/Understand-Anything
/plugin install understand-anything
/understand
```

---

## 🇨🇳 Chinese AI Agent Skills

| Platform | Skills | Mô tả | Link |
|----------|--------|-------|------|
| CocoLoop Hub | 135k+ | Kho Skills AI lớn nhất Trung Quốc - như App Store cho AI agents | https://hub.cocoloop.cn |

### CocoLoop Features
- ✅ 135,347 skills có sẵn
- ✅ 50+ platforms hỗ trợ (Claude Code, Cursor, Copilot, Gemini...)
- ✅ CLS Security Check - phân loại an toàn A/S/S+
- ✅国内镜像 - tải nhanh tại Trung Quốc
- ✅ Molili client - quản lý skills dễ dàng
- ✅ AI matching - mô tả nhu cầu, AI gợi ý skill phù hợp

### Skill Categories
- 🤖 AI Enhancement
- 💻 Development
- 🎨 Design
- 📝 Office Efficiency
- 🎬 Content Creation
- 🔧 Professional Skills

### Popular Skills
- capability-evolver (9.8k) - AI Agent tự tiến hóa
- agent-overflow (7.3k) - Collective memory & collaboration
- agent-browser (17.2k) - AI browser automation

---

## 🆓 No-Signup Tools Collection

| Repo | Stars | Mô tả | Link |
|------|-------|-------|------|
| BraveOPotato/FckSignups | 1.8k | Danh sách tools miễn phí, không cần đăng ký, dùng trong browser | https://github.com/BraveOPotato/FckSignups |

### FckSignups Features
- ✅ 50+ tools không cần signup
- ✅ Category齐全: Image, Video, Audio, PDF, Code, Privacy...
- ✅ Open source React + TypeScript
- ✅ Website: https://nosignups.net

### Install
```bash
git clone https://github.com/BraveOPotato/FckSignups.git
cd FckSignups && npm install && npm run dev
```

---

## 🔍 Search & Research

| Repo | Stars | Mô tả | Link |
|------|-------|-------|------|
| koala73/worldmonitor | - | AI-powered global intelligence dashboard | https://github.com/koala73/worldmonitor |
| langchain-ai/openwiki | 12k | Auto-generate AI-friendly documentation | https://github.com/langchain-ai/openwiki |
| Panniantong/Agent-Reach | 58k | Give AI agent eyes to see entire internet | https://github.com/Panniantong/Agent-Reach |

---

## 💼 Productivity & Job Tools

| Repo | Stars | Mô tả | Link |
|------|-------|-------|------|
| MadsLorentzen/ai-job-search | 23k | Automate job applications with AI | https://github.com/MadsLorentzen/ai-job-search |
| santifer/career-ops | 60k | AI job search: scan portals, score listings, tailor CV | https://github.com/santifer/career-ops |
| dreamhunter2333/cloudflare_temp_email | - | Free temporary email with Cloudflare Workers | https://github.com/dreamhunter2333/cloudflare_temp_email |

---

## 🎵 Audio & Music AI

| Tool | Mô tả | Link |
|------|-------|------|
| Suno | AI music - full songs with vocals (~60s) | https://suno.com |
| Udio | High-quality AI music generation | https://udio.com |
| ElevenLabs | Industry-leading TTS + voice cloning | https://elevenlabs.io |
| Bark | Open-source TTS (multilingual) | https://github.com/suno-ai/bark |
| MusicGen | Meta's music generation | https://github.com/facebookresearch/audiocraft |
| Descript | Audio/video editing by text | https://descript.com |

---

## 🖼️ Image Generation AI (Local Studio)

| Repo | Stars | Mô tả | Link |
|------|-------|-------|------|
| lidge-jun/ima2-gen | 554 | Local AI studio: CLI + Web UI for GPT Image 2, Grok, Gemini | https://github.com/lidge-jun/ima2-gen |

### ima2-gen Features
- ✅ Classic mode: generate, edit, reuse, history
- ✅ Node mode: branch variations from parent image
- ✅ Video generation via Grok
- ✅ Canvas Mode: cleanup, annotate, export
- ✅ Providers: ChatGPT OAuth (free), Grok, Gemini, OpenAI API
- ✅ Multimode batches: parallel generation

### Install
```bash
npm install -g ima2-gen
ima2 serve
```

---

## 🖼️ Image Generation AI

| Tool | Mô tả | Link |
|------|-------|------|
| Flux | State-of-the-art open image model | https://blackforestlabs.ai |
| Stable Diffusion | Open-source image generation | https://stability.ai |
| ComfyUI | Node-based workflow for SD | https://github.com/comfyanonymous/ComfyUI |
| Fooocus | Simplified SD (Midjourney-like) | https://github.com/lllyasviel/Fooocus |
| Midjourney | Highest quality artistic images | https://midjourney.com |
| Ideogram | AI art with text rendering | https://ideogram.ai |

---

## 🧠 Local LLM Tools

| Tool | Mô tả | Link |
|------|-------|------|
| Ollama | Chạy LLM local dễ nhất | https://ollama.com/ |
| LM Studio | GUI đẹp, GGUF support | https://lmstudio.ai/ |
| LocalAI | OpenAI API replacement | https://localai.io/ |
| Jan | Privacy-first local chat | https://jan.ai/ |
| GPT4All | Local LLM chatbot | https://gpt4all.io/ |

---

## 🚀 AI Gateway / Router

| Repo | Stars | Mô tả | Link |
|------|-------|-------|------|
| diegosouzapw/OmniRoute | 29k | Free AI Gateway: 290+ providers, 500+ models, auto-fallback, RTK compression | https://github.com/diegosouzapw/OmniRoute |

### OmniRoute Features
- ✅ 290+ providers (90+ free, 11 free forever)
- ✅ 500+ models (Claude, GPT, Gemini, DeepSeek, MiniMax, GLM, Kimi...)
- ✅ Auto-fallback (quota out → next provider)
- ✅ RTK + Caveman compression (save 15-95% tokens)
- ✅ MCP Server (104 tools, 31 scopes)
- ✅ A2A Protocol (agent-to-agent)
- ✅ Works with Claude Code, Codex, Cursor, Cline, Copilot, OpenCode
- ✅ OpenAI ↔ Claude ↔ Gemini ↔ Responses API translation
- ✅ Circuit breakers, TLS stealth, memory, guardrails

### Install
```bash
npm install -g omniroute
omniroute
```
Dashboard: http://localhost:20128
API: http://localhost:20128/v1

---

## 📋 Awesome Lists & Free Resources

| Repo | Stars | Mô tả | Link |
|------|-------|-------|------|
| mnfst/awesome-free-llm-apis | 5.9k | 381+ free LLM APIs | https://github.com/mnfst/awesome-free-llm-apis |
| mdruhulkuddus/awesome-free-ai-tools | - | 231+ genuinely free AI tools (35 categories) | https://github.com/mdruhulkuddus/awesome-free-ai-tools |
| T-R-I-T-E-J/awesome-free-ai-resources | - | 290+ free AI tools & resources | https://github.com/T-R-I-T-E-J/awesome-free-ai-resources |
| rocnubie/Awesome-AI-Websites-2026 | - | Best free AI websites 2026 | https://github.com/rocnubie/Awesome-AI-Websites-2026 |
| 0xvibly/awesome-ai-tools-2026 | - | Curated AI tools 2026 | https://github.com/0xvibly/awesome-ai-tools-2026 |
| OuterSpacee/awesome-ai-tools | - | Comprehensive AI tools list | https://github.com/OuterSpacee/awesome-ai-tools |
| ComposioHQ/awesome-claude-skills | 70k | Curated Claude skills & resources | https://github.com/ComposioHQ/awesome-claude-skills |

---

## 🧮 Data & Analytics

| Repo | Stars | Mô tả | Link |
|------|-------|-------|------|
| duckdb/duckdb | 39k | Analytical in-process SQL database | https://github.com/duckdb/duckdb |
| OtterMind/Chat2DB | - | AI-driven database tool & SQL client | https://github.com/OtterMind/Chat2DB |
| t8y2/dbx | - | 20MB cross-platform DB client (70+ DBs) + AI | https://github.com/t8y2/dbx |

---

## 🔧 Developer Tools

| Repo | Stars | Mô tả | Link |
|------|-------|-------|------|
| huggingface/transformers | - | NLP models | https://github.com/huggingface/transformers |
| ggml-org/llama.cpp | 100k+ | C/C++ inference engine | https://github.com/ggml-org/llama.cpp |
| vllm-project/vllm | - | LLM serving engine | https://github.com/vllm-project/vllm |
| ollama/ollama | - | Local LLM runner | https://github.com/ollama/ollama |

---

*Cập nhật: Tháng 7/2026*
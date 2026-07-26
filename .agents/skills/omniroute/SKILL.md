# Skill: omniroute

## Mô tả
Free AI Gateway - một endpoint, 290+ providers (90+ free), 500+ models. Auto-fallback, RTK compression, MCP/A2A.

## Repository
- **Repo**: https://github.com/diegosouzapw/OmniRoute
- **Stars**: 29k+
- **License**: MIT

## Install
```bash
npm install -g omniroute
omniroute
```

## Quick Start
```bash
# Khởi động server
omniroute

# Dashboard: http://localhost:20128
# API: http://localhost:20128/v1
```

## Features
- ✅ 290+ providers (90+ free, 11 free forever)
- ✅ 500+ models (Claude, GPT, Gemini, DeepSeek, MiniMax, GLM, Kimi)
- ✅ Auto-fallback (quota out → next provider)
- ✅ RTK + Caveman compression (save 15-95% tokens)
- ✅ MCP Server (104 tools, 31 scopes)
- ✅ A2A Protocol (agent-to-agent)
- ✅ OpenAI ↔ Claude ↔ Gemini ↔ Responses API translation
- ✅ Circuit breakers, TLS stealth, memory, guardrails

## Supported Tools
- Claude Code
- Codex CLI
- Gemini CLI
- Cursor
- Cline
- Copilot
- OpenCode
- 20+ more tools

## Base URL
```
http://localhost:20128/v1
```

## Free Providers
| Provider | Models | Limit |
|----------|--------|-------|
| Kiro AI | Claude Sonnet/Haiku | Unlimited |
| Qoder AI | Kimi-K2, DeepSeek-R1 | Unlimited |
| Pollinations | GPT-5, Claude, Llama 4 | No API key |
| LongCat AI | Flash-Lite | 50M/day |
| Cloudflare AI | 50+ models | 10K neurons/day |
| NVIDIA NIM | Llama, Mistral | 1K req/day |

## Usage with Claude Code
```bash
# Thêm OmniRoute as MCP server
claude mcp add-server omniroute --type http --url http://localhost:20128/api/mcp/stream
```

## Usage with OpenCode
```json
{
  "provider": {
    "omniroute": {
      "baseURL": "http://localhost:20128/v1"
    }
  }
}
```

## Dashboard
- URL: http://localhost:20128/dashboard
- Quản lý providers
- Xem usage/stats
- Configure routing
- Manage API keys

## Documentation
- Website: https://omniroute.online
- Docs: https://github.com/diegosouzapw/OmniRoute/tree/main/docs
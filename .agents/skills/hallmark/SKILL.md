# Skill: hallmark

## Mô tả
Anti-AI-slop design skill - làm cho UI không trông giống AI-generated.由 Together AI phát triển.

## Repository
- **Repo**: https://github.com/Nutlope/hallmark
- **Stars**: 13k+
- **License**: MIT

## Install
```bash
npx skills add nutlope/hallmark
```

Hoặc copy `SKILL.md` + `references/` vào:
- **Claude Code**: `~/.claude/skills/hallmark/`
- **Cursor**: `.cursor/rules/hallmark.mdc`
- **Codex**: `~/.codex/skills/hallmark/`

## 4 Verbs

| Verb | Mô tả |
|------|-------|
| `hallmark` (default) | Build new UI - picks macrostructure, applies rule-set, runs 57 slop tests |
| `hallmark audit <target>` | Score existing code against anti-patterns. Punch list, no edits |
| `hallmark redesign <target>` | Rebuild with different fingerprint, keep content + IA + brand |
| `hallmark study <screenshot\|URL>` | Extract design DNA (macrostructure, type-pairing, colour anchor) |

## Features
- ✅ 20 themes (macrostructure + style)
- ✅ 57 slop-test gates
- ✅ Custom theme (design from scratch)
- ✅ Extract DNA from any design
- ✅ Works with Claude Code, Cursor, Codex

## Anti-Patterns Hallmark Chatches
- AI nav (wordmark hard-left, 4 links, CTA hard-right)
- Generic gradient backgrounds
- Cookie-cutter templates
- Overused shadows/borders
- Lack of visual hierarchy

## Ví dụ
```bash
# Build new landing page
hallmark build a pricing page for SaaS product

# Audit existing code
hallmark audit src/components/

# Redesign page
hallmark redesign index.html --mood dark

# Study a design
hallmark study https://stripe.com
```

## References
- Website: https://www.usehallmark.com
- Docs: https://github.com/Nutlope/hallmark/tree/main/docs
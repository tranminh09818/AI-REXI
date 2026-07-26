# AUTO-DETECT SKILL PROMPT

Copy nội dung bên dưới vào system prompt / AGENTS.md / .cursorrules / settings của bất kỳ AI agent nào:

---

## PROMPT START

```
## SKILL AUTO-DETECTION RULES

You have access to a skills library at ~/.agents/skills/

### Before responding to ANY task:

1. **Scan for skill match** - Check if the task matches any skill below
2. **Load immediately** - If match found, load the skill FIRST
3. **Follow skill instructions** - Use the skill's methodology

### Available Skills (by trigger words):

**VIDEO/MEDIA:**
- "video", "watch", "YouTube", "TikTok", "transcript" → Load skill: watch
- "screenshot", "capture", "screen" → Load skill: screenshot
- "image", "analyze image", "describe image", "OCR" → Load skill: vision-analysis
- "desktop control", "computer use" → Load skill: computer-use

**PROMPT/JAILBREAK:**
- "jailbreak", "bypass", "DAN", "unlock AI", "remove restrictions" → Load skill: prompt-jailbreak
- "prompt injection", "override system" → Load skill: prompt-jailbreak

**DESIGN/UI:**
- "landing page", "UI", "frontend", "React", "component" → Load skill: frontend-design
- "banner", "social media", "ad design" → Load skill: banner-design
- "logo", "brand", "identity" → Load skill: brand or design
- "redesign", "upgrade UI" → Load skill: redesign-existing-projects
- "accessibility", "a11y", "WCAG" → Load skill: accessibility

**DEVELOPMENT:**
- "API integration", "REST", "endpoint" → Load skill: apilayer
- "Node.js", "Express", "backend" → Load skill: nodejs-backend-patterns
- "security scan", "vulnerability" → Load skill: codeql
- "SEO", "meta tags", "sitemap" → Load skill: seo
- "code search", "function lookup" → Load skill: codebase

**DOCUMENTS:**
- "Word document", "DOCX", "report" → Load skill: officecli-docx or docx-master
- "PDF", "edit PDF", "merge PDF" → Load skill: stirling-pdf
- "PowerPoint", "slides", "deck" → Load skill: pptx

**TESTING:**
- "Playwright", "E2E test" → Load skill: playwright-best-practices
- "TestCafe" → Load skill: testcafe

**DEPLOYMENT:**
- "deploy", "Vercel", "go live" → Load skill: deploy-to-vercel

**AI AGENTS:**
- "build AI agent", "chatbot" → Load skill: hermes-agent or parlant
- "RAG", "knowledge base" → Load skill: zleap-sag
- "browser automation" → Load skill: browser-use or stagehand
- "persistent memory" → Load skill: agentmemory

**NETWORK/INFRA:**
- "SSH", "remote server" → Load skill: ssh
- "IPTV", "streaming" → Load skill: iptv
- "free domain", "DNS" → Load skill: freedomain

### How to load a skill:

For OpenCode:
- Use tool: skill(name="skill-name")

For Claude Code:
- Read the skill file: Read ~/.agents/skills/[category]/[skill-name]/SKILL.md

For Cursor:
- Follow instructions in the SKILL.md file

For any AI agent:
- Read the SKILL.md file from the skills directory
- Follow the methodology described

### NEVER skip skill loading. Always check FIRST before responding.
```

## PROMPT END

---

## Installation Instructions:

### For OpenCode:
1. Create file: ~/.opencode/AGENTS.md
2. Paste the prompt above
3. Restart OpenCode

### For Claude Code:
1. Create file: ~/.claude/CLAUDE.md
2. Paste the prompt above
3. Restart Claude Code

### For Cursor:
1. Create file: .cursorrules in your project
2. Paste the prompt above
3. Restart Cursor

### For any other AI agent:
1. Find the system prompt configuration
2. Paste the prompt above
3. Restart the agent

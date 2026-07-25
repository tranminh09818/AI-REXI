# AI REXI – Design System & UI Philosophy

## Triết lý thiết kế
AI Rexi không phải một chatbot thông thường. Giao diện phải truyền cảm giác **một công cụ lập trình đỉnh cao** — như Vercel v0, Cursor IDE, Linear App. 

## Bảng màu & Token
```
Background:    #08090c  (gần đen tuyền, sâu)
Surface-1:     #0e1117  (card, sidebar)
Surface-2:     #161b25  (input, hover)
Surface-3:     #1e2434  (modal, tooltip)
Border:        rgba(255,255,255,0.06)
Border-hover:  rgba(255,255,255,0.12)

Primary:       #7c6aff  (violet gradient chủ đạo)
Primary-glow:  #5b4fcf
Accent-cyan:   #22d3ee
Accent-pink:   #f472b6
Accent-emerald:#34d399

Text-primary:  #f0f2f8
Text-secondary:#8892a4
Text-muted:    #4b5568
```

## Typography
- Font: **Inter** (Google Fonts) — không dùng system-ui
- Code font: **JetBrains Mono**
- Size scale: 11 / 12 / 13 / 14 / 16 / 20 / 24 / 32px

## Gradient chủ đạo
- Brand: `from-violet-600 via-blue-500 to-cyan-400` (diagonal)
- Glow effect: `box-shadow: 0 0 40px rgba(124,106,255,0.15)`
- AI avatar: violet → blue
- User avatar: pink → orange

## Layout nguyên tắc
1. **Sidebar**: 260px, nền `#0e1117`, không viền thẳng mà dùng gradient fade
2. **Chat area**: Centered max-w-2xl, padding rộng, không bị bí
3. **Input box**: Nổi bật với viền gradient khi focus, icon toolbar tinh tế
4. **Messages**: 
   - User: bubble phải, bg `#1e2434` + viền violet mờ
   - AI: không bubble, text plain, heading gradient violet
5. **Micro-animations**: `transition-all duration-200`, hover lift `translateY(-1px)`

## Yêu cầu bắt buộc
- Dùng `100dvh` để full screen mobile
- Font Inter import từ Google Fonts trong index.html
- Không dùng màu đỏ/xanh lá đơn giản cho status — dùng gradient/glow
- Mọi button phải có `active:scale-95` bounce effect
- Sidebar conversation items: hiện thời gian tương đối (hôm nay, hôm qua...)
- Glassmorphism cho modal: `backdrop-blur-xl bg-[#0e1117]/90 border border-white/8`
- Code blocks: custom header với tên ngôn ngữ + nút copy

## Anti-patterns (KHÔNG làm)
- ❌ Không dùng màu xanh dương (#3b82f6) đơn thuần — quá generic
- ❌ Không rounded-full cho button lớn — dùng rounded-xl
- ❌ Không shadow to bè bè đen — dùng color shadow (violet/cyan tint)
- ❌ Không để placeholder text quá ngắn ("Gõ ở đây...")
- ❌ Không cứng nhắc theo 1 framework UI — tự sáng tạo

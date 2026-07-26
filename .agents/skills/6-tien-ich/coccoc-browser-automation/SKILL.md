# Coccoc Browser Automation Skill

## Overview
Automation control of Coccoc browser using `pyautogui` + clipboard paste. Works when CDP/WebSocket not available.

## Key Learnings

### 1. Coccoc DevTools Console
- **F12** toggles DevTools
- Console requires typing "allow pasting" first before executing JS
- Use clipboard paste (`Ctrl+V`) NOT `pyautogui.typewrite()` (font issues with special chars)

### 2. Clipboard Paste Method
```python
import subprocess
# Copy text to clipboard (UTF-16LE for Windows)
subprocess.run(['clip'], input='your text here'.encode('utf-16le'), check=True)
# Then Ctrl+V to paste
pyautogui.hotkey('ctrl', 'v')
```

### 3. Messenger Panel Navigation
- Coccoc Messenger panel is embedded in inspect page, NOT accessible via JS `document.querySelector`
- No iframes, no shadow DOM - it's a native browser feature
- **Keyboard arrows** work for image navigation in viewer (not mouse clicks on arrows)
- `pyautogui.press('right')` / `pyautogui.press('left')` to navigate images

### 4. Image Viewer Navigation
- Click image to open viewer
- Use `pyautogui.press('right')` to go next
- Use `pyautogui.press('left')` to go previous
- Use `pyautogui.press('escape')` to close viewer
- Mouse click on arrow buttons does NOT work reliably

### 5. Scrolling
```python
# Scroll up (positive value)
pyautogui.scroll(3)
# Scroll down (negative value)
pyautogui.scroll(-3)
```
- Must click on target area first before scrolling
- `window.scrollTo(0,0)` does NOT work on Coccoc internal pages

### 6. Screenshot for Debugging
```python
pyautogui.screenshot().save('D:/Temp/debug.png')
```

## Common Patterns

### Open URL in Coccoc
```python
import pyautogui, time, subprocess
# Click address bar
pyautogui.click(350, 72)
time.sleep(0.3)
# Paste URL
subprocess.run(['clip'], input='https://example.com'.encode('utf-16le'), check=True)
pyautogui.hotkey('ctrl', 'a')
time.sleep(0.1)
pyautogui.hotkey('ctrl', 'v')
time.sleep(0.3)
pyautogui.press('enter')
time.sleep(5)
```

### Navigate Messenger Images
```python
# Click on image grid
pyautogui.click(x, y)
time.sleep(1)
# Navigate with keyboard
for i in range(12):
    pyautogui.press('right')
    time.sleep(0.8)
    pyautogui.screenshot().save(f'D:/Temp/img_{i}.png')
```

### Close Battery/Popup Warnings
```python
# Click Close button on popup
pyautogui.click(close_button_x, close_button_y)
time.sleep(0.5)
```

## Important Notes
- `pyautogui.typewrite()` has font issues - always use clipboard paste
- Coccoc remote debugging on port 9222 returns 404 on `/json/list`
- `browser-use` and `orca` tools not available on this system
- Always take screenshots for debugging state

## Lessons Learned (24/07/2026)

### Arrow Keys Navigation Issue
- When image viewer is open, `pyautogui.press('right')` may navigate REEL thumbnails instead of image viewer
- **Root cause**: Arrow keys affect the focused element - could be reel feed or image viewer
- **Solution**: Click directly on image thumbnails in chat to open viewer, then use arrows

### Correct Image Viewer Navigation
1. Click on image thumbnail in Messenger chat (not on reel feed)
2. Wait 1-1.5 seconds for viewer to load
3. Then use `pyautogui.press('right')` to navigate
4. Take screenshot after each navigation to verify

### Notification Panel Blocking
- Notification panel (`Thông báo`) may open and block Messenger panel
- Close it before proceeding with image viewing
- Use `pyautogui.press('escape')` to close overlays

### Messenger Chat Scroll Position
- Chat needs to be scrolled to correct position before clicking thumbnails
- Image groups show "Bạn đã gửi X ảnh" with thumbnails below
- Click on first thumbnail to open image viewer

# Hướng Dẫn Fix MCP Error — Antigravity IDE

## 🔴 Vấn Đề

**MCP Error** hiển thị trong status bar bottom-right của Antigravity IDE (Cline).

### Nguyên Nhân Có Thể
1. MCP server chưa được cấu hình đúng
2. MCP extension đang load nhưng gặp lỗi kết nối
3. MCP configuration file bị thiếu hoặc corrupt

---

## ✅ Giải Pháp

### Cách 1: Kiểm Tra MCP Configuration

1. **Mở Command Palette:**
   ```
   Ctrl + Shift + P
   ```

2. **Tìm và chọn:**
   ```
   "MCP: List Servers"
   hoặc
   "Antigravity: MCP Settings"
   ```

3. **Kiểm tra output:** Xem danh sách MCP servers đang active

---

### Cách 2: Restart IDE với Clear Cache

```powershell
# 1. Đóng Antigravity IDE hoàn toàn
# 2. Xóa cache
Remove-Item -Recurse -Force "$env:USERPROFILE\.antigravity" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:USERPROFILE\.cache\antigravity" -ErrorAction SilentlyContinue

# 3. Restart IDE
```

---

### Cách 3: Kiểm Tra MCP Extensions

```powershell
# List tất cả extensions
code --list-extensions

# Tìm extensions liên quan đến MCP
code --list-extensions | Select-String "mcp"
```

**Extensions cần thiết:**
- `antigravity.mcp-server` (nếu có)
- Các MCP tools khác đang active

---

### Cách 4: Manual MCP Configuration

Tạo file `.vscode/mcp.json` trong project root:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "D:/AI REXI"]
    },
    "fetch": {
      "command": "uvx",
      "args": ["mcp-server-fetch"]
    }
  }
}
```

Sau đó restart IDE.

---

### Cách 5: Disable MCP Nếu Không Cần

Nếu bạn không cần MCP tools, có thể disable:

1. Mở Settings (`Ctrl + ,`)
2. Tìm `"mcp.enabled"`
3. Set thành `false`
4. Restart IDE

---

## 🔍 Debug Steps

### 1. Check IDE Logs
```
View → Output → Select "Antigravity" từ dropdown
```

### 2. Check Developer Tools
```
Help → Toggle Developer Tools → Console tab
```
Tìm error messages liên quan đến MCP.

### 3. Verify Node.js Version
```powershell
node --version
# Cần >= v18.x
```

---

## 📋 Troubleshooting Checklist

- [ ] Restart IDE
- [ ] Clear cache (.antigravity folder)
- [ ] Check MCP configuration file
- [ ] Verify MCP extensions installed
- [ ] Check IDE logs for specific error
- [ ] Update Antigravity IDE to latest version
- [ ] Reinstall MCP extensions nếu cần

---

## 🚀 Quick Fix (Recommended)

```powershell
# 1. Close IDE completely
# 2. Run this in PowerShell
Stop-Process -Name "Antigravity" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# 3. Clear cache
$paths = @(
    "$env:USERPROFILE\.antigravity",
    "$env:USERPROFILE\.cache\antigravity",
    "$env:APPDATA\Antigravity"
)
foreach ($path in $paths) {
    if (Test-Path $path) {
        Remove-Item -Recurse -Force $path -ErrorAction SilentlyContinue
    }
}

# 4. Restart IDE
Start-Process "Antigravity"
```

---

## 📞 Nếu Vẫn Lỗi

1. **Check GitHub Issues:**
   https://github.com/antigravity/ide/issues

2. **Community Support:**
   - Discord: [Antigravity Community]
   - Forum: [Antigravity Forum]

3. **Alternative:** Sử dụng Cursor hoặc Claude Code nếu MCP không quan trọng

---

**Lưu ý:** MCP Error thường không ảnh hưởng đến core functionality của IDE. Bạn vẫn có thể code bình thường. Error này chỉ cảnh báo rằng một số MCP tools có thể không hoạt động.

**Ngày tạo:** 2025-08-02  
**Tác giả:** Cline AI Assistant

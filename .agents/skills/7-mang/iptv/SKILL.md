---
name: iptv
description: Internet Protocol Television — streaming live TV and on-demand content over IP networks. Use when building IPTV players, playlist management, EPG integration, or streaming infrastructure.
---

# IPTV (Internet Protocol Television)

Delivering television content over IP networks instead of traditional terrestrial, satellite, or cable formats.

## Key Protocols & Formats

- **M3U / M3U8**: Playlist format for channel lists
- **EPG (XMLTV)**: Electronic Program Guide in XML format
- **HLS**: HTTP Live Streaming by Apple (`.m3u8` segments)
- **MPEG-TS**: Transport stream container for live TV
- **RTMP**: Real-Time Messaging Protocol for streaming

## Common Tools

### Players
- **VLC Media Player**: Cross-platform, supports M3U/EPG
- **IPTV Smarters**: Mobile/STB player
- **TiviMate**: Android TV IPTV player
- **Kodi**: Media center with IPTV addons (PVR IPTV Simple Client)

### Server/Proxy
- **xTeVe**: M3U proxy/emulator for Plex, Emby, Channels
- **TVHeadend**: Open-source TV streaming server
- **Plex**: Media server with Live TV/DVR support

### EPG
- **EPG-Buddy**: EPG grabber and editor
- **WebGrab+Plus**: XMLTV EPG grabber
- **EPG123**: Windows EPG guide tool

## M3U Playlist Format

```
#EXTM3U
#EXTINF:-1 tvg-id="vn1" tvg-name="VTV1" group-title="VN Channels",VTV1
http://example.com/stream/vtv1.ts
#EXTINF:-1 tvg-id="vn2" tvg-name="VTV2" group-title="VN Channels",VTV2
http://example.com/stream/vtv2.ts
```

## Links

- VLC: https://www.videolan.org/vlc/
- xTeVe: https://xteve.de/
- TVHeadend: https://tvheadend.org/

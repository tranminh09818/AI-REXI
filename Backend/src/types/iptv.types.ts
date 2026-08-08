{
  "name": "channel",
  "type": "object",
  "required": ["name", "url"],
  "properties": {
    "name": {
      "type": "string",
      "description": "Tên kênh"
    },
    "url": {
      "type": "string",
      "description": "URL stream"
    },
    "logo": {
      "type": "string",
      "description": "URL logo"
    },
    "group": {
      "type": "string",
      "description": "Nhóm kênh"
    },
    "country": {
      "type": "string",
      "description": "Mã quốc gia (2 chữ)"
    },
    "status": {
      "type": "string",
      "enum": ["online", "offline"],
      "description": "Trạng thái kênh"
    },
    "ping": {
      "type": "number",
      "description": "Ping latency"
    },
    "scan_id": {
      "type": "integer",
      "description": "ID của lần quét"
    }
  }
}

{
  "name": "scan",
  "type": "object",
  "required": [],
  "properties": {
    "id": {
      "type": "integer",
      "description": "ID lần quét"
    },
    "status": {
      "type": "string",
      "enum": ["running", "completed", "error"],
      "description": "Trạng thái quét"
    },
    "start_time": {
      "type": "string",
      "format": "date-time",
      "description": "Thời gian bắt đầu"
    },
    "end_time": {
      "type": "string",
      "format": "date-time",
      "description": "Thời gian kết thúc"
    },
    "channels_found": {
      "type": "integer",
      "description": "Số kênh tìm thấy"
    },
    "channels_added": {
      "type": "integer",
      "description": "Số kênh được thêm"
    }
  }
}

{
  "name": "export_request",
  "type": "object",
  "required": ["format"],
  "properties": {
    "format": {
      "type": "string",
      "enum": ["m3u", "json", "csv"],
      "description": "Định dạng xuất"
    },
    "filters": {
      "type": "object",
      "description": "Bộ lọc (country, status, group)"
    }
  }
}
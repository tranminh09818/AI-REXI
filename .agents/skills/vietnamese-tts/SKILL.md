# Skill: vietnamese-tts

## Mô tả
Chuyển văn bản thành giọng nói tiếng Việt (Text-to-Speech) với chất lượng cao, hỗ trợ voice cloning và đa giọng nói.

## Repositories chính
| Repo | Stars | Link |
|------|-------|------|
| **tronghieuit/valtec-tts** | 360 | https://github.com/tronghieuit/valtec-tts |
| **nguyenvulebinh/VietVoice-TTS** | 105 | https://github.com/nguyenvulebinh/VietVoice-TTS |
| **dangvansam/viet-tts** | - | https://github.com/dangvansam/viet-tts |
| **nghimestudio/nghitts** | 139 | https://github.com/nghimestudio/nghitts |
| **k2-fsa/OmniVoice** | 8k | https://github.com/k2-fsa/OmniVoice |

---

## 1. Valtec TTS (Nhẹ nhất - 74.8M params)

### Cài đặt
```bash
pip install git+https://github.com/tronghieuit/valtec-tts.git
```

### Sử dụng
```python
from valtec_tts import ValtecTTS

tts = ValtecTTS()
tts.synthesize("Xin chào, đây là giọng nói tiếng Việt", output="output.wav")
```

### Features
- ✅ 74.8M params (nhẹ nhất)
- ✅ CPU-only (không cần GPU)
- ✅ Zero-shot voice cloning (3-10s audio)
- ✅ 5 giọng Việt (Bắc/Nam, Nam/Nữ)
- ✅ Tốc độ 4x realtime

### Built-in Voices
| Voice | Miền | Giới tính |
|-------|------|-----------|
| NF | Bắc | Nữ |
| SF | Nam | Nữ |
| NM1 | Bắc | Nam |
| SM | Nam | Nam |
| NM2 | Bắc | Nam |

---

## 2. VietVoice-TTS

### Cài đặt
```bash
git clone https://github.com/nguyenvulebinh/VietVoice-TTS.git
cd VietVoice-TTS
pip install -e ".[gpu]"  # hoặc ".[cpu]"
```

### Sử dụng
```python
from vietvoice_tts import synthesize

# Cơ bản
synthesize("Xin chào", output="hello.wav")

# Voice cloning
synthesize("Xin chào", 
          reference_audio="reference.wav",
          output="cloned.wav")
```

---

## 3. VietTTS (OpenAI API Compatible)

### Cài đặt
```bash
git clone https://github.com/dangvansam/viet-tts.git
cd viet-tts
pip install -e .
```

### Sử dụng
```python
from viet_tts import VietTTS

tts = VietTTS()
tts.synthesize("Xin chào", voice="quynh", output="output.wav")
```

### Available Voices
| # | Voice | Giới tính |
|---|-------|-----------|
| 1 | speechify_1 | Nữ |
| 2 | speechify_2 | Nữ |
| 3 | speechify_3 | Nữ |
| 4 | quynh | Nữ |
| 5 | ngocngan | Nữ |
| 6 | son-tung-mtp | Nam |
| 7 | doremon | Nam |
| 8 | jack-sparrow | Nam |

---

## 4. NghiTTS (Browser-based)

### Cài đặt
```bash
git clone https://github.com/nghimestudio/nghitts.git
cd nghitts
npm install
npm run dev
```

### Features
- ✅ Chạy trong browser (không cần server)
- ✅ Hỗ trợ Vietnamese, English, Indonesian
- ✅ Xử lý số, ngày tháng, tiền tệ tự động
- ✅ Miễn phí, commercial use allowed

---

## 5. OmniVoice (600+ languages)

### Cài đặt
```bash
pip install omnivoice
```

### Sử dụng
```python
from omnivoice import OmniVoice

tts = OmniVoice(language="vi")
tts.synthesize("Xin chào Việt Nam", output="hello.wav")
```

### Features
- ✅ 600+ ngôn ngữ (bao gồm tiếng Việt)
- ✅ Voice cloning
- ✅ Voice design (giới tính, tuổi, accent)
- ✅ Tốc độ 40x realtime

---

## So sánh

| Model | Params | GPU | Voice Cloning | Languages |
|-------|--------|-----|---------------|-----------|
| Valtec TTS | 74.8M | ❌ | ✅ | Vietnamese |
| VietVoice-TTS | - | Optional | ✅ | Vietnamese |
| VietTTS | - | Optional | ✅ | Vietnamese |
| NghiTTS | - | ❌ | ❌ | VI/EN/ID |
| OmniVoice | - | Optional | ✅ | 600+ |

---

## Recommended
- **Nhẹ nhất, chạy CPU**: Valtec TTS
- **Đa ngôn ngữ**: OmniVoice
- **Browser-based**: NghiTTS
- **Voice cloning tốt**: VietVoice-TTS
# 记忆故事问答训练 - 项目大纲

## 📋 项目概述

为阿尔茨海默症患者设计的认知训练应用，通过听故事、回答问题来锻炼记忆和逻辑思维能力。

## 👤 目标用户

- **主要用户**：奶奶（阿尔茨海默症患者）
- **操作方式**：iPhone Safari 浏览器
- **使用语言**：普通话

---

## 🎯 功能列表

### 1. 故事生成
- 我生成 50-100 字的简短故事
- 故事内容简单易懂，适合老年人

### 2. 语音朗读
- 浏览器 SpeechSynthesis API 将故事转为语音
- 匀速朗读，可控制语速

### 3. 答题环节
- 播放完毕后展示 3 个问题
- 用户按按钮录音回答
- 再次按按钮停止录音

### 4. 语音识别
- 浏览器 SpeechRecognition API 将语音转为文字
- 将文字发送给我评判

### 5. 答案评判
- 我判断回答是否正确
- 给出分数（0-100分）
- 语音播报结果

### 6. 历史记录
- 记录每次练习的日期、分数、回答内容
- 可查看历史进步

---

## 📄 文件结构

```
qna/
├── index.html          # 主页面
├── css/
│   └── style.css      # 样式
├── js/
│   ├── app.js         # 主逻辑
│   ├── tts.js         # 文字转语音
│   └── stt.js         # 语音转文字
├── api/
│   └── qwen.js        # Qwen API 调用
├── data/
│   └── history.json   # 历史记录（可选，本地存储）
├── AGENTS.md          # 项目人员
└── README.md          # 本文件
```

---

## 🔧 技术栈

| 功能 | 技术 | API |
|------|------|-----|
| 前端框架 | 原生 HTML/CSS/JS | - |
| 文字转语音 (TTS) | CosyVoice-V3-Flash | dashscope API |
| 语音转文字 (STT) | Fun-ASR | WebSocket |
| AI 对话 | qwen-max | OpenAI 兼容接口 |
| 托管 | GitHub Pages | - |

## 🔑 API 配置

- **Base URL**: `https://dashscope.aliyuncs.com`
- **API Key**: `sk-4fdce5e5cbe04b0fb479e3e500611340`

### TTS (CosyVoice)
```
POST /api/v1/services/aigc/text2audio/audio-synthesis
Model: cosyvoice-v3.5-plus
```

### STT (Fun-ASR)
```
WebSocket: wss://dashscope.aliyuncs.com/api-ws/v1/inference
Model: fun-asr-realtime
Format: pcm, sample_rate: 16000
```

### AI 对话 (OpenAI 兼容)
```
POST /compatible-mode/v1/chat/completions
Model: qwen-max
```

---

## ✅ 待确认

- [x] Qwen API Key - 已配置
- [ ] GitHub 账号准备 (urbestboy@gmail.com)
- [ ] 测试设备：iPhone Safari

---

## 🚀 部署流程

1. 本地开发完成 ✅
2. 推送到 GitHub 仓库
3. 启用 GitHub Pages
4. 测试 iPhone 麦克风权限

---

## 📱 iOS Safari 兼容性

- **TTS (语音合成)**: 使用阿里云 CosyVoice API ✅
- **STT (语音识别)**: 使用浏览器原生 SpeechRecognition API
  - iOS Safari 16.4+ 支持
  - 需要 HTTPS 环境
  - 首次使用需授权麦克风

---

## ⚠️ 注意事项

- iOS Safari 需要 HTTPS（GitHub Pages 自带）
- 首次使用需要授权麦克风权限
- SpeechRecognition 在 iOS 上支持有限，可能需要备用方案

# AGENTS.md - 项目人员

## 开发者
- **总助理** 🐱 - AI 助手，负责故事生成、答案评判、打分

## 用户
- **奶奶** - 阿尔茨海默症患者，使用普通话
- **Chris** - 项目负责人，奶奶的儿子

---

# 技术架构

## 前端（静态网页）
- **托管**：GitHub Pages
- **技术**：原生 HTML + CSS + JavaScript
- **功能**：录音、播放、UI 交互

## AI 服务（阿里云百炼）

| 功能 | 模型 | 说明 |
|------|------|------|
| **TTS** | CosyVoice-V3-Flash | 文字转语音，实时流式，反应快 |
| **STT** | Fun-ASR-2025-11-07 | 语音转文字，高精度，适合有口音 |
| **对话** | Qwen-max | 故事生成、答案评判、打分 |

## API 配置

- **API Key**：sk-4fdce5e5cbe04b0fb479e3e500611340
- **调用地址**：https://dashscope.aliyuncs.com/api/v1/

## GitHub 部署

- **账号**：urbestboy@gmail.com
- **托管**：GitHub Pages

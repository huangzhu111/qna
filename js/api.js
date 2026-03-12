/**
 * 阿里云百炼 API 调用封装
 * TTS: 浏览器自带 SpeechSynthesis
 * AI: qwen-flash (更便宜，生成快)
 */

const API_CONFIG = {
    apiKey: 'sk-4fdce5e5cbe04b0fb479e3e500611340',
    baseUrl: 'https://dashscope.aliyuncs.com'
};

/**
 * 调用 Qwen Flash 对话 API
 */
async function chat(messages) {
    const response = await fetch(`${API_CONFIG.baseUrl}/compatible-mode/v1/chat/completions`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${API_CONFIG.apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'qwen-flash',
            messages: messages,
            max_tokens: 1000
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'API 调用失败');
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

/**
 * 生成记忆故事 - 使用 AI
 */
async function generateStory() {
    const systemPrompt = `你是一个认知训练专家。请生成一个50-80字的简短故事，适合老年人记忆。
要求：
1. 简单易懂，情节清晰
2. 包含具体的人物、时间、地点
3. 故事结束后，直接给出3个选择题，格式如下：

请严格按照以下JSON格式输出，不要有其他内容：
{"story": "故事正文", "questions": [{"question": "问题文字", "options": ["A. 选项1", "B. 选项2"], "answer": "A或B"}]}`;

    const content = await chat([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: '请生成一个记忆训练故事和3个选择题。' }
    ]);

    try {
        // 尝试解析 JSON
        const result = JSON.parse(content);
        return result;
    } catch (e) {
        console.error('解析失败:', e, content);
        // 如果解析失败，返回预设故事
        return getFallbackStory();
    }
}

/**
 * 预设故事（备用）
 */
function getFallbackStory() {
    const stories = [
        {
            story: '今天早上，爷爷去公园散步。他看到一只小鸟在树上唱歌，就停下来听。太阳暖暖的，爷爷很开心。',
            questions: [
                { question: '爷爷去哪里散步？', options: ['A. 公园', 'B. 超市'], answer: 'A' },
                { question: '爷爷看到了什么？', options: ['A. 小鸟', 'B. 小猫'], answer: 'A' },
                { question: '爷爷开心吗？', options: ['A. 开心', 'B. 不开心'], answer: 'A' }
            ]
        },
        {
            story: '昨天中午，奶奶在厨房做饭。她做了红烧肉，还炒了青菜。全家一起吃饭，很热闹。',
            questions: [
                { question: '昨天是中午做饭吗？', options: ['A. 是', 'B. 不是'], answer: 'A' },
                { question: '奶奶做了什么肉？', options: ['A. 红烧肉', 'B. 炸鸡'], answer: 'A' },
                { question: '全家一起吃饭吗？', options: ['A. 是', 'B. 否'], answer: 'A' }
            ]
        }
    ];
    return stories[Math.floor(Math.random() * stories.length)];
}

/**
 * 语音合成 (TTS) - 浏览器自带
 */
function textToSpeech(text) {
    return new Promise((resolve, reject) => {
        if (!window.speechSynthesis) {
            reject(new Error('浏览器不支持语音合成'));
            return;
        }

        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'zh-CN';
        utterance.rate = 0.85; // 稍慢，适合老年人
        
        // 尝试获取中文声音
        const voices = window.speechSynthesis.getVoices();
        const chineseVoice = voices.find(v => v.lang.includes('zh')) || voices[0];
        if (chineseVoice) {
            utterance.voice = chineseVoice;
        }

        utterance.onend = () => resolve();
        utterance.onerror = (e) => reject(e);

        window.speechSynthesis.speak(utterance);
    });
}

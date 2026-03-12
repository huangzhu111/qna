/**
 * 阿里云百炼 API 调用封装
 */

const API_CONFIG = {
    apiKey: 'sk-4fdce5e5cbe04b0fb479e3e500611340',
    baseUrl: 'https://dashscope.aliyuncs.com'
};

/**
 * 调用 Qwen 对话 API (OpenAI 兼容接口)
 */
async function chat(messages, temperature = 0.7) {
    const response = await fetch(`${API_CONFIG.baseUrl}/compatible-mode/v1/chat/completions`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${API_CONFIG.apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'qwen-max',
            messages: messages,
            max_tokens: 2000,
            temperature: temperature
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
 * 生成记忆故事
 * @returns {Promise<{story: string, questions: Array}>}
 */
async function generateStory() {
    const systemPrompt = `你是一个专门为阿尔茨海默症患者设计认知训练内容专家。请生成一个50-100字的简短故事，故事要：
1. 简单易懂，情节清晰
2. 包含具体的人物、时间、地点
3. 最后生成3个是非题或选择题（可以用"是"或"否"回答）

请按以下JSON格式输出，不要有其他内容：
{
    "story": "故事正文",
    "questions": [
        {"question": "问题1", "answer": "是/否"},
        {"question": "问题2", "answer": "是/否"},
        {"question": "问题3", "answer": "是/否"}
    ]
}`;

    const content = await chat([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: '请生成一个记忆训练故事和3个问题。' }
    ]);

    try {
        const result = JSON.parse(content);
        return result;
    } catch (e) {
        console.error('解析失败，使用备用故事', e);
        return getFallbackStory();
    }
}

/**
 * 评判答案
 * @param {string} question 问题
 * @param {string} answer 用户回答
 * @param {string} correctAnswer 正确答案
 * @returns {Promise<{correct: boolean, feedback: string}>}
 */
async function judgeAnswer(question, answer, correctAnswer) {
    const systemPrompt = `你是一个认知训练评估师。用户刚才听了故事，现在需要判断他的回答是否正确。
故事的问题是："${question}"
正确答案应该是："${correctAnswer}"
用户的回答是："${answer}"

请判断用户回答是否正确（只要用户回答的意思接近正确答案就算对）。请按以下JSON格式输出：
{"correct": true/false, "feedback": "简短的评价（10字以内）"}`;

    const content = await chat([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: '请判断这个回答是否正确。' }
    ]);

    try {
        return JSON.parse(content);
    } catch (e) {
        // 简单判断
        const isCorrect = answer.toLowerCase().includes(correctAnswer.toLowerCase());
        return { correct: isCorrect, feedback: isCorrect ? '正确！' : '不对哦' };
    }
}

/**
 * 语音合成 (TTS) - CosyVoice
 * @param {string} text 要转语音的文字
 * @returns {Promise<string>} 音频 URL
 */
async function textToSpeech(text) {
    const response = await fetch(`${API_CONFIG.baseUrl}/api/v1/services/aigc/text2audio/audio-synthesis`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${API_CONFIG.apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'cosyvoice-v3.5-plus',
            input: {
                text: text,
                voice: 'aixia', // 适合老年人的温柔女声
                format: 'mp3',
                speed: 0.9, // 稍慢，清晰
                volume: 1.0
            }
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'TTS 调用失败');
    }

    const data = await response.json();
    
    if (data.output?.audio_url) {
        return data.output.audio_url;
    } else if (data.output?.audio) {
        // Base64 音频
        return `data:audio/mp3;base64,${data.output.audio}`;
    } else {
        throw new Error('无法获取音频');
    }
}

/**
 * 语音识别 (STT) 
 * 优先使用浏览器原生 SpeechRecognition API
 * 备用方案：直接返回空，让用户手动输入
 * 
 * 注意：阿里云 Fun-ASR 的 REST API 需要复杂的任务轮询，
 * 对于静态网页，推荐使用浏览器原生 API
 * 
 * @param {Blob} audioBlob 音频数据（此参数在当前实现中未使用）
 * @returns {Promise<string>} 识别结果文字
 */
async function speechToText(audioBlob) {
    // 检查浏览器是否支持 SpeechRecognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        throw new Error('浏览器不支持语音识别');
    }

    // 返回一个 Promise，让调用者通过回调获取结果
    return new Promise((resolve, reject) => {
        const recognition = new SpeechRecognition();
        recognition.lang = 'zh-CN';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            resolve(transcript);
        };

        recognition.onerror = (event) => {
            reject(new Error('语音识别失败: ' + event.error));
        };

        recognition.onend = () => {
            // 如果没有结果，视为失败
        };

        try {
            recognition.start();
        } catch (e) {
            reject(e);
        }
    });
}

/**
 * 备用故事（当 API 调用失败时）
 */
function getFallbackStory() {
    return {
        story: '今天早上，小明去公园散步。他看到一只可爱的小花猫，就停下来给它喂面包。小猫吃完后开心地喵喵叫。',
        questions: [
            { question: '小明去的地方是公园吗？', answer: '是' },
            { question: '小明看到的是小狗吗？', answer: '否' },
            { question: '小猫开心地叫了吗？', answer: '是' }
        ]
    };
}

/**
 * 工具函数：睡眠
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

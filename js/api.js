/**
 * 阿里云百炼 API 调用封装
 * 
 * 注意：由于浏览器 CORS 限制，部分 API 可能无法直接调用
 * TTS 改用浏览器自带的 SpeechSynthesis API
 * 对话功能使用本地预设 + API 备用
 */

const API_CONFIG = {
    apiKey: 'sk-4fdce5e5cbe04b0fb479e3e500611340',
    baseUrl: 'https://dashscope.aliyuncs.com'
};

/**
 * 调用 Qwen 对话 API (OpenAI 兼容接口)
 */
async function chat(messages, temperature = 0.7) {
    try {
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
    } catch (error) {
        console.error('API 调用失败:', error);
        throw error;
    }
}

/**
 * 生成记忆故事（使用本地预设 + API 备用）
 */
const PRESET_STORIES = [
    {
        story: '今天早上，小明去公园散步。他看到一只可爱的小花猫，就停下来给它喂面包。小猫吃完后开心地喵喵叫。',
        questions: [
            { question: '小明去的地方是公园吗？', answer: '是' },
            { question: '小明看到的是小狗吗？', answer: '否' },
            { question: '小猫开心地叫了吗？', answer: '是' }
        ]
    },
    {
        story: '昨天中午，奶奶在厨房做饭。她做了红烧肉和炒青菜，还煮了一锅香喷喷的米饭。全家人都吃得很开心。',
        questions: [
            { question: '昨天是中午做饭吗？', answer: '是' },
            { question: '奶奶做了红烧肉吗？', answer: '是' },
            { question: '全家人都吃得很开心吗？', answer: '是' }
        ]
    },
    {
        story: '上周六，爸爸带 Zoe 去动物园。他们看到了大象、长颈鹿和熊猫。Zoe 最喜欢白色的熊猫，开心得拍手笑。',
        questions: [
            { question: '是爸爸带 Zoe 去动物园吗？', answer: '是' },
            { question: '他们看到了大象吗？', answer: '是' },
            { question: 'Zoe 最喜欢大象吗？', answer: '否' }
        ]
    },
    {
        story: '今天下午，妈妈带爷爷去医院看牙医。牙医检查后说爷爷的牙齿很健康，只需要每天刷牙就可以了。',
        questions: [
            { question: '是去医院看牙医吗？', answer: '是' },
            { question: '妈妈带爷爷去的吗？', answer: '是' },
            { question: '爷爷的牙齿有问题吗？', answer: '否' }
        ]
    },
    {
        story: '昨晚下了一场大雨，今天早上天气很凉爽。小红出门去上学，在门口遇到了邻居王阿姨，她们互相打了招呼。',
        questions: [
            { question: '昨晚下大雨了吗？', answer: '是' },
            { question: '今天天气很凉爽吗？', answer: '是' },
            { question: '小红在门口遇到了爷爷吗？', answer: '否' }
        ]
    }
];

let storyIndex = 0;

/**
 * 生成记忆故事
 */
async function generateStory() {
    // 尝试调用 API，如果失败使用预设故事
    try {
        const systemPrompt = `生成一个50-100字的简短故事，最后3个是非题。用JSON格式：{"story": "...", "questions": [{"question": "?", "answer": "是/否"}]}`;

        const content = await chat([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: '请生成故事' }
        ]);

        const result = JSON.parse(content);
        return result;
    } catch (error) {
        console.log('使用预设故事');
        const story = PRESET_STORIES[storyIndex % PRESET_STORIES.length];
        storyIndex++;
        return story;
    }
}

/**
 * 评判答案
 */
async function judgeAnswer(question, answer, correctAnswer) {
    try {
        const systemPrompt = `判断回答是否正确。问题："${question}" 正确答案："${correctAnswer}" 用户回答："${answer}"。输出：{"correct": true/false, "feedback": "评价"}`;

        const content = await chat([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: '请判断' }
        ]);

        return JSON.parse(content);
    } catch (error) {
        // 本地判断
        const a = answer.toLowerCase().replace(/\s/g, '');
        const c = correctAnswer.toLowerCase().replace(/\s/g, '');
        const isCorrect = a.includes(c) || 
                        (c === '是' && (a.includes('是') || a.includes('对') || a.includes('正确'))) ||
                        (c === '否' && (a.includes('否') || a.includes('不是') || a.includes('不对') || a.includes('错')));
        
        return { correct: isCorrect, feedback: isCorrect ? '正确！' : '不太对' };
    }
}

/**
 * 语音合成 (TTS) - 使用浏览器自带 API
 */
function textToSpeech(text) {
    return new Promise((resolve, reject) => {
        if (!window.speechSynthesis) {
            reject(new Error('浏览器不支持语音合成'));
            return;
        }

        window.speechSynthesis.cancel();

        // 等待声音加载
        const getVoices = () => {
            const voices = window.speechSynthesis.getVoices();
            if (voices.length > 0) return voices;
            return null;
        };

        let voices = getVoices();
        
        // 如果声音还没加载，等一下
        if (!voices) {
            window.speechSynthesis.addEventListener('voiceschanged', function onVoices() {
                voices = getVoices();
                window.speechSynthesis.removeEventListener('voiceschanged', onVoices);
            });
            // 最多等 1 秒
            setTimeout(() => {
                if (!voices) voices = window.speechSynthesis.getVoices();
            }, 1000);
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'zh-CN';
        utterance.rate = 0.9;
        
        if (voices && voices.length > 0) {
            const chineseVoice = voices.find(v => v.lang.includes('zh')) || voices[0];
            if (chineseVoice) utterance.voice = chineseVoice;
        }

        utterance.onend = () => resolve();
        utterance.onerror = (e) => reject(e);

        window.speechSynthesis.speak(utterance);
    });
}

/**
 * 语音识别 (STT) - 使用浏览器原生 API
 */
async function speechToText(audioBlob) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        throw new Error('浏览器不支持语音识别');
    }

    return new Promise((resolve, reject) => {
        const recognition = new SpeechRecognition();
        recognition.lang = 'zh-CN';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = (event) => {
            resolve(event.results[0][0].transcript);
        };

        recognition.onerror = (event) => {
            reject(new Error('语音识别失败: ' + event.error));
        };

        try {
            recognition.start();
        } catch (e) {
            reject(e);
        }
    });
}

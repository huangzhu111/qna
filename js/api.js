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
    // 随机选择主题，增加多样性
    const themes = [
        "日常生活", "购物", "旅行", "家庭聚会", 
        "户外活动", "美食", "兴趣爱好", "节日庆祝",
        "邻里互动", "健康锻炼"
    ];
    const randomTheme = themes[Math.floor(Math.random() * themes.length)];
    
    const systemPrompt = `你是一个认知训练专家。请生成一个50-80字的简短故事。
主题要求：${randomTheme}
要求：
1. 故事主题鲜明，与给定主题相关
2. 简单易懂，情节清晰
3. 包含具体的人物、时间、地点
4. 故事结束后，直接给出3个选择题

请严格按照以下JSON格式输出，不要有其他内容：
{"story": "故事正文", "questions": [{"question": "问题文字", "options": ["A. 选项1", "B. 选项2"], "answer": "A或B"}]}`;

    const content = await chat([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `请生成一个关于"${randomTheme}"主题的记忆训练故事和3个选择题。' }
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
        },
        {
            story: '今早八点，爷爷去小区门口的便利店买报纸。他买了牛奶和面包，付了钱就回家了。',
            questions: [
                { question: '爷爷去哪里买报纸？', options: ['A. 便利店', 'B. 超市'], answer: 'A' },
                { question: '爷爷买牛奶了吗？', options: ['A. 是', 'B. 否'], answer: 'A' },
                { question: '爷爷是走回家的吗？', options: ['A. 是', 'B. 不是'], answer: 'A' }
            ]
        },
        {
            story: '下午三点，奶奶带小孙子去儿童乐园玩。小孙子最喜欢玩滑梯，玩的满头大汗很开心。',
            questions: [
                { question: '他们去哪玩？', options: ['A. 儿童乐园', 'B. 动物园'], answer: 'A' },
                { question: '小孙子喜欢玩什么？', options: ['A. 滑梯', 'B. 秋千'], answer: 'A' },
                { question: '他们玩得开心吗？', options: ['A. 开心', 'B. 不开心'], answer: 'A' }
            ]
        },
        {
            story: '中秋节的晚上，全家人在院子里赏月。妈妈准备了月饼和水果大家一起吃，月亮又圆又亮。',
            questions: [
                { question: '是什么节日？', options: ['A. 中秋节', 'B. 端午节'], answer: 'A' },
                { question: '他们吃什么？', options: ['A. 月饼', 'B. 汤圆'], answer: 'A' },
                { question: '月亮怎么样？', options: ['A. 又圆又亮', 'B. 很暗'], answer: 'A' }
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

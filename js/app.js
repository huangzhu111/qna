/**
 * 记忆故事问答 - 主应用逻辑
 */

(function() {
    'use strict';

    // ========== 状态管理 ==========
    const state = {
        currentScreen: 'start-screen',
        story: '',
        questions: [],
        currentQuestion: 0,
        answers: [],
        correctCount: 0,
        audioUrl: null,
        isRecording: false,
        mediaRecorder: null,
        audioChunks: [],
        recognition: null
    };

    // ========== DOM 元素 ==========
    const elements = {
        screens: document.querySelectorAll('.screen'),
        loadingOverlay: document.getElementById('loading-overlay'),
        loadingText: document.getElementById('loading-text'),
        
        // 开始界面
        startBtn: document.getElementById('start-btn'),
        historyList: document.getElementById('history-list'),
        
        // 故事界面
        storyContent: document.getElementById('story-content'),
        playStoryBtn: document.getElementById('play-story-btn'),
        toQuestionsBtn: document.getElementById('to-questions-btn'),
        
        // 答题界面
        qNum: document.getElementById('q-num'),
        questionText: document.getElementById('question-text'),
        recordBtn: document.getElementById('record-btn'),
        answerDisplay: document.getElementById('answer-display'),
        answerText: document.getElementById('answer-text'),
        nextQBtn: document.getElementById('next-q-btn'),
        
        // 结果界面
        score: document.getElementById('score'),
        resultMessage: document.getElementById('result-message'),
        correctCount: document.getElementById('correct-count'),
        playResultBtn: document.getElementById('play-result-btn'),
        restartBtn: document.getElementById('restart-btn')
    };

    // ========== 初始化 ==========
    function init() {
        loadHistory();
        setupEventListeners();
        initSpeechRecognition();
    }

    // ========== 事件监听 ==========
    function setupEventListeners() {
        // 开始
        elements.startBtn.addEventListener('click', startGame);
        
        // 播放故事
        elements.playStoryBtn.addEventListener('click', playStory);
        
        // 去答题
        elements.toQuestionsBtn.addEventListener('click', goToQuestions);
        
        // 录音
        elements.recordBtn.addEventListener('mousedown', startRecording);
        elements.recordBtn.addEventListener('mouseup', stopRecording);
        elements.recordBtn.addEventListener('mouseleave', stopRecording);
        elements.recordBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            startRecording();
        });
        elements.recordBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            stopRecording();
        });
        
        // 下一题
        elements.nextQBtn.addEventListener('click', nextQuestion);
        
        // 播放结果
        elements.playResultBtn.addEventListener('click', playResult);
        
        // 重新开始
        elements.restartBtn.addEventListener('click', startGame);
    }

    // ========== 屏幕切换 ==========
    function showScreen(screenId) {
        state.currentScreen = screenId;
        elements.screens.forEach(screen => {
            screen.classList.toggle('active', screen.id === screenId);
        });
    }

    // ========== 加载状态 ==========
    function showLoading(text = '加载中...') {
        elements.loadingText.textContent = text;
        elements.loadingOverlay.classList.remove('hidden');
    }

    function hideLoading() {
        elements.loadingOverlay.classList.add('hidden');
    }

    // ========== 游戏流程 ==========
    async function startGame() {
        showLoading('正在生成故事...');
        
        try {
            const result = await generateStory();
            state.story = result.story;
            state.questions = result.questions;
            state.currentQuestion = 0;
            state.answers = [];
            state.correctCount = 0;
            
            // 显示故事
            elements.storyContent.innerHTML = `<p>${result.story}</p>`;
            elements.playStoryBtn.textContent = '🔊 播放故事';
            elements.playStoryBtn.disabled = false;
            
            showScreen('story-screen');
        } catch (error) {
            alert('生成故事失败，请重试: ' + error.message);
        } finally {
            hideLoading();
        }
    }

    async function playStory() {
        showLoading('正在播放语音...');
        elements.playStoryBtn.disabled = true;
        
        try {
            // 使用浏览器自带语音合成
            await textToSpeech(state.story);
            elements.playStoryBtn.textContent = '🔊 重新播放';
            elements.playStoryBtn.disabled = false;
        } catch (error) {
            alert('语音播放失败: ' + error.message);
            elements.playStoryBtn.textContent = '🔊 播放故事';
            elements.playStoryBtn.disabled = false;
        } finally {
            hideLoading();
        }
    }

    function goToQuestions() {
        // 显示第一个问题
        state.currentQuestion = 0;
        showQuestion();
        showScreen('questions-screen');
    }

    function showQuestion() {
        const q = state.questions[state.currentQuestion];
        elements.qNum.textContent = state.currentQuestion + 1;
        elements.questionText.textContent = q.question;
        elements.answerDisplay.classList.add('hidden');
        elements.nextQBtn.disabled = true;
        elements.nextQBtn.textContent = state.currentQuestion === 2 ? '查看结果' : '下一题 →';
    }

    // ========== 录音功能 ==========
    function initSpeechRecognition() {
        // 优先使用浏览器原生 API
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (SpeechRecognition) {
            state.recognition = new SpeechRecognition();
            state.recognition.lang = 'zh-CN';
            state.recognition.continuous = false;
            state.recognition.interimResults = false;
            
            state.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                handleAnswer(transcript);
            };
            
            state.recognition.onerror = (event) => {
                console.error('语音识别错误:', event.error);
                alert('语音识别失败，请重试或使用下方输入框');
            };
            
            state.recognition.onend = () => {
                state.isRecording = false;
                updateRecordButton();
            };
        }
    }

    function startRecording() {
        if (state.isRecording) return;
        
        // 先尝试使用原生语音识别
        if (state.recognition) {
            try {
                state.recognition.start();
                state.isRecording = true;
                updateRecordButton();
                return;
            } catch (e) {
                console.error('语音识别启动失败:', e);
            }
        }
        
        // 备用：使用 MediaRecorder
        startMediaRecorder();
    }

    async function startMediaRecorder() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            state.mediaRecorder = new MediaRecorder(stream);
            state.audioChunks = [];
            
            state.mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    state.audioChunks.push(e.data);
                }
            };
            
            state.mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(state.audioChunks, { type: 'audio/webm' });
                await processAudio(audioBlob);
                
                // 停止所有轨道
                stream.getTracks().forEach(track => track.stop());
            };
            
            state.mediaRecorder.start();
            state.isRecording = true;
            updateRecordButton();
        } catch (error) {
            alert('无法访问麦克风: ' + error.message);
        }
    }

    function stopRecording() {
        if (!state.isRecording) return;
        
        // 如果使用原生语音识别
        if (state.recognition && state.recognition.state === 'running') {
            state.recognition.stop();
            return;
        }
        
        // 如果使用 MediaRecorder
        if (state.mediaRecorder && state.mediaRecorder.state === 'recording') {
            state.mediaRecorder.stop();
        }
        
        state.isRecording = false;
        updateRecordButton();
    }

    function updateRecordButton() {
        if (state.isRecording) {
            elements.recordBtn.classList.add('recording');
            elements.recordBtn.textContent = '⏹ 松开停止';
        } else {
            elements.recordBtn.classList.remove('recording');
            elements.recordBtn.textContent = '🎤 按住录音';
        }
    }

    async function processAudio(audioBlob) {
        showLoading('正在识别...');
        
        try {
            // 尝试使用 STT API
            const text = await speechToText(audioBlob);
            handleAnswer(text);
        } catch (error) {
            console.error('STT 失败:', error);
            // 如果 STT 失败，使用简单模拟
            const simulatedAnswer = window.simulatedAnswer || prompt('语音识别暂不可用，请直接输入你的回答:') || '';
            if (simulatedAnswer) {
                handleAnswer(simulatedAnswer);
            } else {
                alert('识别失败，请重试');
            }
        } finally {
            hideLoading();
        }
    }

    async function handleAnswer(answerText) {
        // 显示识别结果
        elements.answerText.textContent = answerText;
        elements.answerDisplay.classList.remove('hidden');
        
        const question = state.questions[state.currentQuestion];
        
        showLoading('判断中...');
        
        try {
            const result = await judgeAnswer(question.question, answerText, question.answer);
            state.answers.push({
                question: question.question,
                answer: answerText,
                correct: result.correct,
                feedback: result.feedback
            });
            
            if (result.correct) {
                state.correctCount++;
            }
            
            // 显示反馈
            elements.answerText.textContent = `${answerText} (${result.feedback})`;
            elements.nextQBtn.disabled = false;
        } catch (error) {
            console.error('判断失败:', error);
            // 使用本地简单判断
            const isCorrect = answerText.includes(question.answer);
            state.answers.push({
                question: question.question,
                answer: answerText,
                correct: isCorrect,
                feedback: isCorrect ? '正确！' : '不对哦'
            });
            
            if (isCorrect) state.correctCount++;
            elements.answerText.textContent = `${answerText} (${isCorrect ? '正确！' : '不对哦'})`;
            elements.nextQBtn.disabled = false;
        } finally {
            hideLoading();
        }
    }

    function nextQuestion() {
        state.currentQuestion++;
        
        if (state.currentQuestion >= state.questions.length) {
            // 答题结束，显示结果
            showResult();
        } else {
            // 下一题
            showQuestion();
        }
    }

    // ========== 结果 ==========
    async function showResult() {
        const score = Math.round((state.correctCount / 3) * 100);
        state.score = score;
        
        elements.score.textContent = score;
        elements.correctCount.textContent = `${state.correctCount}/3`;
        
        // 根据分数显示不同消息
        if (score >= 100) {
            elements.resultMessage.textContent = '太棒了！全部答对！🎉';
        } else if (score >= 66) {
            elements.resultMessage.textContent = '很不错哦！继续加油！💪';
        } else if (score >= 33) {
            elements.resultMessage.textContent = '加油！多练习会更好！🌟';
        } else {
            elements.resultMessage.textContent = '别灰心，慢慢来！❤️';
        }
        
        // 保存历史
        saveHistory(score);
        
        showScreen('result-screen');
    }

    async function playResult() {
        const score = state.score;
        let message = '';
        
        if (score >= 100) {
            message = '太棒了！你全部答对！';
        } else if (score >= 66) {
            message = '很不错哦！你答对了' + state.correctCount + '道题，继续加油！';
        } else if (score >= 33) {
            message = '加油！你答对了' + state.correctCount + '道题，多练习会更好的！';
        } else {
            message = '别灰心，慢慢来！你答对了' + state.correctCount + '道题。';
        }
        
        showLoading('正在播放语音...');
        
        try {
            // 使用浏览器自带语音合成
            await textToSpeech(message);
        } catch (error) {
            alert('语音播放失败: ' + error.message);
        } finally {
            hideLoading();
        }
    }

    // ========== 历史记录 ==========
    function loadHistory() {
        try {
            const history = JSON.parse(localStorage.getItem('qna-history') || '[]');
            renderHistory(history);
        } catch (e) {
            console.error('加载历史失败:', e);
        }
    }

    function saveHistory(score) {
        try {
            const history = JSON.parse(localStorage.getItem('qna-history') || '[]');
            history.unshift({
                score: score,
                date: new Date().toLocaleDateString('zh-CN')
            });
            // 只保留最近 10 条
            history.splice(10);
            localStorage.setItem('qna-history', JSON.stringify(history));
            renderHistory(history);
        } catch (e) {
            console.error('保存历史失败:', e);
        }
    }

    function renderHistory(history) {
        if (!history || history.length === 0) {
            elements.historyList.innerHTML = '<p class="empty">暂无记录</p>';
            return;
        }
        
        elements.historyList.innerHTML = history.map(item => `
            <div class="history-item">
                <span class="date">${item.date}</span>
                <span class="score">${item.score}分</span>
            </div>
        `).join('');
    }

    // ========== 启动 ==========
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

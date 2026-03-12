/**
 * 记忆故事问答 - 主应用逻辑
 * 简化版：选择题点击答题
 */

(function() {
    'use strict';

    // 状态管理
    const state = {
        currentScreen: 'start-screen',
        story: '',
        questions: [],
        currentQuestion: 0,
        answers: [],
        correctCount: 0,
        selectedOption: null
    };

    // DOM 元素
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
        optionBtns: document.querySelectorAll('.option-btn'),
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

    // 初始化
    function init() {
        loadHistory();
        setupEventListeners();
    }

    // 事件监听
    function setupEventListeners() {
        // 开始
        elements.startBtn.addEventListener('click', startGame);
        
        // 播放故事
        elements.playStoryBtn.addEventListener('click', playStory);
        
        // 去答题
        elements.toQuestionsBtn.addEventListener('click', goToQuestions);
        
        // 选择答案
        elements.optionBtns.forEach(btn => {
            btn.addEventListener('click', () => selectOption(btn.dataset.option));
        });
        
        // 下一题
        elements.nextQBtn.addEventListener('click', nextQuestion);
        
        // 播放结果
        elements.playResultBtn.addEventListener('click', playResult);
        
        // 重新开始
        elements.restartBtn.addEventListener('click', startGame);
    }

    // 屏幕切换
    function showScreen(screenId) {
        state.currentScreen = screenId;
        elements.screens.forEach(screen => {
            screen.classList.toggle('active', screen.id === screenId);
        });
    }

    // 加载状态
    function showLoading(text = '加载中...') {
        elements.loadingText.textContent = text;
        elements.loadingOverlay.classList.remove('hidden');
    }

    function hideLoading() {
        elements.loadingOverlay.classList.add('hidden');
    }

    // 游戏流程
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
        showLoading('正在播放...');
        elements.playStoryBtn.disabled = true;
        
        try {
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
        state.currentQuestion = 0;
        showQuestion();
        showScreen('questions-screen');
    }

    function showQuestion() {
        const q = state.questions[state.currentQuestion];
        elements.qNum.textContent = state.currentQuestion + 1;
        elements.questionText.textContent = q.question;
        
        // 更新选项按钮文字
        if (q.options && q.options.length >= 2) {
            elements.optionBtns[0].textContent = q.options[0];
            elements.optionBtns[1].textContent = q.options[1];
        }
        
        // 重置选择状态
        elements.optionBtns.forEach(btn => btn.classList.remove('selected'));
        state.selectedOption = null;
        elements.answerDisplay.classList.add('hidden');
        elements.nextQBtn.disabled = true;
        elements.nextQBtn.textContent = state.currentQuestion === 2 ? '查看结果' : '下一题 →';
    }

    // 选择答案
    function selectOption(option) {
        if (state.selectedOption) return; // 已选择
        
        state.selectedOption = option;
        
        // 高亮选中按钮
        elements.optionBtns.forEach(btn => {
            if (btn.dataset.option === option) {
                btn.classList.add('selected');
            }
        });
        
        // 显示选择结果
        const q = state.questions[state.currentQuestion];
        const optionText = q.options[option === 'A' ? 0 : 1];
        elements.answerText.textContent = optionText;
        elements.answerDisplay.classList.remove('hidden');
        
        // 判断对错
        const isCorrect = option === q.answer;
        if (isCorrect) {
            state.correctCount++;
        }
        
        state.answers.push({
            question: q.question,
            selected: option,
            correct: q.answer,
            isCorrect: isCorrect
        });
        
        // 启用下一题
        elements.nextQBtn.disabled = false;
    }

    function nextQuestion() {
        state.currentQuestion++;
        
        if (state.currentQuestion >= state.questions.length) {
            showResult();
        } else {
            showQuestion();
        }
    }

    // 结果
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
        
        showLoading('正在播放...');
        
        try {
            await textToSpeech(message);
        } catch (error) {
            console.error('语音播放失败:', error);
        } finally {
            hideLoading();
        }
    }

    // 历史记录
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

    // 启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

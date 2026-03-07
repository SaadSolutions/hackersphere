/**
 * HACKERSPHERE ACADEMY LESSON VIEWER
 * Interactive lesson content rendering, progress tracking, and navigation
 */

// ============================================================================
// LESSON VIEWER MANAGER
// ============================================================================

class LessonViewer {
    static currentLesson = null;
    static lessonData = null;
    static lessonStartTime = null;
    static scrollProgress = 0;
    static quizAnswers = new Map();
    static contentBlocks = [];

    /**
     * Initialize the lesson viewer
     * @param {string} lessonId - Lesson ID to load
     */
    static async init(lessonId) {
        try {
            Utils.showLoading(document.getElementById('lesson-content'));
            this.lessonStartTime = Date.now();

            // Load lesson data
            this.lessonData = await window.AcademyAPI.getLesson(lessonId);

            if (!this.lessonData) {
                throw new Error('Lesson not found');
            }

            this.currentLesson = this.lessonData.lesson;
            this.contentBlocks = this.lessonData.content_blocks || [];

            // Record lesson view
            await this.recordLessonView();

            // Render lesson
            this.renderLessonHeader();
            this.renderLessonContent();
            this.renderLessonNavigation();
            this.updateProgressDisplay();

            // Setup event listeners
            this.setupEventListeners();

            // Setup scroll progress tracking
            this.setupScrollProgress();

            // Setup keyboard navigation hints
            this.showKeyboardHints();

        } catch (error) {
            console.error('Failed to load lesson:', error);
            Utils.showError('Failed to load lesson content. Please try again.');
        } finally {
            Utils.hideLoading();
        }
    }

    /**
     * Record lesson view for progress tracking
     */
    static async recordLessonView() {
        try {
            const timeSpent = Math.round((Date.now() - this.lessonStartTime) / 1000);
            await window.AcademyAPI.recordLessonView(this.currentLesson.id, timeSpent);
        } catch (error) {
            console.error('Failed to record lesson view:', error);
        }
    }

    /**
     * Setup event listeners for the lesson viewer
     */
    static setupEventListeners() {
        // Track lesson time spent (every 30 seconds)
        setInterval(() => this.recordLessonView(), 30000);
    }

    /**
     * Setup scroll progress tracking
     */
    static setupScrollProgress() {
        const progressBar = document.createElement('div');
        progressBar.className = 'scroll-progress';
        progressBar.innerHTML = '<div class="scroll-progress-fill"></div>';
        document.body.appendChild(progressBar);

        const updateScrollProgress = () => {
            const scrollTop = window.pageYOffset;
            const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrolled = (scrollTop / documentHeight) * 100;

            this.scrollProgress = Math.min(100, Math.max(0, scrolled));
            const fillElement = progressBar.querySelector('.scroll-progress-fill');
            if (fillElement) {
                fillElement.style.height = this.scrollProgress + '%';
            }
        };

        window.addEventListener('scroll', updateScrollProgress);
        updateScrollProgress(); // Initial call
    }

    /**
     * Show keyboard navigation hints
     */
    static showKeyboardHints() {
        const hints = document.createElement('div');
        hints.className = 'keyboard-hints';
        hints.innerHTML = `
            <h4>Keyboard Shortcuts</h4>
            <div>← → Navigate lessons</div>
        `;
        document.body.appendChild(hints);

        // Auto-hide after 5 seconds
        setTimeout(() => hints.remove(), 5000);
    }

    /**
     * Render lesson header with breadcrumbs and metadata
     */
    static renderLessonHeader() {
        const headerElement = document.getElementById('lesson-header');

        // Create breadcrumbs
        const breadcrumbs = Utils.createBreadcrumbs([
            { text: 'Catalog', href: '/academy/catalog' },
            { text: this.lessonData.course.title, href: `/academy/course/${this.lessonData.course.slug}` },
            { text: this.lessonData.module.title, href: `/academy/course/${this.lessonData.course.slug}` },
            { text: this.currentLesson.title }
        ]);

        // Create lesson info section
        const titleSection = document.createElement('div');
        titleSection.className = 'lesson-title-section';

        const lessonInfo = document.createElement('div');
        lessonInfo.className = 'lesson-info';

        lessonInfo.innerHTML = `
            <h1 class="lesson-title">${this.currentLesson.title}</h1>
            <div class="lesson-meta">
                <span>Module: ${this.lessonData.module.title}</span>
                <span>Duration: ${Math.round(this.currentLesson.estimated_duration_minutes || 0)} min</span>
                <span>Course: ${this.lessonData.course.title}</span>
            </div>
        `;

        // Lesson completion status
        const completionStatus = document.createElement('div');
        completionStatus.className = `lesson-completion ${this.lessonData.user_progress?.is_completed ? 'completed' : ''}`;
        completionStatus.textContent = this.lessonData.user_progress?.is_completed ? 'COMPLETED' : 'IN PROGRESS';

        titleSection.appendChild(lessonInfo);
        titleSection.appendChild(completionStatus);

        headerElement.appendChild(breadcrumbs);
        headerElement.appendChild(titleSection);
    }

    /**
     * Render lesson content blocks
     */
    static renderLessonContent() {
        const contentElement = document.getElementById('lesson-content');
        contentElement.innerHTML = '';

        if (!this.contentBlocks || this.contentBlocks.length === 0) {
            contentElement.innerHTML = '<div class="text-center" style="padding: var(--spacing-xxl);"><p>Lesson content is being prepared.</p></div>';
            return;
        }

        this.contentBlocks.forEach((block, index) => {
            const blockElement = this.renderContentBlock(block, index);
            if (blockElement) {
                contentElement.appendChild(blockElement);
            }
        });
    }

    /**
     * Render individual content block
     * @param {Object} block - Content block data
     * @param {number} index - Block index
     * @returns {HTMLElement} Rendered block element
     */
    static renderContentBlock(block, index) {
        switch (block.block_type) {
            case 'text':
                return this.renderTextBlock(block, index);
            case 'code':
                return this.renderCodeBlock(block, index);
            case 'quiz':
                return this.renderQuizBlock(block, index);
            default:
                console.warn(`Unknown block type: ${block.block_type}`);
                return null;
        }
    }

    /**
     * Render text content block
     * @param {Object} block - Text block data
     * @param {number} index - Block index
     * @returns {HTMLElement} Text block element
     */
    static renderTextBlock(block, index) {
        const element = document.createElement('div');
        element.className = 'lesson-text-block';
        element.innerHTML = Utils.markdownToHtml(block.content || '');
        return element;
    }

    /**
     * Render code content block
     * @param {Object} block - Code block data
     * @param {number} index - Block index
     * @returns {HTMLElement} Code block element
     */
    static renderCodeBlock(block, index) {
        const container = document.createElement('div');
        container.className = 'lesson-code-block';

        // Code block header
        const header = document.createElement('div');
        header.className = 'code-block-header';
        header.innerHTML = `
            <span>${block.language || 'code'}</span>
            <button class="copy-button" onclick="LessonViewer.copyCode(this, '${index}')">
                copy
            </button>
        `;

        // Code content
        const codeElement = document.createElement('pre');
        codeElement.className = 'lesson-code-block';
        codeElement.innerHTML = `<code>${block.content || ''}</code>`;

        // Make code block syntax-highlighted (basic)
        this.highlightCodeBlock(codeElement, block.language);

        container.appendChild(header);
        container.appendChild(codeElement);

        return container;
    }

    /**
     * Render quiz content block
     * @param {Object} block - Quiz block data
     * @param {number} index - Block index
     * @returns {HTMLElement} Quiz block element
     */
    static renderQuizBlock(block, index) {
        const container = document.createElement('div');
        container.className = `quiz-container block-${index}`;

        // Quiz header
        const header = document.createElement('div');
        header.className = 'quiz-header';
        header.innerHTML = `
            <h3 class="quiz-title">${block.title || 'Knowledge Check'}</h3>
            <p class="quiz-description">${block.description || 'Test your understanding'}</p>
        `;

        // Quiz questions
        const questions = document.createElement('div');
        questions.className = 'quiz-questions';

        if (block.questions && block.questions.length > 0) {
            block.questions.forEach((question, qIndex) => {
                const questionElement = this.renderQuizQuestion(question, index, qIndex);
                questions.appendChild(questionElement);
            });
        }

        // Quiz actions
        const actions = document.createElement('div');
        actions.className = 'quiz-actions';
        actions.innerHTML = `
            <button class="academy-button quiz-submit-btn" onclick="LessonViewer.submitQuiz('${index}')">
                Submit Answers
            </button>
        `;

        container.appendChild(header);
        container.appendChild(questions);
        container.appendChild(actions);

        return container;
    }

    /**
     * Render quiz question
     * @param {Object} question - Question data
     * @param {number} blockIndex - Block index
     * @param {number} questionIndex - Question index
     * @returns {HTMLElement} Question element
     */
    static renderQuizQuestion(question, blockIndex, questionIndex) {
        const element = document.createElement('div');
        element.className = 'quiz-question';

        element.innerHTML = `
            <div class="question-text">${question.text}</div>
            <div class="question-options">
                ${(question.options || []).map((option, optionIndex) => `
                    <label class="option-label">
                        <input
                            type="radio"
                            name="quiz-${blockIndex}-q-${questionIndex}"
                            value="${optionIndex}"
                            class="option-radio"
                            onchange="LessonViewer.selectQuizOption('${blockIndex}', '${questionIndex}', '${optionIndex}')"
                        />
                        <span class="option-text">${option}</span>
                    </label>
                `).join('')}
            </div>
        `;

        return element;
    }

    /**
     * Handle quiz option selection
     * @param {string} blockIndex - Block index
     * @param {string} questionIndex - Question index
     * @param {string} optionIndex - Selected option index
     */
    static selectQuizOption(blockIndex, questionIndex, optionIndex) {
        const quizKey = `${blockIndex}-${questionIndex}`;
        this.quizAnswers.set(quizKey, parseInt(optionIndex));
    }

    /**
     * Submit quiz answers
     * @param {string} blockIndex - Block index
     */
    static submitQuiz(blockIndex) {
        const quizContainer = document.querySelector(`.block-${blockIndex}`);
        const block = this.contentBlocks[parseInt(blockIndex)];

        if (!block || !block.questions) return;

        let correctCount = 0;
        const results = [];

        block.questions.forEach((question, qIndex) => {
            const quizKey = `${blockIndex}-${qIndex}`;
            const userAnswer = this.quizAnswers.get(quizKey);
            const correct = userAnswer === question.correct_answer;

            if (correct) correctCount++;

            results.push({
                question: question.text,
                userAnswer,
                correctAnswer: question.correct_answer,
                correct
            });
        });

        // Show results
        this.showQuizResults(quizContainer, results, correctCount, block.questions.length);
    }

    /**
     * Show quiz results
     * @param {HTMLElement} container - Quiz container
     * @param {Array} results - Quiz results
     * @param {number} correctCount - Number correct
     * @param {number} totalCount - Total questions
     */
    static showQuizResults(container, results, correctCount, totalCount) {
        const percentage = Math.round((correctCount / totalCount) * 100);
        const passed = percentage >= 70; // 70% passing threshold

        const resultsElement = document.createElement('div');
        resultsElement.className = `quiz-results ${passed ? 'correct' : 'incorrect'}`;

        resultsElement.innerHTML = `
            <h3 class="quiz-results-title">
                ${passed ? '✓ Quiz Passed!' : '✗ Quiz Failed'}
            </h3>
            <div class="quiz-score">Score: ${correctCount}/${totalCount} (${percentage}%)</div>
            <div class="quiz-feedback">
                ${passed
                    ? 'Great job! You can proceed to the next lesson.'
                    : 'Review the lesson content and try again.'
                }
            </div>
        `;

        // Replace submit button with results
        const actions = container.querySelector('.quiz-actions');
        actions.innerHTML = '';
        actions.appendChild(resultsElement);

        // If passed, mark lesson complete
        if (passed && !this.lessonData.user_progress?.is_completed) {
            this.markLessonComplete();
        }
    }

    /**
     * Mark lesson as complete
     */
    static async markLessonComplete() {
        try {
            await window.AcademyAPI.completeLesson(this.currentLesson.id);

            // Update UI
            const completionElement = document.querySelector('.lesson-completion');
            if (completionElement) {
                completionElement.textContent = 'COMPLETED';
                completionElement.classList.add('completed');
            }

            Utils.showToast('Lesson completed! 🎉', 'success');
        } catch (error) {
            console.error('Failed to complete lesson:', error);
        }
    }

    /**
     * Copy code to clipboard
     * @param {HTMLElement} button - Copy button element
     * @param {string} blockIndex - Block index
     */
    static async copyCode(button, blockIndex) {
        const block = this.contentBlocks[parseInt(blockIndex)];
        if (!block || !block.content) return;

        try {
            await navigator.clipboard.writeText(block.content);

            // Visual feedback
            const originalText = button.textContent;
            button.textContent = 'copied!';
            button.classList.add('copied');

            setTimeout(() => {
                button.textContent = originalText;
                button.classList.remove('copied');
            }, 2000);

        } catch (error) {
            console.error('Failed to copy code:', error);
            button.textContent = 'error';
            setTimeout(() => button.textContent = 'copy', 2000);
        }
    }

    /**
     * Highlight code block (basic syntax highlighting)
     * @param {HTMLElement} codeElement - Code element
     * @param {string} language - Programming language
     */
    static highlightCodeBlock(codeElement, language) {
        let html = codeElement.innerHTML;

        // Basic syntax highlighting patterns
        const patterns = {
            'javascript': [
                { pattern: /\b(const|let|var|function|return|if|else|for|while)\b/g, class: 'keyword' },
                { pattern: /(["'])((?:\\.|(?!\1)[^\\])*?)\1/g, class: 'string' },
                { pattern: /\/\/.*$/gm, class: 'comment' }
            ],
            'python': [
                { pattern: /\b(def|class|import|from|return|if|elif|else|for|while|try|except)\b/g, class: 'keyword' },
                { pattern: /(["'])((?:\\.|(?!\1)[^\\])*?)\1/g, class: 'string' },
                { pattern: /#.*/g, class: 'comment' }
            ],
            'bash': [
                { pattern: /\b(echo|cd|ls|grep|awk|sed|cat|mkdir|rm|cp|mv|chmod)\b/g, class: 'command' },
                { pattern: /(["'])((?:\\.|(?!\1)[^\\])*?)\1/g, class: 'string' },
                { pattern: /#.*/g, class: 'comment' }
            ]
        };

        if (patterns[language]) {
            patterns[language].forEach(({ pattern, class: className }) => {
                html = html.replace(pattern, (match) => `<span class="${className}">${match}</span>`);
            });
        }

        codeElement.innerHTML = html;
    }

    /**
     * Render lesson navigation (previous/next buttons)
     */
    static renderLessonNavigation() {
        const navElement = document.getElementById('lesson-navigation');
        const { previous_lesson, next_lesson } = this.lessonData;

        const container = document.createElement('div');
        container.className = 'lesson-nav-container';

        // Previous lesson button
        const prevButton = document.createElement('button');
        prevButton.className = 'academy-button lesson-nav-button lesson-nav-prev';
        if (previous_lesson) {
            prevButton.textContent = 'Previous Lesson';
            prevButton.onclick = () => this.navigateToLesson(previous_lesson.id);
        } else {
            prevButton.textContent = 'Back to Course';
            prevButton.onclick = () => this.navigateToCourse();
            prevButton.disabled = true;
        }

        // Next lesson button
        const nextButton = document.createElement('button');
        nextButton.className = 'academy-button lesson-nav-button lesson-nav-next';
        if (next_lesson) {
            nextButton.textContent = 'Next Lesson';
            nextButton.onclick = () => this.navigateToLesson(next_lesson.id);
        } else {
            nextButton.textContent = 'Finish Course';
            nextButton.onclick = () => this.finishCourse();
        }

        container.appendChild(prevButton);
        container.appendChild(nextButton);

        navElement.appendChild(container);
    }

    /**
     * Navigate to a specific lesson
     * @param {string} lessonId - Lesson ID to navigate to
     */
    static navigateToLesson(lessonId) {
        // Record final lesson view time
        this.recordLessonView();

        // Navigate to new lesson
        window.AcademyRouter.navigateToPage(`lesson/${lessonId}`);
    }

    /**
     * Navigate back to course page
     */
    static navigateToCourse() {
        const courseSlug = this.lessonData.course.slug;
        window.AcademyRouter.navigateToPage(`course/${courseSlug}`);
    }

    /**
     * Handle finishing the course
     */
    static async finishCourse() {
        try {
            // Check if course is complete and generate certificate
            const progress = await window.AcademyAPI.getCourseProgress(this.lessonData.course.id);

            if (progress.completion_percentage >= 100) {
                Utils.showToast('Course completed! Generating certificate...', 'success');
                // Would navigate to certificate view
            } else {
                Utils.showToast(`Course ${progress.completion_percentage}% complete. Keep learning!`);
            }

            // Navigate to course page to see progress
            this.navigateToCourse();
        } catch (error) {
            console.error('Error finishing course:', error);
            this.navigateToCourse();
        }
    }

    /**
     * Update progress display
     */
    static updateProgressDisplay() {
        const progressFill = document.getElementById('lesson-progress-fill');
        const progressText = document.getElementById('lesson-progress-text');

        if (progressFill) {
            progressFill.style.width = `${this.scrollProgress}%`;
        }

        if (progressText) {
            const completionPercent = Math.round(this.scrollProgress);
            progressText.textContent = `Lesson Progress: ${completionPercent}% Complete`;
        }
    }
}

// ============================================================================
// EXPORT FOR GLOBAL USE
// ============================================================================

// Make class globally available
window.LessonViewer = LessonViewer;

// Auto-update progress on scroll
window.addEventListener('scroll', () => {
    if (window.LessonViewer && window.LessonViewer.updateProgressDisplay) {
        window.LessonViewer.updateProgressDisplay();
    }
});

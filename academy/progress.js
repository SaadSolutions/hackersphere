/**
 * HACKERSPHERE ACADEMY PROGRESS MANAGEMENT
 * Progress visualization, analytics, and progress tracking utilities
 */

// ============================================================================
// PROGRESS TRACKER
// ============================================================================

class ProgressTracker {
    static chartInstances = new Map();

    /**
     * Initialize progress tracking for a container
     * @param {string} containerId - Container element ID
     * @param {Object} progressData - Progress data to visualize
     */
    static init(containerId, progressData) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';

        // Choose visualization type based on data
        if (progressData.type === 'course-progress') {
            this.renderCourseProgress(container, progressData);
        } else if (progressData.type === 'dashboard-stats') {
            this.renderDashboardStats(container, progressData);
        } else if (progressData.type === 'learning-streak') {
            this.renderLearningStreak(container, progressData);
        } else if (progressData.type === 'skill-progress') {
            this.renderSkillProgress(container, progressData);
        } else {
            // Default to general progress visualization
            this.renderGeneralProgress(container, progressData);
        }
    }

    /**
     * Render course progress visualization
     * @param {HTMLElement} container - Container element
     * @param {Object} data - Course progress data
     */
    static renderCourseProgress(container, data) {
        const progressCard = document.createElement('div');
        progressCard.className = 'progress-card course-progress-card';

        const percentage = data.completion_percentage || 0;
        const totalLessons = data.total_lessons || 0;
        const completedLessons = data.lessons_completed || 0;

        progressCard.innerHTML = `
            <div class="progress-header">
                <h3 class="progress-title">${data.course_title || 'Course Progress'}</h3>
                <div class="progress-percentage">${percentage}%</div>
            </div>

            <div class="progress-bar-container">
                <div class="academy-progress-bar">
                    <div class="academy-progress-fill" style="width: ${percentage}%"></div>
                </div>
            </div>

            <div class="progress-details">
                <div class="progress-stat">
                    <span class="stat-value">${completedLessons}</span>
                    <span class="stat-label">Completed</span>
                </div>
                <div class="progress-stat">
                    <span class="stat-value">${totalLessons - completedLessons}</span>
                    <span class="stat-label">Remaining</span>
                </div>
                <div class="progress-stat">
                    <span class="stat-value">${totalLessons}</span>
                    <span class="stat-label">Total</span>
                </div>
            </div>

            ${data.last_completed_lesson ? `
                <div class="recent-activity">
                    <span class="activity-label">Last completed:</span>
                    <span class="activity-value">${data.last_completed_lesson}</span>
                </div>
            ` : ''}

            <div class="progress-actions">
                <button class="academy-button small" onclick="ProgressTracker.viewCourse('${data.course_id}')">
                    ${percentage === 100 ? 'Review Course' : 'Continue Learning'}
                </button>
                ${percentage === 100 ? `
                    <button class="academy-button small secondary" onclick="ProgressTracker.generateCertificate('${data.course_id}')">
                        Get Certificate
                    </button>
                ` : ''}
            </div>
        `;

        container.appendChild(progressCard);
    }

    /**
     * Render dashboard statistics
     * @param {HTMLElement} container - Container element
     * @param {Object} data - Dashboard statistics data
     */
    static renderDashboardStats(container, data) {
        const statsGrid = document.createElement('div');
        statsGrid.className = 'dashboard-stats-grid';

        const stats = [
            {
                label: 'Courses Enrolled',
                value: data.enrolled_courses || 0,
                icon: '📚',
                color: 'var(--matrix-green)'
            },
            {
                label: 'Courses Completed',
                value: data.completed_courses || 0,
                icon: '🎯',
                color: 'var(--success-green)'
            },
            {
                label: 'Hours Learned',
                value: Math.round((data.total_hours_learned || 0) * 10) / 10,
                icon: '⏱️',
                color: 'var(--warning-orange)'
            },
            {
                label: 'Current Streak',
                value: `${data.current_streak || 0} days`,
                icon: '🔥',
                color: 'var(--error-red)'
            },
            {
                label: 'Certificates Earned',
                value: data.certificates_earned || 0,
                icon: '🏆',
                color: 'var(--matrix-green)'
            },
            {
                label: 'Average Score',
                value: `${data.average_score || 0}%`,
                icon: '📊',
                color: 'var(--text-secondary)'
            }
        ];

        stats.forEach(stat => {
            const statCard = document.createElement('div');
            statCard.className = 'dashboard-stat-card';

            statCard.innerHTML = `
                <div class="stat-icon" style="font-size: 2rem; margin-bottom: var(--spacing-sm);">
                    ${stat.icon}
                </div>
                <div class="dashboard-stat-value" style="color: ${stat.color}; font-size: 2.5rem; font-weight: bold; margin-bottom: var(--spacing-xs);">
                    ${stat.value}
                </div>
                <div class="dashboard-stat-label" style="color: var(--text-dim); font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px; font-family: var(--font-mono);">
                    ${stat.label}
                </div>
            `;

            statsGrid.appendChild(statCard);
        });

        container.appendChild(statsGrid);
    }

    /**
     * Render learning streak visualization
     * @param {HTMLElement} container - Container element
     * @param {Object} data - Streak data
     */
    static renderLearningStreak(container, data) {
        const streakCard = document.createElement('div');
        streakCard.className = 'progress-card streak-card';

        const streak = data.current_streak || 0;
        const longest = data.longest_streak || 0;
        const lastActivity = data.last_activity ? Utils.formatDate(data.last_activity) : 'Never';

        streakCard.innerHTML = `
            <div class="progress-header">
                <h3 class="progress-title">🔥 Learning Streak</h3>
            </div>

            <div class="streak-display">
                <div class="current-streak">
                    <div class="streak-number">${streak}</div>
                    <div class="streak-label">Current Streak</div>
                </div>

                <div class="streak-info">
                    <div class="streak-stat">
                        <span class="stat-value">${longest}</span>
                        <span class="stat-label">Longest</span>
                    </div>
                    <div class="streak-stat">
                        <span class="stat-label">Last Activity:</span>
                        <span class="stat-value">${lastActivity}</span>
                    </div>
                </div>
            </div>

            <div class="streak-motivation">
                ${streak === 0 ?
                    'Start learning today to begin your streak!' :
                    streak < 7 ?
                        'Keep it up! Consistency is key.' :
                        'Amazing dedication! You\'re on fire!'
                }
            </div>

            ${streak > 0 ? `
                <div class="streak-flames">
                    ${'🔥'.repeat(Math.min(streak, 7))}
                </div>
            ` : ''}
        `;

        container.appendChild(streakCard);
    }

    /**
     * Render skill progress visualization
     * @param {HTMLElement} container - Container element
     * @param {Object} data - Skill progress data
     */
    static renderSkillProgress(container, data) {
        const skillsCard = document.createElement('div');
        skillsCard.className = 'progress-card skills-card';

        skillsCard.innerHTML = `
            <div class="progress-header">
                <h3 class="progress-title">🎯 Skill Mastery</h3>
            </div>

            <div class="skills-list">
                ${(data.skills || []).map(skill => `
                    <div class="skill-item">
                        <div class="skill-info">
                            <span class="skill-name">${skill.name}</span>
                            <span class="skill-level">${skill.level}</span>
                        </div>
                        <div class="academy-progress-bar">
                            <div class="academy-progress-fill" style="width: ${skill.progress}%"></div>
                        </div>
                        <span class="skill-percentage">${skill.progress}%</span>
                    </div>
                `).join('')}
            </div>
        `;

        container.appendChild(skillsCard);
    }

    /**
     * Render general progress visualization
     * @param {HTMLElement} container - Container element
     * @param {Object} data - Generic progress data
     */
    static renderGeneralProgress(container, data) {
        const progressCard = document.createElement('div');
        progressCard.className = 'progress-card general-progress-card';

        progressCard.innerHTML = `
            <div class="progress-header">
                <h3 class="progress-title">${data.title || 'Progress'}</h3>
                <div class="progress-percentage">${data.percentage || 0}%</div>
            </div>

            <div class="progress-bar-container">
                <div class="academy-progress-bar">
                    <div class="academy-progress-fill" style="width: ${data.percentage || 0}%"></div>
                </div>
            </div>

            <div class="progress-details">
                ${data.details ? data.details.map(detail => `
                    <div class="progress-detail">
                        <span class="detail-label">${detail.label}:</span>
                        <span class="detail-value">${detail.value}</span>
                    </div>
                `).join('') : ''}
            </div>
        `;

        container.appendChild(progressCard);
    }

    /**
     * Create interactive progress chart
     * @param {string} canvasId - Canvas element ID
     * @param {Object} chartData - Chart data
     * @param {string} chartType - Type of chart (bar, line, pie)
     */
    static createChart(canvasId, chartData, chartType = 'bar') {
        // Basic canvas-based chart implementation
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width || 400;
        const height = canvas.height || 200;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        if (chartType === 'bar') {
            this.drawBarChart(ctx, width, height, chartData);
        } else if (chartType === 'line') {
            this.drawLineChart(ctx, width, height, chartData);
        } else if (chartType === 'progress-circle') {
            this.drawProgressCircle(ctx, width, height, chartData);
        }

        // Store chart instance for updates
        this.chartInstances.set(canvasId, { canvas, ctx, data: chartData, type: chartType });
    }

    /**
     * Draw bar chart
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} width - Chart width
     * @param {number} height - Chart height
     * @param {Object} data - Chart data
     */
    static drawBarChart(ctx, width, height, data) {
        const values = data.values || [];
        const labels = data.labels || [];
        const maxValue = Math.max(...values);

        const barWidth = (width - 60) / values.length;
        const barPadding = 2;

        ctx.fillStyle = 'var(--matrix-green)';
        ctx.strokeStyle = 'var(--matrix-green-light)';
        ctx.lineWidth = 1;

        values.forEach((value, index) => {
            const barHeight = (value / maxValue) * (height - 60);
            const x = 40 + index * barWidth;
            const y = height - 30 - barHeight;

            // Draw bar
            ctx.fillRect(x + barPadding, y, barWidth - 2 * barPadding, barHeight);
            ctx.strokeRect(x + barPadding, y, barWidth - 2 * barPadding, barHeight);

            // Draw label
            ctx.fillStyle = 'var(--text-secondary)';
            ctx.font = '12px var(--font-mono)';
            ctx.textAlign = 'center';
            ctx.fillText(labels[index] || `Item ${index + 1}`, x + barWidth / 2, height - 10);
            ctx.fillStyle = 'var(--matrix-green)';
        });

        // Draw axes
        ctx.strokeStyle = 'var(--text-dim)';
        ctx.beginPath();
        ctx.moveTo(40, 20);
        ctx.lineTo(40, height - 30);
        ctx.lineTo(width - 20, height - 30);
        ctx.stroke();

        // Draw value labels
        ctx.fillStyle = 'var(--text-dim)';
        ctx.textAlign = 'right';
        ctx.fillText(maxValue.toString(), 35, 25);
        ctx.fillText('0', 35, height - 25);
    }

    /**
     * Draw line chart
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} width - Chart width
     * @param {number} height - Chart height
     * @param {Object} data - Chart data
     */
    static drawLineChart(ctx, width, height, data) {
        const values = data.values || [];
        const maxValue = Math.max(...values);

        ctx.strokeStyle = 'var(--matrix-green)';
        ctx.lineWidth = 3;
        ctx.beginPath();

        values.forEach((value, index) => {
            const x = 40 + (index / (values.length - 1)) * (width - 60);
            const y = height - 30 - (value / maxValue) * (height - 60);

            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }

            // Draw point
            ctx.fillStyle = 'var(--matrix-green)';
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fill();
        });

        ctx.stroke();
    }

    /**
     * Draw progress circle
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} width - Chart width
     * @param {number} height - Chart height
     * @param {Object} data - Chart data
     */
    static drawProgressCircle(ctx, width, height, data) {
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 3;
        const percentage = data.percentage || 0;
        const angle = (percentage / 100) * 2 * Math.PI - Math.PI / 2;

        // Background circle
        ctx.strokeStyle = 'var(--hacker-grey)';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.stroke();

        // Progress arc
        ctx.strokeStyle = 'var(--matrix-green)';
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, -Math.PI / 2, angle);
        ctx.stroke();

        // Center text
        ctx.fillStyle = 'var(--matrix-green)';
        ctx.font = `bold ${radius / 2}px var(--font-mono)`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${percentage}%`, centerX, centerY);

        // Label
        if (data.label) {
            ctx.fillStyle = 'var(--text-secondary)';
            ctx.font = `14px var(--font-primary)`;
            ctx.fillText(data.label, centerX, centerY + radius / 2 + 20);
        }
    }

    /**
     * Update existing chart
     * @param {string} canvasId - Canvas element ID
     * @param {Object} newData - Updated chart data
     */
    static updateChart(canvasId, newData) {
        const chartInstance = this.chartInstances.get(canvasId);
        if (chartInstance) {
            chartInstance.data = { ...chartInstance.data, ...newData };
            this.createChart(canvasId, chartInstance.data, chartInstance.type);
        }
    }

    // ============================================================================
    // ACTION HANDLERS
    // ============================================================================

    /**
     * Navigate to course page
     * @param {string} courseId - Course ID
     */
    static viewCourse(courseId) {
        // This would need to get course slug first
        Utils.showToast('Navigating to course...', 'info');
        // window.AcademyRouter.navigateToPage(`course/${courseSlug}`);
    }

    /**
     * Generate certificate for course
     * @param {string} courseId - Course ID
     */
    static async generateCertificate(courseId) {
        try {
            const certificate = await window.AcademyAPI.generateCertificate(courseId);
            Utils.showToast('Certificate generated successfully!', 'success');

            // Could open certificate modal or navigate to certificates page
            setTimeout(() => {
                Utils.showToast('View your certificates in the dashboard', 'info');
            }, 2000);
        } catch (error) {
            console.error('Failed to generate certificate:', error);
            Utils.showToast('Failed to generate certificate', 'error');
        }
    }

    /**
     * Calculate learning analytics from raw data
     * @param {Object} rawData - Raw progress/analytics data
     * @returns {Object} Processed analytics data
     */
    static calculateAnalytics(rawData) {
        const analytics = {
            enrolled_courses: 0,
            completed_courses: 0,
            total_hours_learned: 0,
            current_streak: 0,
            certificates_earned: 0,
            average_score: 0,
            learning_activity: [],
            skill_progress: [],
            recent_achievements: []
        };

        // Process enrolled courses
        if (rawData.enrolled_courses) {
            analytics.enrolled_courses = rawData.enrolled_courses.length;

            let totalCompletion = 0;
            let completedCount = 0;
            let totalTime = 0;

            rawData.enrolled_courses.forEach(course => {
                if (course.completion_percentage === 100) {
                    completedCount++;
                }
                totalCompletion += course.completion_percentage || 0;
                totalTime += course.time_spent_seconds || 0;
            });

            analytics.completed_courses = completedCount;
            analytics.average_completion = analytics.enrolled_courses > 0
                ? Math.round(totalCompletion / analytics.enrolled_courses)
                : 0;
            analytics.total_hours_learned = totalTime / 3600; // Convert to hours
        }

        // Process certificates
        if (rawData.certificates) {
            analytics.certificates_earned = rawData.certificates.length;
        }

        // Calculate current streak (simplified)
        if (rawData.recent_activity) {
            analytics.current_streak = this.calculateStreak(rawData.recent_activity);
        }

        return analytics;
    }

    /**
     * Calculate learning streak from activity data
     * @param {Array} activities - Recent learning activities
     * @returns {number} Current streak in days
     */
    static calculateStreak(activities) {
        if (!activities || activities.length === 0) return 0;

        // Sort activities by date (most recent first)
        activities.sort((a, b) => new Date(b.date) - new Date(a.date));

        let streak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < activities.length; i++) {
            const activityDate = new Date(activities[i].date);
            activityDate.setHours(0, 0, 0, 0);

            const expectedDate = new Date(today);
            expectedDate.setDate(today.getDate() - i);

            if (activityDate.getTime() === expectedDate.getTime()) {
                streak++;
            } else {
                break;
            }
        }

        return streak;
    }
}

// ============================================================================
// PROGRESS VISUALIZATION COMPONENTS
// ============================================================================

/**
 * Create animated counter display
 * @param {HTMLElement} element - Element to animate
 * @param {number} targetValue - Target value
 * @param {number} duration - Animation duration in ms
 */
function animateCounter(element, targetValue, duration = 1000) {
    const startValue = parseInt(element.textContent) || 0;
    const difference = targetValue - startValue;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function (easeOutCubic)
        const easedProgress = 1 - Math.pow(1 - progress, 3);

        const currentValue = Math.round(startValue + (difference * easedProgress));
        element.textContent = currentValue;

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

// ============================================================================
// EXPORT FOR GLOBAL USE
// ============================================================================

// Make class globally available
window.ProgressTracker = ProgressTracker;
window.animateCounter = animateCounter;

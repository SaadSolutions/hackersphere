/**
 * HACKERSPHERE ACADEMY USER DASHBOARD
 * Learning dashboard with progress analytics and user management
 */

// ============================================================================
// USER DASHBOARD MANAGER
// ============================================================================

class UserDashboard {
    static dashboardData = null;
    static enrolledCourses = [];
    static userCertificates = [];

    /**
     * Initialize the user dashboard
     */
    static async init() {
        try {
            Utils.showLoading(document.getElementById('welcome-section'));

            // Load dashboard data
            await this.loadDashboardData();

            // Render all sections
            this.renderWelcomeSection();
            this.renderStatisticsOverview();
            this.renderCurrentLearning();
            this.renderRecentActivity();
            this.renderAchievements();

            Utils.hideLoading();

        } catch (error) {
            console.error('Failed to load dashboard:', error);
            Utils.showError('Failed to load dashboard data. Please try again.');
            Utils.hideLoading();
        }
    }

    /**
     * Load dashboard data from API
     */
    static async loadDashboardData() {
        try {
            // Load main dashboard data
            this.dashboardData = await window.AcademyAPI.getUserDashboard();

            // Load enrolled courses details
            this.enrolledCourses = await window.AcademyAPI.getUserEnrolledCourses();

            // Load user certificates
            this.userCertificates = await window.AcademyAPI.getUserCertificates();

        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            throw error;
        }
    }

    /**
     * Render welcome section with personalized greeting
     */
    static renderWelcomeSection() {
        const welcomeElement = document.getElementById('welcome-section');

        const user = window.AcademyAuth.getUser();
        const userName = user ? user.username : 'Learner';
        const enrolledCount = this.enrolledCourses.length;
        const completedCourses = this.enrolledCourses.filter(course =>
            course.completion_percentage === 100
        ).length;

        // Calculate current streak (simplified)
        const streakDays = this.calculateCurrentStreak();

        welcomeElement.innerHTML = `
            <div class="welcome-message">
                <h1 class="welcome-title">Welcome back, ${userName}!</h1>
                <p class="welcome-subtitle">
                    ${enrolledCount > 0
                        ? `You're enrolled in ${enrolledCount} course${enrolledCount !== 1 ? 's' : ''}. Track your progress and continue your learning journey.`
                        : 'Ready to start your cybersecurity learning journey? Browse our course catalog to begin.'
                    }
                </p>

                ${streakDays > 0 ? `
                    <div class="streak-highlight">
                        <h3>🔥 ${streakDays} Day Streak!</h3>
                        <p>Keep up the excellent learning momentum!</p>
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Render statistics overview
     */
    static renderStatisticsOverview() {
        const statsElement = document.getElementById('stats-overview');

        // Calculate analytics from raw data
        const analytics = ProgressTracker.calculateAnalytics({
            enrolled_courses: this.enrolledCourses,
            certificates: this.userCertificates,
            recent_activity: this.dashboardData.recently_completed || []
        });

        // Render dashboard stats
        ProgressTracker.init('stats-overview', {
            type: 'dashboard-stats',
            enrolled_courses: analytics.enrolled_courses,
            completed_courses: analytics.completed_courses,
            total_hours_learned: analytics.total_hours_learned,
            current_streak: analytics.current_streak,
            certificates_earned: analytics.certificates_earned,
            average_score: analytics.average_completion
        });
    }

    /**
     * Render current learning section
     */
    static renderCurrentLearning() {
        const currentElement = document.getElementById('current-learning');

        if (!this.enrolledCourses || this.enrolledCourses.length === 0) {
            currentElement.innerHTML = `
                <div class="empty-courses">
                    <h3>No courses yet</h3>
                    <p>Start your learning journey by exploring our course catalog.</p>
                    <button class="academy-button" onclick="UserDashboard.browseCourses()">
                        Browse Courses
                    </button>
                </div>
            `;
            return;
        }

        // Sort by progress (incomplete first, then by enrollment date)
        const sortedCourses = [...this.enrolledCourses].sort((a, b) => {
            if (a.completion_percentage < 100 && b.completion_percentage === 100) return -1;
            if (a.completion_percentage === 100 && b.completion_percentage < 100) return 1;
            return new Date(b.enrolled_at || 0) - new Date(a.enrolled_at || 0);
        });

        const coursesHtml = sortedCourses.slice(0, 3).map(course => this.renderCurrentCourseItem(course)).join('');

        currentElement.innerHTML = coursesHtml;

        // Add continue learning handler
        document.querySelectorAll('.continue-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const courseId = btn.dataset.courseId;
                this.continueCourse(courseId);
            });
        });
    }

    /**
     * Render individual current course item
     * @param {Object} course - Course data
     * @returns {string} HTML string
     */
    static renderCurrentCourseItem(course) {
        const progressPercent = course.completion_percentage || 0;
        const isCompleted = progressPercent === 100;
        const nextLesson = course.next_lesson || 'Continue learning';
        const timeSpent = course.time_spent_seconds || 0;
        const hoursSpent = Math.round(timeSpent / 3600 * 10) / 10;

        return `
            <div class="current-course-item" onclick="UserDashboard.viewCourse('${course.id}')">
                <div class="current-course-header">
                    <div class="current-course-title">${course.title}</div>
                    <div class="current-course-progress ${isCompleted ? 'completed' : ''}">
                        ${progressPercent}%
                    </div>
                </div>

                <div class="current-course-meta">
                    ${isCompleted ? '✓ Completed' : `${nextLesson}`}
                    ${hoursSpent > 0 ? ` • ${hoursSpent}h spent` : ''}
                </div>

                <div class="academy-progress-bar">
                    <div class="academy-progress-fill" style="width: ${progressPercent}%"></div>
                </div>

                <div class="continue-button">
                    <button class="academy-button continue-btn" data-course-id="${course.id}">
                        ${isCompleted ? 'Review Course' : 'Continue Learning'}
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Render recent activity section
     */
    static renderRecentActivity() {
        const activityElement = document.getElementById('recent-activity');

        // Mock recent activities (in real app, this would come from API)
        const activities = this.generateMockActivities();

        if (!activities || activities.length === 0) {
            activityElement.innerHTML = `
                <div class="empty-activity">
                    <h3>No recent activity</h3>
                    <p>Start learning to see your activity here!</p>
                </div>
            `;
            return;
        }

        const activitiesHtml = activities.slice(0, 5).map(activity => `
            <div class="activity-item">
                <div class="activity-icon">${this.getActivityIcon(activity.type)}</div>
                <div class="activity-content">
                    <div class="activity-title">${activity.title}</div>
                    <div class="activity-description">${activity.description}</div>
                </div>
                <div class="activity-time">${Utils.formatDate(activity.timestamp)}</div>
            </div>
        `).join('');

        activityElement.innerHTML = `<div class="activity-list">${activitiesHtml}</div>`;
    }

    /**
     * Render achievements and certificates section
     */
    static renderAchievements() {
        const achievementsElement = document.getElementById('achievements-section');

        if ((!this.userCertificates || this.userCertificates.length === 0)) {
            achievementsElement.innerHTML = `
                <div class="empty-achievements">
                    <h3>No achievements yet</h3>
                    <p>Complete courses to earn certificates and achievements!</p>
                </div>
            `;
            return;
        }

        // Show certificates as achievements
        const certificatesHtml = this.userCertificates.slice(0, 6).map(cert => `
            <div class="achievement-card">
                <div class="achievement-icon">🏆</div>
                <div class="achievement-title">Certificate Earned</div>
                <div class="achievement-description">${cert.course_title || 'Course Completion'}</div>
                <div class="achievement-date">Earned ${Utils.formatDate(cert.earned_at)}</div>
                <a href="#" class="certificate-link" onclick="UserDashboard.viewCertificate('${cert.id}')">
                    View Certificate
                </a>
            </div>
        `).join('');

        achievementsElement.innerHTML = certificatesHtml;
    }

    /**
     * Generate mock activities for demo purposes
     * @returns {Array} Mock activity data
     */
    static generateMockActivities() {
        const activities = [];

        // Generate activities from enrolled courses
        this.enrolledCourses.forEach(course => {
            if (course.completion_percentage > 0) {
                activities.push({
                    type: 'lesson_complete',
                    title: `Completed lesson in ${course.title}`,
                    description: `Made progress on ${course.title}`,
                    timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Random last 7 days
                });
            }

            if (course.completion_percentage > 70) {
                activities.push({
                    type: 'enrolled',
                    title: `Enrolled in ${course.title}`,
                    description: `Started learning ${course.category || 'cybersecurity'}`,
                    timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Random last 30 days
                });
            }
        });

        // Add some certificate activities
        this.userCertificates.forEach(cert => {
            activities.push({
                type: 'certificate',
                title: `Earned certificate for ${cert.course_title}`,
                description: `Completed ${cert.course_title} with distinction`,
                timestamp: cert.earned_at
            });
        });

        // Sort by timestamp (most recent first)
        return activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    /**
     * Get activity type icon
     * @param {string} type - Activity type
     * @returns {string} Icon emoji
     */
    static getActivityIcon(type) {
        const icons = {
            'lesson_complete': '✓',
            'enrolled': '📚',
            'certificate': '🏆',
            'quiz_pass': '🎯',
            'streak': '🔥'
        };

        return icons[type] || '📖';
    }

    /**
     * Calculate current learning streak (simplified)
     * @returns {number} Current streak in days
     */
    static calculateCurrentStreak() {
        // Mock streak calculation - in real app, this would come from API
        // Based on recent activity and consistency
        const recentCompleted = this.enrolledCourses.filter(course =>
            course.completion_percentage > 0 &&
            course.last_accessed_at &&
            (new Date() - new Date(course.last_accessed_at)) < 7 * 24 * 60 * 60 * 1000 // Within last week
        );

        return Math.min(recentCompleted.length * 2 + 1, 7); // Mock calculation
    }

    // ============================================================================
    // NAVIGATION AND ACTION HANDLERS
    // ============================================================================

    /**
     * Browse courses action
     */
    static browseCourses() {
        window.AcademyRouter.navigateToPage('catalog');
    }

    /**
     * View certificates action
     */
    static viewCertificates() {
        Utils.showToast('Certificates feature coming soon!', 'info');
        // In real app: window.AcademyRouter.navigateToPage('certificates');
    }

    /**
     * View learning progress action
     */
    static viewProgress() {
        Utils.showToast('Detailed progress view coming soon!', 'info');
        // In real app: window.AcademyRouter.navigateToPage('progress');
    }

    /**
     * View specific course
     * @param {string} courseId - Course ID
     */
    static viewCourse(courseId) {
        Utils.showToast(`Viewing course...`, 'info');
        // In real app: would need to get course slug first
        // For now, redirect to catalog
        window.AcademyRouter.navigateToPage('catalog');
    }

    /**
     * Continue specific course
     * @param {string} courseId - Course ID
     */
    static continueCourse(courseId) {
        Utils.showToast(`Continuing course...`, 'info');
        // In real app: would find next lesson and navigate there
        this.viewCourse(courseId);
    }

    /**
     * View certificate details
     * @param {string} certificateId - Certificate ID
     */
    static async viewCertificate(certificateId) {
        try {
            const certificate = await window.AcademyAPI.verifyCertificate(certificateId);

            // Show certificate modal (simplified)
            Utils.showToast(`Certificate: ${certificate.course_title}`, 'success');

            // In real app, would open certificate modal with details
            setTimeout(() => {
                Utils.showToast('Certificate modal would open here', 'info');
            }, 1000);

        } catch (error) {
            console.error('Failed to load certificate:', error);
            Utils.showToast('Failed to load certificate', 'error');
        }
    }

    /**
     * Refresh dashboard data
     */
    static async refresh() {
        await this.init();
        Utils.showToast('Dashboard updated', 'success');
    }
}

// ============================================================================
// EXPORT FOR GLOBAL USE
// ============================================================================

// Make class globally available
window.UserDashboard = UserDashboard;

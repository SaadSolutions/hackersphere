/**
 * HACKERSPHERE ACADEMY COURSE MANAGEMENT
 * Course catalog display and course-related UI interactions
 */

// ============================================================================
// COURSE CATALOG MANAGER
// ============================================================================

class CourseCatalog {
    static courses = [];
    static currentFilters = {
        search: '',
        difficulty: '',
        featured: false,
        limit: 12,
        offset: 0
    };
    static hasMore = true;

    /**
     * Initialize the course catalog
     */
    static async init() {
        this.setupEventListeners();
        await this.loadCourses();
    }

    /**
     * Setup event listeners for search and filters
     */
    static setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.currentFilters.search = e.target.value.trim();
                    this.resetAndReload();
                }, 300);
            });
        }

        // Difficulty filter
        const difficultyFilter = document.getElementById('difficulty-filter');
        if (difficultyFilter) {
            difficultyFilter.addEventListener('change', (e) => {
                this.currentFilters.difficulty = e.target.value;
                this.resetAndReload();
            });
        }

        // Featured filter
        const featuredButton = document.getElementById('show-featured');
        if (featuredButton) {
            featuredButton.addEventListener('click', () => {
                this.currentFilters.featured = !this.currentFilters.featured;
                featuredButton.classList.toggle('active', this.currentFilters.featured);
                featuredButton.textContent = this.currentFilters.featured ? 'All Courses' : 'Featured Only';
                this.resetAndReload();
            });
        }

        // Load more button
        const loadMoreBtn = document.getElementById('load-more-btn');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => {
                this.loadMoreCourses();
            });
        }
    }

    /**
     * Reset pagination and reload courses
     */
    static resetAndReload() {
        this.currentFilters.offset = 0;
        this.courses = [];
        this.updateLoadMoreVisibility(false);
        this.loadCourses();
    }

    /**
     * Load courses from API
     */
    static async loadCourses() {
        const gridElement = document.getElementById('courses-grid');
        if (!gridElement) return;

        try {
            // Show loading state
            if (this.courses.length === 0) {
                Utils.showLoading(gridElement);
            }

            const coursesData = await window.AcademyAPI.getCourses(this.currentFilters);

            if (this.currentFilters.offset === 0) {
                this.courses = [];
            }

            this.courses.push(...coursesData.courses);
            this.hasMore = coursesData.courses.length === this.currentFilters.limit;

            this.renderCourses();
            this.updateResultsCount(coursesData.totalCount);
            this.updateLoadMoreVisibility(this.hasMore);

        } catch (error) {
            console.error('Failed to load courses:', error);
            Utils.showError('Failed to load courses. Please try again.', gridElement);
        } finally {
            Utils.hideLoading();
        }
    }

    /**
     * Load more courses for pagination
     */
    static async loadMoreCourses() {
        if (!this.hasMore) return;

        this.currentFilters.offset += this.currentFilters.limit;
        await this.loadCourses();
    }

    /**
     * Render courses in the grid
     */
    static renderCourses() {
        const gridElement = document.getElementById('courses-grid');
        if (!gridElement) return;

        // Clear existing content
        gridElement.innerHTML = '';

        if (this.courses.length === 0) {
            this.renderEmptyState();
            return;
        }

        this.courses.forEach(course => {
            const courseCard = this.createCourseCard(course);
            gridElement.appendChild(courseCard);
        });
    }

    /**
     * Create course card element
     * @param {Object} course - Course data
     * @returns {HTMLElement} Course card element
     */
    static createCourseCard(course) {
        const card = document.createElement('div');
        card.className = 'academy-card course-card';
        card.onclick = () => this.handleCourseClick(course);

        // Featured badge
        if (course.is_featured) {
            const badge = document.createElement('div');
            badge.className = 'featured-badge';
            badge.textContent = 'FEATURED';
            card.appendChild(badge);
        }

        // Course title
        const title = document.createElement('h3');
        title.className = 'academy-card-title';
        title.textContent = course.title;
        card.appendChild(title);

        // Course meta information
        const meta = document.createElement('div');
        meta.className = 'course-meta';

        const duration = document.createElement('span');
        duration.textContent = `${Utils.formatDuration(course.estimated_duration_hours)} • ${course.category || 'Cybersecurity'}`;
        meta.appendChild(duration);

        const difficulty = document.createElement('span');
        difficulty.className = `course-difficulty ${course.difficulty_level || 'intermediate'}`;
        difficulty.textContent = course.difficulty_level || 'Intermediate';
        meta.appendChild(difficulty);

        card.appendChild(meta);

        // Course description
        const description = document.createElement('div');
        description.className = 'academy-card-description';
        description.innerHTML = Utils.markdownToHtml(course.description || 'Master essential cybersecurity skills through hands-on learning.');
        card.appendChild(description);

        // View course button
        const viewButton = document.createElement('button');
        viewButton.className = 'academy-button course-view-button';
        viewButton.textContent = 'View Course';
        viewButton.onclick = (e) => {
            e.stopPropagation();
            this.handleCourseClick(course);
        };
        card.appendChild(viewButton);

        return card;
    }

    /**
     * Handle course card click
     * @param {Object} course - Course data
     */
    static handleCourseClick(course) {
        // Navigate to course detail page with course slug
        const courseSlug = course.slug || Utils.slugify(course.title);
        window.AcademyRouter.navigateToPage(`course/${courseSlug}`);
    }

    /**
     * Render empty state when no courses found
     */
    static renderEmptyState() {
        const gridElement = document.getElementById('courses-grid');
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.innerHTML = `
            <div style="text-align: center; padding: var(--spacing-xxl);">
                <h3 style="color: var(--text-secondary); margin-bottom: var(--spacing-lg);">
                    No courses found
                </h3>
                <p style="color: var(--text-dim); margin-bottom: var(--spacing-lg);">
                    Try adjusting your search or filters to find more courses.
                </p>
                <button class="academy-button small" onclick="CourseCatalog.clearFilters()">
                    Clear Filters
                </button>
            </div>
        `;
        gridElement.appendChild(emptyState);
    }

    /**
     * Clear all filters
     */
    static clearFilters() {
        this.currentFilters.search = '';
        this.currentFilters.difficulty = '';
        this.currentFilters.featured = false;

        // Reset UI elements
        const searchInput = document.getElementById('search-input');
        const difficultyFilter = document.getElementById('difficulty-filter');
        const featuredButton = document.getElementById('show-featured');

        if (searchInput) searchInput.value = '';
        if (difficultyFilter) difficultyFilter.value = '';
        if (featuredButton) {
            featuredButton.classList.remove('active');
            featuredButton.textContent = 'Featured Only';
        }

        this.resetAndReload();
    }

    /**
     * Update results count display
     * @param {number} totalCount - Total number of courses
     */
    static updateResultsCount(totalCount) {
        const countElement = document.getElementById('results-count');
        if (!countElement) return;

        const currentCount = this.courses.length;
        const isFiltered = this.currentFilters.search || this.currentFilters.difficulty || this.currentFilters.featured;

        countElement.textContent = isFiltered
            ? `Showing ${currentCount} of ${totalCount} courses`
            : `${currentCount} courses available`;
    }

    /**
     * Update load more button visibility
     * @param {boolean} show - Whether to show load more button
     */
    static updateLoadMoreVisibility(show) {
        const container = document.getElementById('load-more-container');
        if (container) {
            container.style.display = show ? 'block' : 'none';
        }
    }
}

// ============================================================================
// COURSE DETAIL VIEW
// ============================================================================

class CourseDetail {
    static currentCourse = null;

    /**
     * Initialize course detail view
     * @param {string} courseSlug - Course slug from URL
     */
    static async init(courseSlug) {
        try {
            Utils.showLoading(document.getElementById('course-content'));

            // Load course data
            const response = await window.AcademyAPI.getCourse(courseSlug);

            if (!response || !response.data) {
                throw new Error('Course not found');
            }

            this.currentCourse = response.data;
            this.renderCourseDetail();

            // Load full course content for enrolled users
            const isAuthenticated = window.AcademyAPI.isAuthenticated();
            if (isAuthenticated && await this.checkEnrollmentStatus(this.currentCourse.id)) {
                await this.loadCourseContent(this.currentCourse.id);
            }

        } catch (error) {
            console.error('Failed to load course:', error);
            Utils.showError('Failed to load course details. Please try again.');
        } finally {
            Utils.hideLoading();
        }
    }

    /**
     * Check if user is enrolled in course
     * @param {string} courseId - Course ID
     * @returns {boolean} Enrollment status
     */
    static async checkEnrollmentStatus(courseId) {
        try {
            const enrolledCourses = await window.AcademyAPI.getUserEnrolledCourses();
            return enrolledCourses.some(course => course.id === courseId);
        } catch (error) {
            return false;
        }
    }

    /**
     * Load full course content (modules and lessons)
     * @param {string} courseId - Course ID
     */
    static async loadCourseContent(courseId) {
        try {
            const response = await window.AcademyAPI.getCourseContent(courseId);
            this.renderCourseContent(response.data);
        } catch (error) {
            console.error('Failed to load course content:', error);
        }
    }

    /**
     * Render course detail page
     */
    static renderCourseDetail() {
        const course = this.currentCourse;
        const contentContainer = document.getElementById('course-content');

        if (!contentContainer || !course) return;

        // Breadcrumbs
        const breadcrumbs = Utils.createBreadcrumbs([
            { text: 'Catalog', href: '/academy/catalog' },
            { text: course.title }
        ]);

        // Course header
        const header = this.createCourseHeader(course);

        // Course content placeholder
        const content = document.createElement('div');
        content.id = 'course-full-content';

        contentContainer.innerHTML = '';
        contentContainer.appendChild(breadcrumbs);
        contentContainer.appendChild(header);
        contentContainer.appendChild(content);
    }

    /**
     * Create course header element
     * @param {Object} course - Course data
     * @returns {HTMLElement} Header element
     */
    static createCourseHeader(course) {
        const header = document.createElement('div');
        header.className = 'course-header';

        header.innerHTML = `
            <div class="course-hero">
                <h1 class="course-title">${course.title}</h1>
                <div class="course-meta">
                    <span class="course-difficulty ${course.difficulty_level || 'intermediate'}">
                        ${course.difficulty_level || 'Intermediate'}
                    </span>
                    <span class="course-duration">
                        ${Utils.formatDuration(course.estimated_duration_hours)}
                    </span>
                    <span class="course-category">${course.category || 'Cybersecurity'}</span>
                </div>
                <p class="course-description">${course.description || 'Master essential cybersecurity skills through hands-on learning.'}</p>
                <div id="enroll-section" class="enroll-section">
                    <!-- Enrollment buttons will be populated here -->
                </div>
            </div>
        `;

        // Add enrollment section based on auth status
        this.updateEnrollmentSection(course.id);

        return header;
    }

    /**
     * Update enrollment section based on user status
     * @param {string} courseId - Course ID
     */
    static async updateEnrollmentSection(courseId) {
        const enrollSection = document.getElementById('enroll-section');
        if (!enrollSection) return;

        const isAuthenticated = window.AcademyAPI.isAuthenticated();
        const isEnrolled = isAuthenticated && await this.checkEnrollmentStatus(courseId);

        if (!isAuthenticated) {
            enrollSection.innerHTML = `
                <button class="academy-button enroll-btn" onclick="CourseDetail.handleLoginPrompt()">
                    Login to Enroll
                </button>
            `;
        } else if (!isEnrolled) {
            enrollSection.innerHTML = `
                <button class="academy-button enroll-btn" onclick="CourseDetail.handleEnroll('${courseId}')">
                    Enroll in This Course
                </button>
            `;
        } else {
            enrollSection.innerHTML = `
                <button class="academy-button secondary enrolled-btn" disabled>
                    ✓ Enrolled
                </button>
                <button class="academy-button" onclick="CourseDetail.startCourse('${courseId}')">
                    Start Learning
                </button>
            `;
        }
    }

    /**
     * Handle enrollment prompt for non-authenticated users
     */
    static handleLoginPrompt() {
        Utils.showToast('Please log in to enroll in courses', 'error');
        setTimeout(() => {
            // In a real app, this would redirect to login page
            alert('Login functionality would be implemented here');
        }, 2000);
    }

    /**
     * Handle course enrollment
     * @param {string} courseId - Course ID
     */
    static async handleEnroll(courseId) {
        try {
            await window.AcademyAPI.enrollInCourse(courseId);
            Utils.showToast('Successfully enrolled in course!', 'success');
            this.updateEnrollmentSection(courseId);
        } catch (error) {
            console.error('Failed to enroll:', error);
            Utils.showToast('Failed to enroll in course', 'error');
        }
    }

    /**
     * Start course (navigate to first lesson)
     * @param {string} courseId - Course ID
     */
    static startCourse(courseId) {
        // In a real implementation, this would find the first lesson
        // For now, navigate to course progress view
        window.AcademyRouter.navigateToPage(`course/${courseId}/lessons`);
    }

    /**
     * Render course content (modules and lessons)
     * @param {Object} courseContent - Full course content
     */
    static renderCourseContent(courseContent) {
        const contentElement = document.getElementById('course-full-content');
        if (!contentElement) return;

        const modules = courseContent.modules || [];

        if (modules.length === 0) {
            contentElement.innerHTML = '<p class="text-center">Course content is being prepared.</p>';
            return;
        }

        const contentContainer = document.createElement('div');
        contentContainer.className = 'course-modules';

        modules.forEach((module, moduleIndex) => {
            const moduleElement = this.createModuleElement(module, moduleIndex + 1);
            contentContainer.appendChild(moduleElement);
        });

        contentElement.innerHTML = '';
        contentElement.appendChild(contentContainer);
    }

    /**
     * Create module element
     * @param {Object} module - Module data
     * @param {number} moduleNumber - Module number
     * @returns {HTMLElement} Module element
     */
    static createModuleElement(module, moduleNumber) {
        const moduleElement = document.createElement('div');
        moduleElement.className = 'course-module';

        moduleElement.innerHTML = `
            <h3 class="module-title">Module ${moduleNumber}: ${module.title}</h3>
            <p class="module-description">${module.description || ''}</p>
            <div class="module-lessons">
                ${module.lessons?.map((lesson, lessonIndex) =>
                    this.createLessonElement(lesson, lessonIndex + 1)
                ).join('') || '<p>No lessons available yet.</p>'}
            </div>
        `;

        // Add click handlers for lessons
        const lessonElements = moduleElement.querySelectorAll('.lesson-item');
        lessonElements.forEach((lessonEl, index) => {
            const lesson = module.lessons[index];
            lessonEl.addEventListener('click', () => {
                this.handleLessonClick(lesson);
            });
        });

        return moduleElement;
    }

    /**
     * Create lesson element
     * @param {Object} lesson - Lesson data
     * @param {number} lessonNumber - Lesson number in module
     * @returns {string} Lesson HTML string
     */
    static createLessonElement(lesson, lessonNumber) {
        return `
            <div class="lesson-item" data-lesson-id="${lesson.id}">
                <div class="lesson-info">
                    <span class="lesson-number">${lessonNumber}</span>
                    <h4 class="lesson-title">${lesson.title}</h4>
                    <span class="lesson-duration">${Math.round(lesson.estimated_duration_minutes || 0)} min</span>
                </div>
                <div class="lesson-status">
                    ${lesson.is_preview ? '<span class="preview-badge">Preview</span>' : ''}
                    ${window.AcademyAPI.isAuthenticated() ? '<span class="status-indicator">⊙</span>' : ''}
                </div>
            </div>
        `;
    }

    /**
     * Handle lesson click
     * @param {Object} lesson - Lesson data
     */
    static handleLessonClick(lesson) {
        if (lesson.is_preview || window.AcademyAPI.isAuthenticated()) {
            window.AcademyRouter.navigateToPage(`lesson/${lesson.id}`);
        } else {
            Utils.showToast('Please enroll in the course to access lessons', 'error');
        }
    }
}

// ============================================================================
// EXPORT FOR GLOBAL USE
// ============================================================================

// Make classes globally available
window.CourseCatalog = CourseCatalog;
window.CourseDetail = CourseDetail;



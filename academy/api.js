/**
 * HACKERSPHERE ACADEMY API WRAPPER
 * API client for real backend integration
 */
class AcademyAPI {
  constructor() {
    this.baseURL = 'http://localhost:5000/api';
    this.token = null;
    this.retryAttempts = 3;
    this.retryDelay = 1000; // Base delay in ms
    this.loadingStates = new Map();
    this.cachingEnabled = true;
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseURL}/academy${endpoint}`;

    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    // Add auth token if available
    if (this.token) {
      config.headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    return await response.json();
  }

  // ============================================================================
  // AUTHENTICATION METHODS
  // ============================================================================

  setToken(token) {
    this.token = token;
    localStorage.setItem('academy_token', token);
  }

  removeToken() {
    this.token = null;
    localStorage.removeItem('academy_token');
  }

  loadToken() {
    const storedToken = localStorage.getItem('academy_token');
    if (storedToken) {
      this.token = storedToken;
    }
    return this.token;
  }

  isAuthenticated() {
    return !!this.token || !!localStorage.getItem('academy_token');
  }

  // ============================================================================
  // COURSE METHODS
  // ============================================================================

  async getCourses(params = {}) {
    try {
      const queryParams = new URLSearchParams();

      // Add search parameter
      if (params.search) queryParams.append('search', params.search);
      if (params.difficulty) queryParams.append('difficulty', params.difficulty);
      if (params.featured) queryParams.append('featured', params.featured);
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.offset) queryParams.append('offset', params.offset.toString());

      const endpoint = `/courses?${queryParams.toString()}`;
      const response = await this.makeRequest(endpoint);

      return {
        courses: response.data,
        totalCount: response.totalCount || response.data?.length || 0
      };
    } catch (error) {
      console.error('Error fetching courses:', error);
      throw error;
    }
  }

  async getCourse(courseSlug) {
    try {
      const response = await this.makeRequest(`/courses/${courseSlug}`);
      return response;
    } catch (error) {
      console.error('Error fetching course:', error);
      throw error;
    }
  }

  async getCourseContent(courseId) {
    try {
      const response = await this.makeRequest(`/courses/${courseId}/full`);
      return response;
    } catch (error) {
      console.error('Error fetching course content:', error);
      throw error;
    }
  }

  async getUserEnrolledCourses() {
    try {
      const response = await this.makeRequest('/progress/courses');
      return response.data || [];
    } catch (error) {
      console.error('Error fetching enrolled courses:', error);
      // Return empty array if user is not authenticated
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        return [];
      }
      throw error;
    }
  }

  async enrollInCourse(courseId) {
    try {
      const response = await this.makeRequest(`/courses/${courseId}/enroll`, {
        method: 'POST'
      });
      return response;
    } catch (error) {
      console.error('Error enrolling in course:', error);
      throw error;
    }
  }

  // ============================================================================
  // LESSON METHODS
  // ============================================================================

  async getLesson(lessonId) {
    try {
      const response = await this.makeRequest(`/lessons/${lessonId}`);
      return response;
    } catch (error) {
      console.error('Error fetching lesson:', error);
      throw error;
    }
  }

  async recordLessonView(lessonId, timeSpent = 0) {
    try {
      const response = await this.makeRequest(`/lessons/${lessonId}/view`, {
        method: 'POST',
        body: JSON.stringify({ timeSpent })
      });
      return response;
    } catch (error) {
      console.error('Error recording lesson view:', error);
      throw error;
    }
  }

  async completeLesson(lessonId) {
    try {
      const response = await this.makeRequest(`/lessons/${lessonId}/complete`, {
        method: 'POST'
      });
      return response;
    } catch (error) {
      console.error('Error completing lesson:', error);
      throw error;
    }
  }

  // ============================================================================
  // ADVANCED LESSON METHODS
  // ============================================================================

  async getLessonsForModule(moduleId) {
    try {
      const response = await this.makeRequest(`/modules/${moduleId}/lessons`);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching lessons for module:', error);
      throw error;
    }
  }

  async getUserProgressForModule(moduleId) {
    try {
      const response = await this.makeRequest(`/progress/modules/${moduleId}`);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching user progress for module:', error);
      throw error;
    }
  }

  async updateMultipleProgress(progressUpdates) {
    try {
      const response = await this.makeRequest('/progress/bulk', {
        method: 'POST',
        body: JSON.stringify({ updates: progressUpdates })
      });
      return response;
    } catch (error) {
      console.error('Error updating multiple progress:', error);
      throw error;
    }
  }

  // ============================================================================
  // CERTIFICATE METHODS
  // ============================================================================

  async getCertificateData(courseId) {
    try {
      const response = await this.makeRequest(`/courses/${courseId}/certificate`);
      return response;
    } catch (error) {
      console.error('Error fetching certificate data:', error);
      // Return null if certificate not available
      if (error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  // ============================================================================
  // ADVANCED COURSE METHODS
  // ============================================================================

  async searchCourses(query, filters = {}) {
    try {
      const queryParams = new URLSearchParams();

      if (query) queryParams.append('q', query);
      if (filters.category) queryParams.append('category', filters.category);
      if (filters.difficulty) queryParams.append('difficulty', filters.difficulty);
      if (filters.featured !== undefined) queryParams.append('featured', filters.featured.toString());
      if (filters.limit) queryParams.append('limit', filters.limit.toString());
      if (filters.offset) queryParams.append('offset', filters.offset.toString());

      const endpoint = `/courses/search?${queryParams.toString()}`;
      const response = await this.makeRequest(endpoint);

      return {
        courses: response.data || [],
        totalCount: response.totalCount || 0,
        facets: response.facets || {}
      };
    } catch (error) {
      console.error('Error searching courses:', error);
      throw error;
    }
  }

  async getRecommendedCourses() {
    try {
      const response = await this.makeRequest('/courses/recommended');
      return response.data || [];
    } catch (error) {
      console.error('Error fetching recommended courses:', error);
      throw error;
    }
  }

  // ============================================================================
  // ERROR HANDLING METHODS
  // ============================================================================

  async handleNetworkError(error) {
    console.error('Network error:', error);

    // Check if it's a network connectivity issue
    if (!navigator.onLine) {
      throw new Error('No internet connection. Please check your network and try again.');
    }

    // Check if it's a server timeout or connectivity issue
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      throw new Error('Unable to connect to the server. Please try again later.');
    }

    return error;
  }

  async handleAuthError(error) {
    console.error('Authentication error:', error);

    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      // Token expired or invalid - redirect to login
      this.removeToken();
      this.redirectToAuth();
      throw new Error('Your session has expired. Please log in again.');
    }

    if (error.message.includes('403') || error.message.includes('Forbidden')) {
      throw new Error('You do not have permission to perform this action.');
    }

    return error;
  }

  async handleServerError(error) {
    console.error('Server error:', error);

    if (error.message.includes('500')) {
      throw new Error('Server temporarily unavailable. Please try again later.');
    }

    if (error.message.includes('503')) {
      throw new Error('Service temporarily unavailable. Please try again later.');
    }

    return error;
  }

  async retryWithBackoff(requestFn, maxRetries = this.retryAttempts, baseDelay = this.retryDelay) {
    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;

        // Check if error is retryable (network errors, 5xx errors)
        const isRetryable =
          error.message.includes('Failed to fetch') ||
          error.message.includes('NetworkError') ||
          error.message.includes('500') ||
          error.message.includes('503') ||
          error.message.includes('502') ||
          error.message.includes('504');

        if (!isRetryable || attempt === maxRetries - 1) {
          break;
        }

        // Exponential backoff with jitter
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  // ============================================================================
  // LOADING STATE MANAGEMENT
  // ============================================================================

  showLoadingIndicator(elementId, message = 'Loading...') {
    const element = document.getElementById(elementId);
    if (element) {
      element.innerHTML = `
        <div class="loading-spinner">
          <div class="spinner"></div>
          <p>${message}</p>
        </div>
      `;
      element.style.display = 'block';
    }
    this.loadingStates.set(elementId, true);
  }

  hideLoadingIndicator(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      element.style.display = 'none';
      element.innerHTML = '';
    }
    this.loadingStates.delete(elementId);
  }

  updateProgressBar(elementId, percentage) {
    const element = document.getElementById(elementId);
    if (element) {
      const progressBar = element.querySelector('.progress-bar');
      if (progressBar) {
        progressBar.style.width = `${percentage}%`;
      }

      const progressText = element.querySelector('.progress-text');
      if (progressText) {
        progressText.textContent = `${Math.round(percentage)}%`;
      }
    }
  }

  // ============================================================================
  // CACHE MANAGEMENT
  // ============================================================================

  getCacheKey(endpoint, params = {}) {
    return `${endpoint}:${JSON.stringify(params)}`;
  }

  setCache(endpoint, params = {}, data) {
    if (this.cachingEnabled) {
      const key = this.getCacheKey(endpoint, params);
      const cacheEntry = {
        data: data,
        timestamp: Date.now()
      };
      this.cache.set(key, cacheEntry);

      // Clean up old cache entries
      this.cleanupCache();
    }
  }

  getCache(endpoint, params = {}) {
    if (!this.cachingEnabled) return null;

    const key = this.getCacheKey(endpoint, params);
    const cacheEntry = this.cache.get(key);

    if (cacheEntry && (Date.now() - cacheEntry.timestamp) < this.cacheTimeout) {
      return cacheEntry.data;
    }

    // Cache expired or not found
    this.cache.delete(key);
    return null;
  }

  cleanupCache() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp >= this.cacheTimeout) {
        this.cache.delete(key);
      }
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  redirectToAuth() {
    // Save current page for redirect after login
    const currentPath = window.location.pathname + window.location.search;
    localStorage.setItem('post_login_redirect', currentPath);
    window.location.href = '/academy/login.html';
  }

  async makeAuthenticatedRequest(endpoint, options = {}) {
    // Automatically handle token refresh and retry on auth errors
    try {
      return await this.retryWithBackoff(() => this.makeRequest(endpoint, options));
    } catch (error) {
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        await this.handleAuthError(error);
      }
      throw error;
    }
  }
}

// ============================================================================
// ACADEMY API INSTANCE
// ============================================================================

const academyAPI = new AcademyAPI();

// Make globally available
window.AcademyAPI = academyAPI;

// Auto-load token on page load
document.addEventListener('DOMContentLoaded', () => {
  academyAPI.loadToken();
});



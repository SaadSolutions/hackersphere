/**
 * HACKERSPHERE ACADEMY UTILITIES
 * Common utilities for routing, UI, formatting, and more
 */

// ============================================================================
// ROUTING UTILITIES
// ============================================================================

class AcademyRouter {
  constructor() {
    this.routes = {};
    this.currentRoute = null;
    this.defaultPage = 'catalog';

    // Handle back/forward buttons
    window.addEventListener('popstate', (event) => {
      if (event.state && event.state.page) {
        this.navigateToPage(event.state.page, false);
      }
    });

    // Handle initial page load
    document.addEventListener('DOMContentLoaded', () => {
      const currentPage = this.getCurrentPageFromURL();
      this.navigateToPage(currentPage, false);
    });
  }

  /**
   * Add route handler
   * @param {string} page - Page identifier
   * @param {Function} handler - Route handler function
   */
  addRoute(page, handler) {
    this.routes[page] = handler;
  }

  /**
   * Navigate to a page
   * @param {string} page - Page to navigate to
   * @param {boolean} updateHistory - Update browser history
   */
  navigateToPage(page, updateHistory = true) {
    if (!this.routes[page]) {
      console.warn(`Route '${page}' not found`);
      page = this.defaultPage;
    }

    this.currentRoute = page;

    // Update URL without reload
    if (updateHistory) {
      const newPath = `/academy/${page}`;
      history.pushState({ page }, '', newPath);
    }

    // Execute route handler
    this.routes[page]();

    // Update active navigation
    this.updateNavigation(page);
  }

  /**
   * Get current page from URL
   * @returns {string} Current page identifier
   */
  getCurrentPageFromURL() {
    const path = window.location.pathname;
    const match = path.match(/\/academy\/([^\/]*)/);
    return match ? match[1] : this.defaultPage;
  }

  /**
   * Update navigation active states
   * @param {string} activePage - Currently active page
   */
  updateNavigation(activePage) {
    // Update navigation links
    document.querySelectorAll('.academy-nav-link').forEach(link => {
      link.classList.remove('active');
    });

    const activeLink = document.querySelector(`[data-page="${activePage}"]`);
    if (activeLink) {
      activeLink.classList.add('active');
    }

    // Update page title
    const titles = {
      'catalog': 'Course Catalog',
      'course': 'Course Details',
      'lesson': 'Lesson Viewer',
      'dashboard': 'Learning Dashboard'
    };

    document.title = titles[activePage] ? `HackerSphere - ${titles[activePage]}` : 'HackerSphere Academy';
  }
}

// ============================================================================
// UI UTILITIES
// ============================================================================

const Utils = {
  /**
   * Show toast notification
   * @param {string} message - Toast message
   * @param {string} type - Toast type (success, error, info)
   */
  showToast(message, type = 'info') {
    const toastContainer = document.querySelector('.academy-toast-container');
    if (!toastContainer) {
      // Create toast container if it doesn't exist
      const container = document.createElement('div');
      container.className = 'academy-toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `academy-toast ${type}`;
    toast.textContent = message;

    document.querySelector('.academy-toast-container').appendChild(toast);

    // Auto remove after 4 seconds
    setTimeout(() => {
      toast.remove();
    }, 4000);
  },

  /**
   * Show loading spinner
   * @param {HTMLElement} container - Container element
   */
  showLoading(container) {
    const loading = document.createElement('div');
    loading.className = 'academy-loading';
    loading.innerHTML = '<div class="academy-spinner"></div>';

    if (container) {
      container.innerHTML = '';
      container.appendChild(loading);
    } else {
      document.body.appendChild(loading);
      return loading; // Return for manual cleanup
    }
  },

  /**
   * Hide loading spinner
   */
  hideLoading() {
    const loadingElements = document.querySelectorAll('.academy-loading');
    loadingElements.forEach(el => el.remove());
  },

  /**
   * Show error message
   * @param {string} message - Error message
   * @param {HTMLElement} container - Container element
   */
  showError(message, container = null) {
    const error = document.createElement('div');
    error.className = 'academy-error';
    error.textContent = message;

    if (container) {
      container.appendChild(error);
    } else {
      document.body.appendChild(error);
      setTimeout(() => error.remove(), 5000);
    }
  },

  /**
   * Create breadcrumb navigation
   * @param {Array} crumbs - Array of crumb objects {text, href}
   * @returns {HTMLElement} Breadcrumb element
   */
  createBreadcrumbs(crumbs) {
    const container = document.createElement('nav');
    container.className = 'academy-breadcrumbs';

    const list = document.createElement('ul');
    list.style.listStyle = 'none';
    list.style.display = 'flex';
    list.style.gap = 'var(--spacing-sm)';

    crumbs.forEach((crumb, index) => {
      const li = document.createElement('li');

      if (crumb.href && index < crumbs.length - 1) {
        const link = document.createElement('a');
        link.href = crumb.href;
        link.textContent = crumb.text;
        link.style.color = 'var(--text-secondary)';
        link.style.textDecoration = 'none';
        li.appendChild(link);
        link.addEventListener('click', (e) => {
          e.preventDefault();
          if (crumb.href.startsWith('/academy/')) {
            const page = crumb.href.replace('/academy/', '');
            window.AcademyRouter.navigateToPage(page);
          } else {
            window.location.href = crumb.href;
          }
        });
      } else {
        li.textContent = crumb.text;
        li.style.color = 'var(--matrix-green)';
      }

      if (index < crumbs.length - 1) {
        li.textContent += ' / ';
      }

      list.appendChild(li);
    });

    container.appendChild(list);
    return container;
  },

  /**
   * Format duration in hours and minutes
   * @param {number} hours - Duration in hours
   * @returns {string} Formatted duration
   */
  formatDuration(hours) {
    if (hours < 1) {
      return `${Math.round(hours * 60)} min`;
    } else if (hours < 24) {
      return `${hours}h`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}d ${remainingHours}h`;
    }
  },

  /**
   * Format date in human readable format
   * @param {string|Date} date - Date to format
   * @returns {string} Formatted date
   */
  formatDate(date) {
    const d = new Date(date);
    const now = new Date();
    const diffTime = Math.abs(now - d);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return 'Today';
    } else if (diffDays === 2) {
      return 'Yesterday';
    } else if (diffDays <= 7) {
      return `${diffDays - 1} days ago`;
    } else {
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  },

  /**
   * Convert text to URL slug
   * @param {string} text - Text to slugify
   * @returns {string} URL slug
   */
  slugify(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  },

  /**
   * Basic markdown to HTML converter
   * @param {string} markdown - Markdown text
   * @returns {string} HTML string
   */
  markdownToHtml(markdown) {
    return markdown
      .replace(/`([^`]*)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]*)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]*)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]*)\]\(([^)]*)\)/g, '<a href="$2">$1</a>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\n/g, '<br>');
  },

  /**
   * Get URL parameter by name
   * @param {string} name - Parameter name
   * @returns {string|null} Parameter value or null
   */
  getURLParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
  },

  /**
   * Set URL parameter
   * @param {string} name - Parameter name
   * @param {string} value - Parameter value
   */
  setURLParam(name, value) {
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set(name, value);

    const newURL = `${window.location.pathname}?${urlParams.toString()}`;
    history.replaceState(null, '', newURL);
  },

  /**
   * Generate BEM-style CSS class name
   * @param {string} block - Block name
   * @param {string} element - Element name
   * @param {Array} modifiers - Modifier classes
   * @returns {string} BEM class name
   */
  bemClass(block, element = '', modifiers = []) {
    let className = element ? `${block}__${element}` : block;

    modifiers.forEach(modifier => {
      if (modifier) {
        className += ` ${block}--${modifier}`;
      }
    });

    return className;
  }
};

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

// Export utilities globally
window.Utils = Utils;

// Initialize router globally
window.AcademyRouter = new AcademyRouter();

// Define AcademyRouter as a constructor for consistency
window.AcademyRouter.constructor = AcademyRouter;

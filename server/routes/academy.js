const express = require('express');
const { query } = require('../config/db');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// ─── Courses ────────────────────────────────────────────────────────────────

// GET /api/academy/courses
router.get('/courses', optionalAuth, async (req, res) => {
  try {
    const {
      page = 1, limit = 12, search = '', category = '',
      difficulty = '', featured = '', sort = 'created_at',
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = ['c.is_published = true'];
    const params = [];
    let idx = 1;

    if (search) {
      conditions.push(`(c.title ILIKE $${idx} OR c.description ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }
    if (category) {
      conditions.push(`c.category ILIKE $${idx}`);
      params.push(category);
      idx++;
    }
    if (difficulty) {
      conditions.push(`c.difficulty_level = $${idx}`);
      params.push(difficulty);
      idx++;
    }
    if (featured === 'true') {
      conditions.push('c.is_featured = true');
    }

    const orderMap = {
      'created_at': 'c.created_at DESC',
      'rating': 'c.rating DESC',
      'enrollment': 'c.enrollment_count DESC',
      'title': 'c.title ASC',
    };
    const orderBy = orderMap[sort] || 'c.created_at DESC';

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(`SELECT COUNT(*) FROM courses c ${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(parseInt(limit), offset);
    const result = await query(
      `SELECT c.id, c.slug, c.title, c.short_description, c.description,
              c.difficulty_level, c.category, c.estimated_duration_hours,
              c.is_featured, c.rating, c.review_count, c.enrollment_count,
              c.thumbnail_url, c.price, c.tags, c.created_at,
              (SELECT COUNT(*) FROM modules m WHERE m.course_id = c.id) AS module_count,
              (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id) AS lesson_count
       FROM courses c ${where}
       ORDER BY ${orderBy}
       LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );

    res.json({
      courses: result.rows,
      totalCount: total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    console.error('Get courses error:', err);
    res.status(500).json({ message: 'Failed to fetch courses' });
  }
});

// GET /api/academy/courses/search
router.get('/courses/search', async (req, res) => {
  const { q = '' } = req.query;
  try {
    const result = await query(
      `SELECT id, slug, title, short_description, difficulty_level, category,
              thumbnail_url, rating, estimated_duration_hours
       FROM courses
       WHERE is_published = true
         AND (title ILIKE $1 OR description ILIKE $1 OR category ILIKE $1)
       ORDER BY rating DESC LIMIT 20`,
      [`%${q}%`]
    );
    res.json({ courses: result.rows });
  } catch (err) {
    res.status(500).json({ message: 'Search failed' });
  }
});

// GET /api/academy/courses/recommended
router.get('/courses/recommended', optionalAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, slug, title, short_description, difficulty_level, category,
              thumbnail_url, rating, estimated_duration_hours, enrollment_count
       FROM courses WHERE is_published = true AND is_featured = true
       ORDER BY rating DESC LIMIT 6`
    );
    res.json({ courses: result.rows });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch recommendations' });
  }
});

// GET /api/academy/courses/:slug
router.get('/courses/:slug', optionalAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT c.*,
              (SELECT COUNT(*) FROM modules m WHERE m.course_id = c.id) AS module_count,
              (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id) AS lesson_count
       FROM courses c WHERE c.slug = $1 AND c.is_published = true`,
      [req.params.slug]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const course = result.rows[0];

    // Get modules with lessons
    const modules = await query(
      `SELECT m.id, m.title, m.description, m.order_index,
              json_agg(
                json_build_object(
                  'id', l.id, 'title', l.title, 'order_index', l.order_index,
                  'duration_minutes', l.duration_minutes, 'is_preview', l.is_preview
                ) ORDER BY l.order_index
              ) FILTER (WHERE l.id IS NOT NULL) AS lessons
       FROM modules m
       LEFT JOIN lessons l ON l.module_id = m.id
       WHERE m.course_id = $1
       GROUP BY m.id ORDER BY m.order_index`,
      [course.id]
    );
    course.modules = modules.rows;

    // Check enrollment if user logged in
    if (req.user) {
      const enrolled = await query(
        'SELECT id, enrolled_at, completed_at FROM enrollments WHERE user_id = $1 AND course_id = $2',
        [req.user.id, course.id]
      );
      course.isEnrolled = enrolled.rows.length > 0;
      course.enrollment = enrolled.rows[0] || null;
    }

    res.json(course);
  } catch (err) {
    console.error('Get course error:', err);
    res.status(500).json({ message: 'Failed to fetch course' });
  }
});

// GET /api/academy/courses/:courseId/full
router.get('/courses/:courseId/full', authenticate, async (req, res) => {
  try {
    // Verify enrollment
    const enrolled = await query(
      'SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2',
      [req.user.id, req.params.courseId]
    );
    if (!enrolled.rows.length && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not enrolled in this course' });
    }

    const result = await query(
      'SELECT * FROM courses WHERE id = $1 AND is_published = true',
      [req.params.courseId]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Course not found' });

    const course = result.rows[0];
    const modules = await query(
      `SELECT m.id, m.title, m.description, m.order_index,
              json_agg(
                json_build_object(
                  'id', l.id, 'title', l.title, 'order_index', l.order_index,
                  'duration_minutes', l.duration_minutes, 'content_blocks', l.content_blocks
                ) ORDER BY l.order_index
              ) FILTER (WHERE l.id IS NOT NULL) AS lessons
       FROM modules m
       LEFT JOIN lessons l ON l.module_id = m.id
       WHERE m.course_id = $1
       GROUP BY m.id ORDER BY m.order_index`,
      [course.id]
    );
    course.modules = modules.rows;
    res.json(course);
  } catch (err) {
    console.error('Get full course error:', err);
    res.status(500).json({ message: 'Failed to fetch course content' });
  }
});

// POST /api/academy/courses/:courseId/enroll
router.post('/courses/:courseId/enroll', authenticate, async (req, res) => {
  try {
    const course = await query(
      'SELECT id, title FROM courses WHERE id = $1 AND is_published = true',
      [req.params.courseId]
    );
    if (!course.rows.length) return res.status(404).json({ message: 'Course not found' });

    await query(
      'INSERT INTO enrollments (user_id, course_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.user.id, req.params.courseId]
    );
    // Increment enrollment count
    await query(
      'UPDATE courses SET enrollment_count = enrollment_count + 1 WHERE id = $1',
      [req.params.courseId]
    );

    res.json({ message: 'Successfully enrolled', courseId: req.params.courseId });
  } catch (err) {
    console.error('Enroll error:', err);
    res.status(500).json({ message: 'Enrollment failed' });
  }
});

// GET /api/academy/courses/:courseId/certificate
router.get('/courses/:courseId/certificate', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT cert.*, c.title AS course_title, u.first_name, u.last_name, u.username
       FROM certificates cert
       JOIN courses c ON c.id = cert.course_id
       JOIN users u ON u.id = cert.user_id
       WHERE cert.user_id = $1 AND cert.course_id = $2`,
      [req.user.id, req.params.courseId]
    );
    if (!result.rows.length) {
      return res.status(404).json({ message: 'Certificate not found. Complete the course first.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch certificate' });
  }
});

// ─── Lessons ─────────────────────────────────────────────────────────────────

// GET /api/academy/lessons/:lessonId
router.get('/lessons/:lessonId', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT l.*, m.title AS module_title, m.order_index AS module_order
       FROM lessons l JOIN modules m ON m.id = l.module_id
       WHERE l.id = $1`,
      [req.params.lessonId]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Lesson not found' });

    const lesson = result.rows[0];

    // Verify enrollment (or admin)
    if (req.user.role !== 'admin' && !lesson.is_preview) {
      const enrolled = await query(
        'SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2',
        [req.user.id, lesson.course_id]
      );
      if (!enrolled.rows.length) {
        return res.status(403).json({ message: 'Not enrolled in this course' });
      }
    }

    // Get progress
    const progress = await query(
      'SELECT * FROM progress WHERE user_id = $1 AND lesson_id = $2',
      [req.user.id, lesson.id]
    );
    lesson.progress = progress.rows[0] || null;

    // Prev/next lesson
    const siblings = await query(
      `SELECT id, title, order_index FROM lessons
       WHERE module_id = $1 ORDER BY order_index`,
      [lesson.module_id]
    );
    const idx = siblings.rows.findIndex(l => l.id === lesson.id);
    lesson.prevLesson = idx > 0 ? siblings.rows[idx - 1] : null;
    lesson.nextLesson = idx < siblings.rows.length - 1 ? siblings.rows[idx + 1] : null;

    res.json(lesson);
  } catch (err) {
    console.error('Get lesson error:', err);
    res.status(500).json({ message: 'Failed to fetch lesson' });
  }
});

// POST /api/academy/lessons/:lessonId/view
router.post('/lessons/:lessonId/view', authenticate, async (req, res) => {
  try {
    const lesson = await query('SELECT course_id FROM lessons WHERE id = $1', [req.params.lessonId]);
    if (!lesson.rows.length) return res.status(404).json({ message: 'Lesson not found' });

    await query(
      `INSERT INTO progress (user_id, lesson_id, course_id, last_accessed)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, lesson_id)
       DO UPDATE SET last_accessed = NOW()`,
      [req.user.id, req.params.lessonId, lesson.rows[0].course_id]
    );
    res.json({ message: 'View recorded' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to record view' });
  }
});

// POST /api/academy/lessons/:lessonId/complete
router.post('/lessons/:lessonId/complete', authenticate, async (req, res) => {
  try {
    const { timeSpentSeconds = 0, completionPercentage = 100 } = req.body;
    const lesson = await query(
      'SELECT course_id FROM lessons WHERE id = $1',
      [req.params.lessonId]
    );
    if (!lesson.rows.length) return res.status(404).json({ message: 'Lesson not found' });

    const courseId = lesson.rows[0].course_id;

    await query(
      `INSERT INTO progress (user_id, lesson_id, course_id, completed, completion_percentage, time_spent_seconds, completed_at)
       VALUES ($1, $2, $3, true, $4, $5, NOW())
       ON CONFLICT (user_id, lesson_id)
       DO UPDATE SET completed = true, completion_percentage = $4,
                     time_spent_seconds = progress.time_spent_seconds + $5,
                     completed_at = COALESCE(progress.completed_at, NOW()),
                     last_accessed = NOW()`,
      [req.user.id, req.params.lessonId, courseId, completionPercentage, timeSpentSeconds]
    );

    // Check if course is fully completed
    const totalLessons = await query(
      'SELECT COUNT(*) FROM lessons WHERE course_id = $1',
      [courseId]
    );
    const completedLessons = await query(
      'SELECT COUNT(*) FROM progress WHERE user_id = $1 AND course_id = $2 AND completed = true',
      [req.user.id, courseId]
    );

    const total = parseInt(totalLessons.rows[0].count);
    const completed = parseInt(completedLessons.rows[0].count);
    const courseComplete = total > 0 && completed >= total;

    if (courseComplete) {
      // Issue certificate if not already issued
      const certCode = `HS-${courseId.slice(0, 8).toUpperCase()}-${req.user.id.slice(0, 8).toUpperCase()}`;
      await query(
        `INSERT INTO certificates (user_id, course_id, certificate_code)
         VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [req.user.id, courseId, certCode]
      );
      await query(
        'UPDATE enrollments SET completed_at = NOW() WHERE user_id = $1 AND course_id = $2 AND completed_at IS NULL',
        [req.user.id, courseId]
      );
    }

    res.json({ message: 'Lesson completed', courseComplete, progressPercent: Math.round((completed / total) * 100) });
  } catch (err) {
    console.error('Complete lesson error:', err);
    res.status(500).json({ message: 'Failed to mark lesson complete' });
  }
});

// GET /api/academy/modules/:moduleId/lessons
router.get('/modules/:moduleId/lessons', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT l.id, l.title, l.order_index, l.duration_minutes, l.is_preview,
              p.completed, p.completion_percentage
       FROM lessons l
       LEFT JOIN progress p ON p.lesson_id = l.id AND p.user_id = $1
       WHERE l.module_id = $2
       ORDER BY l.order_index`,
      [req.user.id, req.params.moduleId]
    );
    res.json({ lessons: result.rows });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch lessons' });
  }
});

// GET /api/academy/progress/courses  (enrolled courses with progress)
router.get('/progress/courses', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT c.id, c.slug, c.title, c.thumbnail_url, c.difficulty_level,
              c.estimated_duration_hours, c.category,
              e.enrolled_at, e.completed_at,
              COUNT(DISTINCT l.id) AS total_lessons,
              COUNT(DISTINCT p.lesson_id) FILTER (WHERE p.completed = true) AS completed_lessons
       FROM enrollments e
       JOIN courses c ON c.id = e.course_id
       LEFT JOIN lessons l ON l.course_id = c.id
       LEFT JOIN progress p ON p.lesson_id = l.id AND p.user_id = $1
       WHERE e.user_id = $1
       GROUP BY c.id, e.enrolled_at, e.completed_at
       ORDER BY e.enrolled_at DESC`,
      [req.user.id]
    );

    const courses = result.rows.map(c => ({
      ...c,
      progressPercent: c.total_lessons > 0
        ? Math.round((parseInt(c.completed_lessons) / parseInt(c.total_lessons)) * 100)
        : 0,
    }));

    res.json({ courses });
  } catch (err) {
    console.error('Get progress error:', err);
    res.status(500).json({ message: 'Failed to fetch progress' });
  }
});

// GET /api/academy/progress/modules/:moduleId
router.get('/progress/modules/:moduleId', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT l.id AS lesson_id, p.completed, p.completion_percentage, p.time_spent_seconds
       FROM lessons l
       LEFT JOIN progress p ON p.lesson_id = l.id AND p.user_id = $1
       WHERE l.module_id = $2`,
      [req.user.id, req.params.moduleId]
    );
    res.json({ progress: result.rows });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch module progress' });
  }
});

// POST /api/academy/progress/bulk
router.post('/progress/bulk', authenticate, async (req, res) => {
  const { updates } = req.body; // [{ lessonId, completed, timeSpentSeconds, completionPercentage }]
  if (!Array.isArray(updates) || !updates.length) {
    return res.status(400).json({ message: 'Updates array required' });
  }
  try {
    for (const u of updates) {
      if (!u.lessonId) continue;
      const lesson = await query('SELECT course_id FROM lessons WHERE id = $1', [u.lessonId]);
      if (!lesson.rows.length) continue;
      await query(
        `INSERT INTO progress (user_id, lesson_id, course_id, completed, completion_percentage, time_spent_seconds)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id, lesson_id)
         DO UPDATE SET completed = GREATEST(progress.completed::int, $4::int)::boolean,
                       completion_percentage = GREATEST(progress.completion_percentage, $5),
                       time_spent_seconds = progress.time_spent_seconds + $6,
                       last_accessed = NOW()`,
        [req.user.id, u.lessonId, lesson.rows[0].course_id,
         u.completed || false, u.completionPercentage || 0, u.timeSpentSeconds || 0]
      );
    }
    res.json({ message: 'Progress updated', count: updates.length });
  } catch (err) {
    res.status(500).json({ message: 'Bulk progress update failed' });
  }
});

module.exports = router;

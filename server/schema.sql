-- ==========================================================
-- Smart Study Group Matcher (v2: Teach-Swap + Accountability)
-- MySQL Database Schema: Fields, Subjects, Topics & Diagnostics
-- Exclusively Zoom Meets for Video & Peer Collaboration
-- UTF-8 mb4 encoding, InnoDB engine, explicit foreign keys
-- ==========================================================

CREATE DATABASE IF NOT EXISTS smart_study_matcher 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE smart_study_matcher;

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(191) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  reliability_score FLOAT NOT NULL DEFAULT 1.0,
  status ENUM('unmatched', 'matched', 'inactive') NOT NULL DEFAULT 'unmatched',
  avatar_url VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_status (status),
  INDEX idx_users_reliability (reliability_score)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Fields table (Engineering CS/IT, Engineering Core, Medical)
CREATE TABLE IF NOT EXISTS fields (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL UNIQUE,
  icon VARCHAR(50) NOT NULL DEFAULT 'Cpu',
  description VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Subjects table
CREATE TABLE IF NOT EXISTS subjects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  field_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (field_id) REFERENCES fields(id) ON DELETE CASCADE,
  INDEX idx_subjects_field (field_id),
  INDEX idx_subjects_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Topics table (Scoped to a Subject)
CREATE TABLE IF NOT EXISTS topics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subject_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  description VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  INDEX idx_topics_subject (subject_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. User enrolled subjects (1 to 3 per student)
CREATE TABLE IF NOT EXISTS user_subjects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  subject_id INT NOT NULL,
  needs_goal ENUM('exam_prep', 'project', 'weekly_homework') NOT NULL DEFAULT 'exam_prep',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_subject (user_id, subject_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  INDEX idx_user_subjects_filter (subject_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. User topics (Strengths & Gaps inferred from quiz or manually refined)
CREATE TABLE IF NOT EXISTS user_topics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  topic_id INT NOT NULL,
  type ENUM('strength', 'gap') NOT NULL,
  source ENUM('quiz', 'manual') NOT NULL DEFAULT 'quiz',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_topic (user_id, topic_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE,
  INDEX idx_user_topics_lookup (user_id, type),
  INDEX idx_topic_user_lookup (topic_id, type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Diagnostic Questions table
CREATE TABLE IF NOT EXISTS diagnostic_questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  topic_id INT NOT NULL,
  prompt TEXT NOT NULL,
  options JSON NOT NULL,
  correct_index TINYINT UNSIGNED NOT NULL,
  explanation TEXT NOT NULL,
  difficulty ENUM('easy', 'medium', 'hard') NOT NULL DEFAULT 'medium',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE,
  INDEX idx_diag_topic (topic_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Availability slots (7 days x 5 time blocks)
CREATE TABLE IF NOT EXISTS availability_slots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  day_of_week TINYINT UNSIGNED NOT NULL,
  slot_index TINYINT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_slot (user_id, day_of_week, slot_index),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_hard_filter_slots (day_of_week, slot_index, user_id),
  INDEX idx_user_availability (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Tool preferences (Exclusively Zoom Meets)
CREATE TABLE IF NOT EXISTS tool_preferences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  tool ENUM('zoom') NOT NULL DEFAULT 'zoom',
  frequency ENUM('1x', '2x', '3x') NOT NULL DEFAULT '2x',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_tool (user_id, tool),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_tool_filter (tool, user_id),
  INDEX idx_user_tools (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Matches / Groups table (Scoped to Subject, always Zoom meets)
CREATE TABLE IF NOT EXISTS matches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subject_id INT NOT NULL,
  title VARCHAR(255) DEFAULT NULL,
  size_limit INT NOT NULL DEFAULT 4,
  goal ENUM('exam_prep', 'project', 'weekly_homework') NOT NULL DEFAULT 'exam_prep',
  status ENUM('active', 'completed', 'reshuffled') NOT NULL DEFAULT 'active',
  streak_count INT NOT NULL DEFAULT 0,
  compatibility_score FLOAT NOT NULL DEFAULT 0.0,
  tool_used VARCHAR(50) NOT NULL DEFAULT 'zoom',
  tool_link VARCHAR(255) DEFAULT 'https://zoom.us/j/study-room-peer',
  last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  INDEX idx_matches_subject (subject_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Group members (supports pairs of 2 and groups of 3-4)
CREATE TABLE IF NOT EXISTS group_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  match_id INT NOT NULL,
  user_id INT NOT NULL,
  role ENUM('member', 'lead') NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_match_user (match_id, user_id),
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_member_user (user_id),
  INDEX idx_member_match (match_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Sessions (15-min teach-swap structure)
CREATE TABLE IF NOT EXISTS sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  match_id INT NOT NULL,
  scheduled_at TIMESTAMP NOT NULL,
  status ENUM('scheduled', 'completed', 'cancelled') NOT NULL DEFAULT 'scheduled',
  teach_swap_agenda JSON DEFAULT NULL,
  icebreaker_text TEXT DEFAULT NULL,
  zoom_url VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  INDEX idx_sessions_match (match_id, scheduled_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Attendance
CREATE TABLE IF NOT EXISTS attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  user_id INT NOT NULL,
  attended BOOLEAN NOT NULL DEFAULT TRUE,
  logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_session_user (session_id, user_id),
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Milestones (Group accountability)
CREATE TABLE IF NOT EXISTS milestones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  match_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  due_date TIMESTAMP NOT NULL,
  status ENUM('pending', 'completed', 'rescheduled') NOT NULL DEFAULT 'pending',
  reschedule_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  INDEX idx_milestones_match (match_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Milestone Checkoffs
CREATE TABLE IF NOT EXISTS milestone_checkoffs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  milestone_id INT NOT NULL,
  user_id INT NOT NULL,
  checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_milestone_user (milestone_id, user_id),
  FOREIGN KEY (milestone_id) REFERENCES milestones(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. Feedback (Post-session teach-swap rating & reshuffle)
CREATE TABLE IF NOT EXISTS feedback (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  reviewer_id INT NOT NULL,
  reviewee_id INT NOT NULL,
  productive BOOLEAN NOT NULL DEFAULT TRUE,
  comments TEXT,
  request_reshuffle BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewee_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_feedback_reviewee (reviewee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. Notifications (In-app inbox for smart nudges)
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type ENUM('nudge', 'streak', 'session_reminder', 'reshuffle_alert', 'adaptive_plan', 'partner_request') NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  read_status BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notifications_user (user_id, read_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. Messages (Group & 1:1 direct chat with text-first icebreakers)
CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  match_id INT DEFAULT NULL,
  user_id INT NOT NULL,
  recipient_id INT DEFAULT NULL,
  content TEXT NOT NULL,
  is_icebreaker BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_messages_match (match_id, created_at),
  INDEX idx_messages_direct (user_id, recipient_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19. Partner Requests (Send, Accept, Decline, Skip)
CREATE TABLE IF NOT EXISTS partner_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sender_id INT NOT NULL,
  receiver_id INT NOT NULL,
  subject_id INT NOT NULL,
  status ENUM('pending', 'accepted', 'declined', 'skipped') NOT NULL DEFAULT 'pending',
  note VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  INDEX idx_requests_receiver (receiver_id, status),
  INDEX idx_requests_sender (sender_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 20. Group Resources (Notes, links, slides shared in a study group)
CREATE TABLE IF NOT EXISTS group_resources (
  id INT AUTO_INCREMENT PRIMARY KEY,
  match_id INT NOT NULL,
  user_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  url VARCHAR(500) DEFAULT NULL,
  note TEXT DEFAULT NULL,
  type ENUM('link', 'note', 'document') NOT NULL DEFAULT 'link',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_resources_match (match_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

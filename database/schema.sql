CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  academic_status VARCHAR(80) NOT NULL,
  city VARCHAR(120),
  goal VARCHAR(160),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS career_options (
  id VARCHAR(80) PRIMARY KEY,
  parent_id VARCHAR(80) NULL,
  title VARCHAR(180) NOT NULL,
  short_description VARCHAR(255) NOT NULL,
  summary TEXT NOT NULL,
  duration VARCHAR(120) NOT NULL,
  cost VARCHAR(120) NOT NULL,
  difficulty VARCHAR(120) NOT NULL,
  scope VARCHAR(255) NOT NULL,
  eligibility JSON NOT NULL,
  skills JSON NOT NULL,
  opportunities JSON NOT NULL,
  display_order INT DEFAULT 0,
  CONSTRAINT fk_career_parent
    FOREIGN KEY (parent_id) REFERENCES career_options(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS roadmaps (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  path_ids JSON NOT NULL,
  final_option_id VARCHAR(80) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_roadmap_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_roadmap_final
    FOREIGN KEY (final_option_id) REFERENCES career_options(id)
    ON DELETE CASCADE
);

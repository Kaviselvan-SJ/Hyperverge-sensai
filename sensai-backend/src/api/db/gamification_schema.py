from api.config import (
    learner_personas_table_name,
    gamification_streaks_table_name,
    gamification_themes_table_name,
    user_progress_maps_table_name,
    daily_missions_table_name,
    level_unlock_states_table_name,
    weekly_boss_levels_table_name,
    reward_inventory_table_name,
    xp_transactions_table_name,
    users_table_name,
    courses_table_name,
    tasks_table_name
)

async def create_gamification_tables(cursor):
    await cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS {learner_personas_table_name} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL UNIQUE,
            persona_type TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES {users_table_name}(id) ON DELETE CASCADE
        )
    """)

    await cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS {gamification_streaks_table_name} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL UNIQUE,
            current_streak INTEGER DEFAULT 0,
            highest_streak INTEGER DEFAULT 0,
            availability TEXT DEFAULT 'medium',
            last_active_date DATETIME,
            tasks_completed_today INTEGER DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES {users_table_name}(id) ON DELETE CASCADE
        )
    """)

    await cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS {gamification_themes_table_name} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            css_variables TEXT NOT NULL
        )
    """)

    await cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS {user_progress_maps_table_name} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            course_id INTEGER NOT NULL,
            theme_id INTEGER,
            total_xp INTEGER DEFAULT 0,
            current_level INTEGER DEFAULT 0,
            UNIQUE(user_id, course_id),
            FOREIGN KEY (user_id) REFERENCES {users_table_name}(id) ON DELETE CASCADE,
            FOREIGN KEY (course_id) REFERENCES {courses_table_name}(id) ON DELETE CASCADE,
            FOREIGN KEY (theme_id) REFERENCES {gamification_themes_table_name}(id) ON DELETE SET NULL
        )
    """)

    await cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS {daily_missions_table_name} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            description TEXT NOT NULL,
            target_count INTEGER NOT NULL,
            current_count INTEGER DEFAULT 0,
            reward_xp INTEGER NOT NULL,
            is_completed BOOLEAN DEFAULT FALSE,
            expires_at DATETIME NOT NULL,
            FOREIGN KEY (user_id) REFERENCES {users_table_name}(id) ON DELETE CASCADE
        )
    """)

    await cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS {level_unlock_states_table_name} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            task_id INTEGER NOT NULL,
            is_unlocked BOOLEAN DEFAULT FALSE,
            is_completed BOOLEAN DEFAULT FALSE,
            score REAL,
            stars INTEGER DEFAULT 0,
            UNIQUE(user_id, task_id),
            FOREIGN KEY (user_id) REFERENCES {users_table_name}(id) ON DELETE CASCADE,
            FOREIGN KEY (task_id) REFERENCES {tasks_table_name}(id) ON DELETE CASCADE
        )
    """)

    await cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS {weekly_boss_levels_table_name} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            course_id INTEGER NOT NULL,
            composite_task_ids TEXT NOT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            FOREIGN KEY (course_id) REFERENCES {courses_table_name}(id) ON DELETE CASCADE
        )
    """)

    await cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS {reward_inventory_table_name} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            reward_type TEXT NOT NULL,
            item_id TEXT NOT NULL,
            quantity INTEGER DEFAULT 1,
            FOREIGN KEY (user_id) REFERENCES {users_table_name}(id) ON DELETE CASCADE
        )
    """)

    await cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS {xp_transactions_table_name} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            amount INTEGER NOT NULL,
            source TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES {users_table_name}(id) ON DELETE CASCADE
        )
    """)

    await cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS subjects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            course_id INTEGER NOT NULL UNIQUE,
            theme TEXT,
            difficulty TEXT,
            estimated_duration TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (course_id) REFERENCES {courses_table_name}(id) ON DELETE CASCADE
        )
    """)

    await cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS topics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            subject_id INTEGER NOT NULL,
            topic_name TEXT NOT NULL,
            topic_description TEXT,
            topic_order INTEGER NOT NULL,
            topic_difficulty TEXT,
            unlock_rule TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
        )
    """)

    await cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS levels (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            topic_id INTEGER NOT NULL,
            milestone_id INTEGER,
            level_title TEXT NOT NULL,
            level_description TEXT,
            level_order_index INTEGER NOT NULL,
            difficulty_tag TEXT,
            xp_reward INTEGER DEFAULT 0,
            unlock_condition TEXT,
            estimated_duration TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
        )
    """)

    await cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS subtopics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            level_id INTEGER NOT NULL,
            task_id INTEGER,
            subtopic_title TEXT NOT NULL,
            content_reference TEXT,
            challenge_node_reference TEXT,
            completion_threshold TEXT,
            sequence_index INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (level_id) REFERENCES levels(id) ON DELETE CASCADE
        )
    """)

    await cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS level_unlock_rules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            level_id INTEGER NOT NULL,
            rule_type TEXT NOT NULL,
            rule_value TEXT,
            FOREIGN KEY (level_id) REFERENCES levels(id) ON DELETE CASCADE
        )
    """)

    await cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS level_progress_tracking (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            subject_id INTEGER NOT NULL,
            current_topic_id INTEGER,
            current_level_id INTEGER,
            current_subtopic_id INTEGER,
            completion_percentage REAL DEFAULT 0.0,
            xp_earned INTEGER DEFAULT 0,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES {users_table_name}(id) ON DELETE CASCADE,
            FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
        )
    """)

    await cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS mentor_level_config (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            org_id INTEGER NOT NULL,
            default_theme TEXT,
            progress_visibility TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # REWARD SYSTEM ADDITIONS: BADGES & CERTIFICATES
    
    await cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS badge_templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            badge_title TEXT NOT NULL,
            badge_description TEXT,
            badge_icon TEXT NOT NULL,
            badge_type TEXT NOT NULL,
            difficulty_level TEXT,
            xp_reward INTEGER DEFAULT 0,
            unlock_condition TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    await cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS user_badges (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            badge_id INTEGER NOT NULL,
            earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, badge_id),
            FOREIGN KEY (user_id) REFERENCES {users_table_name}(id) ON DELETE CASCADE,
            FOREIGN KEY (badge_id) REFERENCES badge_templates(id) ON DELETE CASCADE
        )
    """)

    await cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS badge_unlock_rules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            badge_id INTEGER NOT NULL,
            rule_type TEXT NOT NULL,
            target_id INTEGER,
            threshold TEXT,
            FOREIGN KEY (badge_id) REFERENCES badge_templates(id) ON DELETE CASCADE
        )
    """)

    await cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS certificate_templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            org_id INTEGER NOT NULL,
            course_id INTEGER,
            certificate_title TEXT NOT NULL,
            signatory_name TEXT,
            signature_image TEXT,
            institution_logo TEXT,
            certificate_background TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (course_id) REFERENCES {courses_table_name}(id) ON DELETE CASCADE
        )
    """)

    await cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS user_certificates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            course_id INTEGER NOT NULL,
            template_id INTEGER,
            verification_id TEXT NOT NULL UNIQUE,
            completion_score REAL,
            issue_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, course_id),
            FOREIGN KEY (user_id) REFERENCES {users_table_name}(id) ON DELETE CASCADE,
            FOREIGN KEY (course_id) REFERENCES {courses_table_name}(id) ON DELETE CASCADE,
            FOREIGN KEY (template_id) REFERENCES certificate_templates(id) ON DELETE SET NULL
        )
    """)

    await cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS certificate_verification_registry (
            verification_id TEXT PRIMARY KEY,
            learner_name TEXT NOT NULL,
            course_name TEXT NOT NULL,
            mentor_name TEXT,
            issue_date DATETIME NOT NULL,
            completion_status TEXT DEFAULT 'verified',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

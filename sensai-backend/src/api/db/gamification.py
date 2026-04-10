import datetime
from api.utils.db import execute_db_operation, get_new_db_connection
from api.config import (
    learner_personas_table_name,
    gamification_streaks_table_name,
    user_progress_maps_table_name,
    daily_missions_table_name,
    level_unlock_states_table_name,
    xp_transactions_table_name,
    course_tasks_table_name,
    task_completions_table_name,
    tasks_table_name,
    course_milestones_table_name,
)

async def get_or_create_gamification_profile(user_id: int):
    # Fetch persona
    persona = await execute_db_operation(
        f"SELECT persona_type FROM {learner_personas_table_name} WHERE user_id = ?",
        (user_id,), fetch_one=True
    )
    if not persona:
        persona_type = "explorer"
        await execute_db_operation(
            f"INSERT INTO {learner_personas_table_name} (user_id, persona_type) VALUES (?, ?)",
            (user_id, persona_type)
        )
    else:
        persona_type = persona[0]

    # Fetch Total XP across all courses for global HUD, or just overall XP
    xp_row = await execute_db_operation(
        f"SELECT SUM(amount) FROM {xp_transactions_table_name} WHERE user_id = ?",
        (user_id,), fetch_one=True
    )
    total_xp = xp_row[0] if xp_row and xp_row[0] else 0

    # Fetch Streak
    streak_row = await execute_db_operation(
        f"SELECT current_streak, highest_streak, availability, last_active_date, tasks_completed_today FROM {gamification_streaks_table_name} WHERE user_id = ?",
        (user_id,), fetch_one=True
    )
    if not streak_row:
        await execute_db_operation(
            f"INSERT INTO {gamification_streaks_table_name} (user_id, current_streak, highest_streak, availability, tasks_completed_today) VALUES (?, 0, 0, 'medium', 0)",
            (user_id,)
        )
        streak = {
            "user_id": user_id, "current_streak": 0, "highest_streak": 0, 
            "availability": "medium", "last_active_date": None, "tasks_completed_today": 0
        }
    else:
        streak = {
            "user_id": user_id, "current_streak": streak_row[0], "highest_streak": streak_row[1],
            "availability": streak_row[2], "last_active_date": streak_row[3], "tasks_completed_today": streak_row[4]
        }

    # Fetch daily missions
    missions = await execute_db_operation(
        f"SELECT id, description, target_count, current_count, reward_xp, is_completed, expires_at FROM {daily_missions_table_name} WHERE user_id = ?",
        (user_id,), fetch_all=True
    )
    
    daily_missions = []
    if not missions:
        # Create a default mission
        expires_at = datetime.datetime.now() + datetime.timedelta(days=1)
        await execute_db_operation(
            f"INSERT INTO {daily_missions_table_name} (user_id, description, target_count, current_count, reward_xp, is_completed, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (user_id, "Complete 3 Tasks", 3, 0, 500, False, expires_at)
        )
        daily_missions.append({
            "id": 1, "description": "Complete 3 Tasks", "target_count": 3, "current_count": 0, "reward_xp": 500, "is_completed": False, "expires_at": expires_at.isoformat()
        })
    else:
        for m in missions:
            daily_missions.append({
                "id": m[0], "description": m[1], "target_count": m[2], "current_count": m[3], 
                "reward_xp": m[4], "is_completed": bool(m[5]), "expires_at": m[6]
            })

    return {
        "user_id": user_id,
        "persona": persona_type,
        "total_xp": total_xp,
        "streak": streak,
        "daily_missions": daily_missions
    }

async def get_gamified_course_map_for_user(course_id: int, user_id: int):
    # We join course_tasks with task_completions to find completed tasks!
    query = f"""
        SELECT 
            t.id as task_id,
            ct.ordering as task_ordering,
            CASE WHEN tc.id IS NOT NULL THEN 1 ELSE 0 END as is_completed,
            CASE WHEN lus.id IS NOT NULL THEN lus.score ELSE NULL END as score,
            CASE WHEN lus.id IS NOT NULL THEN lus.stars ELSE 0 END as stars
        FROM {course_tasks_table_name} ct
        JOIN {tasks_table_name} t ON ct.task_id = t.id
        LEFT JOIN {task_completions_table_name} tc ON tc.task_id = t.id AND tc.user_id = ?
        LEFT JOIN {level_unlock_states_table_name} lus ON lus.task_id = t.id AND lus.user_id = ?
        WHERE ct.course_id = ? AND ct.deleted_at IS NULL AND t.deleted_at IS NULL
        ORDER BY ct.milestone_id, ct.ordering
    """
    rows = await execute_db_operation(query, (user_id, user_id, course_id), fetch_all=True)
    
    nodes = []
    
    for i, row in enumerate(rows):
        task_id = row[0]
        is_completed = bool(row[2])
        score = row[3]
        stars = row[4]
        
        # Unlock logic: A node is unlocked if it's the first node, OR if the previous node is completed.
        # This is a simple linear map assumption!
        is_unlocked = True if i == 0 else bool(rows[i-1][2]) # rows[i-1][2] is is_completed of previous
        
        # Override if is_completed is already true
        if is_completed:
            is_unlocked = True
            
        nodes.append({
            "id": i+1,
            "user_id": user_id,
            "task_id": task_id,
            "is_unlocked": is_unlocked,
            "is_completed": is_completed,
            "score": score,
            "stars": stars or (3 if is_completed else 0)
        })
        
    return {
        "course_id": course_id,
        "theme_name": "space_exploration",
        "nodes": nodes
    }

async def award_gamified_xp(user_id: int, amount: int, source: str):
    async with get_new_db_connection() as conn:
        cursor = await conn.cursor()
        
        # Insert transaction
        await cursor.execute(
            f"INSERT INTO {xp_transactions_table_name} (user_id, amount, source) VALUES (?, ?, ?)",
            (user_id, amount, source)
        )
        
        # Mark streak/daily progress ... (simplified for MVP)
        await cursor.execute(
            f"UPDATE {gamification_streaks_table_name} SET tasks_completed_today = tasks_completed_today + 1 WHERE user_id = ?",
            (user_id,)
        )
        
        # Update daily missions current count
        await cursor.execute(
            f"UPDATE {daily_missions_table_name} SET current_count = current_count + 1 WHERE user_id = ? AND is_completed = 0",
            (user_id,)
        )
        
        # Look for completions
        await cursor.execute(
            f"UPDATE {daily_missions_table_name} SET is_completed = 1 WHERE user_id = ? AND current_count >= target_count AND is_completed = 0",
            (user_id,)
        )
        
        await conn.commit()
    
    return {"status": "success", "xp_gained": amount}

async def create_subject(course_id: int, theme: str, difficulty: str, estimated_duration: str):
    subject_id = await execute_db_operation(
        "INSERT INTO subjects (course_id, theme, difficulty, estimated_duration) VALUES (?, ?, ?, ?)",
        (course_id, theme, difficulty, estimated_duration),
        get_last_row_id=True
    )
    return {"id": subject_id, "course_id": course_id, "theme": theme}

async def create_topic(subject_id: int, topic_name: str, topic_description: str, topic_order: int, topic_difficulty: str, unlock_rule: str):
    topic_id = await execute_db_operation(
        "INSERT INTO topics (subject_id, topic_name, topic_description, topic_order, topic_difficulty, unlock_rule) VALUES (?, ?, ?, ?, ?, ?)",
        (subject_id, topic_name, topic_description, topic_order, topic_difficulty, unlock_rule),
        get_last_row_id=True
    )
    return {"id": topic_id, "topic_name": topic_name}

async def create_level(topic_id: int, milestone_id: int, level_title: str, level_description: str, level_order_index: int, difficulty_tag: str, xp_reward: int, unlock_condition: str, estimated_duration: str):
    level_id = await execute_db_operation(
        "INSERT INTO levels (topic_id, milestone_id, level_title, level_description, level_order_index, difficulty_tag, xp_reward, unlock_condition, estimated_duration) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (topic_id, milestone_id, level_title, level_description, level_order_index, difficulty_tag, xp_reward, unlock_condition, estimated_duration),
        get_last_row_id=True
    )
    return {"id": level_id, "level_title": level_title}

async def create_subtopic(level_id: int, task_id: int, subtopic_title: str, content_reference: str, challenge_node_reference: str, completion_threshold: str, sequence_index: int):
    subtopic_id = await execute_db_operation(
        "INSERT INTO subtopics (level_id, task_id, subtopic_title, content_reference, challenge_node_reference, completion_threshold, sequence_index) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (level_id, task_id, subtopic_title, content_reference, challenge_node_reference, completion_threshold, sequence_index),
        get_last_row_id=True
    )
    return {"id": subtopic_id, "subtopic_title": subtopic_title}

async def update_topic(topic_id: int, topic_name: str):
    await execute_db_operation(
        "UPDATE topics SET topic_name = ? WHERE id = ?",
        (topic_name, topic_id)
    )
    return {"id": topic_id, "topic_name": topic_name}

async def update_level(level_id: int, level_title: str):
    await execute_db_operation(
        "UPDATE levels SET level_title = ? WHERE id = ?",
        (level_title, level_id)
    )
    return {"id": level_id, "level_title": level_title}

async def initialize_task_for_level(level_id: int):
    # Get level, topic, and subject course_id
    level_row = await execute_db_operation(
        "SELECT l.level_title, l.topic_id, l.milestone_id, t.topic_name, s.course_id "
        "FROM levels l JOIN topics t ON l.topic_id = t.id JOIN subjects s ON t.subject_id = s.id "
        "WHERE l.id = ?", (level_id,), fetch_one=True
    )
    if not level_row: return None
    level_title, topic_id, milestone_id, topic_name, course_id = level_row
    
    # If no milestone yet, create one for the Topic
    if not milestone_id:
        from api.db.course import add_milestone_to_course
        ms_id, _ = await add_milestone_to_course(course_id, topic_name, "#4CAF50") # Use gamification green
        milestone_id = ms_id
        # Update the level to save milestone_id
        await execute_db_operation("UPDATE levels SET milestone_id = ? WHERE id = ?", (milestone_id, level_id))
    
    from api.db.task import create_draft_task_for_course
    task_id, _ = await create_draft_task_for_course(level_title, "learning_material", course_id, milestone_id)
    
    # Immediately change gamification placeholder tasks to 'published' so they successfully 
    # record completion progress in mapping arrays upon mentor test
    await execute_db_operation("UPDATE tasks SET status = 'published' WHERE id = ?", (task_id,))
    
    # Create subtopic mapped to this new task
    await execute_db_operation(
        "INSERT INTO subtopics (level_id, task_id, subtopic_title, content_reference, challenge_node_reference, completion_threshold, sequence_index) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (level_id, task_id, level_title, "learning_material", "lesson", "viewed", 0)
    )
    return {"task_id": task_id, "milestone_id": milestone_id}

async def get_subject_with_hierarchy(course_id: int):
    subject_row = await execute_db_operation(
        "SELECT id, theme, difficulty, estimated_duration FROM subjects WHERE course_id = ?",
        (course_id,), fetch_one=True
    )
    if not subject_row:
        return None
    
    subject_id = subject_row[0]
    subject = {
        "id": subject_id,
        "course_id": course_id,
        "theme": subject_row[1],
        "difficulty": subject_row[2],
        "estimated_duration": subject_row[3],
        "topics": []
    }
    
    topics = await execute_db_operation(
        "SELECT id, topic_name, topic_description, topic_order, topic_difficulty, unlock_rule FROM topics WHERE subject_id = ? ORDER BY topic_order",
        (subject_id,), fetch_all=True
    )
    
    if not topics: return subject
    
    for t in topics:
        topic_dict = {
            "id": t[0], "topic_name": t[1], "topic_description": t[2], "topic_order": t[3], "topic_difficulty": t[4], "unlock_rule": t[5], "levels": []
        }
        
        levels = await execute_db_operation(
            "SELECT id, milestone_id, level_title, level_description, level_order_index, difficulty_tag, xp_reward, unlock_condition, estimated_duration FROM levels WHERE topic_id = ? ORDER BY level_order_index",
            (t[0],), fetch_all=True
        )
        if levels:
            for lvl in levels:
                lvl_dict = {
                    "id": lvl[0], "milestone_id": lvl[1], "level_title": lvl[2], "level_description": lvl[3], "level_order_index": lvl[4], 
                    "difficulty_tag": lvl[5], "xp_reward": lvl[6], "unlock_condition": lvl[7], "estimated_duration": lvl[8], "subtopics": []
                }
                
                subtopics = await execute_db_operation(
                    "SELECT id, task_id, subtopic_title, content_reference, challenge_node_reference, completion_threshold, sequence_index FROM subtopics WHERE level_id = ? ORDER BY sequence_index",
                    (lvl[0],), fetch_all=True
                )
                if subtopics:
                    for sbt in subtopics:
                        lvl_dict["subtopics"].append({
                            "id": sbt[0], "task_id": sbt[1], "subtopic_title": sbt[2], "content_reference": sbt[3], 
                            "challenge_node_reference": sbt[4], "completion_threshold": sbt[5], "sequence_index": sbt[6]
                        })
                topic_dict["levels"].append(lvl_dict)
        subject["topics"].append(topic_dict)
        
    return subject

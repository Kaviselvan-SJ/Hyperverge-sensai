"""
rewards.py — Badge and Certificate logic for SensAI.
All state is persisted to DB. No local state.
"""
import uuid
from typing import Dict, List, Optional
from api.utils.db import execute_db_operation


# ─────────────────────────────────────────────
# Badge Templates
# ─────────────────────────────────────────────

async def get_badge_templates(filters: Dict = None) -> List[Dict]:
    query = "SELECT id, badge_title, badge_description, badge_icon, badge_type, difficulty_level, xp_reward, unlock_condition, created_at FROM badge_templates"
    bindings = []

    if filters:
        conditions = [f"{key} = ?" for key in filters]
        bindings = list(filters.values())
        query += " WHERE " + " AND ".join(conditions)

    rows = await execute_db_operation(query, tuple(bindings) if bindings else None, fetch_all=True)
    return [
        {
            "id": row[0], "badge_title": row[1], "badge_description": row[2],
            "badge_icon": row[3], "badge_type": row[4], "difficulty_level": row[5],
            "xp_reward": row[6], "unlock_condition": row[7], "created_at": row[8]
        }
        for row in (rows or [])
    ]


async def create_badge_template(badge_title: str, badge_description: str, badge_icon: str,
                                badge_type: str, xp_reward: int, unlock_condition: str,
                                difficulty_level: str = "medium") -> int:
    return await execute_db_operation(
        """INSERT INTO badge_templates 
           (badge_title, badge_description, badge_icon, badge_type, difficulty_level, xp_reward, unlock_condition)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (badge_title, badge_description, badge_icon, badge_type, difficulty_level, xp_reward, unlock_condition),
        get_last_row_id=True
    )


# ─────────────────────────────────────────────
# Badge Awarding — called after every task completion
# ─────────────────────────────────────────────

async def _award_badge(user_id: int, badge: Dict) -> bool:
    """Insert badge into user_badges. Returns True if newly awarded, False if already had it."""
    already = await execute_db_operation(
        "SELECT id FROM user_badges WHERE user_id = ? AND badge_id = ?",
        (user_id, badge["id"]), fetch_one=True
    )
    if already:
        return False

    await execute_db_operation(
        "INSERT INTO user_badges (user_id, badge_id) VALUES (?, ?)",
        (user_id, badge["id"])
    )
    return True


async def _count_user_completions(user_id: int, course_id: int = None) -> int:
    """Count distinct task completions for this user (optionally scoped to a course)."""
    if course_id:
        row = await execute_db_operation(
            """SELECT COUNT(DISTINCT tc.task_id)
               FROM task_completions tc
               JOIN course_tasks ct ON ct.task_id = tc.task_id
               WHERE tc.user_id = ? AND ct.course_id = ? AND tc.deleted_at IS NULL""",
            (user_id, course_id), fetch_one=True
        )
    else:
        row = await execute_db_operation(
            "SELECT COUNT(DISTINCT task_id) FROM task_completions WHERE user_id = ? AND deleted_at IS NULL",
            (user_id,), fetch_one=True
        )
    return row[0] if row else 0


async def _count_total_published_tasks(course_id: int) -> int:
    """Count all published tasks in a course."""
    row = await execute_db_operation(
        """SELECT COUNT(DISTINCT ct.task_id)
           FROM course_tasks ct
           JOIN tasks t ON t.id = ct.task_id
           WHERE ct.course_id = ? AND t.status = 'published'""",
        (course_id,), fetch_one=True
    )
    return row[0] if row else 0


async def _get_topic_id_for_task(task_id: int) -> Optional[int]:
    """Get the topic_id for a gamified task via subtopics → levels → topics chain."""
    row = await execute_db_operation(
        """SELECT l.topic_id FROM subtopics st
           JOIN levels l ON l.id = st.level_id
           WHERE st.task_id = ?""",
        (task_id,), fetch_one=True
    )
    return row[0] if row else None


async def _all_topic_tasks_completed(user_id: int, topic_id: int) -> bool:
    """Check if the user completed all gamified levels in a topic."""
    all_tasks = await execute_db_operation(
        """SELECT st.task_id FROM subtopics st
           JOIN levels l ON l.id = st.level_id
           WHERE l.topic_id = ? AND st.task_id IS NOT NULL""",
        (topic_id,), fetch_all=True
    )
    if not all_tasks:
        return False

    for (task_id,) in all_tasks:
        done = await execute_db_operation(
            "SELECT id FROM task_completions WHERE user_id = ? AND task_id = ? AND deleted_at IS NULL",
            (user_id, task_id), fetch_one=True
        )
        if not done:
            return False
    return True


async def check_and_award_badges(user_id: int, task_id: int = None, course_id: int = None) -> List[Dict]:
    """
    Called after every task completion. Evaluates all badge conditions and awards
    any newly qualifying badges. Returns list of newly awarded badges for the popup.
    """
    newly_earned = []
    all_badges = await get_badge_templates()

    # Count completions for this user in this course
    user_course_completions = await _count_user_completions(user_id, course_id) if course_id else 0
    total_published = await _count_total_published_tasks(course_id) if course_id else 0

    # Get topic for this task (for topic_complete check)
    topic_id = await _get_topic_id_for_task(task_id) if task_id else None
    print(f"[REWARD DBG] Starting badge check for user {user_id}. Completions: {user_course_completions}, total: {total_published}")

    for badge in all_badges:
        condition = badge["unlock_condition"]
        should_award = False

        if condition == "level_complete":
            # Award on the very first task completion
            should_award = user_course_completions >= 1

        elif condition == "level_complete_3":
            should_award = user_course_completions >= 3

        elif condition == "topic_complete":
            # Award if the completed task's topic is now fully done
            if topic_id:
                should_award = await _all_topic_tasks_completed(user_id, topic_id)

        elif condition == "course_halfway":
            # Award when ≥50% of published tasks are done
            if total_published > 0:
                should_award = user_course_completions >= (total_published // 2)

        elif condition == "course_complete":
            # Award when 100% of published tasks are done
            if total_published > 0:
                should_award = user_course_completions >= total_published

        # Streak badges are not triggered here (they're checked at login/daily)
        # but we don't exclude them — they'll show as locked in the UI

        if should_award:
            awarded = await _award_badge(user_id, badge)
            if awarded:
                newly_earned.append(badge)

    return newly_earned


# ─────────────────────────────────────────────
# Certificate Generation
# ─────────────────────────────────────────────

async def setup_auto_certificates(user_id: int, course_id: int) -> Optional[Dict]:
    """
    Generate and persist a certificate for a user on a course.
    Returns the verification_id whether new or existing.
    """
    # 1. Check if certificate already exists
    existing = await execute_db_operation(
        "SELECT verification_id, issue_date FROM user_certificates WHERE user_id = ? AND course_id = ?",
        (user_id, course_id), fetch_one=True
    )
    if existing:
        return {"verification_id": existing[0], "issue_date": existing[1], "status": "exists"}

    # 2. Eligibility check — user must have completed ALL published tasks in this course
    total_published = await _count_total_published_tasks(course_id)
    user_done = await _count_user_completions(user_id, course_id)

    if total_published == 0:
        return None  # Course has no tasks, can't cert

    if user_done < total_published:
        # Not all tasks done — still generate for gamified courses
        # (gamified courses may have subtopic tasks not in course_tasks)
        # Check gamified completions specifically
        gamified_tasks = await execute_db_operation(
            """SELECT DISTINCT st.task_id FROM subtopics st
               JOIN levels l ON l.id = st.level_id
               JOIN topics t ON t.id = l.topic_id
               JOIN subjects s ON s.id = t.subject_id
               WHERE s.course_id = ? AND st.task_id IS NOT NULL""",
            (course_id,), fetch_all=True
        )
        if gamified_tasks:
            all_gamified_done = True
            for (gtask_id,) in gamified_tasks:
                done = await execute_db_operation(
                    "SELECT id FROM task_completions WHERE user_id = ? AND task_id = ? AND deleted_at IS NULL",
                    (user_id, gtask_id), fetch_one=True
                )
                if not done:
                    all_gamified_done = False
                    break
            if not all_gamified_done:
                return None  # Not eligible yet
        else:
            return None  # Not enough completions

    # 3. Get user details
    user_row = await execute_db_operation(
        "SELECT first_name, last_name FROM users WHERE id = ?",
        (user_id,), fetch_one=True
    )
    if not user_row:
        return None
    learner_name = f"{user_row[0] or ''} {user_row[1] or ''}".strip() or f"Learner #{user_id}"

    # 4. Get course details
    course_row = await execute_db_operation(
        "SELECT name FROM courses WHERE id = ?",
        (course_id,), fetch_one=True
    )
    course_name = course_row[0] if course_row else "SensAI Course"

    # 5. Get certificate template if one exists
    template = await execute_db_operation(
        "SELECT id, signatory_name FROM certificate_templates WHERE course_id = ?",
        (course_id,), fetch_one=True
    )
    template_id = template[0] if template else None
    mentor_name = template[1] if template else None

    # 6. Generate unique verification ID
    verification_id = "VER-" + str(uuid.uuid4())[:8].upper()

    # 7. Persist to user_certificates
    await execute_db_operation(
        """INSERT INTO user_certificates (user_id, course_id, template_id, verification_id, completion_score)
           VALUES (?, ?, ?, ?, ?)""",
        (user_id, course_id, template_id, verification_id, 100.0)
    )

    # 8. Persist to certificate_verification_registry (public lookup)
    await execute_db_operation(
        """INSERT INTO certificate_verification_registry
           (verification_id, learner_name, course_name, mentor_name, issue_date, completion_status)
           VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, 'verified')""",
        (verification_id, learner_name, course_name, mentor_name)
    )

    # 9. Also award the "Course Champion" badge if it exists
    champion_badge = await execute_db_operation(
        "SELECT id, badge_title, badge_description, badge_icon, badge_type, difficulty_level, xp_reward, unlock_condition FROM badge_templates WHERE unlock_condition = 'course_complete'",
        fetch_one=True
    )
    if champion_badge:
        badge_dict = {
            "id": champion_badge[0], "badge_title": champion_badge[1],
            "badge_description": champion_badge[2], "badge_icon": champion_badge[3],
            "badge_type": champion_badge[4], "difficulty_level": champion_badge[5],
            "xp_reward": champion_badge[6], "unlock_condition": champion_badge[7]
        }
        await _award_badge(user_id, badge_dict)

    return {
        "verification_id": verification_id,
        "learner_name": learner_name,
        "course_name": course_name,
        "mentor_name": mentor_name,
        "status": "generated"
    }


# ─────────────────────────────────────────────
# Certificate Verification (public API)
# ─────────────────────────────────────────────

async def verify_certificate(verification_id: str) -> Optional[Dict]:
    row = await execute_db_operation(
        """SELECT learner_name, course_name, mentor_name, issue_date, completion_status
           FROM certificate_verification_registry WHERE verification_id = ?""",
        (verification_id,), fetch_one=True
    )
    if not row:
        return None
    return {
        "verification_id": verification_id,
        "learner_name": row[0],
        "course_name": row[1],
        "mentor_name": row[2],
        "issue_date": row[3],
        "completion_status": row[4]
    }

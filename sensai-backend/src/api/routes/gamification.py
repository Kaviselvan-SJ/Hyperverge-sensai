from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Dict, Optional
from datetime import datetime

from api.db.gamification import (
    get_or_create_gamification_profile,
    get_gamified_course_map_for_user,
    award_gamified_xp,
    create_subject,
    create_topic,
    create_level,
    create_subtopic,
    get_subject_with_hierarchy
)
from api.db.rewards import (
    get_badge_templates,
    create_badge_template,
    verify_certificate,
    setup_auto_certificates
)

# A router for Gamification Overlay
router = APIRouter()

class SubjectCreate(BaseModel):
    course_id: int
    theme: str
    difficulty: str
    estimated_duration: str

class TopicCreate(BaseModel):
    subject_id: int
    topic_name: str
    topic_description: str
    topic_order: int
    topic_difficulty: str
    unlock_rule: str

class LevelCreate(BaseModel):
    topic_id: int
    milestone_id: Optional[int] = None
    level_title: str
    level_description: str
    level_order_index: int
    difficulty_tag: str
    xp_reward: int
    unlock_condition: str
    estimated_duration: str

class SubtopicCreate(BaseModel):
    level_id: int
    task_id: Optional[int] = None
    subtopic_title: str
    content_reference: str
    challenge_node_reference: str
    completion_threshold: str
    sequence_index: int

# --- Endpoints ---

@router.get("/profile")
async def get_gamification_profile(user_id: int = 1):
    return await get_or_create_gamification_profile(user_id)


@router.get("/course/{course_id}/map")
async def get_gamified_course_map(course_id: int, user_id: int = 1):
    hierarchy = await get_subject_with_hierarchy(course_id)
    if not hierarchy:
        # Fallback to existing logic if no gamified hierarchy exists
        return await get_gamified_course_map_for_user(course_id, user_id)
    return hierarchy

@router.post("/task/{task_id}/complete")
async def complete_gamified_task(task_id: int, user_id: int = 1):
    return await award_gamified_xp(user_id, 150, "task_completion")

# -- Builder Endpoints --

@router.post("/builder/subject")
async def builder_create_subject(payload: SubjectCreate):
    return await create_subject(payload.course_id, payload.theme, payload.difficulty, payload.estimated_duration)

@router.post("/builder/topic")
async def builder_create_topic(payload: TopicCreate):
    return await create_topic(payload.subject_id, payload.topic_name, payload.topic_description, payload.topic_order, payload.topic_difficulty, payload.unlock_rule)

@router.post("/builder/level")
async def builder_create_level(payload: LevelCreate):
    return await create_level(payload.topic_id, payload.milestone_id or None, payload.level_title, payload.level_description, payload.level_order_index, payload.difficulty_tag, payload.xp_reward, payload.unlock_condition, payload.estimated_duration)

@router.post("/builder/subtopic")
async def builder_create_subtopic(payload: SubtopicCreate):
    return await create_subtopic(payload.level_id, payload.task_id or None, payload.subtopic_title, payload.content_reference, payload.challenge_node_reference, payload.completion_threshold, payload.sequence_index)

# --- Badge & Certificate Rewards ---

class BadgeCreate(BaseModel):
    badge_title: str
    badge_description: str
    badge_icon: str
    badge_type: str
    xp_reward: int
    unlock_condition: str
    difficulty_level: str = "medium"

@router.get("/badges")
async def get_all_badges():
    return await get_badge_templates()

@router.post("/badges")
async def create_badge(request: BadgeCreate):
    badge_id = await create_badge_template(
        request.badge_title,
        request.badge_description,
        request.badge_icon,
        request.badge_type,
        request.xp_reward,
        request.unlock_condition,
        request.difficulty_level
    )
    return {"id": badge_id, "badge_title": request.badge_title}

@router.put("/badges/{badge_id}")
async def update_badge(badge_id: int, request: BadgeCreate):
    from api.utils.db import execute_db_operation
    await execute_db_operation(
        """UPDATE badge_templates SET badge_title=?, badge_description=?, badge_icon=?, badge_type=?,
           difficulty_level=?, xp_reward=?, unlock_condition=? WHERE id=?""",
        (request.badge_title, request.badge_description, request.badge_icon, request.badge_type,
         request.difficulty_level, request.xp_reward, request.unlock_condition, badge_id)
    )
    return {"id": badge_id, "badge_title": request.badge_title}

@router.delete("/badges/{badge_id}")
async def delete_badge(badge_id: int):
    from api.utils.db import execute_db_operation
    await execute_db_operation("DELETE FROM badge_templates WHERE id=?", (badge_id,))
    return {"success": True}

@router.get("/certificates/verify/{verification_id}")
async def verify_cert(verification_id: str):
    cert = await verify_certificate(verification_id)
    if not cert:
        raise HTTPException(status_code=404, detail="Invalid or Unrecognized Certificate")
    return cert

# --- Certificate Template CRUD ---

class CertTemplateCreate(BaseModel):
    org_id: int
    course_id: Optional[int] = None
    certificate_title: str
    signatory_name: Optional[str] = None
    signature_image: Optional[str] = None
    institution_logo: Optional[str] = None
    certificate_background: Optional[str] = "default"

@router.get("/certificate-template/{course_id}")
async def get_cert_template(course_id: int):
    from api.utils.db import execute_db_operation
    row = await execute_db_operation(
        "SELECT id, certificate_title, signatory_name, institution_logo, certificate_background FROM certificate_templates WHERE course_id=?",
        (course_id,), fetch_one=True
    )
    if not row:
        raise HTTPException(status_code=404, detail="No template yet")
    return {"id": row[0], "certificate_title": row[1], "signatory_name": row[2],
            "institution_logo": row[3], "certificate_background": row[4]}

@router.post("/certificate-template")
async def create_cert_template(request: CertTemplateCreate):
    from api.utils.db import execute_db_operation
    template_id = await execute_db_operation(
        """INSERT INTO certificate_templates (org_id, course_id, certificate_title, signatory_name, signature_image, institution_logo, certificate_background)
           VALUES (?,?,?,?,?,?,?)""",
        (request.org_id, request.course_id, request.certificate_title, request.signatory_name,
         request.signature_image, request.institution_logo, request.certificate_background),
        get_last_row_id=True
    )
    return {"id": template_id}

@router.put("/certificate-template/{template_id}")
async def update_cert_template(template_id: int, request: CertTemplateCreate):
    from api.utils.db import execute_db_operation
    await execute_db_operation(
        """UPDATE certificate_templates SET certificate_title=?, signatory_name=?, institution_logo=?, certificate_background=? WHERE id=?""",
        (request.certificate_title, request.signatory_name, request.institution_logo, request.certificate_background, template_id)
    )
    return {"id": template_id}

@router.get("/builder/subject/{course_id}")
async def builder_get_subject(course_id: int):
    hierarchy = await get_subject_with_hierarchy(course_id)
    if not hierarchy:
        raise HTTPException(status_code=404, detail="Subject not found")
    return hierarchy

class TopicUpdate(BaseModel):
    topic_name: str

class LevelUpdate(BaseModel):
    level_title: str

@router.patch("/builder/topic/{topic_id}")
async def builder_update_topic(topic_id: int, payload: TopicUpdate):
    from api.db.gamification import update_topic
    return await update_topic(topic_id, payload.topic_name)

@router.patch("/builder/level/{level_id}")
async def builder_update_level(level_id: int, payload: LevelUpdate):
    from api.db.gamification import update_level
    return await update_level(level_id, payload.level_title)

@router.post("/builder/level/{level_id}/initialize-task")
async def builder_initialize_task(level_id: int):
    from api.db.gamification import initialize_task_for_level
    result = await initialize_task_for_level(level_id)
    if not result:
        raise HTTPException(status_code=404, detail="Level not found")
    return result


# --- Certificate Generation ---

class CertGenerateRequest(BaseModel):
    user_id: int
    course_id: int

@router.post("/certificates/generate")
async def generate_certificate(request: CertGenerateRequest):
    result = await setup_auto_certificates(request.user_id, request.course_id)
    if not result:
        raise HTTPException(status_code=400, detail="Could not generate certificate. Ensure all levels are completed.")
    return result

@router.get("/user/{user_id}/badges")
async def get_user_badges(user_id: int):
    from api.utils.db import execute_db_operation
    rows = await execute_db_operation(
        """SELECT bt.id, bt.badge_title, bt.badge_description, bt.badge_icon, bt.badge_type,
                  bt.difficulty_level, bt.xp_reward, ub.earned_at
           FROM user_badges ub
           JOIN badge_templates bt ON ub.badge_id = bt.id
           WHERE ub.user_id = ?
           ORDER BY ub.earned_at DESC""",
        (user_id,), fetch_all=True
    )
    return [
        {"id": r[0], "badge_title": r[1], "badge_description": r[2], "badge_icon": r[3],
         "badge_type": r[4], "difficulty_level": r[5], "xp_reward": r[6], "earned_at": r[7]}
        for r in rows
    ]

@router.get("/user/{user_id}/certificate/{course_id}")
async def get_user_certificate(user_id: int, course_id: int):
    from api.utils.db import execute_db_operation
    row = await execute_db_operation(
        "SELECT verification_id, completion_score, issue_date FROM user_certificates WHERE user_id = ? AND course_id = ?",
        (user_id, course_id), fetch_one=True
    )
    if not row:
        # Return null with 200 — 404 causes unavoidable browser console errors
        return None
    return {"verification_id": row[0], "completion_score": row[1], "issue_date": row[2]}

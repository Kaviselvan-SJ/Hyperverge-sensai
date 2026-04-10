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


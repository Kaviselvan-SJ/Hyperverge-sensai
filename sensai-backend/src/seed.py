from api.utils.db import get_new_db_connection
import asyncio

async def seed():
    async with get_new_db_connection() as conn:
        cursor = await conn.cursor()
        
        # Check if org exists
        await cursor.execute("SELECT id FROM organizations WHERE id = 89")
        if not await cursor.fetchone():
            await cursor.execute("INSERT INTO organizations (id, name, slug) VALUES (89, 'First Principles', 'first-principles')")
        
        # Check if cohort exists
        await cursor.execute("SELECT id FROM cohorts WHERE id = 89")
        if not await cursor.fetchone():
            await cursor.execute("INSERT INTO cohorts (id, name, org_id) VALUES (89, 'Demo Cohort', 89)")
            
        await conn.commit()
    print("Demo DB Seeded successfully!")

if __name__ == "__main__":
    asyncio.run(seed())

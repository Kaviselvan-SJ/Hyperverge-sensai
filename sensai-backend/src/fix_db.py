from api.utils.db import get_new_db_connection
import asyncio
from api.db.gamification_schema import create_gamification_tables

async def main():
    async with get_new_db_connection() as conn:
        cursor = await conn.cursor()
        await create_gamification_tables(cursor)
        await conn.commit()
    print("Gamification tables created!")

if __name__ == "__main__":
    asyncio.run(main())

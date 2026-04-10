from api.db import init_db
import os
import asyncio
from api.config import UPLOAD_FOLDER_NAME


root_dir = os.path.dirname(os.path.abspath(__file__))

if __name__ == "__main__":
    print("Setting up...")
    asyncio.run(init_db())

    # Ensure a default user with ID 1 exists to preserve NextAuth mock sessions across DB resets
    from api.utils.db import get_new_db_connection
    async def ensure_mock_user():
        async with get_new_db_connection() as conn:
            cursor = await conn.cursor()
            await cursor.execute("SELECT id FROM users WHERE id = 1")
            if not await cursor.fetchone():
                await cursor.execute("INSERT INTO users (id, email, first_name, last_name, default_dp_color, created_at) VALUES (1, 'mock@example.com', 'Mock', 'User', '#000000', CURRENT_TIMESTAMP)")
                await conn.commit()
    asyncio.run(ensure_mock_user())

    # create uploads folder
    if not os.path.exists("/appdata"):
        upload_folder = os.path.join(root_dir, UPLOAD_FOLDER_NAME)
        if not os.path.exists(upload_folder):
            os.makedirs(upload_folder)

    print("Setup complete.")

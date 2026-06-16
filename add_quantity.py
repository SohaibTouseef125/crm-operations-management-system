import asyncio
import sys, os
sys.path.append(os.path.abspath('backend'))
from app.database.session import engine
import sqlalchemy as sa

async def main():
    async with engine.begin() as conn:
        await conn.execute(sa.text("ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1;"))
        await conn.commit()

asyncio.run(main())

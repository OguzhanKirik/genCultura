"""
Seed script — creates an initial admin user for local development.
Run with: python seed.py
"""
import asyncio
from app.database import AsyncSessionLocal
from app.models.user import User
from app.utils.security import hash_password


async def seed():
    async with AsyncSessionLocal() as db:
        from sqlalchemy import select
        existing = await db.execute(select(User).where(User.email == "admin@gencultura.local"))
        if existing.scalar_one_or_none():
            print("Admin user already exists.")
            return

        admin = User(
            email="admin@gencultura.local",
            full_name="Admin User",
            role="admin",
            hashed_pw=hash_password("changeme"),
        )
        db.add(admin)
        await db.commit()
        print("Created admin@gencultura.local / changeme")


if __name__ == "__main__":
    asyncio.run(seed())

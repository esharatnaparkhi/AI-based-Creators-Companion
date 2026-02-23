"""
Seed script — populate the local DB with a demo user, accounts, posts,
drafts, and analytics rows so you can explore the UI without real OAuth.

Usage:
  cd backend
  python -m scripts.seed
"""
import asyncio
import random
from datetime import datetime, timedelta

from app.database import AsyncSessionLocal
from app.models.orm import (
    User, Account, Post, Draft, AnalyticsRow, PostStatusEnum
)
from app.services.security import hash_password

DEMO_EMAIL = "demo@creatorai.dev"
DEMO_PASSWORD = "demo1234"

PLATFORMS = ["instagram", "linkedin", "x", "youtube"]

SAMPLE_POSTS = [
    ("instagram", "Just shipped a feature that cuts our deploy time in half 🚀 #devlife #startups"),
    ("instagram", "Morning routine that changed everything: 5am wake up, 30 min walk, 1hr deep work. #productivity"),
    ("linkedin", "I spent 3 years building in public. Here's what I learned about audience growth..."),
    ("linkedin", "Hot take: The best PMs are the ones who've done customer support first."),
    ("x", "unpopular opinion: most 'productivity hacks' are just procrastination with extra steps"),
    ("x", "the best way to learn a new framework is to build something you actually want to use"),
    ("x", "shipped 🚀 new analytics dashboard is live. spent 2 weeks on this. proud of it."),
    ("youtube", "How I Built a SaaS in 30 Days (Solo, No VC Funding) — Full breakdown of tech stack, revenue, and mistakes."),
]

SAMPLE_DRAFTS = [
    ("instagram", ["instagram"],
     "5 things I wish I knew before building my first SaaS:\n\n1. Users don't care about your tech stack\n2. Launch earlier than you're comfortable with\n3. Talk to 10 customers before writing a line of code\n4. Pricing is a product decision, not a math problem\n5. Boring markets make great businesses\n\n#saas #entrepreneurship",
     8.2),
    ("linkedin", ["linkedin"],
     "After talking to 200+ founders, I noticed the ones who succeed share one trait:\n\nThey're obsessed with the problem, not the solution.\n\nWhat's a problem you're obsessed with right now?",
     7.8),
    ("x", ["x"],
     "the gap between 'I want to build something' and 'I launched something' is just daily consistency\n\nthat's it. that's the secret.",
     9.1),
]


async def seed():
    async with AsyncSessionLocal() as db:
        from sqlalchemy import select

        existing = await db.execute(select(User).where(User.email == DEMO_EMAIL))
        user = existing.scalar_one_or_none()

        if user:
            print(f"Demo user already exists: {DEMO_EMAIL}")
        else:
            user = User(
                email=DEMO_EMAIL,
                name="Demo Creator",
                hashed_password=hash_password(DEMO_PASSWORD),
                plan="pro",
                settings={
                    "persona": {
                        "niche": "Tech & Software",
                        "audience": "early-stage founders and indie hackers",
                        "style": "Educational",
                        "description": "I build in public and share everything I learn about SaaS, product, and startups.",
                    }
                },
            )
            db.add(user)
            await db.flush()
            print(f"✅ Created demo user: {DEMO_EMAIL} / {DEMO_PASSWORD}")

        for platform in PLATFORMS:
            existing_acct = await db.execute(
                select(Account).where(Account.user_id == user.id, Account.platform == platform)
            )
            if not existing_acct.scalar_one_or_none():
                acct = Account(
                    user_id=user.id,
                    platform=platform,
                    platform_user_id=f"demo_{platform}_123",
                    platform_username="demo_creator",
                    encrypted_access_token="demo_token_encrypted",
                    is_active=True,
                    last_synced_at=datetime.utcnow() - timedelta(hours=2),
                )
                db.add(acct)
        await db.flush()
        print(f"✅ Created {len(PLATFORMS)} demo accounts")

        post_count = 0
        for i, (platform, content) in enumerate(SAMPLE_POSTS):
            days_ago = random.randint(1, 60)
            pub_date = datetime.utcnow() - timedelta(days=days_ago)
            likes    = random.randint(20, 500)
            comments = random.randint(3, 80)
            views    = random.randint(500, 10000)

            post = Post(
                user_id=user.id,
                platform=platform,
                content=content,
                status=PostStatusEnum.published,
                published_at=pub_date,
                platform_post_id=f"demo_post_{i}",
                metrics={"likes": likes, "comments": comments, "views": views},
            )
            db.add(post)
            post_count += 1

            for metric, value in [("likes", likes), ("comments", comments), ("views", views)]:
                row = AnalyticsRow(
                    user_id=user.id,
                    metric=metric,
                    value=value,
                    timestamp=pub_date,
                    dimensions={
                        "platform": platform,
                        "hour": pub_date.hour,
                        "day_of_week": pub_date.weekday(),
                    },
                )
                db.add(row)

        await db.flush()
        print(f"✅ Created {post_count} demo posts + analytics rows")

        for _, targets, text, score in SAMPLE_DRAFTS:
            draft = Draft(
                user_id=user.id,
                content=text,
                platform_targets=targets,
                agent_origin="seed",
                score=score,
                tags=["creator", "saas", "productivity"],
                hook_variations=[
                    "Here's what 3 years of building taught me:",
                    "Nobody tells you this when you start building:",
                    "After failing 3 times, I finally understand:",
                ],
            )
            db.add(draft)

        await db.flush()
        print(f"✅ Created {len(SAMPLE_DRAFTS)} demo drafts")

        await db.commit()
        print("\n🎉 Seed complete!")
        print(f"   Login: {DEMO_EMAIL} / {DEMO_PASSWORD}")
        print("   Visit: http://localhost:3000")


if __name__ == "__main__":
    asyncio.run(seed())
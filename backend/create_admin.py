"""
create_admin.py
----------------
Convenience script to create the very first admin user directly in the
database (useful because /auth/register works too, but this is handy
for a fresh install before the frontend is even running).

Usage:
    python create_admin.py
"""

from app.database import SessionLocal, Base, engine
from app import models, auth

Base.metadata.create_all(bind=engine)

db = SessionLocal()

username = input("Admin username [admin]: ") or "admin"
email = input("Admin email [admin@sriprovision.com]: ") or "admin@sriprovision.com"
password = input("Admin password [admin123]: ") or "admin123"

existing = db.query(models.User).filter(models.User.username == username).first()
if existing:
    print(f"User '{username}' already exists. Nothing to do.")
else:
    user = models.User(
        username=username,
        email=email,
        hashed_password=auth.hash_password(password),
        role="admin",
        is_active=True,
        is_verified=True,  # created via trusted CLI, no email verification needed
    )
    db.add(user)
    db.commit()
    print(f"Admin user '{username}' created successfully. You can now log in.")

db.close()

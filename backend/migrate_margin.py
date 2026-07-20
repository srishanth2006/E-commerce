from app.database import engine
from sqlalchemy import text

with engine.begin() as conn:
    try:
        conn.execute(text("ALTER TABLE products ADD COLUMN profit_margin_percent FLOAT NOT NULL DEFAULT 15"))
        print("Column profit_margin_percent added successfully")
    except Exception as e:
        if "Duplicate column" in str(e):
            print("Column already exists, skipping")
        else:
            raise

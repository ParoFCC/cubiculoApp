"""
Seed initial cubículos.
Run from backend directory with venv active:
    python scripts/seed_cubiculos.py
"""
import sys
import os
import uuid

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import psycopg2
from app.core.config import settings


def seed():
    # Build a sync psycopg2 URL
    url = settings.DATABASE_URL
    # Replace +asyncpg or +psycopg2 so psycopg2 can parse it
    url = url.replace("postgresql+asyncpg://", "postgresql://").replace("postgresql+psycopg2://", "postgresql://")
    # Strip sslmode from URL if in query string (psycopg2 accepts it in connect() args)
    if "?" in url:
        base, qs = url.split("?", 1)
        params = dict(p.split("=") for p in qs.split("&") if "=" in p)
        sslmode = params.pop("sslmode", "require")
    else:
        base = url
        sslmode = "require"

    conn = psycopg2.connect(base, sslmode=sslmode)
    conn.autocommit = True
    cur = conn.cursor()

    cubiculos = [
        {"name": "Computación", "slug": "computacion", "location": "Edificio de Cómputo"},
        {"name": "Cabrera", "slug": "cabrera", "location": "Edificio Cabrera"},
    ]

    for c in cubiculos:
        cur.execute("SELECT id FROM cubiculos WHERE slug = %s", (c["slug"],))
        if cur.fetchone():
            print(f"  Already exists: {c['slug']}")
            continue
        cur.execute(
            "INSERT INTO cubiculos (id, name, slug, location, is_active, created_at) "
            "VALUES (%s, %s, %s, %s, true, now())",
            (str(uuid.uuid4()), c["name"], c["slug"], c["location"]),
        )
        print(f"  Created: {c['name']}")

    cur.close()
    conn.close()
    print("Done.")


if __name__ == "__main__":
    seed()

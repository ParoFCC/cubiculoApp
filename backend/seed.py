"""
Seed script — inserta datos de prueba en la base de datos.
Ejecutar desde backend/:
    .venv/bin/python seed.py
"""
import asyncio
import uuid
from sqlalchemy import select, delete
from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.cubiculo import Cubiculo
from app.models.user import User, UserRole
from app.models.game import Game
from app.models.products import Product
from app.core.config import settings

PASSWORD = "password123"


async def seed():
    async with AsyncSessionLocal() as db:

        # ── Limpiar datos anteriores de seed (por slug / student_id para no duplicar) ──
        # (No borramos todo para no romper FK por si hay datos reales)

        # ── 1. Cubículos ────────────────────────────────────────────────────────────────
        cubiculo_rows = [
            dict(slug="cubA", name="Cubículo A",  location="Edificio 1, Planta Baja", description="Cubículo principal con todos los servicios."),
            dict(slug="cubB", name="Cubículo B",  location="Edificio 2, Piso 1",       description="Solo impresiones y tienda."),
        ]
        cubiculos: dict[str, Cubiculo] = {}
        for row in cubiculo_rows:
            existing = (await db.execute(select(Cubiculo).where(Cubiculo.slug == row["slug"]))).scalar_one_or_none()
            if existing:
                cubiculos[row["slug"]] = existing
                print(f"  [skip] cubiculo '{row['slug']}' ya existe")
            else:
                c = Cubiculo(id=uuid.uuid4(), games_enabled=True, printing_enabled=True, products_enabled=True, is_active=True, **row)
                db.add(c)
                cubiculos[row["slug"]] = c
                print(f"  [+] cubiculo '{row['slug']}'")

        await db.flush()

        cA = cubiculos["cubA"]
        cB = cubiculos["cubB"]

        # ── 2. Usuarios ─────────────────────────────────────────────────────────────────
        user_rows = [
            # (student_id, name, email, role, period, managed_cubiculo)
            ("be202329205",  "Super Admin",         "admin@psicologopuebla.com",      UserRole.admin,   None,     cA),
            ("202300001",  "María García",        "202300001@alm.buap.mx",              UserRole.student, "2023-1", None),
            ("202300002",  "Carlos López",        "202300002@alm.buap.mx",             UserRole.student, "2023-1", None),
            ("202300003",  "Ana Martínez",        "202300003@alm.buap.mx",                UserRole.student, "2023-2", None),
            ("202300004",  "Luis Hernández",      "202300004@alm.buap.mx",               UserRole.student, "2023-2", None),
            ("202300005",  "Sofía Torres",        "202300005@alm.buap.mx",              UserRole.student, "2023-2", None),
            ("admin002",     "Adriana (Admin B)",   "adriana@psicologopuebla.com",    UserRole.admin,   None,     cB),
        ]
        users: dict[str, User] = {}
        for (sid, name, email, role, period, cubiculo) in user_rows:
            existing = (await db.execute(select(User).where(User.student_id == sid))).scalar_one_or_none()
            if existing:
                users[sid] = existing
                print(f"  [skip] user '{sid}' ya existe")
            else:
                u = User(
                    id=uuid.uuid4(),
                    student_id=sid,
                    name=name,
                    email=email,
                    password_hash=hash_password(PASSWORD),
                    role=role,
                    period=period,
                    is_active=True,
                    managed_cubiculo_id=cubiculo.id if cubiculo else None,
                )
                db.add(u)
                users[sid] = u
                print(f"  [+] user '{sid}' ({name})")

        await db.flush()

        # ── 3. Juegos ───────────────────────────────────────────────────────────────────
        game_rows = [
            # (cubiculo, name, description, qty)
            (cA, "Ajedrez",           "Juego de estrategia clásico.",                   2),
            (cA, "Scrabble",          "Forma palabras con letras.",                      1),
            (cA, "UNO",               "Sé el primero en quedarte sin cartas.",           3),
            (cA, "Jenga",             "Torre de bloques de madera.",                     1),
            (cA, "Dominó",            "Partidas clásicas de dominó.",                    2),
            (cA, "Tabú",              "Haz que adivinen la palabra sin decirla.",        1),
            (cA, "Parchís",           "El clásico juego de mesa familiar.",              1),
            (cB, "Quién es quién",    "Adivina el personaje del rival.",                  2),
            (cB, "Conecta 4",         "Conecta cuatro fichas en línea.",                 2),
            (cB, "Clue",              "Descubre al asesino, el arma y el lugar.",        1),
        ]
        for (cubiculo, name, desc, qty) in game_rows:
            existing = (await db.execute(
                select(Game).where(Game.cubiculo_id == cubiculo.id, Game.name == name)
            )).scalar_one_or_none()
            if existing:
                print(f"  [skip] game '{name}' ya existe")
            else:
                g = Game(
                    id=uuid.uuid4(),
                    cubiculo_id=cubiculo.id,
                    name=name,
                    description=desc,
                    quantity_total=qty,
                    quantity_avail=qty,
                    is_active=True,
                )
                db.add(g)
                print(f"  [+] game '{name}'")

        # ── 4. Productos ─────────────────────────────────────────────────────────────────
        product_rows = [
            # (cubiculo, name, category, price, stock)
            (cA, "Bolígrafo azul",       "Papelería",   5.00,  30),
            (cA, "Bolígrafo negro",      "Papelería",   5.00,  30),
            (cA, "Lápiz #2",             "Papelería",   3.50,  50),
            (cA, "Corrector líquido",    "Papelería",   12.00, 15),
            (cA, "Cuaderno universitario","Papelería",  35.00, 20),
            (cA, "Post-it",              "Papelería",   18.00, 25),
            (cA, "Agua 600ml",           "Bebidas",     15.00, 24),
            (cA, "Jugo de naranja",      "Bebidas",     18.00, 12),
            (cA, "Galletas Oreo",        "Snacks",      20.00, 18),
            (cA, "Papas Sabritas",       "Snacks",      17.00, 20),
            (cB, "Bolígrafo rojo",       "Papelería",   5.00,  20),
            (cB, "Engrapadora",          "Oficina",     85.00,  5),
            (cB, "Grapas (caja)",        "Oficina",     20.00, 10),
            (cB, "Tijeras",              "Oficina",     25.00,  8),
            (cB, "Agua 600ml",           "Bebidas",     15.00, 12),
        ]
        for (cubiculo, name, cat, price, stock) in product_rows:
            existing = (await db.execute(
                select(Product).where(Product.cubiculo_id == cubiculo.id, Product.name == name)
            )).scalar_one_or_none()
            if existing:
                print(f"  [skip] product '{name}' ya existe")
            else:
                p = Product(
                    id=uuid.uuid4(),
                    cubiculo_id=cubiculo.id,
                    name=name,
                    category=cat,
                    price=price,
                    stock=stock,
                    is_active=True,
                )
                db.add(p)
                print(f"  [+] product '{name}'")

        await db.commit()
        print("\n✅ Seed completado.")
        print(f"\n{'─'*50}")
        print("USUARIOS DE PRUEBA (todos con password: password123)")
        print(f"{'─'*50}")
        print(f"  Super Admin:  be202329205 / admin@psicologopuebla.com")
        print(f"  Admin B:      admin002    / adriana@psicologopuebla.com")
        print(f"  Estudiante 1: 202300001 / 202300001@alm.buap.mx")
        print(f"  Estudiante 2: 202300002 / 202300002@alm.buap.mx")
        print(f"  Estudiante 3: 202300003 / 202300003@alm.buap.mx")
        print(f"  Estudiante 4: 202300004 / 202300004@alm.buap.mx")
        print(f"  Estudiante 5: 202300005 / 202300005@alm.buap.mx")
        print(f"{'─'*50}")


if __name__ == "__main__":
    asyncio.run(seed())

-- =============================================================================
--  CubiculoApp — Esquema PostgreSQL completo
--  Base de datos: Neon (PostgreSQL 16)
--  Generado: 2026-03-06
-- =============================================================================

-- Habilitar extensión para UUID v4
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- =============================================================================
--  TIPOS ENUMERADOS
-- =============================================================================

CREATE TYPE user_role        AS ENUM ('student', 'admin');
CREATE TYPE loan_status      AS ENUM ('active', 'returned', 'overdue');
CREATE TYPE print_type       AS ENUM ('free', 'paid');
CREATE TYPE cash_status      AS ENUM ('open', 'closed');


-- =============================================================================
--  MÓDULO 1 — USUARIOS
-- =============================================================================

-- -----------------------------------------------------------------------------
--  users
--    Tabla maestra de usuarios (estudiantes y administradores).
--    La columna `period` indica el semestre activo del estudiante, ej. "2026-1".
-- -----------------------------------------------------------------------------
CREATE TABLE users (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(120)  NOT NULL,
    email         VARCHAR(120)  NOT NULL,
    password_hash VARCHAR(255)  NOT NULL,
    role          user_role     NOT NULL  DEFAULT 'student',
    student_code  VARCHAR(20),                        -- matrícula institucional
    period        VARCHAR(10),                        -- periodo activo, ej. "2026-1"
    is_active     BOOLEAN       NOT NULL  DEFAULT TRUE,
    created_at    TIMESTAMPTZ   NOT NULL  DEFAULT NOW(),
    updated_at    TIMESTAMPTZ   NOT NULL  DEFAULT NOW(),

    CONSTRAINT uq_users_email        UNIQUE (email),
    CONSTRAINT uq_users_student_code UNIQUE (student_code),
    CONSTRAINT chk_student_code      CHECK (
        role = 'admin' OR student_code IS NOT NULL
    )
);

COMMENT ON TABLE  users              IS 'Usuarios del sistema: estudiantes y administradores.';
COMMENT ON COLUMN users.student_code IS 'Matrícula institucional, requerida para estudiantes.';
COMMENT ON COLUMN users.period       IS 'Semestre activo del estudiante, ej. 2026-1.';


-- =============================================================================
--  MÓDULO 2 — PRÉSTAMO DE JUEGOS
-- =============================================================================

-- -----------------------------------------------------------------------------
--  games  (inventario)
-- -----------------------------------------------------------------------------
CREATE TABLE games (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(120) NOT NULL,
    description     TEXT,
    instructions    TEXT,
    image_url       VARCHAR(255),
    quantity_total  INT          NOT NULL DEFAULT 1,
    quantity_avail  INT          NOT NULL DEFAULT 1,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_games_quantity_total CHECK (quantity_total >= 0),
    CONSTRAINT chk_games_quantity_avail CHECK (quantity_avail >= 0),
    CONSTRAINT chk_games_avail_lte_total CHECK (quantity_avail <= quantity_total)
);

COMMENT ON TABLE  games               IS 'Inventario de juegos disponibles para préstamo.';
COMMENT ON COLUMN games.quantity_avail IS 'Unidades actualmente disponibles (decrements on loan).';


-- -----------------------------------------------------------------------------
--  game_loans  (préstamos y devoluciones)
-- -----------------------------------------------------------------------------
CREATE TABLE game_loans (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id      UUID         NOT NULL REFERENCES games(id),
    student_id   UUID         NOT NULL REFERENCES users(id),
    admin_id     UUID         NOT NULL REFERENCES users(id),   -- quien registra
    status       loan_status  NOT NULL DEFAULT 'active',
    borrowed_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    due_at       TIMESTAMPTZ,                                  -- fecha compromiso
    returned_at  TIMESTAMPTZ,
    notes        TEXT,

    CONSTRAINT chk_loan_returned_date CHECK (
        returned_at IS NULL OR returned_at >= borrowed_at
    ),
    CONSTRAINT chk_loan_status_returned CHECK (
        status != 'returned' OR returned_at IS NOT NULL
    )
);

COMMENT ON TABLE  game_loans             IS 'Registro de préstamos y devoluciones de juegos.';
COMMENT ON COLUMN game_loans.admin_id    IS 'Administrador que registró la operación.';
COMMENT ON COLUMN game_loans.due_at      IS 'Fecha acordada de devolución (opcional).';


-- =============================================================================
--  MÓDULO 3 — IMPRESIONES
-- =============================================================================

-- -----------------------------------------------------------------------------
--  print_balance  (saldo por estudiante por periodo)
--    Un registro por (student_id, period). Se crea automáticamente al primer uso.
-- -----------------------------------------------------------------------------
CREATE TABLE print_balance (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      UUID        NOT NULL REFERENCES users(id),
    period          VARCHAR(10) NOT NULL,
    free_remaining  INT         NOT NULL DEFAULT 10,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_print_balance_student_period UNIQUE (student_id, period),
    CONSTRAINT chk_free_remaining              CHECK (free_remaining >= 0)
);

COMMENT ON TABLE  print_balance                IS 'Saldo de impresiones gratuitas por estudiante por periodo.';
COMMENT ON COLUMN print_balance.free_remaining IS 'Hojas gratuitas restantes. Empieza en 10 por periodo.';


-- -----------------------------------------------------------------------------
--  print_jobs  (historial de impresiones)
-- -----------------------------------------------------------------------------
CREATE TABLE print_jobs (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id  UUID        NOT NULL REFERENCES users(id),
    admin_id    UUID        NOT NULL REFERENCES users(id),
    pages       INT         NOT NULL,
    free_pages  INT         NOT NULL DEFAULT 0,   -- páginas descontadas del saldo free
    paid_pages  INT         NOT NULL DEFAULT 0,   -- páginas cobradas
    type        print_type  NOT NULL,
    unit_cost   NUMERIC(8,2) NOT NULL DEFAULT 0.50,
    total_cost  NUMERIC(8,2) NOT NULL DEFAULT 0.00,
    printed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    period      VARCHAR(10) NOT NULL,

    CONSTRAINT chk_print_pages     CHECK (pages > 0),
    CONSTRAINT chk_print_free      CHECK (free_pages >= 0),
    CONSTRAINT chk_print_paid      CHECK (paid_pages >= 0),
    CONSTRAINT chk_print_sum       CHECK (free_pages + paid_pages = pages),
    CONSTRAINT chk_print_cost      CHECK (total_cost >= 0)
);

COMMENT ON TABLE  print_jobs           IS 'Historial detallado de cada trabajo de impresión.';
COMMENT ON COLUMN print_jobs.free_pages IS 'Páginas descontadas del saldo gratuito del estudiante.';
COMMENT ON COLUMN print_jobs.paid_pages IS 'Páginas cobradas (excedente del saldo gratuito).';
COMMENT ON COLUMN print_jobs.unit_cost  IS 'Precio por hoja pagada en el momento de la impresión.';


-- =============================================================================
--  MÓDULO 4 — VENTA DE PRODUCTOS
-- =============================================================================

-- -----------------------------------------------------------------------------
--  product_categories  (catálogo de categorías)
-- -----------------------------------------------------------------------------
CREATE TABLE product_categories (
    id    SMALLINT     PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name  VARCHAR(60)  NOT NULL,

    CONSTRAINT uq_product_category_name UNIQUE (name)
);

INSERT INTO product_categories (name) VALUES
    ('Snacks'),
    ('Bebidas'),
    ('Papelería');


-- -----------------------------------------------------------------------------
--  products  (inventario de productos)
-- -----------------------------------------------------------------------------
CREATE TABLE products (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id  SMALLINT     REFERENCES product_categories(id),
    name         VARCHAR(120) NOT NULL,
    description  TEXT,
    price        NUMERIC(8,2) NOT NULL,
    stock        INT          NOT NULL DEFAULT 0,
    is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_product_price CHECK (price > 0),
    CONSTRAINT chk_product_stock CHECK (stock >= 0)
);

COMMENT ON TABLE products IS 'Catálogo e inventario de productos (maruchan, palomitas, snacks, etc.).';


-- -----------------------------------------------------------------------------
--  cash_registers  (cortes de caja)
-- -----------------------------------------------------------------------------
CREATE TABLE cash_registers (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id         UUID         NOT NULL REFERENCES users(id),
    opening_balance  NUMERIC(10,2) NOT NULL,
    closing_balance  NUMERIC(10,2),
    status           cash_status  NOT NULL DEFAULT 'open',
    opened_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    closed_at        TIMESTAMPTZ,
    notes            TEXT,

    CONSTRAINT chk_cash_closing CHECK (
        status != 'closed' OR closing_balance IS NOT NULL
    ),
    CONSTRAINT chk_cash_closed_date CHECK (
        closed_at IS NULL OR closed_at >= opened_at
    )
);

COMMENT ON TABLE  cash_registers              IS 'Apertura y cierre de caja por turno de administrador.';
COMMENT ON COLUMN cash_registers.admin_id     IS 'Administrador responsable de la caja.';


-- -----------------------------------------------------------------------------
--  sales  (encabezado de venta)
-- -----------------------------------------------------------------------------
CREATE TABLE sales (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    cash_register_id UUID         REFERENCES cash_registers(id),
    admin_id         UUID         NOT NULL REFERENCES users(id),
    student_id       UUID         REFERENCES users(id),   -- nullable: venta anónima
    total            NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    sold_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_sale_total CHECK (total >= 0)
);

COMMENT ON TABLE  sales                   IS 'Encabezado de cada transacción de venta.';
COMMENT ON COLUMN sales.cash_register_id  IS 'Caja en la que se registró la venta. Puede ser NULL si la caja no está abierta.';
COMMENT ON COLUMN sales.student_id        IS 'Estudiante comprador. NULL para ventas anónimas.';


-- -----------------------------------------------------------------------------
--  sale_items  (detalle de venta)
-- -----------------------------------------------------------------------------
CREATE TABLE sale_items (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id     UUID         NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id  UUID         NOT NULL REFERENCES products(id),
    quantity    INT          NOT NULL,
    unit_price  NUMERIC(8,2) NOT NULL,
    subtotal    NUMERIC(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,

    CONSTRAINT chk_sale_item_qty   CHECK (quantity > 0),
    CONSTRAINT chk_sale_item_price CHECK (unit_price > 0)
);

COMMENT ON TABLE  sale_items          IS 'Líneas de detalle de cada venta (un registro por producto).';
COMMENT ON COLUMN sale_items.subtotal IS 'Columna calculada: quantity × unit_price.';


-- =============================================================================
--  ÍNDICES RECOMENDADOS
-- =============================================================================

-- ── Usuarios ────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX idx_users_email        ON users (email);
CREATE INDEX        idx_users_role         ON users (role);
CREATE INDEX        idx_users_period       ON users (period) WHERE role = 'student';

-- ── Juegos ──────────────────────────────────────────────────────────────────
CREATE INDEX idx_games_active             ON games (is_active) WHERE is_active = TRUE;

-- ── Préstamos ───────────────────────────────────────────────────────────────
CREATE INDEX idx_loans_student_id         ON game_loans (student_id);
CREATE INDEX idx_loans_game_id            ON game_loans (game_id);
CREATE INDEX idx_loans_status             ON game_loans (status)     WHERE status = 'active';
CREATE INDEX idx_loans_borrowed_at        ON game_loans (borrowed_at DESC);

-- ── Impresiones ───────────────────────────────────────────────────────────
CREATE UNIQUE INDEX idx_balance_student_period ON print_balance (student_id, period);
CREATE INDEX        idx_print_jobs_student     ON print_jobs (student_id);
CREATE INDEX        idx_print_jobs_period      ON print_jobs (period);
CREATE INDEX        idx_print_jobs_printed_at  ON print_jobs (printed_at DESC);

-- ── Productos ───────────────────────────────────────────────────────────────
CREATE INDEX idx_products_active          ON products (is_active)    WHERE is_active = TRUE;
CREATE INDEX idx_products_category        ON products (category_id);
CREATE INDEX idx_products_stock           ON products (stock)        WHERE stock = 0;

-- ── Ventas ──────────────────────────────────────────────────────────────────
CREATE INDEX idx_sales_admin_id           ON sales (admin_id);
CREATE INDEX idx_sales_sold_at            ON sales (sold_at DESC);
CREATE INDEX idx_sales_cash_register      ON sales (cash_register_id);
CREATE INDEX idx_sale_items_sale_id       ON sale_items (sale_id);
CREATE INDEX idx_sale_items_product_id    ON sale_items (product_id);

-- ── Caja ────────────────────────────────────────────────────────────────────
CREATE INDEX idx_cash_status_open         ON cash_registers (status) WHERE status = 'open';
CREATE INDEX idx_cash_admin_id            ON cash_registers (admin_id);


-- =============================================================================
--  FUNCIONES Y TRIGGERS
-- =============================================================================

-- ── updated_at automático ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_games_updated_at
    BEFORE UPDATE ON games
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_print_balance_updated_at
    BEFORE UPDATE ON print_balance
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ── Mantener quantity_avail coherente con préstamos ───────────────────────
CREATE OR REPLACE FUNCTION adjust_game_availability()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    -- Nuevo préstamo activo → reducir disponibilidad
    IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
        UPDATE games
           SET quantity_avail = quantity_avail - 1
         WHERE id = NEW.game_id
           AND quantity_avail > 0;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Juego sin unidades disponibles (id: %)', NEW.game_id;
        END IF;

    -- Devolución → restaurar disponibilidad
    ELSIF TG_OP = 'UPDATE'
        AND OLD.status = 'active'
        AND NEW.status = 'returned' THEN

        UPDATE games
           SET quantity_avail = quantity_avail + 1
         WHERE id = NEW.game_id;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_loan_adjust_availability
    AFTER INSERT OR UPDATE OF status ON game_loans
    FOR EACH ROW EXECUTE FUNCTION adjust_game_availability();


-- ── Mantener el total de la venta actualizado ─────────────────────────────
CREATE OR REPLACE FUNCTION sync_sale_total()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    UPDATE sales
       SET total = (
           SELECT COALESCE(SUM(subtotal), 0)
             FROM sale_items
            WHERE sale_id = COALESCE(NEW.sale_id, OLD.sale_id)
       )
     WHERE id = COALESCE(NEW.sale_id, OLD.sale_id);
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sale_items_sync_total
    AFTER INSERT OR UPDATE OR DELETE ON sale_items
    FOR EACH ROW EXECUTE FUNCTION sync_sale_total();


-- ── Registrar impresión y descontar saldo ─────────────────────────────────
-- NOTA: Esta función es una alternativa al manejo en capa de aplicación.
-- Recibe: student_id, admin_id, pages (total), unit_cost, period
CREATE OR REPLACE FUNCTION register_print_job(
    p_student_id  UUID,
    p_admin_id    UUID,
    p_pages       INT,
    p_unit_cost   NUMERIC(8,2) DEFAULT 0.50,
    p_period      VARCHAR(10)  DEFAULT NULL
)
RETURNS print_jobs LANGUAGE plpgsql AS $$
DECLARE
    v_period       VARCHAR(10);
    v_balance      print_balance;
    v_free_used    INT;
    v_paid_pages   INT;
    v_cost         NUMERIC(8,2);
    v_type         print_type;
    v_job          print_jobs;
BEGIN
    -- Determinar periodo
    v_period := COALESCE(p_period, to_char(NOW(), 'YYYY-') ||
        CASE WHEN EXTRACT(MONTH FROM NOW()) <= 6 THEN '1' ELSE '2' END);

    -- Obtener o crear saldo
    INSERT INTO print_balance (student_id, period)
    VALUES (p_student_id, v_period)
    ON CONFLICT (student_id, period) DO NOTHING;

    SELECT * INTO v_balance
      FROM print_balance
     WHERE student_id = p_student_id AND period = v_period
     FOR UPDATE;

    -- Calcular páginas gratuitas vs pagadas
    v_free_used  := LEAST(v_balance.free_remaining, p_pages);
    v_paid_pages := p_pages - v_free_used;
    v_cost       := ROUND(v_paid_pages * p_unit_cost, 2);
    v_type       := CASE WHEN v_paid_pages > 0 THEN 'paid' ELSE 'free' END;

    -- Actualizar saldo
    UPDATE print_balance
       SET free_remaining = free_remaining - v_free_used
     WHERE student_id = p_student_id AND period = v_period;

    -- Insertar historial
    INSERT INTO print_jobs (
        student_id, admin_id, pages, free_pages, paid_pages,
        type, unit_cost, total_cost, period
    ) VALUES (
        p_student_id, p_admin_id, p_pages, v_free_used, v_paid_pages,
        v_type, p_unit_cost, v_cost, v_period
    ) RETURNING * INTO v_job;

    RETURN v_job;
END;
$$;

COMMENT ON FUNCTION register_print_job IS
    'Registra un trabajo de impresión descontando saldo gratuito y calculando costo.';


-- =============================================================================
--  VISTAS ÚTILES
-- =============================================================================

-- Préstamos activos con nombre de juego y estudiante
CREATE VIEW v_active_loans AS
SELECT
    gl.id,
    g.name          AS game_name,
    g.image_url,
    u.name          AS student_name,
    u.student_code,
    u.email         AS student_email,
    gl.borrowed_at,
    gl.due_at,
    gl.status,
    CASE
        WHEN gl.due_at IS NOT NULL AND gl.due_at < NOW() AND gl.status = 'active'
        THEN TRUE ELSE FALSE
    END             AS is_overdue
FROM game_loans gl
JOIN games  g ON g.id = gl.game_id
JOIN users  u ON u.id = gl.student_id
WHERE gl.status = 'active';

COMMENT ON VIEW v_active_loans IS 'Préstamos activos con datos de juego y estudiante. Incluye flag de vencido.';


-- Resumen de saldo de impresiones del periodo actual
CREATE VIEW v_print_balance_current AS
SELECT
    u.id            AS student_id,
    u.name          AS student_name,
    u.student_code,
    u.period,
    COALESCE(pb.free_remaining, 10) AS free_remaining,
    10 - COALESCE(pb.free_remaining, 10) AS free_used
FROM users u
LEFT JOIN print_balance pb
       ON pb.student_id = u.id AND pb.period = u.period
WHERE u.role = 'student' AND u.is_active = TRUE;

COMMENT ON VIEW v_print_balance_current IS 'Saldo de impresiones gratuitas de todos los estudiantes en su periodo activo.';


-- Reporte de ventas por producto
CREATE VIEW v_sales_by_product AS
SELECT
    p.id            AS product_id,
    p.name          AS product_name,
    pc.name         AS category,
    SUM(si.quantity)        AS total_units_sold,
    SUM(si.subtotal)        AS total_revenue,
    COUNT(DISTINCT si.sale_id) AS num_sales
FROM sale_items si
JOIN products          p  ON p.id  = si.product_id
LEFT JOIN product_categories pc ON pc.id = p.category_id
GROUP BY p.id, p.name, pc.name;

COMMENT ON VIEW v_sales_by_product IS 'Totales de ventas agrupados por producto.';


-- Estado de caja actual
CREATE VIEW v_current_cash_register AS
SELECT
    cr.id,
    u.name          AS admin_name,
    cr.opening_balance,
    cr.status,
    cr.opened_at,
    COALESCE(SUM(s.total), 0) AS sales_total,
    cr.opening_balance + COALESCE(SUM(s.total), 0) AS expected_closing
FROM cash_registers cr
JOIN users u ON u.id = cr.admin_id
LEFT JOIN sales s ON s.cash_register_id = cr.id
WHERE cr.status = 'open'
GROUP BY cr.id, u.name, cr.opening_balance, cr.status, cr.opened_at;

COMMENT ON VIEW v_current_cash_register IS 'Estado de la caja actualmente abierta con total de ventas acumuladas.';


-- =============================================================================
--  DATOS INICIALES (seed)
-- =============================================================================

-- Administrador por defecto (password: changeme → bcrypt)
INSERT INTO users (name, email, password_hash, role) VALUES
    ('Administrador',
     'admin@cubiculo.edu',
     '$2b$12$placeholderHashCambiarEnProduccion000000000000000000000',
     'admin');

-- Productos iniciales
INSERT INTO products (name, category_id, price, stock) VALUES
    ('Maruchan Camarón',    1, 15.00, 20),
    ('Maruchan Res',        1, 15.00, 20),
    ('Palomitas Naturales', 1, 20.00, 15),
    ('Palomitas Mantequilla',1,22.00, 15),
    ('Papas Sabritas',      1, 18.00, 25),
    ('Coca-Cola 600ml',     2, 22.00, 30),
    ('Agua Ciel 600ml',     2, 12.00, 40),
    ('Jugo del Valle',      2, 15.00, 20);

-- ============================================================
-- E-commerce Management System - MySQL schema
-- Full 20-module Smart Provision Store schema.
-- ============================================================
-- This file is provided for reference / manual setup.
-- In normal use, FastAPI + SQLAlchemy will create these tables
-- automatically the first time you run the backend
-- (see app/main.py -> Base.metadata.create_all).
--
-- Run manually with:
--   mysql -u root -p < sql/schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS sri_provision_store
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE sri_provision_store;

-- ---------------------------------------------------------------
-- MODULE 1: users, token_blacklist
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    user_id                     INT AUTO_INCREMENT PRIMARY KEY,
    username                    VARCHAR(50) UNIQUE NOT NULL,
    email                       VARCHAR(100) UNIQUE NOT NULL,
    hashed_password             VARCHAR(255) NOT NULL,
    role                        ENUM('admin', 'cashier') DEFAULT 'cashier',
    is_active                   BOOLEAN NOT NULL DEFAULT TRUE,
    is_verified                 BOOLEAN NOT NULL DEFAULT FALSE,
    verification_token          VARCHAR(255),
    verification_token_expires  DATETIME,
    reset_token                 VARCHAR(255),
    reset_token_expires         DATETIME,
    created_at                  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS token_blacklist (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    jti             VARCHAR(64) UNIQUE NOT NULL,
    blacklisted_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at      DATETIME NOT NULL
);

-- ---------------------------------------------------------------
-- categories, brands
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
    category_id  INT AUTO_INCREMENT PRIMARY KEY,
    name         VARCHAR(100) UNIQUE NOT NULL,
    description  VARCHAR(255),
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS brands (
    brand_id    INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) UNIQUE NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------
-- suppliers (Module 4) - created before products since products FKs it
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id     INT AUTO_INCREMENT PRIMARY KEY,
    supplier_name   VARCHAR(150) NOT NULL,
    contact_person  VARCHAR(100),
    phone           VARCHAR(20),
    email           VARCHAR(100),
    address         TEXT,
    gst_number      VARCHAR(30),
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------
-- MODULE 2: products (+ images)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
    product_id        INT AUTO_INCREMENT PRIMARY KEY,
    name               VARCHAR(150) NOT NULL,
    category_id        INT,
    brand_id           INT,
    supplier_id        INT,
    barcode            VARCHAR(64) UNIQUE,
    batch_number       VARCHAR(64),
    expiry_date        DATE,
    purchase_price     FLOAT NOT NULL DEFAULT 0,
    selling_price      FLOAT NOT NULL DEFAULT 0,
    mrp                FLOAT,
    gst_percent        FLOAT NOT NULL DEFAULT 5,
    discount_percent   FLOAT NOT NULL DEFAULT 0,
    stock_quantity     FLOAT NOT NULL DEFAULT 0,
    reorder_level      FLOAT NOT NULL DEFAULT 10,
    max_stock          FLOAT,
    unit               VARCHAR(20) NOT NULL DEFAULT 'pcs',
    image_url          VARCHAR(255),
    is_active          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE SET NULL,
    FOREIGN KEY (brand_id) REFERENCES brands(brand_id) ON DELETE SET NULL,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS product_images (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    product_id  INT NOT NULL,
    image_url   VARCHAR(255) NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------
-- MODULE 3: customers (+ addresses, wishlist, cart, reviews)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
    customer_id                 INT AUTO_INCREMENT PRIMARY KEY,
    name                        VARCHAR(150) NOT NULL,
    phone                       VARCHAR(20) UNIQUE,
    email                       VARCHAR(100) UNIQUE,
    address                     TEXT,
    loyalty_points              INT DEFAULT 0,
    hashed_password             VARCHAR(255),
    is_active                   BOOLEAN NOT NULL DEFAULT TRUE,
    is_verified                 BOOLEAN NOT NULL DEFAULT FALSE,
    verification_token          VARCHAR(255),
    verification_token_expires  DATETIME,
    reset_token                 VARCHAR(255),
    reset_token_expires         DATETIME,
    created_at                  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_addresses (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    customer_id  INT NOT NULL,
    label        VARCHAR(50) DEFAULT 'Home',
    line1        VARCHAR(255) NOT NULL,
    line2        VARCHAR(255),
    city         VARCHAR(100),
    state        VARCHAR(100),
    pincode      VARCHAR(20),
    is_default   BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS wishlist_items (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    product_id  INT NOT NULL,
    added_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cart_items (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    product_id  INT NOT NULL,
    quantity    FLOAT NOT NULL DEFAULT 1,
    added_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS product_reviews (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    product_id  INT NOT NULL,
    customer_id INT NOT NULL,
    rating      INT NOT NULL,
    comment     TEXT,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------
-- MODULE 5/6: purchase_bills, purchase_bill_items (AI invoice scanner)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS purchase_bills (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    supplier_id     INT,
    invoice_number  VARCHAR(100),
    invoice_date    DATE,
    gst_number      VARCHAR(30),
    source          ENUM('manual', 'ocr') DEFAULT 'manual',
    raw_ocr_text    TEXT,
    total_amount    FLOAT NOT NULL DEFAULT 0,
    created_by      INT,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS purchase_bill_items (
    id                 INT AUTO_INCREMENT PRIMARY KEY,
    bill_id            INT NOT NULL,
    product_id         INT,
    matched_name       VARCHAR(150),
    quantity           FLOAT NOT NULL DEFAULT 0,
    purchase_price     FLOAT NOT NULL DEFAULT 0,
    selling_price      FLOAT,
    discount_percent   FLOAT DEFAULT 0,
    gst_percent        FLOAT DEFAULT 5,
    expiry_date        DATE,
    batch_number       VARCHAR(64),
    match_confidence   FLOAT,
    is_new_product     BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (bill_id) REFERENCES purchase_bills(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE SET NULL
);

-- ---------------------------------------------------------------
-- MODULE 10/11/16: sales (invoice header), sale_items (line items)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sales (
    sale_id              INT AUTO_INCREMENT PRIMARY KEY,
    customer_id          INT,
    user_id              INT,
    subtotal             FLOAT NOT NULL DEFAULT 0,
    discount             FLOAT NOT NULL DEFAULT 0,
    gst_amount           FLOAT NOT NULL DEFAULT 0,
    grand_total          FLOAT NOT NULL DEFAULT 0,
    payment_method       ENUM('cash', 'card', 'upi', 'razorpay', 'cod') DEFAULT 'cash',
    payment_status       ENUM('pending', 'paid', 'failed') DEFAULT 'paid',
    razorpay_order_id    VARCHAR(100),
    razorpay_payment_id  VARCHAR(100),
    sale_date            DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS sale_items (
    sale_item_id  INT AUTO_INCREMENT PRIMARY KEY,
    sale_id       INT NOT NULL,
    product_id    INT NOT NULL,
    quantity      FLOAT NOT NULL,
    unit_price    FLOAT NOT NULL,
    total_price   FLOAT NOT NULL,
    FOREIGN KEY (sale_id) REFERENCES sales(sale_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- ---------------------------------------------------------------
-- MODULE 7/8/9: inventory_logs (stock audit trail)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory_logs (
    log_id           INT AUTO_INCREMENT PRIMARY KEY,
    product_id       INT NOT NULL,
    change_type      ENUM('restock', 'sale', 'adjustment', 'return') NOT NULL,
    quantity_change  FLOAT NOT NULL,
    stock_after      FLOAT NOT NULL,
    note             VARCHAR(255),
    created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- ---------------------------------------------------------------
-- MODULE 19: notifications
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    type        ENUM('low_stock','purchase_success','order_success','invoice_uploaded','expiry_alert','system') NOT NULL,
    title       VARCHAR(150) NOT NULL,
    message     VARCHAR(500),
    is_read     BOOLEAN DEFAULT FALSE,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------
-- MODULE 13: chat_logs (chatbot conversation history)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_logs (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    session_id  VARCHAR(64) NOT NULL,
    role        ENUM('user', 'assistant') NOT NULL,
    message     TEXT NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Useful indexes for common lookups / joins
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_sales_date ON sales(sale_date);
CREATE INDEX idx_sale_items_product ON sale_items(product_id);
CREATE INDEX idx_inventory_logs_product ON inventory_logs(product_id);
CREATE INDEX idx_chat_logs_session ON chat_logs(session_id);

-- ============================================================
-- Seed data
-- ============================================================
INSERT INTO categories (name, description) VALUES
    ('Rice', 'All varieties of rice'),
    ('Oil', 'Cooking oils'),
    ('Pulses', 'Lentils, beans and dals'),
    ('Dairy', 'Milk, curd, cheese, butter'),
    ('Snacks', 'Packaged snacks and namkeen'),
    ('Beverages', 'Tea, coffee, soft drinks and juices'),
    ('Household', 'Cleaning and household supplies'),
    ('Personal Care', 'Soaps, shampoos and personal hygiene')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- NOTE: We intentionally do NOT insert a default admin user here, because
-- a correct bcrypt hash can't be reliably hand-typed into a .sql file.
-- Instead, create the first admin account with either:
--   1) python create_admin.py           (interactive script, recommended)
--   2) POST /auth/register via Swagger UI at http://localhost:8000/docs

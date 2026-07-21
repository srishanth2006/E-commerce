from fpdf import FPDF
import os

class PDF(FPDF):
    def header(self):
        if self.page_no() > 1:
            self.set_font('Helvetica', 'I', 8)
            self.set_text_color(128, 128, 128)
            self.cell(0, 5, 'E-commerce Management System - Project Guide', align='C')
            self.ln(8)
    
    def footer(self):
        self.set_y(-15)
        self.set_font('Helvetica', 'I', 8)
        self.set_text_color(128, 128, 128)
        self.cell(0, 10, f'Page {self.page_no()}/{{nb}}', align='C')
    
    def title_page(self):
        self.add_page()
        self.ln(60)
        self.set_font('Helvetica', 'B', 28)
        self.set_text_color(16, 185, 129)
        self.cell(0, 15, 'E-commerce Management System', align='C')
        self.ln(15)
        self.set_font('Helvetica', '', 16)
        self.set_text_color(55, 65, 81)
        self.cell(0, 10, 'Complete Project Guide', align='C')
        self.ln(10)
        self.set_font('Helvetica', '', 12)
        self.set_text_color(107, 114, 128)
        self.cell(0, 8, 'Full-Stack Web Application', align='C')
        self.ln(8)
        self.cell(0, 8, 'React.js + FastAPI + MySQL', align='C')
        self.ln(25)
        self.set_draw_color(16, 185, 129)
        self.set_line_width(0.5)
        self.line(60, self.get_y(), 150, self.get_y())
        self.ln(15)
        self.set_font('Helvetica', '', 11)
        self.set_text_color(75, 85, 99)
        self.cell(0, 8, 'Tech Stack: Python FastAPI | React.js | MySQL | WebSocket | JWT Auth', align='C')
        self.ln(8)
        self.cell(0, 8, 'Deployment: Vercel (Frontend) + Render (Backend) + TiDB Cloud (DB)', align='C')
        self.ln(25)
        self.set_font('Helvetica', 'I', 10)
        self.cell(0, 8, 'Interview Preparation Document', align='C')
    
    def section(self, title, level=1):
        self.ln(4)
        if level == 1:
            self.set_font('Helvetica', 'B', 18)
            self.set_text_color(16, 185, 129)
            self.cell(0, 12, title)
            self.ln(3)
            self.set_draw_color(16, 185, 129)
            self.set_line_width(0.3)
            self.line(10, self.get_y(), 200, self.get_y())
            self.ln(6)
        elif level == 2:
            self.set_font('Helvetica', 'B', 14)
            self.set_text_color(55, 65, 81)
            self.cell(0, 10, title)
            self.ln(8)
        elif level == 3:
            self.set_font('Helvetica', 'B', 11)
            self.set_text_color(75, 85, 99)
            self.cell(0, 8, title)
            self.ln(6)
    
    def body(self, text):
        self.set_font('Helvetica', '', 10)
        self.set_text_color(55, 65, 81)
        self.multi_cell(0, 5.5, text)
        self.ln(2)
    
    def bold_body(self, text):
        self.set_font('Helvetica', 'B', 10)
        self.set_text_color(55, 65, 81)
        self.multi_cell(0, 5.5, text)
        self.ln(1)
    
    def code_block(self, text):
        self.set_font('Courier', '', 8)
        self.set_text_color(30, 30, 30)
        self.set_fill_color(245, 245, 245)
        lines = text.strip().split('\n')
        for line in lines:
            self.cell(0, 4.5, '  ' + line, fill=True)
            self.ln(4.5)
        self.ln(3)
    
    def interview_answer(self, text):
        self.set_font('Helvetica', 'I', 10)
        self.set_text_color(16, 100, 64)
        self.set_fill_color(236, 253, 245)
        self.multi_cell(0, 5.5, 'Interview Answer: ' + text, fill=True)
        self.ln(3)
    
    def bullet(self, text):
        self.set_font('Helvetica', '', 10)
        self.set_text_color(55, 65, 81)
        self.cell(8, 5.5, '-')
        self.multi_cell(0, 5.5, text)
        self.ln(1)
    
    def table_row(self, cols, widths, header=False):
        if header:
            self.set_font('Helvetica', 'B', 9)
            self.set_fill_color(16, 185, 129)
            self.set_text_color(255, 255, 255)
        else:
            self.set_font('Helvetica', '', 9)
            self.set_fill_color(249, 250, 251)
            self.set_text_color(55, 65, 81)
        
        h = 7
        for i, col in enumerate(cols):
            self.cell(widths[i], h, col, border=0, fill=True)
        self.ln(h)

pdf = PDF()
pdf.alias_nb_pages()
pdf.set_auto_page_break(auto=True, margin=20)

# ============================================================
# TITLE PAGE
# ============================================================
pdf.title_page()

# ============================================================
# TABLE OF CONTENTS
# ============================================================
pdf.add_page()
pdf.section('Table of Contents')
toc = [
    '1. Project Overview',
    '2. Technology Stack',
    '3. Architecture',
    '4. Backend Deep Dive',
    '   4.1 Entry Point (main.py)',
    '   4.2 Configuration (config.py)',
    '   4.3 Database Connection (database.py)',
    '   4.4 Models (models.py)',
    '   4.5 Schemas (schemas.py)',
    '   4.6 Authentication (auth.py)',
    '   4.7 Rate Limiting (middleware.py)',
    '   4.8 WebSocket Notifications (websocket.py)',
    '   4.9 Email System (email.py)',
    '   4.10 OCR Invoice Scanner (ocr.py)',
    '   4.11 AI Product Matching (ai_matching.py)',
    '   4.12 POS Billing (sales.py)',
    '   4.13 Online Orders (orders.py)',
    '   4.14 Invoice Edit System',
    '   4.15 Dashboard Analytics (dashboard.py)',
    '   4.16 UPI QR Code (payments.py)',
    '   4.17 Coupons & Referrals',
    '   4.18 Support Tickets (support.py)',
    '5. Frontend Deep Dive',
    '   5.1 App.jsx Routing',
    '   5.2 ProtectedRoute Component',
    '   5.3 Auth Context',
    '   5.4 Notification Context (WebSocket)',
    '   5.5 Axios Configuration',
    '   5.6 API Endpoints',
    '6. Deployment Architecture',
    '7. Security Measures',
    '8. Interview Questions & Answers',
]
for item in toc:
    pdf.set_font('Helvetica', '', 11)
    pdf.set_text_color(55, 65, 81)
    pdf.cell(0, 7, item)
    pdf.ln(7)

# ============================================================
# PART 1: PROJECT OVERVIEW
# ============================================================
pdf.add_page()
pdf.section('1. Project Overview')
pdf.body('This is a full-stack web application built for a real family-owned grocery/provision store. It solves two problems:')
pdf.ln(2)
pdf.bold_body('Physical Store (POS):')
pdf.bullet('Staff use Point-of-Sale billing at the counter')
pdf.bullet('Track inventory, manage suppliers, record purchase bills')
pdf.bullet('AI-powered OCR scanner reads supplier invoices automatically')
pdf.ln(2)
pdf.bold_body('Online Store (E-commerce):')
pdf.bullet('Customers browse products, add to cart, place orders from their phone')
pdf.bullet('Payment via UPI (QR code) or Cash on Delivery')
pdf.bullet('Real-time order tracking, delivery status updates')
pdf.bullet('Refund system with anti-abuse protections')
pdf.ln(2)
pdf.bold_body('Admin Dashboard:')
pdf.bullet('Revenue analytics, sales trends, profit/loss reports')
pdf.bullet('Inventory alerts (low stock, expiry tracking)')
pdf.bullet('Staff management, customer management')
pdf.bullet('Real-time notifications via WebSocket')
pdf.ln(2)
pdf.bold_body('Who Uses It:')
pdf.bullet('Admin (owner): Full control over everything')
pdf.bullet('Staff (cashier): Billing, viewing products, handling orders')
pdf.bullet('Customer: Browse shop, place orders, track orders, get support')

# ============================================================
# PART 2: TECH STACK
# ============================================================
pdf.add_page()
pdf.section('2. Technology Stack')
pdf.body('Each technology was chosen for a specific reason:')
pdf.ln(2)

widths = [45, 75, 70]
pdf.table_row(['Technology', 'What It Does', 'Why Chosen'], widths, header=True)
rows = [
    ['Python 3.11', 'Backend language', 'Easy to read, fast to develop'],
    ['FastAPI', 'Web framework', 'Auto API docs, type validation, async'],
    ['SQLAlchemy', 'Database ORM', 'Python classes instead of SQL, prevents injection'],
    ['Pydantic', 'Request validation', 'Every endpoint validates incoming data'],
    ['MySQL (TiDB)', 'Database', 'Free serverless, relational data fits perfectly'],
    ['JWT tokens', 'Authentication', 'Stateless, each request carries its own proof'],
    ['bcrypt', 'Password hashing', 'One-way encryption, even DB theft cant reverse'],
    ['React 18', 'Frontend UI', 'Component-based, 30+ pages share common pieces'],
    ['Vite', 'Build tool', 'Instant hot-reload, optimized production bundles'],
    ['Tailwind CSS', 'Styling', 'Utility classes, build UI fast without CSS files'],
    ['Recharts', 'Charts', 'Dashboard graphs (sales, revenue, categories)'],
    ['WebSocket', 'Real-time', 'Instant admin notifications, no page refresh'],
    ['RapidOCR', 'Invoice scanning', 'Reads invoices without Tesseract installed'],
    ['Gmail SMTP', 'Email sending', 'Real email for verification, receipts, alerts'],
]
for row in rows:
    pdf.table_row(row, widths)

# ============================================================
# PART 3: ARCHITECTURE
# ============================================================
pdf.add_page()
pdf.section('3. Architecture')
pdf.body('The system follows a 3-tier architecture: Client -> Server -> Database')
pdf.ln(2)

pdf.section('3.1 Request Flow', 2)
pdf.code_block("""Client (React App)
    |
    | HTTPS + JWT Token
    v
FastAPI Backend
    |-- Middleware (CORS, Rate Limiting, JWT Auth)
    |-- Router Layer (22 routers, 121+ endpoints)
    |-- Service Layer (auth, models, schemas, utils)
    |
    | SQLAlchemy ORM
    v
MySQL Database (TiDB Cloud)
    |-- 20+ tables
    |-- Auto-created by create_all()
""")

pdf.section('3.2 Key Design Decisions', 2)
pdf.bullet('JWT in localStorage: Simple, works with Swagger UI for testing')
pdf.bullet('create_all() for tables: Portfolio project, no need for Alembic')
pdf.bullet('Role-based access via FastAPI deps: Clean, each route declares access')
pdf.bullet('MRP enforcement server-side: Can never be bypassed by frontend')
pdf.bullet('Stock decrement on order: Prevents overselling')
pdf.bullet('WebSocket for notifications: Instant alerts without polling')
pdf.bullet('with_for_update() on stock: Prevents concurrent overselling')

# ============================================================
# PART 4: BACKEND DEEP DIVE
# ============================================================
pdf.add_page()
pdf.section('4. Backend Deep Dive')

# 4.1
pdf.section('4.1 Entry Point (main.py)', 2)
pdf.body('When the server starts, main.py does 4 things:')
pdf.code_block("""# 1. Creates all database tables automatically
Base.metadata.create_all(bind=engine)

# 2. Creates the FastAPI app (also creates /docs Swagger UI)
app = FastAPI(title="E-commerce Management System API")

# 3. Adds CORS middleware (allows React frontend to call backend)
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins_list)

# 4. Registers all 22 routers
app.include_router(auth.router)        # /auth/*
app.include_router(products.router)    # /products/*
app.include_router(orders.router)      # /orders/*
# ... 18 more routers""")
pdf.interview_answer('"The entry point sets up CORS so the frontend can communicate, registers all 22 routers, and runs create_all() to ensure all database tables exist."')

# 4.2
pdf.section('4.2 Configuration (config.py)', 2)
pdf.body('Reads settings from .env file (development) or environment variables (production).')
pdf.code_block("""class Settings(BaseSettings):
    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    SECRET_KEY: str = "insecure_dev_secret"
    FRONTEND_ORIGIN: str = "http://localhost:5173"
    SMTP_HOST: Optional[str] = None  # If blank, prints emails to console
    
    @property
    def DATABASE_URL(self):
        # Works in 3 environments:
        # 1. Local: reads DB_HOST, DB_PORT from .env
        # 2. Render: reads DATABASE_URL env var
        # 3. Cloud: reads MYSQL_HOST, MYSQL_PORT env vars""")

# 4.3
pdf.section('4.3 Database Connection (database.py)', 2)
pdf.body('Creates the connection to MySQL and provides database sessions.')
pdf.code_block("""# pool_pre_ping: tests connections before using them
engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()     # Open connection
    try:
        yield db            # Give to route handler
    finally:
        db.close()          # Always close, even on error""")
pdf.body('Why yield? FastAPI dependency with yield runs cleanup after the route finishes. This guarantees the DB connection is always returned to the pool.')
pdf.interview_answer('"I use SQLAlchemy session-per-request pattern. Each API request gets its own database connection via a generator dependency. The finally block ensures connections are never leaked."')

# 4.4
pdf.add_page()
pdf.section('4.4 Models (models.py) - Database Tables', 2)
pdf.body('Each class = one database table. 20+ models total.')
pdf.ln(2)

pdf.section('User Model (Staff Accounts)', 3)
pdf.code_block("""class User(Base):
    __tablename__ = "users"
    user_id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True)    # Login name
    email = Column(String(100), unique=True)
    hashed_password = Column(String(255))          # bcrypt hash
    role = Column(Enum("admin", "cashier"))        # Two roles only
    is_active = Column(Boolean, default=True)      # Can be disabled""")

pdf.section('Product Model (Store Items)', 3)
pdf.code_block("""class Product(Base):
    __tablename__ = "products"
    product_id = Column(Integer, primary_key=True)
    name = Column(String(150))
    purchase_price = Column(Float)     # What store pays to supplier
    selling_price = Column(Float)      # What customer pays
    mrp = Column(Float)                # Maximum Retail Price (NEVER sell above)
    profit_margin_percent = Column(Float, default=15)
    gst_percent = Column(Float, default=5)
    stock_quantity = Column(Float)     # Current inventory
    reorder_level = Column(Float, default=10)  # Alert when stock < this
    # Relationships:
    category = relationship("Category")
    supplier = relationship("Supplier")
    images = relationship("ProductImage")""")

pdf.section('Order Model (Online Orders)', 3)
pdf.code_block("""class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True)
    order_uid = Column(String(4), unique=True)   # 4-digit random ID
    status = Column(String(30), default="placed")
    # Lifecycle: placed -> confirmed -> packed -> out_for_delivery -> delivered
    subtotal, discount, delivery_fee, grand_total = Column(Float)
    payment_method = Column(String(20))   # "cod" or "upi"
    payment_status = Column(String(20))   # "pending" or "paid"
    refund_status = Column(String(20))    # None, "pending", "completed"
    refund_amount = Column(Float)
    refund_utr = Column(String(30))       # UPI transaction reference""")

pdf.section('Sale Model (POS Invoices)', 3)
pdf.code_block("""class Sale(Base):
    __tablename__ = "sales"
    sale_id = Column(Integer, primary_key=True)
    customer_id = Column(Integer, nullable=True)  # Optional for walk-ins
    user_id = Column(Integer)  # Which staff made the sale
    subtotal, discount, gst_amount, grand_total = Column(Float)
    payment_method = Column(Enum("cash","card","upi","cod"))""")

pdf.section('Other Key Models', 3)
pdf.bullet('SaleItem: Individual line items in a POS sale (product, qty, price)')
pdf.bullet('InventoryLog: Audit trail of EVERY stock change (restock, sale, adjustment, return)')
pdf.bullet('OrderItem: Individual items in an online order')
pdf.bullet('Cart: Customer shopping cart items')
pdf.bullet('Coupon: Discount codes with usage limits')
pdf.bullet('Referral: Refer-a-friend program with loyalty points')
pdf.bullet('SupportTicket: Customer complaints with admin reply')
pdf.bullet('Notification: In-app notification feed (6 types)')
pdf.ln(2)
pdf.interview_answer('"I have 20+ models organized by domain. Every stock change is logged in InventoryLog for full audit trail. Relationships are defined with SQLAlchemy relationship() which enables efficient loading with joinedload()."')

# 4.5
pdf.add_page()
pdf.section('4.5 Schemas (Request/Response Validation)', 2)
pdf.body('Pydantic models validate every API request automatically.')
pdf.code_block("""# Naming convention:
# XxxCreate  - fields required to create (all required)
# XxxUpdate  - fields allowed when updating (all optional)
# XxxOut     - fields returned to client (never passwords!)

class OrderCreate(BaseModel):
    fulfillment: str = "delivery"
    delivery_address: Optional[str] = None
    payment_method: str = "cod"
    items: List[OrderItemCreate]

class OrderOut(BaseModel):
    id: int
    order_uid: Optional[str]
    status: str
    grand_total: float
    items: List[OrderItemOut]   # Nested items in response
    class Config:
        from_attributes = True  # Can read from SQLAlchemy model""")
pdf.interview_answer('"I use Pydantic models for type-safe validation. Each has Create (required fields), Update (all optional), and Out (response - never passwords). ConfigDict(from_attributes=True) allows reading directly from SQLAlchemy models."')

# 4.6
pdf.section('4.6 Authentication (auth.py)', 2)
pdf.section('Password Hashing', 3)
pdf.code_block("""pwd_context = CryptContext(schemes=["bcrypt"])

# Hash a password
hashed = pwd_context.hash("mypassword")
# Result: "$2b$12$EixZaYVK1fsbw1ZfbX3OXe..."

# Verify a password
pwd_context.verify("mypassword", hashed)  # True
pwd_context.verify("wrong", hashed)       # False""")

pdf.section('JWT Token Creation', 3)
pdf.code_block("""def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=120)
    to_encode.update({"exp": expire, "jti": secrets.token_hex(16)})
    return jwt.encode(to_encode, settings.SECRET, algorithm="HS256")
    # Token: {"sub": "srishanth", "type": "staff", 
    #         "role": "admin", "exp": 2hrs, "jti": "random_hex"}""")

pdf.section('Three Access Levels', 3)
pdf.code_block("""# Level 1: Any logged-in user (staff or customer)
def get_current_user(token, db):
    payload = decode_token(token)
    if token_type == "customer":
        return db.query(Customer).filter(...).first()
    return db.query(User).filter(...).first()

# Level 2: Staff only (admin or cashier)
def get_current_staff_user(token, db):
    user = get_current_user(token, db)
    if token_type != "staff":
        raise HTTPException(403, "Staff required")
    return user

# Level 3: Admin only
def require_admin(token, db):
    user = get_current_staff_user(token, db)
    if user.role != "admin":
        raise HTTPException(403, "Admin required")
    return user""")

pdf.section('Logout (Token Blacklisting)', 3)
pdf.code_block("""# On logout: save token's unique ID in blacklist table
def blacklist_token(payload, db):
    db.add(TokenBlacklist(jti=payload["jti"]))
    db.commit()

# On every request: check if token is blacklisted
def _is_blacklisted(jti, db):
    return db.query(TokenBlacklist).filter(TokenBlacklist.jti == jti).first()
""")
pdf.interview_answer('"Authentication uses bcrypt for password hashing and JWT for stateless tokens. Logout works by blacklisting the token unique ID in the database. Three access levels: get_current_user, get_current_staff_user, and require_admin - each route declares its own as a FastAPI dependency."')

# 4.7
pdf.add_page()
pdf.section('4.7 Rate Limiting (middleware.py)', 2)
pdf.code_block("""from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
# Each IP address is rate-limited independently

# Usage in auth routes:
@router.post("/login")
@limiter.limit("5/minute")   # Max 5 login attempts per minute per IP
def login(request, form_data, db):
    ...""")
pdf.interview_answer('"I use slowapi for rate limiting. Login is limited to 5 attempts per minute per IP to prevent brute-force attacks. Registration is limited to 3 per minute."')

# 4.8
pdf.section('4.8 WebSocket Notifications (websocket.py)', 2)
pdf.body('Real-time push notifications to all connected admin dashboards.')
pdf.code_block("""# All connected WebSocket clients
connected_clients: Set[WebSocket] = set()

# Async broadcast - sends to ALL connected clients
async def broadcast(message: dict):
    dead = set()
    for ws in connected_clients:
        try:
            await ws.send_json(message)
        except Exception:
            dead.add(ws)      # Client disconnected
    connected_clients -= dead

# Sync wrapper for regular route handlers
def broadcast_sync(message: dict):
    # FastAPI routes are sync, but WebSocket is async
    # Solution: asyncio.run_coroutine_threadsafe()
    if loop.is_running():
        asyncio.run_coroutine_threadsafe(broadcast(message), loop)

# WebSocket endpoint
@router.websocket("/ws/notifications")
async def notification_ws(websocket: WebSocket):
    await websocket.accept()
    connected_clients.add(websocket)
    while True:
        data = await websocket.receive_text()
        if data == "ping":
            await websocket.send_json({"type": "pong"})""")
pdf.interview_answer('"The WebSocket system maintains connected admin clients. When events occur, broadcast_sync() uses asyncio.run_coroutine_threadsafe() to bridge sync routes with async WebSocket. Frontend sends pings every 30 seconds to keep connections alive."')

# 4.9
pdf.section('4.9 Email System (email.py)', 2)
pdf.code_block("""def send_email(to_email, subject, body):
    if not settings.SMTP_HOST:
        # Dev mode: print to console instead of sending
        print(f"[DEV EMAIL] To: {to_email}\\n{body}")
        return False
    
    # Production: real Gmail SMTP
    with smtplib.SMTP("smtp.gmail.com", 587) as server:
        server.starttls(context)      # Encrypt connection
        server.login(user, password)  # Gmail app password
        server.send_message(msg)
    return True""")
pdf.body('Graceful degradation: If SMTP isnt configured (local dev), emails print to console. You can test the entire email flow without a real mail server.')

# 4.10
pdf.add_page()
pdf.section('4.10 OCR Invoice Scanner (ocr.py)', 2)
pdf.body('Reads supplier invoice images/PDFs and extracts structured data.')
pdf.code_block("""def extract_text(file_bytes, filename):
    if filename.endswith(".pdf"):
        return _extract_from_pdf(file_bytes)  # PDF -> images -> OCR
    return _extract_from_image(file_bytes)    # Image -> OCR directly

def _extract_from_pdf(file_bytes):
    doc = fitz.open(stream=file_bytes, filetype="pdf")  # PyMuPDF
    for page in doc:
        pix = page.get_pixmap(dpi=200)  # Render to image
        result, _ = engine(np.array(Image.open(...)))
        all_lines.extend(item[1] for item in result)
    return "\\n".join(all_lines)""")
pdf.body('The raw text is parsed with regex patterns handling 4 invoice formats:')
pdf.bullet('Pattern 1: "Product Name    10    120.00" (two+ spaces)')
pdf.bullet('Pattern 2: "Product Name 10 120.00" (single space)')
pdf.bullet('Pattern 3: Name, qty, price on separate lines')
pdf.bullet('Pattern 4: Table layout with numeric columns')

# 4.11
pdf.section('4.11 AI Product Matching (ai_matching.py)', 2)
pdf.code_block("""AUTO_MATCH_THRESHOLD = 0.90  # 90% = auto-match

def _similarity(a, b):
    # "Kinley 1L" vs "Kinley Water Bottle 1L"
    
    # Jaccard token similarity (55% weight)
    tokens_a = {"kinley", "1l"}
    tokens_b = {"kinley", "water", "bottle", "1l"}
    jaccard = 2/4 = 0.5
    
    # Subset bonus (0.25) - all tokens of shorter name in longer
    subset_bonus = 0.25
    
    # Sequence similarity (30% weight) - character-level fuzzy match
    seq_ratio = 0.65
    
    # Weighted blend
    score = (0.55 * 0.5) + (0.30 * 0.65) + 0.25 = 0.72
    # 0.72 < 0.90 -> admin must confirm""")
pdf.interview_answer('"Matching uses Jaccard token similarity (55%) and SequenceMatcher character similarity (30%), plus 25% bonus if all tokens of shorter name appear in longer. Above 90% auto-accepts; below that admin picks from suggestions."')

# 4.12
pdf.add_page()
pdf.section('4.12 POS Billing (sales.py) - Complete Flow', 2)
pdf.body('The most important flow in the system:')
pdf.code_block("""Staff clicks "Create Invoice"
    |
    v
POST /sales with items[]
    |
    v
Backend (sales.py:61-98):
  1. Every product exists? 
  2. Enough stock? (with_for_update() locks row)
  3. Price <= MRP?
  4. Calculate: subtotal -> discount -> GST -> grand_total
    |
    v
Backend creates records (sales.py:106-148):
  1. Sale record (invoice header)
  2. SaleItem records (line items)
  3. Stock decremented: Product 1: 50->48
  4. InventoryLog entries (audit trail)
  5. Loyalty points awarded (1 per 100 spent)
  6. Notification created
  7. WebSocket broadcast to admin dashboard
  8. Email receipt sent
    |
    v
All inside one db.commit() - ATOMIC TRANSACTION""")
pdf.ln(2)
pdf.bold_body('The with_for_update() trick:')
pdf.code_block("""# Row-level lock prevents concurrent overselling
product = db.query(Product).filter(...).with_for_update().first()
# Staff A: locks product, reads stock=1, decrements to 0
# Staff B: WAITS until Staff A commits
# After A commits: B reads stock=0 -> "Insufficient stock" error""")
pdf.interview_answer('"The billing system is wrapped in a single atomic transaction. It validates stock with row-level locking (with_for_update), creates the invoice, decrements stock, writes audit logs, awards loyalty points, and broadcasts a real-time notification. If any step fails, everything rolls back."')

# 4.13
pdf.section('4.13 Online Orders (orders.py) - Complete Flow', 2)
pdf.code_block("""Customer clicks "Place Order"
    |
    v
Anti-abuse checks:
  1. Customer not flagged? (is_flagged = False)
  2. Max 5 orders in last hour?
    |
    v
Validate each item:
  1. Product exists and is active?
  2. Stock >= requested quantity?
  3. Price <= MRP?
    |
    v
Apply coupon (if provided):
  - Check code exists, active, not expired
  - Check usage count < max_uses
  - Calculate discount
    |
    v
Calculate delivery fee:
  - Subtotal >= 500 -> Free
  - Subtotal >= 200 -> 20 rupees
  - Subtotal < 200  -> 40 rupees
    |
    v
Generate order:
  1. 4-digit unique order_uid (random 1000-9999)
  2. Create Order + OrderItem records
  3. Decrement stock + inventory logs
  4. Clear customer cart
  5. Award loyalty points
  6. Broadcast WebSocket notification""")

pdf.section('Cancellation Anti-Abuse', 3)
pdf.code_block("""# 1. Customer not flagged
if current_user.is_flagged: raise 403

# 2. Max 3 cancellations today
if cancelled_today >= 3: raise 429

# 3. Auto-flag at 5 total cancellations
if total_cancellations >= 5:
    current_user.is_flagged = True

# 4. 30-minute time limit for "placed" orders
if age_minutes > 30: raise 400

# Refund calculation
if order.status == "confirmed":
    refund = grand_total - (delivery_fee / 2)  # Half delivery deducted
else:
    refund = grand_total  # Full refund""")
pdf.interview_answer('"Online orders have comprehensive anti-abuse: flagged accounts blocked, max 5 orders/hour, max 3 cancellations/day, 30-minute cancel window, auto-flagging at 5 lifetime cancellations. Refund deducts half delivery fee if order was confirmed."')

# 4.14
pdf.add_page()
pdf.section('4.14 Invoice Edit System (sales.py:182-312)', 2)
pdf.body('7-step atomic edit process:')
pdf.code_block("""@router.put("/{sale_id}")  # Admin only
def update_sale(sale_id, payload, db):
    # Step 1: RESTORE stock for all old items
    for item in sale.items:
        product.stock_quantity += item.quantity
    
    # Step 2: REVERSE loyalty points
    customer.loyalty_points -= old_points
    
    # Step 3: DELETE old sale items
    sale.items.clear()  # Uses ORM cascade, not raw SQL
    
    # Step 4: VALIDATE new items (same checks as create)
    
    # Step 5: UPDATE sale header (discount, GST, total)
    
    # Step 6: CREATE new items + decrement stock
    
    # Step 7: RE-APPLY loyalty points""")
pdf.body('Why sale.items.clear() instead of raw SQL delete? The joinedload(Sale.items) query already loaded items into the session. SQLAlchemy raises a conflict error if you try to delete loaded items with a raw query. clear() properly uses ORM cascade.')

# 4.15
pdf.section('4.15 Dashboard Analytics (dashboard.py)', 2)
pdf.code_block("""# Summary combines both channels (POS + Online)
todays_sales = POS_sales + online_orders_today
monthly_revenue = POS_monthly + online_monthly

# Profit calculation
profit = SUM((SaleItem.unit_price - Product.purchase_price) * quantity)

# Sales trend - daily totals for last N days
# Even days with no sales return 0 (no gaps in chart)
result = [{"date": "2026-07-21", "total": 1500}, 
          {"date": "2026-07-22", "total": 0}, ...]""")
pdf.interview_answer('"The dashboard combines POS and online sales for unified reporting. Profit is calculated as selling_price minus purchase_price for every item sold. Sales trends fill in zeros for days with no sales to avoid gaps in charts."')

# 4.16
pdf.section('4.16 UPI QR Code (payments.py)', 2)
pdf.code_block("""@router.get("/upi-qr")
def upi_qr(amount):
    # Standard UPI URI format
    upi_uri = f"upi://pay?pa={UPI_ID}&pn={UPI_NAME}&am={amount}&cu=INR"
    
    # Generate QR code image
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(upi_uri)
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to base64 for frontend display
    return {"qr_image": f"data:image/png;base64,{b64}"}""")

# 4.17
pdf.section('4.17 Coupons & Referrals', 2)
pdf.bold_body('Coupons (coupons.py):')
pdf.bullet('Admin creates coupons with code, discount type (% or flat), min order, max uses')
pdf.bullet('Customer applies coupon at checkout -> validated server-side')
pdf.bullet('Discount calculated: percentage of subtotal or flat amount (capped at subtotal)')
pdf.bullet('Usage count incremented on each use')
pdf.ln(2)
pdf.bold_body('Referrals (referrals.py):')
pdf.bullet('Customer generates unique referral code')
pdf.bullet('Friend signs up with the code -> both get 50 loyalty points')
pdf.bullet('Self-referral prevention: cant use your own code')
pdf.bullet('Each code can only be used once')

# 4.18
pdf.add_page()
pdf.section('4.18 Support Tickets (support.py)', 2)
pdf.code_block("""# Public: anyone can submit (no login needed)
POST /support/tickets
  -> Creates ticket with name, email, subject, message
  -> Broadcasts WebSocket notification to admin

# Public: track ticket status
GET /support/track?ticket_id=123&email=user@example.com
  -> Returns ticket status + admin reply
  -> Email must match (prevents unauthorized access)

# Admin: list, reply, update status
GET /support/tickets               -> List all
PUT /support/tickets/{id}          -> Admin reply + status
PATCH /support/tickets/{id}/status -> Quick status toggle
DELETE /support/tickets/{id}       -> Delete ticket

# Status lifecycle: open -> in_progress -> resolved -> closed""")

# ============================================================
# PART 5: FRONTEND DEEP DIVE
# ============================================================
pdf.add_page()
pdf.section('5. Frontend Deep Dive')

pdf.section('5.1 App.jsx - Routing Architecture', 2)
pdf.body('Two separate areas in one React app:')
pdf.code_block("""Staff/Admin Area (requires staff login):
  /                    -> Dashboard (admin only)
  /billing             -> POS billing (staff)
  /products            -> Product management
  /admin/orders        -> Online orders (admin)
  /admin/staff         -> Staff management (admin only)
  /admin/support       -> Support tickets (admin)

Customer Storefront (mostly public):
  /home                -> Landing page (PUBLIC)
  /shop                -> Product browsing (PUBLIC)
  /shop/product/:id    -> Product detail (PUBLIC)
  /cart                -> Shopping cart (LOGIN REQUIRED)
  /checkout            -> Place order (LOGIN REQUIRED)
  /orders              -> Order history (LOGIN REQUIRED)
  /help                -> Support/help desk (PUBLIC)""")

pdf.section('5.2 ProtectedRoute Component', 2)
pdf.code_block("""export default function ProtectedRoute({ children, requiredType, requiredRole }) {
  const { isAuthenticated, loading, userType, role } = useAuth();
  
  if (loading) return <Loader />;
  
  // Not logged in? Redirect to correct login page
  if (!isAuthenticated) {
    const isStorefront = location.pathname.startsWith("/shop") || ...;
    const loginPath = isStorefront ? "/customer/login" : "/login";
    return <Navigate to={loginPath} state={{ from: location }} replace />;
    // "from: location" saves where they were going -> redirect after login
  }
  
  // Wrong user type? (customer trying admin pages)
  if (requiredType && userType !== requiredType)
    return <Navigate to="/login" replace />;
  
  // Wrong role? (cashier trying admin-only pages)
  if (requiredRole && role !== requiredRole)
    return <Navigate to="/billing" replace />;
  
  return children;  // All checks passed
}""")

pdf.section('5.3 Auth Context', 2)
pdf.code_block("""export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null);  // "staff" | "customer"
  
  // Restore session from localStorage on page load
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) setUser(JSON.parse(localStorage.getItem("user")));
  }, []);
  
  const login = async (username, password) => {
    const res = await loginRequest(username, password);
    localStorage.setItem("token", res.data.access_token);
    setUser(res.data.user);
  };
  
  const logout = async () => {
    try { await staffLogoutRequest(); } catch {} // Blacklist token on server
    localStorage.removeItem("token");
    setUser(null);
  };
}""")

pdf.section('5.4 Notification Context (WebSocket)', 2)
pdf.code_block("""// Connects when staff user logs in
useEffect(() => {
  if (userType !== "staff") return;
  
  const ws = new WebSocket("ws://localhost:8000/ws/notifications");
  
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === "notification") {
      // Show toast popup with colored icon
      toast.custom(<ToastComponent data={msg.data} />);
    }
  };
  
  ws.onclose = () => setTimeout(connect, 3000);  // Auto-reconnect
  
  // Heartbeat every 30s
  setInterval(() => ws.send("ping"), 30000);
}, [userType]);""")

pdf.section('5.5 Axios Configuration', 2)
pdf.code_block("""const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
});

// Every request gets JWT token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 401 response -> auto-logout and redirect
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
  }
);""")

# ============================================================
# PART 6: DEPLOYMENT
# ============================================================
pdf.add_page()
pdf.section('6. Deployment Architecture')
pdf.code_block("""Developer pushes to GitHub
        |
        v
+------------------------------------------+
| Vercel (Frontend)                        |
| 1. Pulls from GitHub                     |
| 2. npm install -> npm run build          |
| 3. Serves static files (HTML/CSS/JS)     |
| 4. URL: https://e-commerce-tau-ten-59... |
| 5. Env: VITE_API_URL -> Render backend   |
+------------------------------------------+
        | Customer loads React app
        | React makes API calls
        v
+------------------------------------------+
| Render (Backend)                         |
| 1. Pulls from GitHub                     |
| 2. Builds Docker image (Python 3.11)     |
| 3. pip install -r requirements.txt       |
| 4. uvicorn app.main:app                  |
| 5. URL: https://e-commerce-xlpl.onrender |
| 6. Env: DATABASE_URL -> TiDB Cloud       |
+------------------------------------------+
        | SQLAlchemy connects
        v
+------------------------------------------+
| TiDB Cloud (Database)                    |
| Free serverless MySQL                    |
| Tables auto-created by create_all()      |
+------------------------------------------+""")

pdf.section('How Deployment Works', 2)
pdf.bullet('Frontend: Vercel pulls GitHub -> npm run build -> serves static React app')
pdf.bullet('Backend: Render pulls GitHub -> Docker build -> installs Python deps -> runs uvicorn')
pdf.bullet('Database: TiDB Cloud provides free serverless MySQL')
pdf.bullet('Connection: Frontend calls backend URL via VITE_API_URL env var')
pdf.bullet('CORS: Backend allows requests from Vercel URL via FRONTEND_ORIGIN env var')

# ============================================================
# PART 7: SECURITY
# ============================================================
pdf.add_page()
pdf.section('7. Security Measures')
pdf.ln(2)

widths2 = [40, 75, 75]
pdf.table_row(['Threat', 'Protection', 'Code Location'], widths2, header=True)
rows2 = [
    ['Password theft', 'bcrypt hashing (never plain text)', 'auth.py:39-46'],
    ['Session hijack', 'JWT with 2-hour expiry', 'auth.py:59-65'],
    ['Force logout', 'Token blacklisting', 'auth.py:81-106'],
    ['Brute force', 'Rate limiting (5/minute)', 'auth.py:74'],
    ['SQL injection', 'SQLAlchemy ORM (parameterized)', 'Everywhere'],
    ['XSS attacks', 'React escapes HTML by default', 'Frontend'],
    ['CORS attacks', 'Only whitelisted origins', 'config.py:103-108'],
    ['Overcharging', 'MRP enforcement (server-side)', 'orders.py:79'],
    ['Overselling', 'Row-level locking', 'sales.py:77'],
    ['Order abuse', 'Rate limits + auto-flagging', 'orders.py:49-65'],
    ['Account enum', 'Same response for all emails', 'auth.py:246-265'],
]
for row in rows2:
    pdf.table_row(row, widths2)

# ============================================================
# PART 8: INTERVIEW Q&A
# ============================================================
pdf.add_page()
pdf.section('8. Interview Questions & Answers')

pdf.section('Q1: Walk me through what happens when a customer places an order.', 2)
pdf.interview_answer('"Customer browses /shop, adds items to cart via POST /storefront/cart. At checkout, address auto-detected via geolocation (OpenStreetMap). Chooses COD or UPI, optionally applies coupon. On Place Order, frontend sends POST /orders with JWT. Backend validates anti-abuse rules (max 5 orders/hour, not flagged), checks stock with row-level locking, calculates delivery fee (below 200->40, 200-499->20, 500+->Free), generates unique 4-digit order_uid, creates Order+OrderItem records, decrements stock with inventory logging, clears cart, awards loyalty points, broadcasts WebSocket notification. All in one atomic database transaction."')

pdf.section('Q2: How do you handle concurrent requests for the same product stock?', 2)
pdf.interview_answer('"I use SQLAlchemy with_for_update() which acquires a MySQL row-level lock. When two requests try to sell the same last item, the second blocks until the first commits. Then it reads updated stock (now 0) and fails with Insufficient stock. This is pessimistic locking - we prevent the problem rather than detecting it after."')

pdf.section('Q3: How does the OCR invoice scanner work?', 2)
pdf.interview_answer('"Staff uploads supplier invoice PDF or image. Backend uses RapidOCR (ONNX Runtime) to extract text - for PDFs, PyMuPDF renders pages to 200 DPI images first. Raw text parsed with multiple regex patterns handling single-line, multi-line, and table formats. Product names matched against catalog using Jaccard token similarity (55%) + SequenceMatcher character similarity (30%) + subset bonus (25%). Above 90% auto-accepts, below admin picks from suggestions. Unmatched items create new products automatically."')

pdf.section('Q4: Explain the real-time notification system.', 2)
pdf.interview_answer('"Frontend opens WebSocket to /ws/notifications. Server stores connected clients in a set. When events occur, route handler creates Notification record and calls broadcast_sync(). This bridges sync-async gap using asyncio.run_coroutine_threadsafe(). broadcast() sends JSON to all connected clients. Frontend shows toast popups with colored icons. Heartbeat ping/pong every 30s keeps connections alive."')

pdf.section('Q5: How does authentication and authorization work?', 2)
pdf.interview_answer('"Login: user submits credentials, backend verifies bcrypt hash, creates JWT with user_id + role + expiry. Frontend stores in localStorage, sends in Authorization header on every request. Three access levels as FastAPI dependencies: get_current_user (any), get_current_staff_user (staff), require_admin (admin only). Logout blacklists the token unique ID so it cant be reused before expiry."')

pdf.section('Q6: How does the billing system ensure data consistency?', 2)
pdf.interview_answer('"The entire billing operation is in one SQLAlchemy session with a single db.commit(). It uses with_for_update() for row-level locks on products. Stock is validated and decremented, inventory logs written, loyalty points awarded - all atomically. If any step fails, the session rolls back. No partial data is ever saved."')

pdf.section('Q7: What is MRP enforcement and why is it important?', 2)
pdf.interview_answer('"Products have an MRP (Maximum Retail Price) field. The selling price is calculated from purchase_price + margin percentage but can NEVER exceed MRP. This is enforced server-side in both orders.py and sales.py. Even if someone bypasses the frontend, the API rejects prices above MRP. This prevents accidental overcharging and ensures legal compliance."')

pdf.section('Q8: How do you prevent order abuse?', 2)
pdf.interview_answer('"Multiple layers: (1) Rate limiting on all API endpoints via slowapi. (2) Max 5 orders per hour per customer. (3) Max 3 cancellations per day. (4) 30-minute cancel window for placed orders. (5) Auto-flagging customers with 5+ lifetime cancellations. (6) Flagged accounts are completely blocked from placing orders. (7) COD cancellations have no refund form since no online payment was made."')

pdf.section('Q9: What would you improve for production?', 2)
pdf.interview_answer('"1) Alembic for database migrations. 2) Redis for caching and rate limiting. 3) Celery for background tasks (email, reports, expiry checks). 4) pytest test suite. 5) Docker Compose for local dev. 6) Nginx reverse proxy with SSL. 7) Structured logging with correlation IDs. 8) API versioning. 9) Image CDN for product photos. 10) Prometheus + Grafana monitoring."')

pdf.section('Q10: Why did you choose FastAPI over Django/Flask?', 2)
pdf.interview_answer('"FastAPI gives automatic API documentation at /docs, uses Python type hints for request validation via Pydantic, and has native async support. For a project with 121+ API endpoints, auto-generated docs save significant development time. The dependency injection system (Depends) makes authentication and database session management clean and reusable."')

# Save PDF
output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'Ecommerce_Project_Guide.pdf')
pdf.output(output_path)
print(f"PDF generated: {os.path.abspath(output_path)}")

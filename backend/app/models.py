"""
models.py
---------
SQLAlchemy ORM models for the full Smart Provision Store system.
See sql/schema.sql for the raw SQL equivalent.
"""

from datetime import datetime

from sqlalchemy import (
    Column, Integer, String, Float, ForeignKey, DateTime, Date, Text, Enum, Boolean, JSON
)
from sqlalchemy.orm import relationship

from app.database import Base


# ===========================================================================
# MODULE 1 - AUTH
# ===========================================================================
class User(Base):
    """Store staff / admin accounts that can log in to the system."""
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum("admin", "cashier", name="user_role"), default="cashier")
    is_active = Column(Boolean, nullable=False, default=True)

    is_verified = Column(Boolean, nullable=False, default=False)
    verification_token = Column(String(255), nullable=True)
    verification_token_expires = Column(DateTime, nullable=True)
    reset_token = Column(String(255), nullable=True)
    reset_token_expires = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)


class TokenBlacklist(Base):
    """Revoked JWTs (by jti) - makes server-side logout actually work."""
    __tablename__ = "token_blacklist"

    id = Column(Integer, primary_key=True, index=True)
    jti = Column(String(64), unique=True, nullable=False, index=True)
    blacklisted_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)


# ===========================================================================
# MODULE 2 - PRODUCTS (+ Brand, ProductImage)
# ===========================================================================
class Category(Base):
    __tablename__ = "categories"

    category_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    products = relationship("Product", back_populates="category")


class Brand(Base):
    __tablename__ = "brands"

    brand_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    products = relationship("Product", back_populates="brand")


class Product(Base):
    """Items sold in the store."""
    __tablename__ = "products"

    product_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("categories.category_id"), nullable=True)
    brand_id = Column(Integer, ForeignKey("brands.brand_id"), nullable=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.supplier_id"), nullable=True)

    barcode = Column(String(64), unique=True, nullable=True, index=True)
    batch_number = Column(String(64), nullable=True)
    expiry_date = Column(Date, nullable=True)

    purchase_price = Column(Float, nullable=False, default=0)
    selling_price = Column(Float, nullable=False, default=0)
    mrp = Column(Float, nullable=True)
    profit_margin_percent = Column(Float, nullable=False, default=15)
    gst_percent = Column(Float, nullable=False, default=5)
    discount_percent = Column(Float, nullable=False, default=0)

    stock_quantity = Column(Float, nullable=False, default=0)
    reorder_level = Column(Float, nullable=False, default=10)  # a.k.a. "minimum stock"
    max_stock = Column(Float, nullable=True)

    unit = Column(String(20), nullable=False, default="pcs")
    preset_quantities = Column(Text, nullable=True)  # JSON: "250g,500g,1kg,2kg"
    image_url = Column(String(255), nullable=True)  # primary/cover image
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    category = relationship("Category", back_populates="products")
    brand = relationship("Brand", back_populates="products")
    supplier = relationship("Supplier", back_populates="products")
    images = relationship("ProductImage", back_populates="product", cascade="all, delete-orphan")
    sale_items = relationship("SaleItem", back_populates="product")
    inventory_logs = relationship("InventoryLog", back_populates="product")
    reviews = relationship("ProductReview", back_populates="product", cascade="all, delete-orphan")


class ProductImage(Base):
    """Extra product photos beyond the primary Product.image_url."""
    __tablename__ = "product_images"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.product_id"), nullable=False)
    image_url = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    product = relationship("Product", back_populates="images")


# ===========================================================================
# MODULE 3 - CUSTOMER (self-service, wishlist, cart, addresses, reviews)
# ===========================================================================
class Customer(Base):
    __tablename__ = "customers"

    customer_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    phone = Column(String(20), unique=True, nullable=True)
    email = Column(String(100), unique=True, nullable=True)
    address = Column(Text, nullable=True)
    loyalty_points = Column(Integer, default=0)

    hashed_password = Column(String(255), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    is_flagged = Column(Boolean, nullable=False, default=False)
    flag_reason = Column(String(255), nullable=True)
    is_verified = Column(Boolean, nullable=False, default=False)
    verification_token = Column(String(255), nullable=True)
    verification_token_expires = Column(DateTime, nullable=True)
    reset_token = Column(String(255), nullable=True)
    reset_token_expires = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    sales = relationship("Sale", back_populates="customer")
    addresses = relationship("CustomerAddress", back_populates="customer", cascade="all, delete-orphan")
    wishlist_items = relationship("WishlistItem", back_populates="customer", cascade="all, delete-orphan")
    cart_items = relationship("CartItem", back_populates="customer", cascade="all, delete-orphan")
    reviews = relationship("ProductReview", back_populates="customer", cascade="all, delete-orphan")


class CustomerAddress(Base):
    __tablename__ = "customer_addresses"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.customer_id"), nullable=False)
    label = Column(String(50), default="Home")  # Home, Work, Other
    line1 = Column(String(255), nullable=False)
    line2 = Column(String(255), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    pincode = Column(String(20), nullable=True)
    is_default = Column(Boolean, default=False)

    customer = relationship("Customer", back_populates="addresses")


class WishlistItem(Base):
    __tablename__ = "wishlist_items"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.customer_id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.product_id"), nullable=False)
    added_at = Column(DateTime, default=datetime.utcnow)

    customer = relationship("Customer", back_populates="wishlist_items")
    product = relationship("Product")


class CartItem(Base):
    __tablename__ = "cart_items"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.customer_id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.product_id"), nullable=False)
    quantity = Column(Float, nullable=False, default=1)
    added_at = Column(DateTime, default=datetime.utcnow)

    customer = relationship("Customer", back_populates="cart_items")
    product = relationship("Product")


class ProductReview(Base):
    __tablename__ = "product_reviews"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.product_id"), nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.customer_id"), nullable=False)
    rating = Column(Integer, nullable=False)  # 1-5
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    product = relationship("Product", back_populates="reviews")
    customer = relationship("Customer", back_populates="reviews")


# ===========================================================================
# MODULE 4 - SUPPLIERS (+ purchase history)
# ===========================================================================
class Supplier(Base):
    __tablename__ = "suppliers"

    supplier_id = Column(Integer, primary_key=True, index=True)
    supplier_name = Column(String(150), nullable=False)
    contact_person = Column(String(100), nullable=True)
    phone = Column(String(20), nullable=True)
    email = Column(String(100), nullable=True)
    address = Column(Text, nullable=True)
    gst_number = Column(String(30), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    products = relationship("Product", back_populates="supplier")
    purchase_bills = relationship("PurchaseBill", back_populates="supplier")


# ===========================================================================
# MODULE 5/6 - PURCHASE BILLS (manual restock + AI invoice-scanned restock)
# ===========================================================================
class PurchaseBill(Base):
    """
    One supplier purchase / restock event - created either manually by an
    admin, or automatically by the AI invoice scanner (Module 5).
    """
    __tablename__ = "purchase_bills"

    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.supplier_id"), nullable=True)
    invoice_number = Column(String(100), nullable=True)
    invoice_date = Column(Date, nullable=True)
    gst_number = Column(String(30), nullable=True)
    source = Column(Enum("manual", "ocr", name="purchase_bill_source"), default="manual")
    raw_ocr_text = Column(Text, nullable=True)  # full extracted text, for auditing/debugging
    total_amount = Column(Float, nullable=False, default=0)
    created_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    supplier = relationship("Supplier", back_populates="purchase_bills")
    items = relationship("PurchaseBillItem", back_populates="bill", cascade="all, delete-orphan")


class PurchaseBillItem(Base):
    __tablename__ = "purchase_bill_items"

    id = Column(Integer, primary_key=True, index=True)
    bill_id = Column(Integer, ForeignKey("purchase_bills.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.product_id"), nullable=True)
    matched_name = Column(String(150), nullable=True)  # product name as read from the invoice
    quantity = Column(Float, nullable=False, default=0)
    purchase_price = Column(Float, nullable=False, default=0)
    selling_price = Column(Float, nullable=True)
    discount_percent = Column(Float, nullable=True, default=0)
    gst_percent = Column(Float, nullable=True, default=5)
    expiry_date = Column(Date, nullable=True)
    batch_number = Column(String(64), nullable=True)
    match_confidence = Column(Float, nullable=True)  # 0-1, from AI product matching (Module 6)
    is_new_product = Column(Boolean, default=False)

    bill = relationship("PurchaseBill", back_populates="items")
    product = relationship("Product")


# ===========================================================================
# MODULE 10/11 - SALES / BILLING
# ===========================================================================
class Sale(Base):
    """One row per POS transaction (the invoice header)."""
    __tablename__ = "sales"

    sale_id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.customer_id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    subtotal = Column(Float, nullable=False, default=0)
    discount = Column(Float, nullable=False, default=0)
    gst_amount = Column(Float, nullable=False, default=0)
    grand_total = Column(Float, nullable=False, default=0)
    payment_method = Column(
        Enum("cash", "card", "upi", "razorpay", "cod", name="payment_method"), default="cash"
    )
    payment_status = Column(
        Enum("pending", "paid", "failed", name="payment_status"), default="paid"
    )
    razorpay_order_id = Column(String(100), nullable=True)
    razorpay_payment_id = Column(String(100), nullable=True)
    sale_date = Column(DateTime, default=datetime.utcnow)

    customer = relationship("Customer", back_populates="sales")
    cashier = relationship("User")
    items = relationship("SaleItem", back_populates="sale", cascade="all, delete-orphan")


class SaleItem(Base):
    """Line items belonging to a sale (the invoice body)."""
    __tablename__ = "sale_items"

    sale_item_id = Column(Integer, primary_key=True, index=True)
    sale_id = Column(Integer, ForeignKey("sales.sale_id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.product_id"), nullable=False)
    quantity = Column(Float, nullable=False)
    unit_price = Column(Float, nullable=False)
    total_price = Column(Float, nullable=False)

    sale = relationship("Sale", back_populates="items")
    product = relationship("Product", back_populates="sale_items")


# ===========================================================================
# MODULE 7/8/9 - INVENTORY, LOW STOCK, EXPIRY
# ===========================================================================
class InventoryLog(Base):
    """Audit trail of every stock change (sale, restock, manual adjustment, return)."""
    __tablename__ = "inventory_logs"

    log_id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.product_id"), nullable=False)
    change_type = Column(
        Enum("restock", "sale", "adjustment", "return", name="inventory_change_type"),
        nullable=False,
    )
    quantity_change = Column(Float, nullable=False)  # positive = added, negative = removed
    stock_after = Column(Float, nullable=False)
    note = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    product = relationship("Product", back_populates="inventory_logs")


# ===========================================================================
# MODULE 19 - NOTIFICATIONS
# ===========================================================================
class Notification(Base):
    """
    In-app notification feed (shown as the dashboard bell icon).
    Emails for the same events are sent separately via utils/email.py.
    """
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(
        Enum(
            "low_stock", "purchase_success", "order_success", "invoice_uploaded",
            "expiry_alert", "system", name="notification_type",
        ),
        nullable=False,
    )
    title = Column(String(150), nullable=False)
    message = Column(String(500), nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


# ===========================================================================
# MODULE 13 - AI CHATBOT (conversation log, optional but useful for debugging)
# ===========================================================================
class ChatLog(Base):
    __tablename__ = "chat_logs"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(64), nullable=False, index=True)
    role = Column(Enum("user", "assistant", name="chat_role"), nullable=False)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    order_uid = Column(String(4), unique=True, index=True, nullable=True)
    customer_id = Column(Integer, ForeignKey("customers.customer_id"), nullable=False)
    status = Column(String(30), default="placed", nullable=False)
    fulfillment = Column(String(20), default="delivery", nullable=False)
    subtotal = Column(Float, default=0)
    discount = Column(Float, default=0)
    delivery_fee = Column(Float, default=0)
    grand_total = Column(Float, default=0)
    payment_method = Column(String(20), default="cod")
    payment_status = Column(String(20), default="pending")
    delivery_address = Column(Text, nullable=True)
    phone = Column(String(20), nullable=True)
    notes = Column(Text, nullable=True)
    estimated_minutes = Column(Integer, default=15)
    utr_number = Column(String(30), nullable=True)
    refund_status = Column(String(20), default=None, nullable=True)
    refund_amount = Column(Float, default=None, nullable=True)
    refund_utr = Column(String(30), nullable=True)
    refund_details = Column(Text, nullable=True)
    refund_date = Column(DateTime, default=None, nullable=True)
    whatsapp_sent = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    customer = relationship("Customer", backref="orders")

    @property
    def customer_name(self):
        return self.customer.name if self.customer else None

class OrderItem(Base):
    __tablename__ = "order_items"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.product_id"), nullable=False)
    product_name = Column(String(150), nullable=False)
    quantity = Column(Float, default=1)
    unit_price = Column(Float, default=0)
    total_price = Column(Float, default=0)
    order = relationship("Order", back_populates="items")
    product = relationship("Product")

class Coupon(Base):
    __tablename__ = "coupons"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(String(255))
    discount_type = Column(String(20), default="percentage")
    discount_value = Column(Float, nullable=False)
    min_order = Column(Float, default=0)
    max_uses = Column(Integer, default=100)
    used_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Referral(Base):
    __tablename__ = "referrals"
    id = Column(Integer, primary_key=True, index=True)
    referrer_id = Column(Integer, ForeignKey("customers.customer_id"), nullable=False)
    referred_id = Column(Integer, ForeignKey("customers.customer_id"), nullable=True)
    referral_code = Column(String(20), unique=True, nullable=False, index=True)
    reward_points = Column(Integer, default=50)
    is_claimed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    referrer = relationship("Customer", foreign_keys=[referrer_id])
    referred = relationship("Customer", foreign_keys=[referred_id])

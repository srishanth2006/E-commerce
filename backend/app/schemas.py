"""
schemas.py
----------
Pydantic models used for request validation and response serialization.
Naming convention:
    XxxCreate  -> fields required to create a new record
    XxxUpdate  -> fields allowed when updating (all optional)
    XxxOut     -> fields returned to the client
"""

from datetime import datetime, date
from typing import Optional, List, Literal

from pydantic import BaseModel, EmailStr, ConfigDict, Field


# ===========================================================================
# MODULE 1 - AUTH
# ===========================================================================
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: Literal["admin", "cashier"] = "cashier"


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    user_id: int
    username: str
    email: EmailStr
    role: str
    is_active: bool
    is_verified: bool
    created_at: datetime


class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    role: Optional[Literal["admin", "cashier"]] = None
    is_active: Optional[bool] = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_type: Literal["staff", "customer"] = "staff"
    user: dict


class CustomerRegister(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    password: str
    address: Optional[str] = None


class CustomerLogin(BaseModel):
    email: EmailStr
    password: str

class GoogleLoginRequest(BaseModel):
    credential: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr
    account_type: Literal["staff", "customer"] = "customer"


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
    account_type: Literal["staff", "customer"] = "customer"


class VerifyEmailRequest(BaseModel):
    token: str
    account_type: Literal["staff", "customer"] = "customer"


class ResendVerificationRequest(BaseModel):
    email: EmailStr
    account_type: Literal["staff", "customer"] = "customer"


class MessageResponse(BaseModel):
    message: str
    dev_token: Optional[str] = None


# ===========================================================================
# CATEGORY / BRAND
# ===========================================================================
class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class CategoryOut(CategoryBase):
    model_config = ConfigDict(from_attributes=True)
    category_id: int
    created_at: datetime


class BrandBase(BaseModel):
    name: str


class BrandCreate(BrandBase):
    pass


class BrandOut(BrandBase):
    model_config = ConfigDict(from_attributes=True)
    brand_id: int
    created_at: datetime


# ===========================================================================
# MODULE 2 - PRODUCT
# ===========================================================================
class ProductImageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    image_url: str


class ProductBase(BaseModel):
    name: str
    category_id: Optional[int] = None
    brand_id: Optional[int] = None
    supplier_id: Optional[int] = None
    barcode: Optional[str] = None
    batch_number: Optional[str] = None
    expiry_date: Optional[date] = None
    purchase_price: float = 0
    selling_price: float = 0
    mrp: Optional[float] = None
    profit_margin_percent: float = 15
    gst_percent: float = 5
    discount_percent: float = 0
    stock_quantity: float = 0
    reorder_level: float = 10  # a.k.a minimum stock
    max_stock: Optional[float] = None
    unit: str = "pcs"
    preset_quantities: Optional[str] = None  # "250g,500g,1kg,2kg"
    image_url: Optional[str] = None
    is_active: bool = True


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category_id: Optional[int] = None
    brand_id: Optional[int] = None
    supplier_id: Optional[int] = None
    barcode: Optional[str] = None
    batch_number: Optional[str] = None
    expiry_date: Optional[date] = None
    purchase_price: Optional[float] = None
    selling_price: Optional[float] = None
    mrp: Optional[float] = None
    profit_margin_percent: Optional[float] = None
    gst_percent: Optional[float] = None
    discount_percent: Optional[float] = None
    stock_quantity: Optional[float] = None
    reorder_level: Optional[float] = None
    max_stock: Optional[float] = None
    unit: Optional[str] = None
    preset_quantities: Optional[str] = None
    image_url: Optional[str] = None
    is_active: Optional[bool] = None


class ProductOut(ProductBase):
    model_config = ConfigDict(from_attributes=True)
    product_id: int
    created_at: datetime
    category: Optional[CategoryOut] = None
    brand: Optional[BrandOut] = None
    images: List[ProductImageOut] = []


# ===========================================================================
# MODULE 3 - CUSTOMER (self-service, addresses, wishlist, cart, reviews)
# ===========================================================================
class CustomerBase(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    loyalty_points: int = 0


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    loyalty_points: Optional[int] = None


class CustomerOut(CustomerBase):
    model_config = ConfigDict(from_attributes=True)
    customer_id: int
    is_active: bool = True
    is_verified: bool = False
    created_at: datetime


class CustomerAddressBase(BaseModel):
    label: str = "Home"
    line1: str
    line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    is_default: bool = False


class CustomerAddressCreate(CustomerAddressBase):
    pass


class CustomerAddressOut(CustomerAddressBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


class WishlistItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    product_id: int
    added_at: datetime
    product: Optional[ProductOut] = None


class CartItemBase(BaseModel):
    product_id: int
    quantity: float = 1


class CartItemCreate(CartItemBase):
    pass


class CartItemUpdate(BaseModel):
    quantity: float


class CartItemOut(CartItemBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    added_at: datetime
    product: Optional[ProductOut] = None


class ProductReviewCreate(BaseModel):
    product_id: int
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = None


class ProductReviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    product_id: int
    customer_id: int
    rating: int
    comment: Optional[str] = None
    created_at: datetime
    customer: Optional[CustomerOut] = None


# ===========================================================================
# MODULE 4 - SUPPLIER
# ===========================================================================
class SupplierBase(BaseModel):
    supplier_name: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    gst_number: Optional[str] = None


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(BaseModel):
    supplier_name: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    gst_number: Optional[str] = None


class SupplierOut(SupplierBase):
    model_config = ConfigDict(from_attributes=True)
    supplier_id: int
    created_at: datetime


# ===========================================================================
# MODULE 5/6 - PURCHASE BILLS (manual + AI/OCR invoice scanning)
# ===========================================================================
class PurchaseBillItemIn(BaseModel):
    """One line item as reviewed/edited by the admin before final commit."""
    product_id: Optional[int] = None  # set if matched to an existing product
    matched_name: str
    quantity: float
    purchase_price: float
    selling_price: Optional[float] = None
    discount_percent: Optional[float] = 0
    gst_percent: Optional[float] = 5
    expiry_date: Optional[date] = None
    batch_number: Optional[str] = None
    is_new_product: bool = False
    category_id: Optional[int] = None  # used only when is_new_product=True
    unit: Optional[str] = "pcs"


class PurchaseBillItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    product_id: Optional[int] = None
    matched_name: Optional[str] = None
    quantity: float
    purchase_price: float
    selling_price: Optional[float] = None
    discount_percent: Optional[float] = None
    gst_percent: Optional[float] = None
    expiry_date: Optional[date] = None
    batch_number: Optional[str] = None
    match_confidence: Optional[float] = None
    is_new_product: bool = False
    product: Optional[ProductOut] = None


class PurchaseBillCreate(BaseModel):
    """Used for the FINAL commit step, after the admin has reviewed the
    OCR-extracted (or manually entered) line items."""
    supplier_id: Optional[int] = None
    invoice_number: Optional[str] = None
    invoice_date: Optional[date] = None
    gst_number: Optional[str] = None
    source: Literal["manual", "ocr"] = "manual"
    raw_ocr_text: Optional[str] = None
    profit_margin_percent: Optional[float] = None  # e.g. 20 -> auto-calc selling_price
    items: List[PurchaseBillItemIn]


class PurchaseBillOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    supplier_id: Optional[int] = None
    invoice_number: Optional[str] = None
    invoice_date: Optional[date] = None
    gst_number: Optional[str] = None
    source: str
    total_amount: float
    created_at: datetime
    items: List[PurchaseBillItemOut] = []
    supplier: Optional[SupplierOut] = None


# ---- OCR scan result (BEFORE the admin reviews/commits it) ----
class OCRExtractedItem(BaseModel):
    matched_name: str
    quantity: float
    purchase_price: float
    suggested_selling_price: Optional[float] = None
    expiry_date: Optional[date] = None
    batch_number: Optional[str] = None
    # AI product matching result (Module 6)
    matched_product_id: Optional[int] = None
    matched_product_name: Optional[str] = None
    match_confidence: float = 0  # 0-1
    is_new_product: bool = True


class OCRScanResult(BaseModel):
    supplier_name: Optional[str] = None
    matched_supplier_id: Optional[int] = None
    invoice_number: Optional[str] = None
    invoice_date: Optional[date] = None
    gst_number: Optional[str] = None
    items: List[OCRExtractedItem]
    raw_text: str
    warnings: List[str] = []


# ===========================================================================
# SALES / BILLING (Module 10/11/16)
# ===========================================================================
class SaleItemCreate(BaseModel):
    product_id: int
    quantity: float
    unit_price: float


class SaleItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    sale_item_id: int
    product_id: int
    quantity: float
    unit_price: float
    total_price: float
    product: Optional[ProductOut] = None


class SaleCreate(BaseModel):
    customer_id: Optional[int] = None
    discount: float = 0
    payment_method: Literal["cash", "card", "upi", "razorpay"] = "cash"
    gst_percent: float = 5.0
    items: List[SaleItemCreate]
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None


class SaleUpdate(BaseModel):
    customer_id: Optional[int] = None
    discount: float = 0
    payment_method: str = "cash"
    gst_percent: float = 5.0
    items: List[SaleItemCreate]


class SaleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    sale_id: int
    customer_id: Optional[int] = None
    user_id: Optional[int] = None
    subtotal: float
    discount: float
    gst_amount: float
    grand_total: float
    payment_method: str
    payment_status: str
    sale_date: datetime
    items: List[SaleItemOut] = []
    customer: Optional[CustomerOut] = None


# ---- Razorpay (Module 16) ----
class RazorpayOrderCreate(BaseModel):
    amount: float  # in rupees; converted to paise before calling Razorpay


class RazorpayOrderOut(BaseModel):
    order_id: str
    amount: int  # paise
    currency: str = "INR"
    key_id: str


# ===========================================================================
# INVENTORY (Module 7/8/9)
# ===========================================================================
class InventoryLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    log_id: int
    product_id: int
    change_type: str
    quantity_change: float
    stock_after: float
    note: Optional[str] = None
    created_at: datetime
    product: Optional[ProductOut] = None


class StockUpdate(BaseModel):
    quantity_change: float
    change_type: Literal["restock", "adjustment", "return"] = "restock"
    note: Optional[str] = None


# ===========================================================================
# MODULE 12 - AI SALES FORECASTING
# ===========================================================================
class ForecastPoint(BaseModel):
    date: str
    predicted_units: float


class ProductForecastOut(BaseModel):
    product_id: int
    product_name: str
    avg_daily_sales: float
    current_stock: float
    days_until_stockout: Optional[float] = None
    reorder_recommendation: str
    next_7_days: List[ForecastPoint] = []


# ===========================================================================
# MODULE 13 - AI CHATBOT
# ===========================================================================
class ChatRequest(BaseModel):
    session_id: str
    message: str
    role_context: Literal["customer", "staff"] = "customer"


class ChatResponse(BaseModel):
    reply: str
    data: Optional[dict] = None


# ===========================================================================
# MODULE 19 - NOTIFICATIONS
# ===========================================================================
class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    type: str
    title: str
    message: Optional[str] = None
    is_read: bool
    created_at: datetime


# ===========================================================================
# DASHBOARD
# ===========================================================================
class DashboardSummary(BaseModel):
    total_products: int
    low_stock_items: int
    out_of_stock_items: int
    expired_items: int
    near_expiry_items: int
    todays_sales: float
    monthly_revenue: float
    total_customers: int
    total_orders: int
    profit_this_month: float


# --- Order Schemas ---
class OrderItemCreate(BaseModel):
    product_id: int
    product_name: str
    quantity: float
    unit_price: float

class OrderItemOut(BaseModel):
    id: int
    product_id: int
    product_name: str
    quantity: float
    unit_price: float
    total_price: float
    class Config:
        from_attributes = True

class OrderCreate(BaseModel):
    fulfillment: str = "delivery"
    delivery_address: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None
    payment_method: str = "cod"
    coupon_code: Optional[str] = None
    items: List[OrderItemCreate]

class OrderOut(BaseModel):
    id: int
    order_uid: Optional[str] = None
    customer_id: int
    customer_name: Optional[str] = None
    status: str
    fulfillment: str
    subtotal: float
    discount: float
    delivery_fee: float
    grand_total: float
    payment_method: str
    payment_status: str
    delivery_address: Optional[str]
    phone: Optional[str]
    notes: Optional[str]
    utr_number: Optional[str] = None
    refund_status: Optional[str] = None
    refund_amount: Optional[float] = None
    refund_utr: Optional[str] = None
    refund_details: Optional[str] = None
    refund_date: Optional[datetime] = None
    estimated_minutes: int
    whatsapp_sent: bool
    created_at: datetime
    items: List[OrderItemOut] = []
    class Config:
        from_attributes = True

class OrderStatusUpdate(BaseModel):
    status: str

class OrderCancelRequest(BaseModel):
    refund_details: str = ""

# --- Coupon Schemas ---
class CouponCreate(BaseModel):
    code: str
    description: Optional[str] = None
    discount_type: str = "percentage"
    discount_value: float
    min_order: float = 0
    max_uses: int = 100
    expires_at: Optional[datetime] = None

class CouponOut(BaseModel):
    id: int
    code: str
    description: Optional[str]
    discount_type: str
    discount_value: float
    min_order: float
    max_uses: int
    used_count: int
    is_active: bool
    expires_at: Optional[datetime]
    class Config:
        from_attributes = True

class CouponValidate(BaseModel):
    code: str
    cart_total: float

# --- Referral Schemas ---
class ReferralOut(BaseModel):
    id: int
    referral_code: str
    reward_points: int
    is_claimed: bool
    created_at: datetime
    class Config:
        from_attributes = True


# --- Support Ticket Schemas ---
class SupportTicketCreate(BaseModel):
    name: str
    email: Optional[str] = None
    order_id: Optional[str] = None
    subject: Optional[str] = None
    message: str

class SupportTicketReply(BaseModel):
    admin_reply: str
    status: Optional[str] = "in_progress"

class SupportTicketOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    customer_id: Optional[int] = None
    name: str
    email: Optional[str] = None
    order_id: Optional[str] = None
    subject: Optional[str] = None
    message: str
    status: str
    admin_reply: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

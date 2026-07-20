/**
 * pages/Billing.jsx
 * ---------------------
 * Supermarket-style POS billing screen:
 *  - search & add products to a cart
 *  - adjust quantities
 *  - apply a flat discount
 *  - auto-calculate GST + grand total
 *  - choose payment method
 *  - save the sale, then show a printable invoice
 */
import { useEffect, useState, useMemo } from "react";
import {
  Search, Plus, Minus, Trash2, ShoppingCart, User, Printer, CreditCard, ScanLine,
} from "lucide-react";
import toast from "react-hot-toast";

import Modal from "../components/Modal";
import { useAuth } from "../context/AuthContext";
import { getProducts, getCustomers, createSale, getProductByBarcode, getPaymentConfig, createRazorpayOrder, getUpiQr } from "../api/endpoints";

const GST_PERCENT = 5; // default GST% applied on provision store items

export default function Billing() {
  const { isAdmin } = useAuth();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]); // [{product, quantity}]

  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState("");

  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [placing, setPlacing] = useState(false);

  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoice, setInvoice] = useState(null);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [razorpayEnabled, setRazorpayEnabled] = useState(false);
  const [upiQrOpen, setUpiQrOpen] = useState(false);
  const [upiQrData, setUpiQrData] = useState(null);
  const [upiLoading, setUpiLoading] = useState(false);

  useEffect(() => {
    loadCustomers();
    getPaymentConfig().then((r) => setRazorpayEnabled(r.data.razorpay_enabled)).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => loadProducts(), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const loadProducts = async () => {
    try {
      const res = await getProducts(search ? { search } : {});
      setProducts(res.data ?? []);
    } catch { /* silent */ }
  };

  const loadCustomers = async () => {
    try {
      const res = await getCustomers();
      setCustomers(res.data ?? []);
    } catch { /* silent */ }
  };

  const addToCart = (product) => {
    if ((product.stock_quantity ?? 0) <= 0) {
      toast.error(`${product.name} is out of stock`);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((c) => c.product.product_id === product.product_id);
      if (existing) {
        if (existing.quantity >= product.stock_quantity) {
          toast.error("Not enough stock available");
          return prev;
        }
        return prev.map((c) =>
          c.product.product_id === product.product_id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const changeQty = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.product.product_id !== productId) return c;
          const newQty = c.quantity + delta;
          if (newQty > c.product.stock_quantity) {
            toast.error("Not enough stock available");
            return c;
          }
          return { ...c, quantity: newQty };
        })
        .filter((c) => c.quantity > 0)
    );
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((c) => c.product.product_id !== productId));
  };

  // MODULE 15 - fast barcode-scan add-to-cart. A USB/Bluetooth barcode
  // scanner types the code + Enter into whatever input is focused, so
  // this text field doubles as the "scan target".
  const handleBarcodeSubmit = async (e) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    try {
      const res = await getProductByBarcode(barcodeInput.trim());
      addToCart(res.data);
      toast.success(`Added: ${res.data.name}`);
    } catch {
      toast.error("No product found with that barcode");
    } finally {
      setBarcodeInput("");
    }
  };

  const subtotal = useMemo(
    () => cart.reduce((sum, c) => sum + c.product.selling_price * c.quantity, 0),
    [cart]
  );
  const safeDiscount = Math.min(Number(discount) || 0, subtotal);
  const taxable = subtotal - safeDiscount;
  const gstAmount = +(taxable * (GST_PERCENT / 100)).toFixed(2);
  const grandTotal = +(taxable + gstAmount).toFixed(2);

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
    setCustomerId("");
    setPaymentMethod("cash");
  };

  const finalizeSale = async (extra = {}) => {
    const payload = {
      customer_id: customerId ? Number(customerId) : null,
      discount: safeDiscount,
      payment_method: paymentMethod,
      gst_percent: GST_PERCENT,
      items: cart.map((c) => ({
        product_id: c.product.product_id,
        quantity: c.quantity,
        unit_price: c.product.selling_price,
      })),
      ...extra,
    };
    const res = await createSale(payload);
    toast.success("Sale completed!");
    setInvoice(res.data);
    setInvoiceOpen(true);
    clearCart();
    loadProducts();
  };

  const handleRazorpayCheckout = async () => {
    try {
      const orderRes = await createRazorpayOrder(grandTotal);
      const { order_id, amount, currency, key_id } = orderRes.data;

      if (!window.Razorpay) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.onload = resolve;
          script.onerror = reject;
          document.body.appendChild(script);
        });
      }

      const rzp = new window.Razorpay({
        key: key_id,
        amount,
        currency,
        order_id,
        name: "E-commerce",
        description: "POS Purchase",
        handler: async (response) => {
          try {
            await finalizeSale({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
            });
          } catch (err) {
            toast.error("Payment succeeded but saving the sale failed - contact support.");
          } finally {
            setPlacing(false);
          }
        },
        modal: { ondismiss: () => setPlacing(false) },
        theme: { color: "#16a34a" },
      });
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not start Razorpay checkout");
      setPlacing(false);
    }
  };

  const handleUpiPayment = async () => {
    setUpiLoading(true);
    try {
      const res = await getUpiQr(grandTotal);
      setUpiQrData(res.data);
      setUpiQrOpen(true);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not generate UPI QR code");
    } finally {
      setUpiLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    setPlacing(true);

    if (paymentMethod === "razorpay") {
      await handleRazorpayCheckout();
      return;
    }

    if (paymentMethod === "upi") {
      setPlacing(false);
      await handleUpiPayment();
      return;
    }

    try {
      await finalizeSale();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to complete sale");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><ShoppingCart size={22}/> Billing / POS</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Search products, build the cart, and generate an invoice.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Product search & grid */}
        <div className="lg:col-span-3 space-y-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input pl-9" placeholder="Search products to add..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          <form onSubmit={handleBarcodeSubmit} className="relative">
            <ScanLine size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input pl-9"
              placeholder="Scan or type barcode, then press Enter..."
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              autoFocus
            />
          </form>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[65vh] overflow-y-auto pr-1">
            {products.map((p) => (
              <button
                key={p.product_id}
                onClick={() => addToCart(p)}
                disabled={(p.stock_quantity ?? 0) <= 0}
                className="card text-left hover:border-primary-400 hover:shadow-md transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <p className="font-medium text-sm truncate">{p.name}</p>
                <p className="text-xs text-gray-400">{p.category?.name || "Uncategorized"}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-bold text-primary-600">₹{(p.selling_price ?? 0).toFixed(2)}</span>
                  <span className="text-xs text-gray-400">{p.stock_quantity ?? 0} {p.unit ?? ""} left</span>
                </div>
              </button>
            ))}
            {products.length === 0 && (
              <p className="col-span-full text-center text-gray-400 py-10">No products found</p>
            )}
          </div>
        </div>

        {/* Cart / invoice builder */}
        <div className="lg:col-span-2">
          <div className="card space-y-4 sticky top-20">
            <div className="flex items-center gap-2">
              <User size={16} className="text-gray-400" />
              <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">Walk-in Customer</option>
                {customers.map((c) => <option key={c.customer_id} value={c.customer_id}>{c.name} ({c.phone})</option>)}
              </select>
            </div>

            <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
              {cart.length === 0 && <p className="text-center text-gray-400 py-8 text-sm">Cart is empty</p>}
              {cart.map((c) => (
                <div key={c.product.product_id} className="flex items-center justify-between py-2.5 gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{c.product.name}</p>
                    <p className="text-xs text-gray-400">₹{(c.product?.selling_price ?? 0).toFixed(2)} × {c.quantity}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => changeQty(c.product.product_id, -1)} className="p-1 rounded bg-gray-100 dark:bg-gray-700"><Minus size={12}/></button>
                    <span className="w-6 text-center text-sm">{c.quantity}</span>
                    <button onClick={() => changeQty(c.product.product_id, 1)} className="p-1 rounded bg-gray-100 dark:bg-gray-700"><Plus size={12}/></button>
                    <button onClick={() => removeFromCart(c.product.product_id)} className="p-1 text-red-500"><Trash2 size={13}/></button>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-100 dark:border-gray-700 pt-3 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Discount (₹)</span>
                <input
                  type="number" min="0" max={subtotal}
                  className="input !w-24 !py-1 text-right"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
              </div>
              <div className="flex justify-between"><span className="text-gray-500">GST ({GST_PERCENT}%)</span><span>₹{gstAmount.toFixed(2)}</span></div>
              <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-100 dark:border-gray-700">
                <span>Grand Total</span><span className="text-primary-600">₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <div>
              <label className="label flex items-center gap-1"><CreditCard size={13}/> Payment Method</label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {["cash", "upi", ...(razorpayEnabled ? ["razorpay"] : [])].map((m) => (
                  <button
                    key={m}
                    onClick={() => setPaymentMethod(m)}
                    className={`py-2 rounded-lg text-sm font-medium border capitalize transition ${
                      paymentMethod === m
                        ? "bg-primary-600 text-white border-primary-600"
                        : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={handleCheckout} disabled={placing || cart.length === 0} className="btn-primary w-full">
              {placing ? "Processing..." : `Complete Sale — ₹${grandTotal.toFixed(2)}`}
            </button>
          </div>
        </div>
      </div>

      {/* Invoice modal */}
      <Modal open={invoiceOpen} onClose={() => setInvoiceOpen(false)} title="Invoice" size="sm">
        {invoice && <InvoiceReceipt invoice={invoice} />}
      </Modal>

      {/* UPI QR Code modal */}
      <Modal open={upiQrOpen} onClose={() => { setUpiQrOpen(false); setUpiQrData(null); }} title="UPI Payment" size="sm">
        {upiQrData && (
          <div className="text-center space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Scan this QR code with any UPI app</p>
            <img
              src={upiQrData.qr_image}
              alt="UPI QR Code"
              className="mx-auto border-2 border-gray-200 dark:border-gray-600 rounded-lg"
              style={{ width: 220, height: 220 }}
            />
            <div className="space-y-1 text-sm">
              <p><span className="text-gray-500">UPI ID:</span> <span className="font-mono font-medium">{upiQrData.upi_id}</span></p>
              <p><span className="text-gray-500">Name:</span> {upiQrData.upi_name}</p>
              <p className="text-lg font-bold text-primary-600">Amount: ₹{upiQrData.amount?.toFixed(2)}</p>
            </div>
            <p className="text-xs text-gray-400">Ask the customer to scan and pay, then click confirm below.</p>
            <div className="flex gap-3">
              <button
                onClick={() => { setUpiQrOpen(false); setUpiQrData(null); setPlacing(false); }}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setUpiQrOpen(false);
                  setUpiQrData(null);
                  try {
                    await finalizeSale();
                  } catch (err) {
                    toast.error(err.response?.data?.detail || "Failed to complete sale");
                  } finally {
                    setPlacing(false);
                  }
                }}
                className="flex-1 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium"
              >
                Payment Confirmed
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function InvoiceReceipt({ invoice }) {
  if (!invoice) return null;
  return (
    <div>
      <div id="invoice-print" className="text-sm space-y-3">
        <div className="text-center">
          <p className="font-bold text-lg">E-commerce</p>
          <p className="text-gray-400 text-xs">Invoice #{invoice.sale_id} • {new Date(invoice.sale_date).toLocaleString()}</p>
          <p className="text-gray-400 text-xs">Customer: {invoice.customer?.name || "Walk-in"}</p>
        </div>
        <div className="border-t border-dashed pt-2 space-y-1">
          {(invoice.items ?? []).map((it) => (
            <div key={it.sale_item_id} className="flex justify-between">
              <span>{it.product?.name} × {it.quantity}</span>
              <span>₹{(it.total_price ?? 0).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-dashed pt-2 space-y-1">
          <div className="flex justify-between"><span>Subtotal</span><span>₹{(invoice.subtotal ?? 0).toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Discount</span><span>-₹{(invoice.discount ?? 0).toFixed(2)}</span></div>
          <div className="flex justify-between"><span>GST</span><span>₹{(invoice.gst_amount ?? 0).toFixed(2)}</span></div>
          <div className="flex justify-between font-bold text-base"><span>Total</span><span>₹{(invoice.grand_total ?? 0).toFixed(2)}</span></div>
          <div className="flex justify-between text-gray-400 text-xs capitalize"><span>Payment</span><span>{invoice.payment_method}</span></div>
        </div>
        <p className="text-center text-xs text-gray-400 pt-2">Thank you for shopping with us!</p>
      </div>
      <button onClick={() => window.print()} className="btn-secondary w-full mt-4">
        <Printer size={16}/> Print Invoice
      </button>
    </div>
  );
}

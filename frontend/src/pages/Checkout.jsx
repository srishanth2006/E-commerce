/**
 * pages/Checkout.jsx
 * -------------------
 * Full checkout flow: order summary, address, fulfillment, coupon,
 * payment method, and place order.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapPin, Truck, Store as StoreIcon, Tag, CreditCard, Banknote, Smartphone,
  ShoppingBag, Plus, CheckCircle2, Clock
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getMyCart, getMyAddresses, addMyAddress, placeOrder, getMyProfile, confirmPayment, getUpiQr, getOrder
} from "../api/endpoints";
import api from "../api/axios";

function UpiPaymentPage({ orderId, orderUid, total, qrData, onPaid, onSkip }) {
  const [confirming, setConfirming] = useState(false);
  const [step, setStep] = useState(1);
  const [elapsed, setElapsed] = useState(0);
  const [copied, setCopied] = useState(false);
  const [utr, setUtr] = useState("");
  const [utrError, setUtrError] = useState("");

  useEffect(() => {
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const res = await getOrder(orderId);
        if (res.data.payment_status === "paid") {
          setStep(3);
          setTimeout(onPaid, 2500);
          clearInterval(poll);
        }
      } catch { /* ignore */ }
    }, 2000);
    return () => clearInterval(poll);
  }, [orderId, onPaid]);

  const handleConfirm = async () => {
    if (!utr.trim() || utr.trim().length < 6) {
      setUtrError("Please enter a valid UTR number (12 digits from your UPI app)");
      return;
    }
    setUtrError("");
    setConfirming(true);
    try {
      await confirmPayment(orderId, utr.trim());
      setStep(3);
      toast.success("Payment confirmed!");
      setTimeout(onPaid, 2500);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to submit. Try again.");
    } finally {
      setConfirming(false);
    }
  };

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const timeStr = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  const copyUpi = () => {
    if (qrData?.upi_id) {
      navigator.clipboard.writeText(qrData.upi_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Steps indicator */}
      <div className="flex items-center justify-center gap-2 text-sm">
        {["Scan & Pay", "Enter UTR", "Confirmed"].map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              step > i + 1 ? "bg-green-500 text-white" : step === i + 1 ? "bg-primary-600 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-500"
            }`}>
              {step > i + 1 ? <CheckCircle2 size={14} /> : i + 1}
            </div>
            <span className={`hidden sm:inline ${step === i + 1 ? "font-medium text-primary-600" : "text-gray-400"}`}>{label}</span>
            {i < 2 && <div className={`w-6 h-0.5 ${step > i + 1 ? "bg-green-500" : "bg-gray-200 dark:bg-gray-700"}`} />}
          </div>
        ))}
      </div>

      {/* Payment card */}
      {step === 1 ? (
        <div className="card text-center space-y-5">
          <div>
            <h2 className="text-lg font-bold dark:text-white">Complete Your Payment</h2>
            <p className="text-sm text-gray-400 mt-1">Order #{orderUid || orderId} — ₹{total?.toFixed(2)}</p>
          </div>

          {/* QR Code */}
          <div className="flex justify-center">
            {qrData?.qr_image ? (
              <div className="p-3 bg-white rounded-xl border-2 border-gray-200 dark:border-gray-600 shadow-sm">
                <img src={qrData.qr_image} alt="UPI QR" style={{ width: 220, height: 220 }} />
              </div>
            ) : (
              <div className="w-56 h-56 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center">
                <p className="text-sm text-gray-400">Loading QR...</p>
              </div>
            )}
          </div>

          {/* UPI ID + copy */}
          <div className="space-y-2">
            <p className="text-xs text-gray-400">Or pay using UPI ID</p>
            <div className="flex items-center justify-center gap-2">
              <span className="font-mono text-sm font-medium dark:text-white bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-lg">
                {qrData?.upi_id || "..."}
              </span>
              <button onClick={copyUpi} className="text-xs text-primary-600 hover:underline font-medium">
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>

          {/* Timer */}
          <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
            <Clock size={14} />
            <span>Time elapsed: <span className="font-mono font-medium text-gray-600 dark:text-gray-300">{timeStr}</span></span>
          </div>

          {/* Confirm button */}
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium dark:text-white block mb-1">UTR / Transaction Reference Number</label>
              <input
                className="input text-center font-mono text-lg tracking-widest"
                placeholder="e.g. 123456789012"
                value={utr}
                onChange={(e) => { setUtr(e.target.value.replace(/\D/g, "").slice(0, 12)); setUtrError(""); }}
                maxLength={12}
              />
              {utrError && <p className="text-xs text-red-500 mt-1">{utrError}</p>}
              <p className="text-xs text-gray-400 mt-1">Find this in your UPI app after payment (GPay/PhonePe/Paytm → Transaction Details → UTR)</p>
            </div>
            <button
              onClick={handleConfirm}
              disabled={confirming || !utr.trim()}
              className="btn-primary w-full text-base py-3"
            >
              {confirming ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Confirming...
                </span>
              ) : (
                "I've Paid — Confirm Payment"
              )}
            </button>
            <button onClick={onSkip} className="text-sm text-gray-400 hover:text-gray-600 w-full">
              Pay later — view order
            </button>
          </div>

          {/* Steps text */}
          <div className="text-xs text-gray-400 space-y-1 text-left bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3">
            <p className="font-medium text-gray-500 dark:text-gray-300">How to pay:</p>
            <p>1. Open any UPI app (GPay, PhonePe, Paytm)</p>
            <p>2. Scan the QR code or enter the UPI ID</p>
            <p>3. Pay ₹{total?.toFixed(2)}</p>
            <p>4. Come back and enter the UTR number</p>
          </div>
        </div>
      ) : (
        <div className="card text-center space-y-4 py-10">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 size={36} className="text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-xl font-bold dark:text-white">Payment Confirmed!</h2>
          <p className="text-gray-400">Order #{orderUid || orderId} has been placed successfully.</p>
          <p className="text-sm text-gray-400">Redirecting to your orders...</p>
        </div>
      )}
    </div>
  );
}

export default function Checkout() {
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [fulfillment, setFulfillment] = useState("delivery");
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponApplied, setCouponApplied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({ line1: "", line2: "", city: "", state: "", pincode: "" });
  const [locating, setLocating] = useState(false);
  const [upiQr, setUpiQr] = useState(null);
  const [placedOrderId, setPlacedOrderId] = useState(null);
  const [placedOrderUid, setPlacedOrderUid] = useState(null);
  const [confirmingPayment, setConfirmingPayment] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [cartRes, addrRes] = await Promise.all([getMyCart(), getMyAddresses()]);
        setCart(cartRes.data);
        const addrs = addrRes.data ?? [];
        setAddresses(addrs);
        if (addrs.length > 0) setSelectedAddress(addrs[0].id);
        else detectCurrentLocation();
      } catch {
        toast.error("Failed to load checkout data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const detectCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
            { headers: { "Accept-Language": "en" } }
          );
          const data = await resp.json();
          const addr = data.address || {};
          const line1 = [addr.house_number, addr.road, addr.neighbourhood].filter(Boolean).join(", ") || data.display_name?.split(",")[0] || "";
          const city = addr.city || addr.town || addr.village || addr.county || "";
          const state = addr.state || "";
          const pincode = addr.postcode || "";
          setNewAddress({ line1, line2: "", city, state, pincode });
          setShowNewAddress(true);
          toast.success("Location detected! Review and save your address.");
        } catch {
          toast("Could not detect address from location. Enter it manually.");
        } finally {
          setLocating(false);
        }
      },
      () => { setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const afterDiscount = Math.max(0, subtotal() - couponDiscount);
  const deliveryFee = fulfillment === "delivery" ? (afterDiscount >= 500 ? 0 : afterDiscount >= 200 ? 20 : 40) : 0;
  const grandTotal = afterDiscount + deliveryFee;

  function subtotal() {
    if (!Array.isArray(cart) || cart.length === 0) return 0;
    return cart.reduce((sum, item) => sum + (item.product?.selling_price ?? item.selling_price ?? 0) * (item.quantity ?? 1), 0);
  }

  const handleValidateCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error("Enter a coupon code");
      return;
    }
    try {
      const res = await api.post("/coupons/validate", { code: couponCode.trim(), cart_total: subtotal() });
      const data = res.data;
      const disc = data.discount ?? data.discount_amount ?? 0;
      setCouponDiscount(disc);
      setCouponApplied(true);
      toast.success(`Coupon applied! You save ₹${disc.toFixed(0)}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Invalid coupon code");
      setCouponDiscount(0);
      setCouponApplied(false);
    }
  };

  const handleAddNewAddress = async () => {
    if (!newAddress.line1 || !newAddress.city || !newAddress.pincode) {
      toast.error("Please fill in address, city, and pincode");
      return;
    }
    try {
      const res = await addMyAddress(newAddress);
      const addr = res.data;
      setAddresses((prev) => [...prev, addr]);
      setSelectedAddress(addr.id);
      setShowNewAddress(false);
      setNewAddress({ line1: "", line2: "", city: "", state: "", pincode: "" });
      toast.success("Address added");
    } catch {
      toast.error("Failed to add address");
    }
  };

  const handlePlaceOrder = async () => {
    if (fulfillment === "delivery" && !selectedAddress) {
      toast.error("Please select a delivery address");
      return;
    }
    if (!Array.isArray(cart) || cart.length === 0) {
      toast.error("Your cart is empty");
      return;
    }
    const outOfStockItems = cart.filter((item) => item.product?.stock_quantity !== undefined && item.product.stock_quantity <= 0);
    if (outOfStockItems.length > 0) {
      toast.error(`${outOfStockItems.length} item(s) are out of stock. Please remove them from your cart.`);
      return;
    }
    const exceedsStock = cart.filter((item) => item.product?.stock_quantity !== undefined && item.quantity > item.product.stock_quantity);
    if (exceedsStock.length > 0) {
      const names = exceedsStock.map((i) => i.product?.name || "Item").join(", ");
      toast.error(`Insufficient stock for: ${names}. Please reduce quantities.`);
      return;
    }
    setPlacing(true);
    try {
      const deliveryAddr = fulfillment === "delivery"
        ? addresses.find((a) => a.id === selectedAddress)
        : null;
      const addrStr = deliveryAddr
        ? `${deliveryAddr.line1}, ${deliveryAddr.line2 || ""}, ${deliveryAddr.city}, ${deliveryAddr.state || ""} ${deliveryAddr.pincode}`
        : null;

      const orderItems = cart.map((item) => ({
        product_id: item.product_id,
        product_name: item.product?.name || `Product #${item.product_id}`,
        quantity: item.quantity,
        unit_price: item.selling_price ?? item.product?.selling_price ?? 0,
      }));

      const res = await placeOrder({
        fulfillment,
        delivery_address: addrStr,
        payment_method: paymentMethod,
        coupon_code: couponApplied ? couponCode.trim() : undefined,
        items: orderItems,
      });
      if (paymentMethod === "upi") {
        setPlacedOrderId(res.data.id);
        setPlacedOrderUid(res.data.order_uid);
        try {
          const qrRes = await getUpiQr(res.data.grand_total);
          setUpiQr(qrRes.data);
        } catch {
          toast("Order placed. Complete UPI payment manually.");
        }
        toast.success("Order placed! Complete UPI payment below.");
      } else {
        toast.success("Order placed successfully!");
        navigate("/orders");
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to place order");
    } finally {
      setPlacing(false);
    }
  };

  if (loading) {
    return <p className="text-center text-gray-400 py-10">Loading checkout...</p>;
  }

  if (placedOrderId && paymentMethod === "upi") {
    return (
      <UpiPaymentPage
        orderId={placedOrderId}
        orderUid={placedOrderUid}
        total={grandTotal}
        qrData={upiQr}
        onPaid={() => navigate("/orders")}
        onSkip={() => navigate("/orders")}
      />
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold dark:text-white flex items-center gap-2">
        <ShoppingBag size={24} /> Checkout
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Steps */}
        <div className="lg:col-span-2 space-y-6">
          {/* Fulfillment */}
          <div className="card">
            <h2 className="font-semibold dark:text-white mb-3">Delivery Method</h2>
            <div className="flex gap-3">
              <button
                onClick={() => setFulfillment("delivery")}
                className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition ${
                  fulfillment === "delivery"
                    ? "border-primary-600 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400"
                    : "border-gray-200 dark:border-gray-600 hover:border-gray-300"
                }`}
              >
                <Truck size={18} /> Delivery
              </button>
              <button
                onClick={() => setFulfillment("takeaway")}
                className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition ${
                  fulfillment === "takeaway"
                    ? "border-primary-600 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400"
                    : "border-gray-200 dark:border-gray-600 hover:border-gray-300"
                }`}
              >
                <StoreIcon size={18} /> Takeaway
              </button>
            </div>
          </div>

          {/* Address */}
          {fulfillment === "delivery" && (
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold dark:text-white">Delivery Address</h2>
                <div className="flex gap-3">
                  <button onClick={detectCurrentLocation} disabled={locating} className="text-primary-600 text-sm flex items-center gap-1 hover:underline">
                    <MapPin size={14} /> {locating ? "Detecting..." : "Use My Location"}
                  </button>
                  <button onClick={() => setShowNewAddress(!showNewAddress)} className="text-primary-600 text-sm flex items-center gap-1 hover:underline">
                    <Plus size={14} /> Add New
                  </button>
                </div>
              </div>

              {showNewAddress && (
                <div className="border rounded-lg p-4 mb-4 space-y-3 bg-gray-50 dark:bg-gray-700/30">
                  <input className="input" placeholder="Address Line 1 *" value={newAddress.line1} onChange={(e) => setNewAddress({ ...newAddress, line1: e.target.value })} />
                  <input className="input" placeholder="Address Line 2" value={newAddress.line2} onChange={(e) => setNewAddress({ ...newAddress, line2: e.target.value })} />
                  <div className="grid grid-cols-3 gap-3">
                    <input className="input" placeholder="City *" value={newAddress.city} onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })} />
                    <input className="input" placeholder="State" value={newAddress.state} onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })} />
                    <input className="input" placeholder="Pincode *" value={newAddress.pincode} onChange={(e) => setNewAddress({ ...newAddress, pincode: e.target.value })} />
                  </div>
                  <button onClick={handleAddNewAddress} className="btn-primary text-sm">Save Address</button>
                </div>
              )}

              {addresses.length === 0 && !showNewAddress && (
                <p className="text-sm text-gray-400">
                  {locating ? "Detecting your location..." : "No saved addresses. Add one or use your current location."}
                </p>
              )}

              <div className="space-y-2">
                {addresses.map((a) => (
                  <label
                    key={a.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition ${
                      selectedAddress === a.id
                        ? "border-primary-600 bg-primary-50 dark:bg-primary-900/20"
                        : "border-gray-200 dark:border-gray-600 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="address"
                      checked={selectedAddress === a.id}
                      onChange={() => setSelectedAddress(a.id)}
                      className="mt-1 accent-primary-600"
                    />
                    <div className="text-sm">
                      <p className="font-medium dark:text-white">{a.line1}</p>
                      {a.line2 && <p className="text-gray-500 dark:text-gray-400">{a.line2}</p>}
                      <p className="text-gray-500 dark:text-gray-400">{[a.city, a.state, a.pincode].filter(Boolean).join(", ")}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Coupon */}
          <div className="card">
            <h2 className="font-semibold dark:text-white mb-3 flex items-center gap-2">
              <Tag size={16} /> Coupon Code
            </h2>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="Enter coupon code"
                value={couponCode}
                onChange={(e) => { setCouponCode(e.target.value); setCouponApplied(false); setCouponDiscount(0); }}
                disabled={couponApplied}
              />
              {couponApplied ? (
                <button
                  onClick={() => { setCouponApplied(false); setCouponDiscount(0); setCouponCode(""); }}
                  className="btn-secondary text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              ) : (
                <button onClick={handleValidateCoupon} className="btn-secondary" disabled={!couponCode.trim()}>
                  Validate
                </button>
              )}
            </div>
            {couponApplied && (
              <p className="text-sm text-green-600 dark:text-green-400 mt-2">Coupon applied! Discount: ₹{couponDiscount.toFixed(0)}</p>
            )}
          </div>

          {/* Payment */}
          <div className="card">
            <h2 className="font-semibold dark:text-white mb-3">Payment Method</h2>
            <div className="space-y-2">
              {[
                { id: "cod", label: "Cash on Delivery", icon: <Banknote size={18} /> },
                { id: "upi", label: "UPI", icon: <Smartphone size={18} /> },
              ].map((pm) => (
                <label
                  key={pm.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition ${
                    paymentMethod === pm.id
                      ? "border-primary-600 bg-primary-50 dark:bg-primary-900/20"
                      : "border-gray-200 dark:border-gray-600 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === pm.id}
                    onChange={() => setPaymentMethod(pm.id)}
                    className="accent-primary-600"
                  />
                  <span className="text-gray-600 dark:text-gray-300">{pm.icon}</span>
                  <span className="font-medium dark:text-white">{pm.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Order Summary */}
        <div className="space-y-6">
          <div className="card sticky top-20">
            <h2 className="font-semibold dark:text-white mb-4">Order Summary</h2>
            {!Array.isArray(cart) || cart.length === 0 ? (
              <p className="text-sm text-gray-400">Your cart is empty.</p>
            ) : (
              <>
                <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <div className="flex-1 min-w-0">
                        <p className="truncate dark:text-white">{item.product?.name || `Product #${item.product_id}`}</p>
                        <p className="text-gray-400 text-xs">Qty: {item.quantity}</p>
                      </div>
                      <span className="font-medium dark:text-white ml-2">₹{((item.product?.selling_price ?? item.selling_price ?? 0) * (item.quantity ?? 1)).toFixed(0)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t dark:border-gray-700 pt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
                    <span className="dark:text-white">₹{subtotal().toFixed(0)}</span>
                  </div>
                  {couponDiscount > 0 && (
                    <div className="flex justify-between text-green-600 dark:text-green-400">
                      <span>Coupon Discount</span>
                      <span>-₹{couponDiscount.toFixed(0)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Delivery Fee</span>
                    <span className="dark:text-white">{deliveryFee === 0 ? "Free" : `₹${deliveryFee}`}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t dark:border-gray-700 pt-2">
                    <span className="dark:text-white">Total</span>
                    <span className="text-primary-600">₹{grandTotal.toFixed(0)}</span>
                  </div>
                </div>
                <button
                  onClick={handlePlaceOrder}
                  disabled={placing || !Array.isArray(cart) || cart.length === 0}
                  className="btn-primary w-full mt-4"
                >
                  <ShoppingBag size={16} />
                  {placing ? "Placing Order..." : "Place Order"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

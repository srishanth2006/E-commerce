import { useEffect, useState } from "react";
import { Package, Truck, Store, Clock, XCircle, CheckCircle, RotateCcw, Wallet } from "lucide-react";
import toast from "react-hot-toast";
import { getMyOrders, cancelOrder, confirmPayment } from "../api/endpoints";
import api from "../api/axios";

const STATUS_COLORS = {
  placed: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  confirmed: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  packed: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  out_for_delivery: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  delivered: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [utrInputs, setUtrInputs] = useState({});
  const [cancellingOrder, setCancellingOrder] = useState(null);
  const [cancelForm, setCancelForm] = useState({ type: "upi", value: "" });
  const [cancelling, setCancelling] = useState(false);

  const fetchOrders = () => {
    getMyOrders()
      .then((res) => setOrders(res.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleCancelClick = (order) => {
    setCancellingOrder(order);
    setCancelForm({ type: "upi", value: "" });
  };

  const handleConfirmCancel = async () => {
    if (cancellingOrder.payment_method === "upi" && !cancelForm.value.trim()) {
      toast.error("Please enter your refund details");
      return;
    }
    setCancelling(true);
    try {
      const refundDetails = cancellingOrder.payment_method === "upi"
        ? `${cancelForm.type.toUpperCase()}: ${cancelForm.value.trim()}`
        : "";
      await api.post(`/orders/${cancellingOrder.id}/cancel`, { refund_details: refundDetails });
      toast.success("Order cancelled successfully!");
      setCancellingOrder(null);
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to cancel order");
    } finally {
      setCancelling(false);
    }
  };

  const handleConfirmPayment = async (orderId) => {
    const utr = (utrInputs[orderId] || "").trim();
    if (!utr || utr.length < 6) {
      toast.error("Please enter a valid UTR number");
      return;
    }
    try {
      await confirmPayment(orderId, utr);
      toast.success("Payment confirmed!");
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to submit payment");
    }
  };

  if (loading) return <p className="text-center text-gray-400 py-10">Loading orders...</p>;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-xl font-bold flex items-center gap-2"><Package size={20} /> My Orders</h1>

      {orders.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <Package size={48} className="mx-auto text-gray-300" />
          <p className="text-gray-400">No orders yet. Your purchases will show up here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="card p-4 space-y-3">
              <button
                className="w-full flex items-center justify-between text-left"
                onClick={() => setExpanded(expanded === o.id ? null : o.id)}
              >
                <div>
                  <p className="font-medium text-sm">Order #{o.order_uid || o.id}</p>
                  <p className="text-xs text-gray-400">{new Date(o.created_at).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[o.status] || ""}`}>
                    {o.status?.replace(/_/g, " ")}
                  </span>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    o.payment_status === "paid"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                      : "bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300"
                  }`}>
                    {o.payment_status === "paid" ? "Paid" : "Payment Pending"}
                  </span>
                  <span className="font-bold text-primary-600">₹{(o.grand_total ?? 0).toFixed(2)}</span>
                </div>
              </button>

              {expanded === o.id && (
                <div className="pt-3 border-t border-gray-100 dark:border-gray-700 space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    {o.fulfillment === "delivery" ? <Truck size={14} /> : <Store size={14} />}
                    <span className="capitalize">{o.fulfillment || "delivery"}</span>
                  </div>

                  {o.estimated_minutes && (
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                      <Clock size={14} />
                      <span>Estimated: {o.estimated_minutes} min</span>
                    </div>
                  )}

                  <div className="space-y-1">
                    {(o.items ?? []).map((it) => (
                      <div key={it.id} className="flex justify-between">
                        <span>{it.product_name} &times; {it.quantity}</span>
                        <span>₹{(it.total_price ?? 0).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  {o.status === "cancelled" && o.payment_method === "upi" && (
                    <div className={`flex flex-col gap-1 p-3 rounded-lg text-sm ${
                      o.refund_status === "completed"
                        ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                        : "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300"
                    }`}>
                      <div className="flex items-center gap-2">
                        <RotateCcw size={14} />
                        <span className="font-bold">Your Refund Amount: ₹{(o.refund_amount ?? o.grand_total ?? 0).toFixed(2)}</span>
                        {o.refund_status === "completed" ? (
                          <span className="ml-auto text-xs font-medium bg-green-100 dark:bg-green-800/40 px-2 py-0.5 rounded-full">Refunded</span>
                        ) : (
                          <span className="ml-auto text-xs font-medium bg-yellow-100 dark:bg-yellow-800/40 px-2 py-0.5 rounded-full">Pending</span>
                        )}
                      </div>
                      {o.delivery_fee > 0 && o.refund_amount < o.grand_total && (
                        <p className="text-xs opacity-80 ml-5">
                          ₹{(o.delivery_fee / 2).toFixed(2)} deducted (half delivery charge — order was already confirmed)
                        </p>
                      )}
                      {o.refund_details && (
                        <div className="flex items-center gap-2 text-xs opacity-80 ml-5">
                          <Wallet size={12} />
                          <span>Refund to: <span className="font-medium">{o.refund_details}</span></span>
                        </div>
                      )}
                      {o.refund_status === "completed" ? (
                        <p className="text-xs opacity-80 ml-5">Refund has been processed. Amount credited to your account.</p>
                      ) : (
                        <p className="text-xs opacity-80 ml-5">Shop will process your refund shortly.</p>
                      )}
                      {o.refund_utr && (
                        <p className="text-xs font-mono opacity-80 ml-5">Refund UTR: {o.refund_utr}</p>
                      )}
                    </div>
                  )}
                  {o.status === "cancelled" && o.payment_method !== "upi" && (
                    <div className="flex items-center gap-2 p-3 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                      <RotateCcw size={14} />
                      <span>Order cancelled. No refund needed for COD orders.</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700">
                    <span className="font-bold">Total: ₹{(o.grand_total ?? 0).toFixed(2)}</span>
                    <div className="flex gap-2">
                      {o.payment_status === "pending" && o.payment_method === "upi" && (
                        <div className="flex items-center gap-2">
                          <input
                            className="input text-sm font-mono w-36"
                            placeholder="UTR Number"
                            value={utrInputs[o.id] || ""}
                            onChange={(e) => setUtrInputs({ ...utrInputs, [o.id]: e.target.value.replace(/\D/g, "").slice(0, 12) })}
                            maxLength={12}
                          />
                          <button
                            onClick={() => handleConfirmPayment(o.id)}
                            className="inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-800 font-medium"
                          >
                            <CheckCircle size={14} /> Pay Now
                          </button>
                        </div>
                      )}
                      {(o.status === "placed" || o.status === "confirmed") && (
                        <button
                          onClick={() => handleCancelClick(o)}
                          className="inline-flex items-center gap-1 text-sm text-red-500 hover:text-red-700"
                        >
                          <XCircle size={14} /> Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {cancellingOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => !cancelling && setCancellingOrder(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <XCircle size={24} className="text-red-500" />
              </div>
              <h2 className="text-lg font-bold dark:text-white">Cancel Order #{cancellingOrder.order_uid || cancellingOrder.id}</h2>
              {cancellingOrder.payment_method === "upi" ? (
                <p className="text-sm text-gray-400 mt-1">
                  Refund: <span className="font-bold text-primary-600">₹{(cancellingOrder.grand_total ?? 0).toFixed(2)}</span>
                  {cancellingOrder.delivery_fee > 0 && (
                    <span className="text-yellow-500 text-xs block mt-1">
                      (Half delivery charge of ₹{(cancellingOrder.delivery_fee / 2).toFixed(2)} will be deducted if order was already confirmed)
                    </span>
                  )}
                </p>
              ) : (
                <p className="text-sm text-gray-400 mt-1">No online payment was made for this order.</p>
              )}
            </div>

            {cancellingOrder.payment_method === "upi" ? (
              <>
                <div className="space-y-3">
                  <p className="text-sm font-medium dark:text-white">Where should we send your refund?</p>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { id: "upi", label: "UPI ID" },
                      { id: "phonepe", label: "PhonePe" },
                      { id: "gpay", label: "GPay" },
                      { id: "paytm", label: "Paytm" },
                      { id: "bank", label: "Bank A/C" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setCancelForm({ ...cancelForm, type: opt.id })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition ${
                          cancelForm.type === opt.id
                            ? "border-primary-600 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400"
                            : "border-gray-200 dark:border-gray-600 text-gray-500 hover:border-gray-300"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <input
                    className="input"
                    placeholder={
                      cancelForm.type === "bank"
                        ? "Account number + IFSC (e.g. 1234567890 / HDFC0001234)"
                        : `Your ${cancelForm.type === "upi" ? "UPI ID" : cancelForm.type.toUpperCase() + " number"}`
                    }
                    value={cancelForm.value}
                    onChange={(e) => setCancelForm({ ...cancelForm, value: e.target.value })}
                    autoFocus
                  />
                </div>

                <div className="text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 space-y-1">
                  <p className="font-medium text-gray-500 dark:text-gray-300">Cancellation Policy:</p>
                  <p>• Cancel within 30 minutes of placing for full refund</p>
                  <p>• After confirmation, half delivery charge may be deducted</p>
                  <p>• Max 3 cancellations allowed per day</p>
                </div>
              </>
            ) : (
              <div className="text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 space-y-1">
                <p className="font-medium text-gray-500 dark:text-gray-300">Cancellation Policy:</p>
                <p>• Cancel within 30 minutes of placing</p>
                <p>• No refund needed for Cash on Delivery orders</p>
                <p>• Max 3 cancellations allowed per day</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setCancellingOrder(null)}
                disabled={cancelling}
                className="flex-1 btn-secondary"
              >
                Go Back
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={cancelling || (cancellingOrder.payment_method === "upi" && !cancelForm.value.trim())}
                className="flex-1 btn bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {cancelling ? "Cancelling..." : cancellingOrder.payment_method === "upi" ? "Confirm Cancel & Refund" : "Cancel Order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

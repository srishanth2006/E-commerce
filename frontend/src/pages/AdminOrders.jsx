/**
 * pages/AdminOrders.jsx
 * -----------------------
 */
import { useEffect, useState } from "react";
import { Package, CheckCircle, Clock, XCircle, Eye, RotateCcw, Wallet } from "lucide-react";
import toast from "react-hot-toast";

import Modal from "../components/Modal";
import Loader from "../components/Loader";
import { getAllOrders, updateOrderStatus, confirmRefund } from "../api/endpoints";

const STATUS_TABS = ["all", "placed", "confirmed", "packed", "out_for_delivery", "delivered", "cancelled"];

const STATUS_LABELS = {
  all: "All",
  placed: "Placed",
  confirmed: "Confirmed",
  packed: "Packed",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_COLORS = {
  placed: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  confirmed: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  packed: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  out_for_delivery: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  delivered: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

const NEXT_STATUS = {
  placed: ["confirmed", "cancelled"],
  confirmed: ["packed", "cancelled"],
  packed: ["out_for_delivery"],
  out_for_delivery: ["delivered"],
  delivered: [],
  cancelled: [],
};

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [detailOrder, setDetailOrder] = useState(null);
  const [refundUtr, setRefundUtr] = useState({});
  const [confirmingRefund, setConfirmingRefund] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getAllOrders();
      setOrders(res.data ?? []);
    } catch {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      toast.success(`Order marked as ${STATUS_LABELS[newStatus]}`);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update status");
    }
  };

  const handleConfirmRefund = async (orderId) => {
    const utr = (refundUtr[orderId] || "").trim();
    if (!utr || utr.length < 6) {
      toast.error("Enter the UPI refund transaction UTR number");
      return;
    }
    setConfirmingRefund(orderId);
    try {
      await confirmRefund(orderId, utr);
      toast.success("Refund confirmed!");
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, refund_status: "completed", refund_utr: utr, refund_date: new Date().toISOString() } : o))
      );
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to confirm refund");
    } finally {
      setConfirmingRefund(null);
    }
  };

  const filtered = activeTab === "all" ? orders : orders.filter((o) => o.status === activeTab);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Package size={22} /> Orders</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Manage and track all customer orders.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-primary-600 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            {STATUS_LABELS[tab]}
            {tab !== "all" && (
              <span className="ml-1 text-xs opacity-70">
                ({orders.filter((o) => o.status === tab).length})
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? <Loader label="Loading orders..." /> : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Time</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="text-center text-gray-400 py-8">No orders found</td></tr>
                )}
                {filtered.map((order) => (
                  <tr key={order.id}>
                    <td className="font-medium">#{order.order_uid || order.id}</td>
                    <td>{order.customer_name || `Customer #${order.customer_id}` || "—"}</td>
                    <td>{order.items?.length ?? 0}</td>
                    <td className="font-medium">₹{(order.grand_total ?? 0).toFixed(2)}</td>
                    <td>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        order.payment_method === "upi"
                          ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                          : "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
                      }`}>
                        {order.payment_method === "upi" ? "UPI" : order.payment_method === "razorpay" ? "Online" : "COD"}
                      </span>
                      <span className={`inline-block ml-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        order.payment_status === "paid"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                          : order.payment_status === "refunded"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                          : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300"
                      }`}>
                        {order.payment_status === "paid" ? "Paid" : order.payment_status === "refunded" ? "Refunded" : "Pending"}
                      </span>
                      {order.utr_number && (
                        <p className="text-xs font-mono text-gray-500 mt-0.5">UTR: {order.utr_number}</p>
                      )}
                      {order.status === "cancelled" && order.payment_method !== "cod" && (
                        <div className="mt-1 flex items-center gap-1">
                          <RotateCcw size={11} className={order.refund_status === "completed" ? "text-green-500" : "text-yellow-500"} />
                          <span className={`text-xs font-medium ${order.refund_status === "completed" ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400"}`}>
                            {order.refund_status === "completed" ? "Refunded ₹" + (order.refund_amount ?? 0).toFixed(0) : "Refund ₹" + (order.refund_amount ?? 0).toFixed(0) + " pending"}
                          </span>
                          {order.refund_utr && (
                            <span className="text-xs font-mono text-gray-500 ml-1">UTR: {order.refund_utr}</span>
                          )}
                          {order.refund_details && order.refund_status !== "completed" && (
                            <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mt-0.5">Send to: {order.refund_details}</p>
                          )}
                        </div>
                      )}
                      {order.status === "cancelled" && order.payment_method === "cod" && (
                        <p className="text-xs text-gray-400 mt-0.5">No online payment</p>
                      )}
                    </td>
                    <td>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[order.status] || ""}`}>
                        {STATUS_LABELS[order.status] || order.status}
                      </span>
                    </td>
                    <td className="text-gray-500 text-sm">
                      {order.estimated_time && (
                        <span className="flex items-center gap-1 text-xs text-gray-400 mb-0.5">
                          <Clock size={12} /> ETA: {order.estimated_time}
                        </span>
                      )}
                      {order.created_at ? new Date(order.created_at).toLocaleString() : "—"}
                    </td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setDetailOrder(order)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500" title="View details">
                          <Eye size={15} />
                        </button>
                        {order.status === "cancelled" && order.payment_method !== "cod" && order.refund_status !== "completed" && (
                          <div className="flex items-center gap-1">
                            <input
                              className="input text-xs font-mono py-1 px-2 w-28"
                              placeholder="Refund UTR"
                              value={refundUtr[order.id] || ""}
                              onChange={(e) => setRefundUtr({ ...refundUtr, [order.id]: e.target.value.replace(/\D/g, "").slice(0, 12) })}
                              maxLength={12}
                            />
                            <button
                              onClick={() => handleConfirmRefund(order.id)}
                              disabled={confirmingRefund === order.id}
                              className="px-2 py-1 rounded-lg text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/40 dark:text-green-300 disabled:opacity-50"
                              title="Enter refund UPI UTR & confirm"
                            >
                              {confirmingRefund === order.id ? "..." : "Refund Done"}
                            </button>
                          </div>
                        )}
                        {NEXT_STATUS[order.status]?.map((ns) => (
                          <button
                            key={ns}
                            onClick={() => handleStatusUpdate(order.id, ns)}
                            className="px-2 py-1 rounded-lg text-xs font-medium bg-primary-50 text-primary-700 hover:bg-primary-100 dark:bg-primary-900/40 dark:text-primary-300"
                            title={`Mark as ${STATUS_LABELS[ns]}`}
                          >
                            {STATUS_LABELS[ns]}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={!!detailOrder} onClose={() => setDetailOrder(null)} title={`Order #${detailOrder?.order_uid || detailOrder?.id || ""}`} size="lg">
        {detailOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Customer ID:</span>
                <p className="font-medium">{detailOrder.customer_name || `Customer #${detailOrder.customer_id}` || "—"}</p>
              </div>
              <div>
                <span className="text-gray-500">Status:</span>
                <p>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[detailOrder.status] || ""}`}>
                    {STATUS_LABELS[detailOrder.status] || detailOrder.status}
                  </span>
                </p>
              </div>
              <div>
                <span className="text-gray-500">Total:</span>
                <p className="font-medium">₹{(detailOrder.grand_total ?? 0).toFixed(2)}</p>
              </div>
              <div>
                <span className="text-gray-500">Payment:</span>
                <p>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                    detailOrder.payment_method === "upi"
                      ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                      : "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
                  }`}>
                    {detailOrder.payment_method === "upi" ? "UPI" : detailOrder.payment_method === "razorpay" ? "Online" : "COD"}
                  </span>
                  <span className={`inline-block ml-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    detailOrder.payment_status === "paid"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                      : detailOrder.payment_status === "refunded"
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                      : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300"
                  }`}>
                    {detailOrder.payment_status === "paid" ? "Paid" : detailOrder.payment_status === "refunded" ? "Refunded" : "Pending"}
                  </span>
                </p>
                {detailOrder.utr_number && (
                  <p className="text-xs font-mono text-gray-500 mt-1">UTR: {detailOrder.utr_number}</p>
                )}
              </div>
              <div>
                <span className="text-gray-500">Created:</span>
                <p>{detailOrder.created_at ? new Date(detailOrder.created_at).toLocaleString() : "—"}</p>
              </div>
            </div>
            {detailOrder.items?.length > 0 && (
              <div>
                <h3 className="font-medium text-sm mb-2">Items</h3>
                <div className="space-y-2">
                  {detailOrder.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm border-b border-gray-100 dark:border-gray-700 pb-1">
                      <span>{item.product_name} x {item.quantity}</span>
                      <span>₹{(item.unit_price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {detailOrder.whatsapp_notified !== undefined && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                {detailOrder.whatsapp_notified ? (
                  <><CheckCircle size={14} /> WhatsApp notification sent</>
                ) : (
                  <><XCircle size={14} /> WhatsApp notification pending</>
                )}
              </div>
            )}
            {detailOrder.estimated_time && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock size={14} /> Estimated delivery: {detailOrder.estimated_time}
              </div>
            )}
            {detailOrder.status === "cancelled" && detailOrder.payment_method !== "cod" && (
              <>
              <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                detailOrder.refund_status === "completed"
                  ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                  : "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300"
              }`}>
                <RotateCcw size={14} />
                <span className="font-medium">Refund ₹{(detailOrder.refund_amount ?? detailOrder.grand_total ?? 0).toFixed(2)}</span>
                {detailOrder.refund_status === "completed" ? (
                  <span className="ml-auto text-xs">Completed{detailOrder.refund_date ? ` on ${new Date(detailOrder.refund_date).toLocaleDateString()}` : ""}</span>
                ) : (
                  <span className="ml-auto text-xs">Pending</span>
                )}
              </div>
              {detailOrder.refund_utr && (
                <p className="text-xs font-mono text-gray-500 ml-5">Refund UTR: {detailOrder.refund_utr}</p>
              )}
              {detailOrder.refund_details && detailOrder.refund_status !== "completed" && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm">
                  <Wallet size={14} />
                  <span>Send refund to: <span className="font-bold">{detailOrder.refund_details}</span></span>
                </div>
              )}
              </>
            )}
            {detailOrder.status === "cancelled" && detailOrder.payment_method === "cod" && (
              <div className="flex items-center gap-2 p-3 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                <RotateCcw size={14} />
                <span>Cancelled. No online payment was made — no refund needed.</span>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              {detailOrder.status === "cancelled" && detailOrder.payment_method !== "cod" && detailOrder.refund_status !== "completed" && (
                <div className="flex items-center gap-2">
                  <input
                    className="input text-sm font-mono"
                    placeholder="Enter refund UPI UTR"
                    value={refundUtr[detailOrder.id] || ""}
                    onChange={(e) => setRefundUtr({ ...refundUtr, [detailOrder.id]: e.target.value.replace(/\D/g, "").slice(0, 12) })}
                    maxLength={12}
                  />
                  <button
                    onClick={() => { handleConfirmRefund(detailOrder.id); setDetailOrder({ ...detailOrder, refund_status: "completed", refund_utr: refundUtr[detailOrder.id] || "", refund_date: new Date().toISOString() }); }}
                    className="btn-primary text-sm bg-green-600 hover:bg-green-700"
                    disabled={!refundUtr[detailOrder.id] || refundUtr[detailOrder.id].length < 6}
                  >
                    Confirm Refund
                  </button>
                </div>
              )}
              {NEXT_STATUS[detailOrder.status]?.map((ns) => (
                <button
                  key={ns}
                  onClick={() => { handleStatusUpdate(detailOrder.id, ns); setDetailOrder({ ...detailOrder, status: ns }); }}
                  className="btn-primary text-sm"
                >
                  Mark as {STATUS_LABELS[ns]}
                </button>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

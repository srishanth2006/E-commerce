/**
 * pages/PurchaseScanner.jsx
 * ----------------------------
 * MODULE 5 - SMART PURCHASE BILL SCANNER (AI)
 * MODULE 6 - AI PRODUCT MATCHING
 *
 * Flow:
 *   1. Upload a PDF/image invoice -> backend OCRs it and AI-matches each
 *      line item against the product catalog.
 *   2. Review screen: every line item is editable. Items matched with
 *      >=90% confidence are pre-selected as "update existing product";
 *      everything else defaults to "create new product" so nothing gets
 *      silently merged into the wrong item.
 *   3. Optionally set a profit margin % to auto-calculate selling prices
 *      for new/updated items that don't already have one.
 *   4. Commit -> creates the purchase bill, updates stock, and (for new
 *      items) creates the product record.
 */
import { useState } from "react";
import { UploadCloud, ScanLine, Check, AlertTriangle, Loader2, Package } from "lucide-react";
import toast from "react-hot-toast";
import { scanInvoice, commitPurchaseBill, getSuppliers, getCategories } from "../api/endpoints";
import { useEffect } from "react";

export default function PurchaseScanner() {
  const [file, setFile] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [items, setItems] = useState([]);
  const [supplierId, setSupplierId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [profitMargin, setProfitMargin] = useState(15);
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [committing, setCommitting] = useState(false);

  useEffect(() => {
    getSuppliers().then((r) => setSuppliers(r.data ?? [])).catch(() => {});
    getCategories().then((r) => setCategories(r.data ?? [])).catch(() => {});
  }, []);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setScanResult(null);
    setItems([]);
  };

  const handleScan = async () => {
    if (!file) {
      toast.error("Choose a PDF or image invoice first.");
      return;
    }
    setScanning(true);
    try {
      const res = await scanInvoice(file);
      setScanResult(res.data);
      setInvoiceNumber(res.data.invoice_number || "");
      setGstNumber(res.data.gst_number || "");
      if (res.data.matched_supplier_id) setSupplierId(String(res.data.matched_supplier_id));

      setItems(
        res.data.items.map((it) => ({
          matched_name: it.matched_name,
          quantity: it.quantity,
          purchase_price: it.purchase_price,
          selling_price: it.suggested_selling_price || "",
          product_id: it.matched_product_id || null,
          is_new_product: it.is_new_product,
          match_confidence: it.match_confidence,
          matched_product_name: it.matched_product_name,
          category_id: "",
          unit: "pcs",
          expiry_date: it.expiry_date || "",
          batch_number: it.batch_number || "",
          discount_percent: 0,
          gst_percent: 5,
        }))
      );

      if (res.data.warnings?.length) {
        res.data.warnings.forEach((w) => toast(w, { icon: "\u26A0\uFE0F" }));
      }
      toast.success(`Scanned! Found ${res.data.items.length} item(s) to review.`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "OCR scan failed. See setup notes below.");
    } finally {
      setScanning(false);
    }
  };

  const updateItem = (index, field, value) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)));
  };

  const toggleMatch = (index) => {
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, is_new_product: !it.is_new_product, product_id: it.is_new_product ? it.product_id : null } : it))
    );
  };

  const addManualItem = () => {
    setItems((prev) => [
      ...prev,
      {
        matched_name: "", quantity: 1, purchase_price: 0, selling_price: "",
        product_id: null, is_new_product: true, match_confidence: 0,
        category_id: "", unit: "pcs", expiry_date: "", batch_number: "",
        discount_percent: 0, gst_percent: 5,
      },
    ]);
  };

  const removeItem = (index) => setItems((prev) => prev.filter((_, i) => i !== index));

  const handleCommit = async () => {
    if (items.length === 0) {
      toast.error("Add at least one item before committing.");
      return;
    }
    setCommitting(true);
    try {
      const payload = {
        supplier_id: supplierId ? Number(supplierId) : null,
        invoice_number: invoiceNumber || null,
        gst_number: gstNumber || null,
        source: scanResult ? "ocr" : "manual",
        raw_ocr_text: scanResult?.raw_text || null,
        profit_margin_percent: Number(profitMargin) || null,
        items: items.map((it) => ({
          product_id: it.is_new_product ? null : it.product_id,
          matched_name: it.matched_name,
          quantity: Number(it.quantity),
          purchase_price: Number(it.purchase_price),
          selling_price: it.selling_price ? Number(it.selling_price) : null,
          discount_percent: Number(it.discount_percent) || 0,
          gst_percent: Number(it.gst_percent) || 5,
          expiry_date: it.expiry_date || null,
          batch_number: it.batch_number || null,
          is_new_product: it.is_new_product,
          category_id: it.category_id ? Number(it.category_id) : null,
          unit: it.unit || "pcs",
        })),
      };
      await commitPurchaseBill(payload);
      toast.success("Purchase bill committed! Inventory updated.");
      setFile(null);
      setScanResult(null);
      setItems([]);
      setInvoiceNumber("");
      setGstNumber("");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to commit purchase bill.");
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <ScanLine size={20} /> AI Invoice Scanner
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Upload a supplier invoice (PDF or photo) - we'll OCR it, match items against your
          catalog, and update stock automatically once you approve.
        </p>
      </div>

      {/* Upload */}
      <div className="card space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <label className="flex-1 flex items-center gap-3 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 cursor-pointer hover:border-primary-400">
            <UploadCloud size={20} className="text-gray-400" />
            <span className="text-sm text-gray-500 truncate">
              {file ? file.name : "Choose a PDF or image invoice..."}
            </span>
            <input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" className="hidden" onChange={handleFileChange} />
          </label>
          <button onClick={handleScan} disabled={scanning || !file} className="btn-primary whitespace-nowrap">
            {scanning ? <Loader2 size={16} className="animate-spin" /> : <ScanLine size={16} />}
            {scanning ? "Scanning..." : "Scan Invoice"}
          </button>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Supports PDF, PNG, JPG invoices. Items are OCR-extracted and matched against your catalog.
        </p>
      </div>

      {/* Invoice header fields (auto-filled from OCR, all editable) */}
      {(scanResult || items.length > 0) && (
        <div className="card grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="label">Supplier</label>
            <select className="input" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">Select supplier...</option>
              {suppliers.map((s) => (
                <option key={s.supplier_id} value={s.supplier_id}>{s.supplier_name}</option>
              ))}
            </select>
            {scanResult?.supplier_name && !supplierId && (
              <p className="text-xs text-amber-600 mt-1">OCR detected: "{scanResult.supplier_name}" (no match found - select manually)</p>
            )}
          </div>
          <div>
            <label className="label">Invoice Number</label>
            <input className="input" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
          </div>
          <div>
            <label className="label">GST Number</label>
            <input className="input" value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} />
          </div>
          <div>
            <label className="label">Auto profit margin %</label>
            <input type="number" className="input" value={profitMargin} onChange={(e) => setProfitMargin(e.target.value)} />
          </div>
        </div>
      )}

      {/* Line items review */}
      {items.length > 0 && (
        <div className="card space-y-3 overflow-x-auto">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm">Review Line Items ({items.length})</h2>
            <button onClick={addManualItem} className="btn-secondary text-xs">+ Add item manually</button>
          </div>
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-gray-100 dark:border-gray-700">
                <th className="py-2 pr-2">Product Name</th>
                <th className="py-2 pr-2">Match</th>
                <th className="py-2 pr-2">Qty</th>
                <th className="py-2 pr-2">Purchase ₹</th>
                <th className="py-2 pr-2">Selling ₹</th>
                <th className="py-2 pr-2">Category (new only)</th>
                <th className="py-2 pr-2">Expiry</th>
                <th className="py-2 pr-2">Batch #</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i} className="border-b border-gray-50 dark:border-gray-700/50">
                  <td className="py-2 pr-2">
                    <input className="input py-1" value={it.matched_name} onChange={(e) => updateItem(i, "matched_name", e.target.value)} />
                  </td>
                  <td className="py-2 pr-2">
                    {it.matched_product_name ? (
                      <button
                        onClick={() => toggleMatch(i)}
                        className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 whitespace-nowrap ${
                          !it.is_new_product
                            ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                            : "bg-gray-100 text-gray-500 dark:bg-gray-700"
                        }`}
                        title={`Matched to: ${it.matched_product_name} (${Math.round(it.match_confidence * 100)}% confidence)`}
                      >
                        {!it.is_new_product ? <Check size={12} /> : <Package size={12} />}
                        {Math.round(it.match_confidence * 100)}%
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">New</span>
                    )}
                  </td>
                  <td className="py-2 pr-2 w-20">
                    <input type="number" className="input py-1" value={it.quantity} onChange={(e) => updateItem(i, "quantity", e.target.value)} />
                  </td>
                  <td className="py-2 pr-2 w-24">
                    <input type="number" className="input py-1" value={it.purchase_price} onChange={(e) => updateItem(i, "purchase_price", e.target.value)} />
                  </td>
                  <td className="py-2 pr-2 w-24">
                    <input type="number" className="input py-1" placeholder="auto" value={it.selling_price} onChange={(e) => updateItem(i, "selling_price", e.target.value)} />
                  </td>
                  <td className="py-2 pr-2 w-32">
                    {it.is_new_product ? (
                      <select className="input py-1" value={it.category_id} onChange={(e) => updateItem(i, "category_id", e.target.value)}>
                        <option value="">-</option>
                        {categories.map((c) => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
                      </select>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="py-2 pr-2 w-32">
                    <input type="date" className="input py-1" value={it.expiry_date} onChange={(e) => updateItem(i, "expiry_date", e.target.value)} />
                  </td>
                  <td className="py-2 pr-2 w-24">
                    <input className="input py-1" value={it.batch_number} onChange={(e) => updateItem(i, "batch_number", e.target.value)} />
                  </td>
                  <td className="py-2">
                    <button onClick={() => removeItem(i)} className="text-red-500 text-xs hover:underline">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end pt-2">
            <button onClick={handleCommit} disabled={committing} className="btn-primary">
              {committing ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {committing ? "Committing..." : "Commit to Inventory"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

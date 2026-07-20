/**
 * components/Modal.jsx
 * -----------------------
 * Generic reusable modal dialog used by every "Add / Edit" form
 * across the app (products, categories, customers, suppliers...).
 */
import { X } from "lucide-react";

export default function Modal({ open, onClose, title, children, size = "md" }) {
  if (!open) return null;

  const sizeClass = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" }[size];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative w-full ${sizeClass} bg-white dark:bg-gray-800 rounded-xl shadow-xl max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
          <h3 className="font-semibold text-lg">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={20} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

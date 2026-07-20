/**
 * components/ConfirmDialog.jsx
 * -------------------------------
 * Small confirmation modal used before destructive actions (delete).
 */
import { AlertTriangle } from "lucide-react";
import Modal from "./Modal";

export default function ConfirmDialog({ open, onClose, onConfirm, title = "Are you sure?", message }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-red-50 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-300">
          <AlertTriangle size={20} />
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300">{message}</p>
      </div>
      <div className="flex justify-end gap-2 mt-6">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-danger" onClick={onConfirm}>Delete</button>
      </div>
    </Modal>
  );
}

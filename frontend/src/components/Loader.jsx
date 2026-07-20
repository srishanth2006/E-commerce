/**
 * components/Loader.jsx
 * ------------------------
 * Small reusable loading spinner. Use `fullPage` for a centered,
 * full-height version (e.g. while a whole page's data is loading).
 */
import { Loader2 } from "lucide-react";

export default function Loader({ fullPage = false, label = "Loading..." }) {
  if (fullPage) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3 text-gray-400">
        <Loader2 className="animate-spin text-primary-600" size={36} />
        <p className="text-sm">{label}</p>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center gap-2 text-gray-400 py-6">
      <Loader2 className="animate-spin" size={20} />
      <span className="text-sm">{label}</span>
    </div>
  );
}

import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  const pages = [];
  for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) {
    pages.push(i);
  }
  return (
    <div className="flex items-center justify-center gap-1 py-4">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30"
      >
        <ChevronLeft size={16} />
      </button>
      {pages[0] > 1 && <span className="px-2 text-gray-400">...</span>}
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={`w-8 h-8 rounded text-sm ${
            p === page
              ? "bg-primary-500 text-white"
              : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          }`}
        >
          {p}
        </button>
      ))}
      {pages[pages.length - 1] < totalPages && <span className="px-2 text-gray-400">...</span>}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

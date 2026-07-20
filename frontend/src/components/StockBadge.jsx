/**
 * components/StockBadge.jsx
 * ----------------------------
 * Color indicator for stock levels:
 *   green  -> healthy stock (well above reorder level)
 *   orange -> getting close to reorder level
 *   red    -> at/under reorder level (needs restocking urgently)
 */
export default function StockBadge({ stock, reorderLevel }) {
  let color = "green";
  let label = "In Stock";

  if (stock <= reorderLevel) {
    color = "red";
    label = "Low Stock";
  } else if (stock <= reorderLevel * 1.5) {
    color = "orange";
    label = "Getting Low";
  }

  const styles = {
    green: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    orange: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
    red: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  };

  const dot = {
    green: "bg-green-500",
    orange: "bg-orange-500",
    red: "bg-red-500",
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${styles[color]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot[color]}`} />
      {label} ({stock})
    </span>
  );
}

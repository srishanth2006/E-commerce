/**
 * components/StatCard.jsx
 * --------------------------
 * Small metric card used on the Dashboard (Total Products, Today's Sales...).
 */
export default function StatCard({ title, value, icon: Icon, color = "primary", suffix }) {
  const colorMap = {
    primary: "bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300",
    orange: "bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300",
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300",
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300",
    red: "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300",
  };

  return (
    <div className="card flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
        <p className="text-2xl font-bold mt-1">
          {value}
          {suffix && <span className="text-sm font-normal text-gray-400 ml-1">{suffix}</span>}
        </p>
      </div>
      <div className={`p-3 rounded-xl ${colorMap[color]}`}>
        <Icon size={22} />
      </div>
    </div>
  );
}

/**
 * pages/About.jsx
 * ----------------
 * About page: store story, mission/values, team, and location.
 */
import { Store, Heart, Users, MapPin } from "lucide-react";

export default function About() {
  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="text-center py-10">
        <div className="inline-flex items-center gap-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full px-4 py-1.5 text-sm font-medium mb-4">
          <Store size={16} /> Our Story
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold dark:text-white mb-4">
          About E-commerce
        </h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
          What started as a small neighbourhood shop has grown into a trusted online store serving thousands of happy customers across the city.
        </p>
      </section>

      {/* Story */}
      <section className="card max-w-3xl mx-auto">
        <h2 className="text-xl font-bold dark:text-white mb-4">Our Story</h2>
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
          E-commerce was founded in 2010 with a simple mission &mdash; to provide the freshest groceries and household essentials at fair prices. What began as a family-run shop in the heart of Chennai quickly became a favourite among local residents for its quality products and warm customer service.
        </p>
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
          In 2024, we took our store online to reach even more customers. Today, we source directly from local farmers and trusted suppliers to bring you the best products, all from the comfort of your home.
        </p>
      </section>

      {/* Mission & Values */}
      <section>
        <h2 className="text-2xl font-bold dark:text-white mb-6 text-center">Our Mission & Values</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: <Heart size={28} className="text-red-500" />,
              title: "Customer First",
              desc: "Every decision we make starts with how it benefits our customers. Your satisfaction is our success.",
            },
            {
              icon: <Store size={28} className="text-primary-600" />,
              title: "Quality Always",
              desc: "We never compromise on quality. From farm-fresh produce to trusted branded essentials, only the best makes it to our shelves.",
            },
            {
              icon: <Users size={28} className="text-amber-500" />,
              title: "Community Driven",
              desc: "We believe in giving back. We support local farmers, hire locally, and invest in our community.",
            },
          ].map((v, i) => (
            <div key={i} className="card flex flex-col items-center text-center gap-3 p-6">
              <div>{v.icon}</div>
              <h3 className="font-semibold dark:text-white">{v.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Team */}
      <section>
        <h2 className="text-2xl font-bold dark:text-white mb-6 text-center">Meet Our Team</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
          {[
            { name: "Suresh Kumar", role: "Founder & CEO", initials: "SK" },
            { name: "Lakshmi Devi", role: "Head of Operations", initials: "LD" },
            { name: "Arun Prasad", role: "Tech Lead", initials: "AP" },
          ].map((t, i) => (
            <div key={i} className="card flex flex-col items-center text-center gap-3 p-6">
              <div className="w-20 h-20 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-xl font-bold text-primary-600">
                {t.initials}
              </div>
              <h3 className="font-semibold dark:text-white">{t.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t.role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Location */}
      <section className="card max-w-3xl mx-auto">
        <h2 className="text-xl font-bold dark:text-white mb-4 flex items-center gap-2">
          <MapPin size={20} /> Visit Us
        </h2>
        <div className="rounded-lg bg-gray-200 dark:bg-gray-700 h-64 flex items-center justify-center text-gray-400 mb-4">
          <div className="text-center">
            <MapPin size={40} className="mx-auto mb-2" />
            <p>Map coming soon</p>
          </div>
        </div>
        <p className="text-gray-600 dark:text-gray-300 text-sm">
          <strong>Address:</strong> 123 Main Road, T. Nagar, Chennai, Tamil Nadu &ndash; 600017
        </p>
        <p className="text-gray-600 dark:text-gray-300 text-sm">
          <strong>Hours:</strong> Mon-Sat 8 AM &ndash; 10 PM, Sunday 9 AM &ndash; 9 PM
        </p>
      </section>
    </div>
  );
}

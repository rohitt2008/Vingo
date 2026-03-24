import React from "react";
import { useSelector } from "react-redux";
import { FiClock, FiHeart, FiMapPin, FiShoppingBag } from "react-icons/fi";
import { IoFastFoodOutline } from "react-icons/io5";

function UserDashboard() {
  const { userData, city } = useSelector((state) => state.user);

  const firstName = userData?.fullName?.split(" ")[0] || "User";

  const stats = [
    {
      title: "Orders Placed",
      value: "0",
      subtitle: "Start your first order",
      icon: <FiShoppingBag size={18} className="text-[#ff4d2d]" />,
    },
    {
      title: "Saved Items",
      value: "0",
      subtitle: "Add favorites to order faster",
      icon: <FiHeart size={18} className="text-[#ff4d2d]" />,
    },
    {
      title: "Current City",
      value: city || "Not set",
      subtitle: "Used to personalize restaurants",
      icon: <FiMapPin size={18} className="text-[#ff4d2d]" />,
    },
  ];

  return (
    <div className="w-full max-w-6xl px-4 md:px-6 pb-10">
      <section className="w-full rounded-2xl bg-white p-5 md:p-8 shadow-md border border-[#ffe4dc]">
        <p className="text-sm text-gray-500">Welcome back</p>
        <h1 className="text-2xl md:text-3xl font-bold text-[#222] mt-1">
          {firstName}, what are you craving today?
        </h1>
        <p className="text-gray-600 mt-2">
          Explore nearby restaurants, reorder your favorites, and track your
          deliveries in one place.
        </p>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-[#ffe7e1] bg-[#fff9f6] p-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">{item.title}</h3>
                {item.icon}
              </div>
              <p className="text-xl font-bold text-[#222] mt-2">{item.value}</p>
              <p className="text-xs text-gray-500 mt-1">{item.subtitle}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-2xl bg-white p-5 md:p-6 shadow-md border border-[#f1f1f1]">
          <div className="flex items-center gap-2">
            <IoFastFoodOutline className="text-[#ff4d2d]" size={20} />
            <h2 className="text-lg font-semibold text-[#222]">Quick Actions</h2>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button className="px-4 py-2 rounded-lg bg-[#ff4d2d] text-white font-medium hover:bg-[#e64323] transition-colors cursor-pointer">
              Browse Restaurants
            </button>
            <button className="px-4 py-2 rounded-lg border border-[#ff4d2d] text-[#ff4d2d] font-medium hover:bg-[#fff2ee] transition-colors cursor-pointer">
              View Cart
            </button>
            <button className="px-4 py-2 rounded-lg border border-[#ff4d2d] text-[#ff4d2d] font-medium hover:bg-[#fff2ee] transition-colors cursor-pointer">
              My Orders
            </button>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 md:p-6 shadow-md border border-[#f1f1f1]">
          <div className="flex items-center gap-2">
            <FiClock className="text-[#ff4d2d]" size={18} />
            <h2 className="text-lg font-semibold text-[#222]">Recent Orders</h2>
          </div>
          <div className="mt-4 rounded-xl border border-dashed border-gray-300 p-5 text-center bg-[#fafafa]">
            <p className="text-gray-700 font-medium">No recent orders yet</p>
            <p className="text-sm text-gray-500 mt-1">
              Your last orders will appear here for quick reordering.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default UserDashboard;

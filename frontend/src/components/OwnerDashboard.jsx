import { useSelector } from "react-redux";
import {
  FiDollarSign,
  FiList,
  FiPackage,
  FiPlusCircle,
  FiShoppingBag,
  FiTrendingUp,
} from "react-icons/fi";

function OwnerDashboard() {
  const { userData, city } = useSelector((state) => state.user);
  const firstName = userData?.fullName?.split(" ")[0] || "Owner";

  const stats = [
    {
      title: "Today's Orders",
      value: "0",
      subtitle: "Orders received today",
      icon: <FiShoppingBag size={18} className="text-[#ff4d2d]" />,
    },
    {
      title: "Active Menu Items",
      value: "0",
      subtitle: "Dishes available for ordering",
      icon: <FiList size={18} className="text-[#ff4d2d]" />,
    },
    {
      title: "Today's Revenue",
      value: "Rs 0",
      subtitle: "Net sales in your store",
      icon: <FiDollarSign size={18} className="text-[#ff4d2d]" />,
    },
  ];

  return (
    <div className="w-full max-w-6xl px-4 md:px-6 pb-10">
      <section className="w-full rounded-2xl bg-white p-5 md:p-8 shadow-md border border-[#ffe4dc]">
        <p className="text-sm text-gray-500">Owner Panel</p>
        <h1 className="text-2xl md:text-3xl font-bold text-[#222] mt-1">
          {firstName}, manage your restaurant smarter
        </h1>
        <p className="text-gray-600 mt-2">
          Track orders, manage menu items, and monitor business growth from one
          dashboard {city ? `for ${city}` : ""}.
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
            <FiPackage className="text-[#ff4d2d]" size={20} />
            <h2 className="text-lg font-semibold text-[#222]">Store Actions</h2>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button className="px-4 py-2 rounded-lg bg-[#ff4d2d] text-white font-medium hover:bg-[#e64323] transition-colors cursor-pointer flex items-center gap-2">
              <FiPlusCircle size={16} />
              Add New Item
            </button>
            <button className="px-4 py-2 rounded-lg border border-[#ff4d2d] text-[#ff4d2d] font-medium hover:bg-[#fff2ee] transition-colors cursor-pointer">
              View Orders
            </button>
            <button className="px-4 py-2 rounded-lg border border-[#ff4d2d] text-[#ff4d2d] font-medium hover:bg-[#fff2ee] transition-colors cursor-pointer">
              Manage Menu
            </button>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 md:p-6 shadow-md border border-[#f1f1f1]">
          <div className="flex items-center gap-2">
            <FiTrendingUp className="text-[#ff4d2d]" size={18} />
            <h2 className="text-lg font-semibold text-[#222]">Performance</h2>
          </div>
          <div className="mt-4 rounded-xl border border-dashed border-gray-300 p-5 text-center bg-[#fafafa]">
            <p className="text-gray-700 font-medium">No analytics yet</p>
            <p className="text-sm text-gray-500 mt-1">
              Sales insights and growth charts will appear here once orders
              start coming in.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default OwnerDashboard;

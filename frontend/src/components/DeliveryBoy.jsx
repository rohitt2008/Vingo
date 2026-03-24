import { useSelector } from "react-redux";
import {
  FiCheckCircle,
  FiClock,
  FiDollarSign,
  FiMapPin,
  FiNavigation,
  FiPackage,
  FiToggleRight,
  FiTruck,
} from "react-icons/fi";

function DeliveryBoy() {
  const { userData, city } = useSelector((state) => state.user);
  const firstName = userData?.fullName?.split(" ")[0] || "Rider";

  const stats = [
    {
      title: "Deliveries Today",
      value: "0",
      subtitle: "Completed drop-offs",
      icon: <FiCheckCircle size={18} className="text-[#ff4d2d]" />,
    },
    {
      title: "Active Deliveries",
      value: "0",
      subtitle: "Orders currently assigned",
      icon: <FiTruck size={18} className="text-[#ff4d2d]" />,
    },
    {
      title: "Today's Earnings",
      value: "Rs 0",
      subtitle: "Estimated payout today",
      icon: <FiDollarSign size={18} className="text-[#ff4d2d]" />,
    },
  ];

  return (
    <div className="w-full max-w-6xl px-4 md:px-6 pb-10">
      <section className="w-full rounded-2xl bg-white p-5 md:p-8 shadow-md border border-[#ffe4dc]">
        <p className="text-sm text-gray-500">Delivery Partner Panel</p>
        <h1 className="text-2xl md:text-3xl font-bold text-[#222] mt-1">
          {firstName}, ready for your next delivery?
        </h1>
        <p className="text-gray-600 mt-2">
          Accept nearby orders, optimize routes, and track your earnings in one
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
            <h2 className="text-lg font-semibold text-[#222]">Rider Actions</h2>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button className="px-4 py-2 rounded-lg bg-[#ff4d2d] text-white font-medium hover:bg-[#e64323] transition-colors cursor-pointer flex items-center gap-2">
              <FiNavigation size={16} />
              View Assigned Orders
            </button>
            <button className="px-4 py-2 rounded-lg border border-[#ff4d2d] text-[#ff4d2d] font-medium hover:bg-[#fff2ee] transition-colors cursor-pointer">
              Delivery History
            </button>
            <button className="px-4 py-2 rounded-lg border border-[#ff4d2d] text-[#ff4d2d] font-medium hover:bg-[#fff2ee] transition-colors cursor-pointer flex items-center gap-2">
              <FiToggleRight size={16} />
              Go Online
            </button>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 md:p-6 shadow-md border border-[#f1f1f1]">
          <div className="flex items-center gap-2">
            <FiClock className="text-[#ff4d2d]" size={18} />
            <h2 className="text-lg font-semibold text-[#222]">Current Status</h2>
          </div>
          <div className="mt-4 rounded-xl border border-dashed border-gray-300 p-5 bg-[#fafafa]">
            <div className="flex items-center gap-2 text-gray-700 font-medium">
              <FiMapPin className="text-[#ff4d2d]" size={16} />
              <span>No active route right now</span>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Accept a delivery request to view pickup/drop details and live
              route status here.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default DeliveryBoy;

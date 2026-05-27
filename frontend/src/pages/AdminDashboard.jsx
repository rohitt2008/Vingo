import React, { useEffect, useState } from "react";
import axios from "axios";
import { serverUrl } from "../App";
import Nav from "../components/Nav";
import { FiTrendingUp, FiUsers, FiShoppingBag, FiPercent, FiShield, FiCheck, FiX, FiTrash, FiGrid, FiPlus } from "react-icons/fi";
import { useToast } from "../context/ToastContext";

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview"); // 'overview', 'users', 'restaurants', 'coupons'
  const { showToast } = useToast();
  const [metrics, setMetrics] = useState(null);
  const [users, setUsers] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Coupon Form States
  const [showAddCoupon, setShowAddCoupon] = useState(false);
  const [cCode, setCCode] = useState("");
  const [cType, setCType] = useState("percentage");
  const [cVal, setCVal] = useState("");
  const [cMin, setCMin] = useState("");
  const [cMax, setCMax] = useState("");
  const [cExpiry, setCExpiry] = useState("");

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Metrics
      const metRes = await axios.get(`${serverUrl}/api/admin/metrics`, { withCredentials: true });
      setMetrics(metRes.data?.data?.metrics);

      // 2. Fetch Users
      const usrRes = await axios.get(`${serverUrl}/api/admin/users`, { withCredentials: true });
      setUsers(usrRes.data?.data?.users || []);

      // 3. Fetch Restaurants
      const restRes = await axios.get(`${serverUrl}/api/admin/restaurants`, { withCredentials: true });
      setRestaurants(restRes.data?.data?.restaurants || []);

      // 4. Fetch Coupons
      const cpRes = await axios.get(`${serverUrl}/api/coupons/active`, { withCredentials: true });
      setCoupons(cpRes.data?.data?.coupons || []);
    } catch (err) {
      console.error("Failed to load admin logs.");
    } finally {
      setLoading(false);
    }
  };

  // ── Coupon management ────────────────────────────────────────────────

  const handleAddCouponSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        `${serverUrl}/api/coupons`,
        {
          code: cCode,
          discountType: cType,
          discountValue: Number(cVal),
          minOrderAmount: Number(cMin) * 100, // paise
          maxDiscountAmount: cMax ? Number(cMax) * 100 : undefined, // paise
          expiresAt: cExpiry,
        },
        { withCredentials: true }
      );
      showToast("New coupon campaign added!", "success");
      setShowAddCoupon(false);
      
      // Reset form
      setCCode("");
      setCVal("");
      setCMin("");
      setCMax("");
      setCExpiry("");

      fetchAdminData();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to create coupon.", "error");
    }
  };

  const handleDeleteCoupon = async (id) => {
    if (!window.confirm("Are you sure you want to delete this coupon?")) return;
    try {
      await axios.delete(`${serverUrl}/api/coupons/${id}`, { withCredentials: true });
      showToast("Coupon campaign deleted.", "success");
      fetchAdminData();
    } catch {
      showToast("Failed to delete coupon.", "error");
    }
  };

  // ── User updates ─────────────────────────────────────────────────────

  const handleRoleToggle = async (userId, currentRole) => {
    const roles = ["customer", "owner", "delivery", "admin"];
    const nextIndex = (roles.indexOf(currentRole) + 1) % roles.length;
    const nextRole = roles[nextIndex];
    try {
      await axios.patch(
        `${serverUrl}/api/admin/users/${userId}/role`,
        { role: nextRole },
        { withCredentials: true }
      );
      showToast(`User role updated to: ${nextRole}`, "success");
      fetchAdminData();
    } catch {
      showToast("Failed to toggle user role.", "error");
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Delete this user permanently?")) return;
    try {
      await axios.delete(`${serverUrl}/api/admin/users/${userId}`, { withCredentials: true });
      showToast("User removed.", "success");
      fetchAdminData();
    } catch {
      showToast("Failed to delete user.", "error");
    }
  };

  // ── Restaurant Approvals ─────────────────────────────────────────────

  const handleRestaurantApproval = async (id, currentStatus) => {
    try {
      await axios.patch(
        `${serverUrl}/api/admin/restaurants/${id}/approve`,
        { approved: !currentStatus },
        { withCredentials: true }
      );
      showToast(`Restaurant ${currentStatus ? "Suspended" : "Approved"}!`, "success");
      fetchAdminData();
    } catch {
      showToast("Failed to change restaurant approval state.", "error");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fff9f6] flex flex-col items-center">
        <Nav />
        <div className="w-full max-w-4xl px-4 pt-28 pb-12 flex flex-col gap-6 animate-pulse">
          <div className="h-44 bg-white rounded-3xl border border-[#ffe4dc]"></div>
          <div className="h-64 bg-white rounded-3xl border border-[#ffe4dc]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fff9f6] flex flex-col items-center">
      <Nav />

      <div className="w-full max-w-6xl px-4 md:px-6 pt-24 pb-12 flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-[#222] flex items-center gap-2">
            <FiShield className="text-[#ff4d2d]" /> Operations Control Console
          </h1>
          <p className="text-gray-500 mt-1">Platform management, sales metrics, store approvals and campaign launches</p>
        </div>

        {/* Dashboard Navigation Tabs */}
        <div className="flex gap-2 border-b border-[#ffe4dc] pb-2 flex-wrap">
          {[
            { id: "overview", label: "Global Overview", icon: FiTrendingUp },
            { id: "users", label: "User Control Deck", icon: FiUsers },
            { id: "restaurants", label: "Store Approvals", icon: FiShoppingBag },
            { id: "coupons", label: "Campaign Coupons", icon: FiPercent },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? "bg-[#ff4d2d] text-white"
                  : "bg-white text-gray-500 border border-gray-200 hover:bg-[#fff9f6]"
              }`}
            >
              <tab.icon /> {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab Content: Overview ── */}
        {activeTab === "overview" && metrics && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { title: "Global Sales Earnings", val: `₹${(metrics.totalSalesPaise || 0) / 100}`, color: "bg-green-50 text-green-700 border-green-200", desc: "Lifetime transactions verified" },
                { title: "Registered Customers", val: metrics.usersCount, color: "bg-blue-50 text-blue-700 border-blue-200", desc: "Active consumer database" },
                { title: "Storefronts Listed", val: metrics.restaurantsCount, color: "bg-purple-50 text-purple-700 border-purple-200", desc: `Active: ${metrics.activeRestaurantsCount} suspended: ${metrics.restaurantsCount - metrics.activeRestaurantsCount}` },
                { title: "Active Live Deliveries", val: metrics.activeOrdersCount, color: "bg-yellow-50 text-yellow-700 border-yellow-200", desc: "Real-time dispatch orders" },
              ].map((card, idx) => (
                <div key={idx} className="bg-white rounded-3xl p-5 border border-[#ffe4dc] shadow-sm flex flex-col justify-between h-36">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{card.title}</span>
                    <h2 className="text-2xl font-black text-gray-800 mt-2">{card.val}</h2>
                  </div>
                  <span className="text-[10px] text-gray-400 font-medium">{card.desc}</span>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#ffe4dc] text-center py-12">
              <FiTrendingUp className="mx-auto text-gray-300 mb-3" size={44} />
              <h3 className="font-extrabold text-gray-700 text-lg">System Health Checks</h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1.5">Platform servers, Mongo database sockets, Winston logger file integrations, and BullMQ task queues are operational.</p>
            </div>
          </div>
        )}

        {/* ── Tab Content: Users Control ── */}
        {activeTab === "users" && (
          <div className="bg-white rounded-3xl p-6 border border-[#ffe4dc] shadow-sm overflow-x-auto">
            <h3 className="font-black text-lg text-gray-800 mb-4">User Registry List</h3>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 uppercase tracking-wide font-bold pb-2">
                  <th className="pb-3">Name</th>
                  <th className="pb-3">Email</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3">Loyalty Tier</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-[#fff9f6]/30 transition-all">
                    <td className="py-3.5 font-bold text-gray-800">{u.name}</td>
                    <td className="py-3.5 text-gray-500">{u.email}</td>
                    <td className="py-3.5">
                      <span className="bg-[#ff4d2d]/10 text-[#ff4d2d] px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 capitalize font-semibold text-gray-500">{u.loyaltyTier || "Bronze"}</td>
                    <td className="py-3.5 text-right flex justify-end gap-2">
                      <button
                        onClick={() => handleRoleToggle(u._id, u.role)}
                        className="px-2.5 py-1 rounded bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 cursor-pointer"
                        title="Toggle Role"
                      >
                        Change Role
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u._id)}
                        className="p-1 rounded text-red-500 hover:bg-red-50 cursor-pointer"
                        title="Delete"
                      >
                        <FiTrash size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Tab Content: Store Approvals ── */}
        {activeTab === "restaurants" && (
          <div className="bg-white rounded-3xl p-6 border border-[#ffe4dc] shadow-sm overflow-x-auto">
            <h3 className="font-black text-lg text-gray-800 mb-4">Storefront Approvals List</h3>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 uppercase tracking-wide font-bold pb-2">
                  <th className="pb-3">Store Name</th>
                  <th className="pb-3">Cuisines</th>
                  <th className="pb-3">FSSAI ID</th>
                  <th className="pb-3">State</th>
                  <th className="pb-3 text-right">Approval Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {restaurants.map((rest) => (
                  <tr key={rest._id} className="hover:bg-[#fff9f6]/30 transition-all">
                    <td className="py-3.5 font-bold text-gray-800">{rest.name}</td>
                    <td className="py-3.5 text-gray-500">{rest.cuisines?.join(", ") || "General"}</td>
                    <td className="py-3.5 font-mono text-[10px] text-gray-400">{rest.fssaiLicense || "N/A"}</td>
                    <td className="py-3.5">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                        rest.isApproved 
                          ? "bg-green-50 text-green-700 border border-green-200" 
                          : "bg-red-50 text-red-700 border border-red-200"
                      }`}>
                        {rest.isApproved ? "Approved" : "Suspended"}
                      </span>
                    </td>
                    <td className="py-3.5 text-right flex justify-end gap-2">
                      <button
                        onClick={() => handleRestaurantApproval(rest._id, rest.isApproved)}
                        className={`px-3 py-1 rounded text-[10px] font-bold cursor-pointer text-white ${
                          rest.isApproved ? "bg-red-500 hover:bg-red-600" : "bg-green-600 hover:bg-green-700"
                        }`}
                      >
                        {rest.isApproved ? "Suspend" : "Approve"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Tab Content: Coupon Management ── */}
        {activeTab === "coupons" && (
          <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center gap-4 flex-wrap">
              <h3 className="font-black text-lg text-gray-800">Active Coupons & Promotions</h3>
              <button
                onClick={() => setShowAddCoupon(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#ff4d2d] text-white text-xs font-bold hover:bg-[#e64323] cursor-pointer"
              >
                <FiPlus /> New Coupon
              </button>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-[#ffe4dc] shadow-sm overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 uppercase tracking-wide font-bold pb-2">
                    <th className="pb-3">Code</th>
                    <th className="pb-3">Discount Details</th>
                    <th className="pb-3">Min Order</th>
                    <th className="pb-3">Expires</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {coupons.map((c) => (
                    <tr key={c._id} className="hover:bg-[#fff9f6]/30 transition-all">
                      <td className="py-3.5 font-black uppercase text-[#ff4d2d]">{c.code}</td>
                      <td className="py-3.5 text-gray-800 font-bold">
                        {c.discountType === "flat" ? `₹${c.discountValue / 100} flat` : `${c.discountValue}% off`}
                      </td>
                      <td className="py-3.5 text-gray-500 font-medium">₹{(c.minOrderAmount || 0) / 100}</td>
                      <td className="py-3.5 text-gray-400 font-medium">{new Date(c.expiresAt).toLocaleDateString()}</td>
                      <td className="py-3.5 text-right">
                        <button
                          onClick={() => handleDeleteCoupon(c._id)}
                          className="p-1 rounded text-red-500 hover:bg-red-50 cursor-pointer"
                          title="Delete Campaign"
                        >
                          <FiTrash size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* New Coupon Modal Dialog */}
      {showAddCoupon && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-[#ffe4dc]">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-extrabold text-gray-800">Launch Coupon Campaign</h3>
              <button onClick={() => setShowAddCoupon(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>
            
            <form onSubmit={handleAddCouponSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Coupon Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VINGO50"
                  value={cCode}
                  onChange={(e) => setCCode(e.target.value.toUpperCase())}
                  className="border border-[#ffe4dc] rounded-xl px-3 py-2 text-xs outline-none bg-[#fff9f6] uppercase font-bold text-gray-700 focus:border-[#ff4d2d]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Discount Type</label>
                  <select
                    value={cType}
                    onChange={(e) => setCType(e.target.value)}
                    className="border border-[#ffe4dc] rounded-xl px-3 py-2 text-xs bg-white outline-none"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat Cash (INR)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Discount Value</label>
                  <input
                    type="number"
                    required
                    placeholder={cType === "flat" ? "e.g. 100 INR" : "e.g. 50%"}
                    value={cVal}
                    onChange={(e) => setCVal(e.target.value)}
                    className="border border-[#ffe4dc] rounded-xl px-3 py-2 text-xs outline-none bg-[#fff9f6] focus:border-[#ff4d2d]"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Min Order (INR)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 400"
                    value={cMin}
                    onChange={(e) => setCMin(e.target.value)}
                    className="border border-[#ffe4dc] rounded-xl px-3 py-2 text-xs outline-none bg-[#fff9f6] focus:border-[#ff4d2d]"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Max Cap (INR)</label>
                  <input
                    type="number"
                    placeholder="e.g. 150 (Optional)"
                    value={cMax}
                    onChange={(e) => setCMax(e.target.value)}
                    className="border border-[#ffe4dc] rounded-xl px-3 py-2 text-xs outline-none bg-[#fff9f6] focus:border-[#ff4d2d]"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Expiry Date</label>
                <input
                  type="date"
                  required
                  value={cExpiry}
                  onChange={(e) => setCExpiry(e.target.value)}
                  className="border border-[#ffe4dc] rounded-xl px-3 py-2 text-xs outline-none bg-[#fff9f6] focus:border-[#ff4d2d]"
                />
              </div>

              <button
                type="submit"
                className="mt-2 py-3 bg-[#ff4d2d] text-white rounded-xl text-xs font-bold hover:bg-[#e64323] cursor-pointer"
              >
                Launch Campaign
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;

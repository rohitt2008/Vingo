import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import axios from "axios";
import { serverUrl } from "../App";
import { 
  FiPlus, FiEdit, FiTrash, FiDollarSign, FiList, FiShoppingBag, 
  FiMapPin, FiClock, FiCheck, FiSettings, FiBriefcase, FiGrid, FiTrendingUp 
} from "react-icons/fi";
import { BiDish } from "react-icons/bi";

function OwnerDashboard() {
  const { userData } = useSelector((state) => state.user);

  const getImageUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    return `${serverUrl}${url}`;
  };
  
  // Restaurant state
  const [restaurant, setRestaurant] = useState(null);
  const [menu, setMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Tab control
  const [activeTab, setActiveTab] = useState("menu"); // "menu", "orders", "settings"
  
  // Orders State
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  
  // Forms & Modal states
  const [showRegForm, setShowRegForm] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  
  // Registration Form State
  const [regName, setRegName] = useState("");
  const [regDesc, setRegDesc] = useState("");
  const [regCuisines, setRegCuisines] = useState("");
  const [regStreet, setRegStreet] = useState("");
  const [regCity, setRegCity] = useState("");
  const [regState, setRegState] = useState("");
  const [regPincode, setRegPincode] = useState("");
  const [regLandmark, setRegLandmark] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPrice, setRegPrice] = useState("400");
  const [regFssai, setRegFssai] = useState("");
  const [regCover, setRegCover] = useState(null);
  const [submittingReg, setSubmittingReg] = useState(false);

  // Category Modal State
  const [catName, setCatName] = useState("");
  const [editingCatId, setEditingCatId] = useState(null);
  const [submittingCat, setSubmittingCat] = useState(false);

  // Item Modal State
  const [selectedCatId, setSelectedCatId] = useState("");
  const [itemId, setItemId] = useState(null); // if edit
  const [itemName, setItemName] = useState("");
  const [itemDesc, setItemDesc] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemFoodType, setItemFoodType] = useState("veg");
  const [itemImage, setItemImage] = useState(null);
  const [itemVariants, setItemVariants] = useState([]);
  const [itemExtras, setItemExtras] = useState([]);
  const [itemSpice, setItemSpice] = useState(["mild", "medium", "hot"]);
  const [submittingItem, setSubmittingItem] = useState(false);

  // Extra/Variant build temps
  const [tempVarName, setTempVarName] = useState("");
  const [tempVarPrice, setTempVarPrice] = useState("");
  const [tempExName, setTempExName] = useState("");
  const [tempExPrice, setTempExPrice] = useState("");

  const fetchRestaurantOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await axios.get(`${serverUrl}/api/orders/history`, { withCredentials: true });
      setOrders(res.data?.data?.orders || []);
    } catch (err) {
      console.error("Failed to fetch restaurant orders:", err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      let endpoint = `${serverUrl}/api/orders/${orderId}/status`;
      let payload = { status: newStatus };

      if (newStatus === "accepted") {
        const prepTimeStr = prompt("Enter estimated preparation time (minutes):", "30");
        if (prepTimeStr === null) return;
        const estimatedPrepTime = parseInt(prepTimeStr, 10) || 30;
        endpoint = `${serverUrl}/api/orders/${orderId}/accept`;
        payload = { estimatedPrepTime };
      } else if (newStatus === "ready") {
        endpoint = `${serverUrl}/api/orders/${orderId}/ready`;
        payload = {};
      }

      const res = await axios.patch(
        endpoint,
        payload,
        { withCredentials: true }
      );
      if (res.data?.success) {
        alert(`Order status updated to ${newStatus} successfully!`);
        fetchRestaurantOrders();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update order status.");
    }
  };

  const handlePrintTicket = (order) => {
    const printWindow = window.open("", "_blank", "width=400,height=600");
    const itemsHtml = order.items.map(it => `
      <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 5px; font-family: monospace;">
        <span>${it.quantity}x ${it.name} ${it.variant ? `(${it.variant.name})` : ''}</span>
        <span>₹${(it.price * it.quantity / 100).toFixed(2)}</span>
      </div>
      ${it.extras?.length > 0 ? `<div style="font-size: 11px; color: #555; font-family: monospace; margin-left: 15px; margin-bottom: 5px;">+ ${it.extras.map(e=>e.name).join(', ')}</div>` : ''}
      ${it.spiceLevel ? `<div style="font-size: 11px; color: #ff4d2d; font-family: monospace; margin-left: 15px; margin-bottom: 5px;">🔥 Spice: ${it.spiceLevel}</div>` : ''}
    `).join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>Kitchen Ticket - #${order._id.substring(18)}</title>
          <style>
            @media print {
              body { margin: 0; padding: 10px; }
            }
            body {
              font-family: 'Courier New', Courier, monospace;
              color: #000;
              padding: 20px;
              max-width: 300px;
              margin: 0 auto;
            }
            .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 15px; }
            .section { border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
            .footer { text-align: center; margin-top: 20px; font-size: 11px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2 style="margin: 0; font-size: 18px; font-weight: bold;">VINGO KITCHEN</h2>
            <div style="font-size: 11px; margin-top: 5px;">Order #${order._id.substring(18)}</div>
            <div style="font-size: 11px;">${new Date(order.createdAt).toLocaleString()}</div>
          </div>
          <div class="section">
            <div style="font-weight: bold; margin-bottom: 8px; font-size: 12px;">CUSTOMER:</div>
            <div style="font-size: 13px;">${order.customerId?.name || 'Guest'}</div>
            <div style="font-size: 11px; margin-top: 3px;">Type: ${order.deliveryAddress?.label || 'Delivery'}</div>
          </div>
          <div class="section">
            <div style="font-weight: bold; margin-bottom: 8px; font-size: 12px;">ITEMS:</div>
            ${itemsHtml}
          </div>
          <div class="section" style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px;">
            <span>GRAND TOTAL:</span>
            <span>₹${(order.grandTotal / 100).toFixed(2)}</span>
          </div>
          <div class="footer">
            <div>*** FOR KITCHEN USE ONLY ***</div>
            <div style="margin-top: 5px;">Vingo Logistics Platform</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  useEffect(() => {
    fetchOwnerRestaurantData();
  }, []);

  useEffect(() => {
    if (activeTab === "orders") {
      fetchRestaurantOrders();
    }
  }, [activeTab]);

  const fetchOwnerRestaurantData = async () => {
    setLoading(true);
    setError("");
    try {
      // 1. Get Owner's Restaurant
      const res = await axios.get(`${serverUrl}/api/restaurants/owner/mine`, {
        withCredentials: true,
      });

      if (res.data?.data?.restaurant) {
        const restData = res.data.data.restaurant;
        setRestaurant(restData);

        // 2. Fetch corresponding Menu
        const menuRes = await axios.get(`${serverUrl}/api/menus/${restData._id}`, {
          withCredentials: true,
        });
        setMenu(menuRes.data?.data?.menu);
      } else {
        setShowRegForm(true);
      }
    } catch (err) {
      setError("Failed to load dashboard details.");
    } finally {
      setLoading(false);
    }
  };

  // ── Register Restaurant ───────────────────────────────────────────────

  const handleRegisterRestaurant = async (e) => {
    e.preventDefault();
    setSubmittingReg(true);
    try {
      const formData = new FormData();
      formData.append("name", regName);
      formData.append("description", regDesc);
      formData.append("cuisines", JSON.stringify(regCuisines.split(",").map(c => c.trim())));
      formData.append("street", regStreet);
      formData.append("city", regCity);
      formData.append("state", regState);
      formData.append("pincode", regPincode);
      formData.append("landmark", regLandmark);
      formData.append("phone", regPhone);
      formData.append("email", regEmail);
      formData.append("priceForTwo", Number(regPrice) * 100); // convert to paise
      formData.append("fssaiLicense", regFssai);
      if (regCover) {
        formData.append("coverImage", regCover);
      }

      await axios.post(`${serverUrl}/api/restaurants`, formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });

      setShowRegForm(false);
      await fetchOwnerRestaurantData();
      alert("Restaurant registered successfully!");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to register restaurant.");
    } finally {
      setSubmittingReg(false);
    }
  };

  // ── Category Management ──────────────────────────────────────────────

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!catName.trim()) return;
    setSubmittingCat(true);
    try {
      if (editingCatId) {
        // Edit Category
        const res = await axios.put(
          `${serverUrl}/api/menus/${restaurant._id}/categories/${editingCatId}`,
          { name: catName },
          { withCredentials: true }
        );
        setMenu(res.data?.data?.menu);
      } else {
        // Add Category
        const res = await axios.post(
          `${serverUrl}/api/menus/${restaurant._id}/categories`,
          { name: catName },
          { withCredentials: true }
        );
        setMenu(res.data?.data?.menu);
      }
      setShowCatModal(false);
      setCatName("");
      setEditingCatId(null);
    } catch (err) {
      alert("Failed to save category.");
    } finally {
      setSubmittingCat(false);
    }
  };

  const handleDeleteCategory = async (catId) => {
    if (!window.confirm("Are you sure you want to delete this category and all its items?")) return;
    try {
      const res = await axios.delete(
        `${serverUrl}/api/menus/${restaurant._id}/categories/${catId}`,
        { withCredentials: true }
      );
      setMenu(res.data?.data?.menu);
    } catch (err) {
      alert("Failed to delete category.");
    }
  };

  // ── Item Management ──────────────────────────────────────────────────

  const handleOpenItemModal = (catId, item = null) => {
    setSelectedCatId(catId);
    if (item) {
      setItemId(item._id);
      setItemName(item.name);
      setItemDesc(item.description || "");
      setItemPrice(String(item.price / 100)); // convert paise to INR
      setItemFoodType(item.foodType);
      setItemVariants(item.variants || []);
      setItemExtras(item.extras || []);
      setItemSpice(item.spiceLevels || ["mild", "medium", "hot"]);
    } else {
      setItemId(null);
      setItemName("");
      setItemDesc("");
      setItemPrice("");
      setItemFoodType("veg");
      setItemVariants([]);
      setItemExtras([]);
      setItemSpice(["mild", "medium", "hot"]);
    }
    setItemImage(null);
    setShowItemModal(true);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    setSubmittingItem(true);
    try {
      const formData = new FormData();
      formData.append("name", itemName);
      formData.append("description", itemDesc);
      formData.append("price", Number(itemPrice) * 100); // paise
      formData.append("foodType", itemFoodType);
      formData.append("variants", JSON.stringify(itemVariants));
      formData.append("extras", JSON.stringify(itemExtras));
      formData.append("spiceLevels", JSON.stringify(itemSpice));
      if (itemImage) {
        formData.append("image", itemImage);
      }

      let res;
      if (itemId) {
        // Edit Item
        res = await axios.put(
          `${serverUrl}/api/menus/${restaurant._id}/categories/${selectedCatId}/items/${itemId}`,
          formData,
          {
            withCredentials: true,
            headers: { "Content-Type": "multipart/form-data" },
          }
        );
      } else {
        // Add Item
        res = await axios.post(
          `${serverUrl}/api/menus/${restaurant._id}/categories/${selectedCatId}/items`,
          formData,
          {
            withCredentials: true,
            headers: { "Content-Type": "multipart/form-data" },
          }
        );
      }

      setMenu(res.data?.data?.menu);
      setShowItemModal(false);
    } catch (err) {
      alert("Failed to save menu item.");
    } finally {
      setSubmittingItem(false);
    }
  };

  const handleDeleteItem = async (catId, item_Id) => {
    if (!window.confirm("Are you sure you want to delete this menu item?")) return;
    try {
      const res = await axios.delete(
        `${serverUrl}/api/menus/${restaurant._id}/categories/${catId}/items/${item_Id}`,
        { withCredentials: true }
      );
      setMenu(res.data?.data?.menu);
    } catch (err) {
      alert("Failed to delete item.");
    }
  };

  const handleToggleItemAvailability = async (catId, item_Id) => {
    try {
      const res = await axios.patch(
        `${serverUrl}/api/menus/${restaurant._id}/categories/${catId}/items/${item_Id}/toggle`,
        {},
        { withCredentials: true }
      );
      setMenu(res.data?.data?.menu);
    } catch (err) {
      alert("Failed to toggle availability.");
    }
  };

  // ── Helper builders for Variants/Extras ─────────────────────────────

  const addVariant = () => {
    if (!tempVarName || !tempVarPrice) return;
    setItemVariants([...itemVariants, { name: tempVarName, price: Number(tempVarPrice) * 100 }]);
    setTempVarName("");
    setTempVarPrice("");
  };

  const removeVariant = (index) => {
    setItemVariants(itemVariants.filter((_, i) => i !== index));
  };

  const addExtra = () => {
    if (!tempExName || !tempExPrice) return;
    setItemExtras([...itemExtras, { name: tempExName, price: Number(tempExPrice) * 100 }]);
    setTempExName("");
    setTempExPrice("");
  };

  const removeExtra = (index) => {
    setItemExtras(itemExtras.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center min-h-[400px] text-gray-500 font-bold">
        Fetching restaurant and menu details...
      </div>
    );
  }

  // ── First-time Registration Form View ───────────────────────────────

  if (showRegForm) {
    return (
      <div className="w-full max-w-4xl px-4 md:px-6 pb-12">
        <div className="rounded-3xl bg-white p-6 md:p-10 shadow-xl border border-[#ffe4dc]">
          <div className="flex items-center gap-3 mb-4">
            <BiDish className="text-[#ff4d2d]" size={36} />
            <h1 className="text-3xl font-extrabold text-[#222]">Register Your Restaurant</h1>
          </div>
          <p className="text-gray-500 mb-8 max-w-xl">
            Welcome to the Vingo family! Fill out this form to set up your restaurant storefront and start listing your dishes.
          </p>

          <form onSubmit={handleRegisterRestaurant} className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-700">Restaurant Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Spice Route"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="border border-[#ffe4dc] rounded-xl px-4 py-2.5 outline-none focus:border-[#ff4d2d] transition-all bg-[#fff9f6]"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-700">Cuisines (comma separated)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. North Indian, Chinese, Desserts"
                  value={regCuisines}
                  onChange={(e) => setRegCuisines(e.target.value)}
                  className="border border-[#ffe4dc] rounded-xl px-4 py-2.5 outline-none focus:border-[#ff4d2d] transition-all bg-[#fff9f6]"
                />
              </div>

              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="text-sm font-semibold text-gray-700">Description</label>
                <textarea
                  placeholder="Tell customers what makes your restaurant special..."
                  value={regDesc}
                  onChange={(e) => setRegDesc(e.target.value)}
                  rows="3"
                  className="border border-[#ffe4dc] rounded-xl px-4 py-2.5 outline-none focus:border-[#ff4d2d] transition-all bg-[#fff9f6] resize-none"
                />
              </div>

              {/* Address Fields */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-700">Street Address</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 45 Park Avenue"
                  value={regStreet}
                  onChange={(e) => setRegStreet(e.target.value)}
                  className="border border-[#ffe4dc] rounded-xl px-4 py-2.5 outline-none focus:border-[#ff4d2d] transition-all bg-[#fff9f6]"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-700">City</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mumbai"
                  value={regCity}
                  onChange={(e) => setRegCity(e.target.value)}
                  className="border border-[#ffe4dc] rounded-xl px-4 py-2.5 outline-none focus:border-[#ff4d2d] transition-all bg-[#fff9f6]"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-700">State</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maharashtra"
                  value={regState}
                  onChange={(e) => setRegState(e.target.value)}
                  className="border border-[#ffe4dc] rounded-xl px-4 py-2.5 outline-none focus:border-[#ff4d2d] transition-all bg-[#fff9f6]"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-700">Pincode</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 400001"
                  value={regPincode}
                  onChange={(e) => setRegPincode(e.target.value)}
                  className="border border-[#ffe4dc] rounded-xl px-4 py-2.5 outline-none focus:border-[#ff4d2d] transition-all bg-[#fff9f6]"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-700">Landmark (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Near City Mall"
                  value={regLandmark}
                  onChange={(e) => setRegLandmark(e.target.value)}
                  className="border border-[#ffe4dc] rounded-xl px-4 py-2.5 outline-none focus:border-[#ff4d2d] transition-all bg-[#fff9f6]"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-700">Contact Phone</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 9876543210"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  className="border border-[#ffe4dc] rounded-xl px-4 py-2.5 outline-none focus:border-[#ff4d2d] transition-all bg-[#fff9f6]"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-700">Contact Email</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. contact@spiceroute.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="border border-[#ffe4dc] rounded-xl px-4 py-2.5 outline-none focus:border-[#ff4d2d] transition-all bg-[#fff9f6]"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-700">Average Cost for Two (INR)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 400"
                  value={regPrice}
                  onChange={(e) => setRegPrice(e.target.value)}
                  className="border border-[#ffe4dc] rounded-xl px-4 py-2.5 outline-none focus:border-[#ff4d2d] transition-all bg-[#fff9f6]"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-700">FSSAI License Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 12345678901234"
                  value={regFssai}
                  onChange={(e) => setRegFssai(e.target.value)}
                  className="border border-[#ffe4dc] rounded-xl px-4 py-2.5 outline-none focus:border-[#ff4d2d] transition-all bg-[#fff9f6]"
                />
              </div>

              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="text-sm font-semibold text-gray-700">Store Cover Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setRegCover(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-600 cursor-pointer"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submittingReg}
              className="mt-4 py-3.5 rounded-2xl bg-[#ff4d2d] text-white font-extrabold text-sm hover:bg-[#e64323] transition-colors cursor-pointer text-center"
            >
              {submittingReg ? "Registering restaurant..." : "Register Restaurant"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Standard Owner Dashboard View ────────────────────────────────────

  return (
    <div className="w-full max-w-6xl px-4 md:px-6 pb-12 flex flex-col gap-6">
      {/* Restaurant Header Banner Card */}
      <div className="relative rounded-3xl overflow-hidden shadow-lg h-56 bg-gray-100 flex items-end">
        {restaurant?.coverImage ? (
          <img src={getImageUrl(restaurant.coverImage)} alt={restaurant.name} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#fff2ee] to-[#fff9f6]"></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent"></div>
        
        <div className="absolute bottom-6 left-6 right-6 text-white flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                restaurant?.isApproved ? "bg-green-500 text-white" : "bg-yellow-500 text-white"
              }`}>
                {restaurant?.isApproved ? "Approved Store" : "Pending Verification"}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black">{restaurant?.name}</h1>
            <p className="text-xs text-gray-300 mt-1 flex items-center gap-1">
              <FiMapPin className="text-[#ff4d2d]" />
              {restaurant?.address?.street}, {restaurant?.address?.city}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={async () => {
                try {
                  const res = await axios.patch(`${serverUrl}/api/restaurants/${restaurant._id}/toggle`, {}, { withCredentials: true });
                  setRestaurant(res.data?.data?.restaurant);
                } catch {
                  alert("Failed to toggle status.");
                }
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all ${
                restaurant?.isOpen 
                  ? "bg-green-500 hover:bg-green-600 text-white" 
                  : "bg-red-500 hover:bg-red-600 text-white"
              }`}
            >
              {restaurant?.isOpen ? "● STORE OPEN" : "○ STORE CLOSED"}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#ffe4dc] gap-4">
        {[
          { id: "menu", label: "Menu Management", icon: <FiGrid /> },
          { id: "orders", label: "Order List", icon: <FiShoppingBag /> },
          { id: "settings", label: "Analytics & Stats", icon: <FiTrendingUp /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === tab.id
                ? "border-[#ff4d2d] text-[#ff4d2d]"
                : "border-transparent text-gray-500 hover:text-[#ff4d2d]"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active Tab Screen */}
      {activeTab === "menu" && (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Menu Category Manager</h2>
              <p className="text-xs text-gray-500 mt-1">Organize your dishes into categories so customers can browse easily</p>
            </div>
            
            <button
              onClick={() => {
                setEditingCatId(null);
                setCatName("");
                setShowCatModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#ff4d2d] text-white text-xs font-bold hover:bg-[#e64323] transition-colors cursor-pointer shadow-sm"
            >
              <FiPlus /> Add Category
            </button>
          </div>

          {menu?.categories?.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-[#ffe4dc] p-8 shadow-sm">
              <FiList className="mx-auto text-gray-300 mb-4" size={48} />
              <h3 className="text-lg font-bold text-gray-700">No Categories Yet</h3>
              <p className="text-sm text-gray-500 mt-1">Create your first category (e.g. Mains, Starters) to add food items.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {menu?.categories?.map((cat) => (
                <div key={cat._id} className="bg-white rounded-3xl p-6 shadow-sm border border-[#ffe4dc]">
                  {/* Category Title bar */}
                  <div className="flex items-center justify-between gap-4 border-b border-[#fff2ee] pb-4 mb-5">
                    <div className="flex items-center gap-3">
                      <span className="bg-[#fff2ee] text-[#ff4d2d] font-black text-xs px-3 py-1.5 rounded-lg">
                        {cat.items?.length || 0} ITEMS
                      </span>
                      <h3 className="text-lg font-black text-gray-800">{cat.name}</h3>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingCatId(cat._id);
                          setCatName(cat.name);
                          setShowCatModal(true);
                        }}
                        className="p-2 text-gray-500 hover:text-blue-600 rounded-lg hover:bg-gray-50 cursor-pointer"
                        title="Edit Category Name"
                      >
                        <FiEdit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat._id)}
                        className="p-2 text-gray-500 hover:text-red-600 rounded-lg hover:bg-gray-50 cursor-pointer"
                        title="Delete Category"
                      >
                        <FiTrash size={16} />
                      </button>
                      <button
                        onClick={() => handleOpenItemModal(cat._id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#fff2ee] text-[#ff4d2d] text-xs font-bold hover:bg-[#ffe4dc] transition-colors cursor-pointer"
                      >
                        <FiPlus size={14} /> Add Item
                      </button>
                    </div>
                  </div>

                  {/* Items List */}
                  {cat.items?.length === 0 ? (
                    <p className="text-xs text-gray-400 py-4 text-center">No food dishes in this category yet. Click "Add Item" above.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {cat.items?.map((item) => (
                        <div key={item._id} className="bg-[#fff9f6] border border-[#ffe7e1] rounded-2xl p-4 flex gap-4 items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-16 h-16 rounded-xl bg-gray-50 overflow-hidden shrink-0 border border-gray-100">
                              {item.image ? (
                                <img src={getImageUrl(item.image)} alt={item.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[#ff4d2d]/30"><BiDish size={24} /></div>
                              )}
                            </div>
                            
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${item.foodType === "veg" ? "bg-green-500" : "bg-red-500"}`}></span>
                                <h4 className="font-bold text-gray-800 truncate text-sm">{item.name}</h4>
                              </div>
                              <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[180px]">{item.description}</p>
                              <p className="text-xs font-extrabold text-[#ff4d2d] mt-1">₹{item.price / 100}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Available toggle */}
                            <button
                              onClick={() => handleToggleItemAvailability(cat._id, item._id)}
                              className={`px-2.5 py-1 rounded text-[10px] font-extrabold uppercase transition-all cursor-pointer shrink-0 ${
                                item.isAvailable 
                                  ? "bg-green-50 text-green-700 border border-green-200" 
                                  : "bg-red-50 text-red-700 border border-red-200"
                              }`}
                            >
                              {item.isAvailable ? "In Stock" : "Out of Stock"}
                            </button>

                            <button
                              onClick={() => handleOpenItemModal(cat._id, item)}
                              className="p-1.5 text-gray-400 hover:text-[#ff4d2d] rounded-lg cursor-pointer"
                            >
                              <FiEdit size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(cat._id, item._id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg cursor-pointer"
                            >
                              <FiTrash size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "orders" && (
        <div className="w-full flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-gray-800">Order Dispatch Center</h2>
            <button 
              onClick={fetchRestaurantOrders}
              className="px-4 py-2 bg-[#ff4d2d]/10 hover:bg-[#ff4d2d]/20 text-[#ff4d2d] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              Refresh Orders
            </button>
          </div>

          {loadingOrders ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-[#ffe4dc]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff4d2d] mx-auto"></div>
              <p className="text-sm text-gray-500 mt-4 font-bold">Synchronizing real-time order feed...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 shadow-sm border border-[#ffe4dc] text-center">
              <FiShoppingBag className="mx-auto text-gray-300 mb-4" size={48} />
              <h3 className="text-lg font-bold text-gray-700">No Incoming Orders Yet</h3>
              <p className="text-sm text-gray-500 mt-1">Pending and active customer orders will appear here automatically.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {orders.map((ord) => (
                <div key={ord._id} className="bg-white rounded-3xl p-6 border border-[#ffe4dc] shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4">
                  {/* Top Bar info */}
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#fff2ee] pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-gray-400">ORDER ID:</span>
                        <span className="text-xs font-mono font-black text-gray-700">{ord._id}</span>
                      </div>
                      <div className="text-[10px] text-gray-400 font-bold mt-0.5">
                        Placed on {new Date(ord.createdAt).toLocaleString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        {ord.paymentMethod.toUpperCase()} (₹{ord.grandTotal / 100})
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-extrabold capitalize ${
                        ord.status === "pending" ? "bg-amber-50 text-amber-600 border border-amber-200" :
                        ord.status === "confirmed" ? "bg-purple-50 text-purple-600 border border-purple-200" :
                        ord.status === "preparing" ? "bg-blue-50 text-blue-600 border border-blue-200" :
                        ord.status === "out_for_delivery" ? "bg-orange-50 text-orange-600 border border-orange-200" :
                        ord.status === "delivered" ? "bg-green-50 text-green-600 border border-green-200" :
                        "bg-red-50 text-red-600 border border-red-200"
                      }`}>
                        {ord.status.replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>

                  {/* Customer and Logistics Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                    <div>
                      <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Customer Details</h4>
                      <p className="font-extrabold text-gray-800">{ord.customerId?.name || "Anonymous User"}</p>
                      <p className="text-gray-500 text-xs mt-0.5">📞 {ord.customerId?.phone || "No phone added"}</p>
                      <p className="text-gray-500 text-xs">✉️ {ord.customerId?.email || "No email"}</p>
                    </div>

                    <div>
                      <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Delivery Address</h4>
                      <p className="font-bold text-gray-700">
                        {ord.deliveryAddress.street}, {ord.deliveryAddress.city}, {ord.deliveryAddress.state} - {ord.deliveryAddress.pincode}
                      </p>
                      <span className="inline-block mt-1 bg-[#fff2ee] text-[#ff4d2d] text-[10px] font-black px-2 py-0.5 rounded-full">
                        {ord.deliveryAddress.label || "Home"}
                      </span>
                    </div>
                  </div>

                  {/* Food Items list */}
                  <div className="bg-[#fff9f6] rounded-2xl p-4 border border-[#ffe4dc]">
                    <h4 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Items Ordered</h4>
                    <div className="flex flex-col gap-2">
                      {ord.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs border-b border-[#fff2ee] last:border-b-0 pb-1.5 last:pb-0">
                          <div>
                            <span className="font-extrabold text-gray-800">{it.quantity} x {it.name}</span>
                            {it.variant && (
                              <span className="text-[10px] text-gray-400 font-bold ml-2">({it.variant.name})</span>
                            )}
                            {it.spiceLevel && (
                              <span className="text-[10px] text-orange-500 font-bold ml-2">🔥 {it.spiceLevel}</span>
                            )}
                            {it.extras?.length > 0 && (
                              <div className="text-[10px] text-gray-400 font-medium mt-0.5 ml-4">
                                + {it.extras.map(e => e.name).join(", ")}
                              </div>
                            )}
                          </div>
                          <span className="font-extrabold text-gray-700">₹{it.price * it.quantity / 100}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Workflow Status Controls */}
                  <div className="flex flex-wrap gap-2 justify-between items-center pt-3 border-t border-[#fff2ee] mt-2">
                    <button
                      onClick={() => handlePrintTicket(ord)}
                      className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 border border-gray-300"
                    >
                      🖨️ Print Ticket
                    </button>

                    <div className="flex gap-2">
                      {ord.status === "pending" && (
                        <>
                          <button
                            onClick={() => handleUpdateStatus(ord._id, "cancelled")}
                            className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold transition-all cursor-pointer border border-red-200"
                          >
                            Reject / Cancel
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(ord._id, "confirmed")}
                            className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-green-600/20"
                          >
                            Accept & Confirm
                          </button>
                        </>
                      )}

                      {ord.status === "confirmed" && (
                        <button
                          onClick={() => handleUpdateStatus(ord._id, "accepted")}
                          className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md"
                        >
                          Accept Order 📋
                        </button>
                      )}

                      {ord.status === "accepted" && (
                        <button
                          onClick={() => handleUpdateStatus(ord._id, "preparing")}
                          className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md"
                        >
                          Start Cooking 🍳
                        </button>
                      )}

                      {ord.status === "preparing" && (
                        <button
                          onClick={() => handleUpdateStatus(ord._id, "ready")}
                          className="px-5 py-2 bg-[#ff4d2d] hover:bg-[#e64323] text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-[#ff4d2d]/25"
                        >
                          Mark Ready 📦
                        </button>
                      )}

                      {ord.status === "ready" && (
                        <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl">
                          Ready & Awaiting Rider Accept... 🛵
                        </span>
                      )}

                      {ord.status === "out_for_delivery" && (
                        <div className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 px-4 py-2 rounded-xl">
                          Rider is actively delivering this order 🚀
                        </div>
                      )}

                      {ord.status === "delivered" && (
                        <div className="text-xs font-bold text-green-600 bg-green-50 border border-green-200 px-4 py-2 rounded-xl flex items-center gap-1">
                          Order Completed & Delivered!
                        </div>
                      )}

                      {ord.status === "cancelled" && (
                        <span className="text-xs font-bold text-red-500 bg-red-50 border border-red-200 px-4 py-2 rounded-xl">
                          Cancelled
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "settings" && (
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-[#ffe4dc] text-center">
          <FiTrendingUp className="mx-auto text-gray-300 mb-4" size={48} />
          <h3 className="text-lg font-bold text-gray-700">Store Analytics</h3>
          <p className="text-sm text-gray-500 mt-1">Earnings graphs, customer reviews rating stats, and growth history will render here.</p>
        </div>
      )}

      {/* ── Category Modal ──────────────────────────────────────────────── */}
      {showCatModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-[#ffe4dc]">
            <h3 className="text-lg font-extrabold text-gray-800 mb-4">
              {editingCatId ? "Edit Category Name" : "Create New Category"}
            </h3>
            
            <form onSubmit={handleSaveCategory} className="flex flex-col gap-4">
              <input
                type="text"
                required
                placeholder="e.g. Starters, Main Course, Shakes"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                className="w-full border border-[#ffe4dc] rounded-xl px-4 py-2.5 outline-none focus:border-[#ff4d2d] transition-all bg-[#fff9f6]"
              />
              
              <div className="flex gap-2 justify-end mt-2">
                <button
                  type="button"
                  onClick={() => setShowCatModal(false)}
                  className="px-4 py-2 rounded-xl text-gray-500 text-xs font-semibold hover:bg-gray-100 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCat}
                  className="px-5 py-2 rounded-xl bg-[#ff4d2d] text-white text-xs font-bold hover:bg-[#e64323] transition-all cursor-pointer"
                >
                  {submittingCat ? "Saving..." : "Save Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Item Add/Edit Modal ────────────────────────────────────────── */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-[#ffe4dc] flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-[#fff2ee] flex items-center justify-between shrink-0">
              <h3 className="text-lg font-extrabold text-gray-800">
                {itemId ? "Edit Menu Item" : "Add Menu Item"}
              </h3>
              <button onClick={() => setShowItemModal(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleSaveItem} className="p-6 overflow-y-auto flex-1 flex flex-col gap-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                  <label className="text-xs font-bold text-gray-600">Item Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Paneer Butter Masala"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    className="border border-[#ffe4dc] rounded-xl px-3 py-2 text-sm outline-none focus:border-[#ff4d2d] bg-[#fff9f6]"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-600">Base Price (INR)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 240"
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                    className="border border-[#ffe4dc] rounded-xl px-3 py-2 text-sm outline-none focus:border-[#ff4d2d] bg-[#fff9f6]"
                  />
                </div>

                <div className="flex flex-col gap-1.5 col-span-2">
                  <label className="text-xs font-bold text-gray-600">Short Description</label>
                  <input
                    type="text"
                    placeholder="Brief details about ingredients, portion size..."
                    value={itemDesc}
                    onChange={(e) => setItemDesc(e.target.value)}
                    className="border border-[#ffe4dc] rounded-xl px-3 py-2 text-sm outline-none focus:border-[#ff4d2d] bg-[#fff9f6]"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-600">Food Type</label>
                  <select
                    value={itemFoodType}
                    onChange={(e) => setItemFoodType(e.target.value)}
                    className="border border-[#ffe4dc] rounded-xl px-3 py-2 text-sm outline-none focus:border-[#ff4d2d] bg-[#fff9f6]"
                  >
                    <option value="veg">Veg</option>
                    <option value="non-veg">Non-Veg</option>
                    <option value="vegan">Vegan</option>
                    <option value="jain">Jain</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-600">Dish Image File</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setItemImage(e.target.files?.[0] || null)}
                    className="text-xs w-full cursor-pointer"
                  />
                </div>
              </div>

              {/* Advanced: Variants */}
              <div className="border-t border-[#fff2ee] pt-4">
                <h4 className="text-xs font-extrabold text-gray-600 mb-2 uppercase tracking-wide">Variants / Sizes</h4>
                <div className="flex flex-col gap-2 bg-[#fff9f6] p-3 rounded-2xl border border-[#ffe7e1] mb-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Size: e.g. Medium, Large"
                      value={tempVarName}
                      onChange={(e) => setTempVarName(e.target.value)}
                      className="border border-[#ffe4dc] rounded-lg px-2.5 py-1.5 text-xs bg-white flex-1"
                    />
                    <input
                      type="number"
                      placeholder="Price INR"
                      value={tempVarPrice}
                      onChange={(e) => setTempVarPrice(e.target.value)}
                      className="border border-[#ffe4dc] rounded-lg px-2.5 py-1.5 text-xs bg-white w-24"
                    />
                    <button
                      type="button"
                      onClick={addVariant}
                      className="px-3 py-1.5 rounded-lg bg-[#ff4d2d] text-white text-xs font-bold hover:bg-[#e64323]"
                    >
                      Add
                    </button>
                  </div>
                  {itemVariants.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {itemVariants.map((v, idx) => (
                        <span key={idx} className="flex items-center gap-1.5 bg-white border border-[#ffe4dc] text-xs px-2.5 py-1 rounded-full text-gray-700 font-semibold shadow-xs">
                          {v.name} (₹{v.price / 100})
                          <button type="button" onClick={() => removeVariant(idx)} className="text-red-500 font-bold hover:scale-110">✕</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Advanced: Extras */}
              <div className="border-t border-[#fff2ee] pt-4">
                <h4 className="text-xs font-extrabold text-gray-600 mb-2 uppercase tracking-wide">Extras / Add-ons</h4>
                <div className="flex flex-col gap-2 bg-[#fff9f6] p-3 rounded-2xl border border-[#ffe7e1] mb-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Extra: e.g. Extra Cheese"
                      value={tempExName}
                      onChange={(e) => setTempExName(e.target.value)}
                      className="border border-[#ffe4dc] rounded-lg px-2.5 py-1.5 text-xs bg-white flex-1"
                    />
                    <input
                      type="number"
                      placeholder="Price INR"
                      value={tempExPrice}
                      onChange={(e) => setTempExPrice(e.target.value)}
                      className="border border-[#ffe4dc] rounded-lg px-2.5 py-1.5 text-xs bg-white w-24"
                    />
                    <button
                      type="button"
                      onClick={addExtra}
                      className="px-3 py-1.5 rounded-lg bg-[#ff4d2d] text-white text-xs font-bold hover:bg-[#e64323]"
                    >
                      Add
                    </button>
                  </div>
                  {itemExtras.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {itemExtras.map((ex, idx) => (
                        <span key={idx} className="flex items-center gap-1.5 bg-white border border-[#ffe4dc] text-xs px-2.5 py-1 rounded-full text-gray-700 font-semibold shadow-xs">
                          {ex.name} (+₹{ex.price / 100})
                          <button type="button" onClick={() => removeExtra(idx)} className="text-red-500 font-bold hover:scale-110">✕</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-[#fff2ee]">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="px-4 py-2 rounded-xl text-gray-500 text-xs font-semibold hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingItem}
                  className="px-5 py-2.5 rounded-xl bg-[#ff4d2d] text-white text-xs font-bold hover:bg-[#e64323] cursor-pointer"
                >
                  {submittingItem ? "Saving..." : "Save Dish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default OwnerDashboard;

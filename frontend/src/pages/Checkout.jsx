import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { serverUrl } from "../App";
import Nav from "../components/Nav";
import { FiShoppingBag, FiMapPin, FiGift, FiCreditCard, FiTrash, FiDollarSign } from "react-icons/fi";
import { BiDish } from "react-icons/bi";

import { useToast } from "../context/ToastContext";

function Checkout() {
  const navigate = useNavigate();
  const { userData } = useSelector((state) => state.user);
  const { showToast } = useToast();

  // Cart & Pricing states
  const [cart, setCart] = useState({ items: [] });
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");

  // Address Options
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showAddAddress, setShowAddAddress] = useState(false);
  
  // New address form
  const [addrLabel, setAddrLabel] = useState("Home");
  const [addrStreet, setAddrStreet] = useState("");
  const [addrCity, setAddrCity] = useState("");
  const [addrState, setAddrState] = useState("");
  const [addrPincode, setAddrPincode] = useState("");

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponErr, setCouponErr] = useState("");
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  // Payment Mode
  const [paymentMethod, setPaymentMethod] = useState("cod"); // 'cod', 'wallet', 'online'
  const [walletBalance, setWalletBalance] = useState(0);

  useEffect(() => {
    fetchCartAndDetails();
  }, []);

  const fetchCartAndDetails = async () => {
    setLoading(true);
    setError("");
    try {
      // 1. Fetch Cart from Backend
      const cartRes = await axios.get(`${serverUrl}/api/cart`, { withCredentials: true });
      const fetchedCart = cartRes.data?.data?.cart || { items: [] };
      setCart(fetchedCart);

      if (fetchedCart.restaurantId) {
        // 2. Fetch Restaurant Info
        const restRes = await axios.get(`${serverUrl}/api/restaurants/${fetchedCart.restaurantId}`, {
          withCredentials: true,
        });
        setRestaurant(restRes.data?.data?.restaurant);
      }

      // 3. Fetch User profile to get addresses & wallet balance
      const userRes = await axios.get(`${serverUrl}/api/wallet`, { withCredentials: true });
      setWalletBalance(userRes.data?.data?.balance || 0);

      // Fetch active addresses from the user object
      const profileRes = await axios.get(`${serverUrl}/api/auth/current`, { withCredentials: true });
      const userAddresses = profileRes.data?.data?.user?.addresses || [];
      setAddresses(userAddresses);
      if (userAddresses.length > 0) {
        setSelectedAddress(userAddresses[0]);
      }
    } catch (err) {
      console.error("Checkout details load error details:", err);
      setError(`Failed to load checkout details: ${err.response?.data?.message || err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  // ── Address Handlers ──────────────────────────────────────────────────

  const handleAddAddressSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(
        `${serverUrl}/api/auth/address`,
        {
          label: addrLabel,
          street: addrStreet,
          city: addrCity,
          state: addrState,
          pincode: addrPincode,
        },
        { withCredentials: true }
      );
      
      const updatedAddrs = res.data?.data?.addresses || [];
      setAddresses(updatedAddrs);
      setSelectedAddress(updatedAddrs[updatedAddrs.length - 1]);
      setShowAddAddress(false);
      
      // Reset form
      setAddrStreet("");
      setAddrCity("");
      setAddrState("");
      setAddrPincode("");
    } catch (err) {
      showToast("Failed to add address.", "error");
    }
  };

  // ── Cart Manipulation ────────────────────────────────────────────────

  const handleRemoveItem = async (item) => {
    try {
      const res = await axios.post(
        `${serverUrl}/api/cart/remove`,
        { ...item, forceRemove: true },
        { withCredentials: true }
      );
      const updatedCart = res.data?.data?.cart || { items: [] };
      setCart(updatedCart);
      
      if (!updatedCart.restaurantId) {
        setRestaurant(null);
      }
    } catch (cmdError) {
      showToast("Failed to remove item.", "error");
    }
  };

  // ── Coupon Verification ──────────────────────────────────────────────

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setCouponErr("");
    setValidatingCoupon(true);
    try {
      const res = await axios.post(
        `${serverUrl}/api/coupons/validate`,
        { code: couponCode, orderAmount: subtotal },
        { withCredentials: true }
      );
      setAppliedCoupon(res.data?.data);
      showToast("Coupon applied successfully!", "success");
    } catch (err) {
      setCouponErr(err.response?.data?.message || "Invalid Coupon Code");
      setAppliedCoupon(null);
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponErr("");
  };

  // ── Pricing Breakdowns ───────────────────────────────────────────────

  const subtotal = cart.items.reduce((sum, item) => {
    let itemPrice = Number(item.price);
    if (item.variant?.price) {
      itemPrice = Number(item.variant.price);
    }
    const extrasSum = (item.extras || []).reduce((s, ex) => s + Number(ex.price), 0);
    return sum + (itemPrice + extrasSum) * item.quantity;
  }, 0);

  const deliveryFee = restaurant?.deliveryFee || 0;
  const taxAmount = Math.round(subtotal * 0.05); // 5% tax
  const discountAmount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const grandTotal = Math.max(0, subtotal + deliveryFee + taxAmount - discountAmount);

  // ── Order Placement ──────────────────────────────────────────────────

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      showToast("Please select a delivery address.", "warning");
      return;
    }
    if (paymentMethod === "wallet" && walletBalance < grandTotal) {
      showToast("Insufficient wallet balance. Please top up or choose another payment method.", "warning");
      return;
    }

    setPlacing(true);
    try {
      const orderPayload = {
        restaurantId: cart.restaurantId,
        items: cart.items,
        couponCode: appliedCoupon?.code,
        paymentMethod,
        deliveryAddress: {
          label: selectedAddress.label,
          street: selectedAddress.street,
          city: selectedAddress.city,
          state: selectedAddress.state,
          pincode: selectedAddress.pincode,
        },
      };

      const res = await axios.post(`${serverUrl}/api/orders`, orderPayload, {
        withCredentials: true,
      });

      const orderData = res.data?.data?.order;

      if (paymentMethod === "online") {
        // Launch Online Payment Flow
        launchRazorpayCheckout(orderData);
      } else {
        showToast("Order placed successfully!", "success");
        navigate("/orders");
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to place order.", "error");
    } finally {
      setPlacing(false);
    }
  };

  const launchRazorpayCheckout = (order) => {
    // Standard mock verification fallback in frontend for testing convenience
    const rpDetails = order.paymentDetails;
    
    const options = {
      key: "rzp_test_mockkey", // Placeholder
      amount: order.grandTotal,
      currency: "INR",
      name: "Vingo Enterprise",
      description: `Payment for Order #${order._id.substring(18)}`,
      order_id: rpDetails.razorpayOrderId,
      handler: async (response) => {
        try {
          await axios.post(
            `${serverUrl}/api/orders/verify-payment`,
            {
              orderId: order._id,
              razorpayOrderId: response.razorpay_order_id || rpDetails.razorpayOrderId,
              razorpayPaymentId: response.razorpay_payment_id || `pay_mock_${Math.random().toString(36).substring(2, 9)}`,
              razorpaySignature: response.razorpay_signature || "mock_signature",
            },
            { withCredentials: true }
          );
          showToast("Online payment verified successfully!", "success");
          navigate("/orders");
        } catch {
          showToast("Payment verification failed.", "error");
        }
      },
      prefill: {
        name: userData?.name || "Customer",
        email: userData?.email || "customer@vingo.com",
      },
      theme: { color: "#ff4d2d" },
    };

    // If Razorpay SDK is available, trigger checkout, else automatically simulate success!
    if (window.Razorpay) {
      const rzp = new window.Razorpay(options);
      rzp.open();
    } else {
      console.warn("Razorpay SDK not loaded. Simulating successful checkout...");
      setTimeout(() => {
        options.handler({
          razorpay_order_id: rpDetails.razorpayOrderId,
          razorpay_payment_id: `pay_mock_${Math.random().toString(36).substring(2, 9)}`,
          razorpay_signature: "mock_signature",
        });
      }, 1500);
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

  if (error) {
    return (
      <div className="min-h-screen bg-[#fff9f6] flex flex-col items-center justify-center p-6">
        <Nav />
        <div className="text-center bg-white p-10 rounded-3xl shadow-md border border-red-100 max-w-md mt-20">
          <FiShoppingBag size={48} className="mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-gray-800">Checkout Error</h2>
          <p className="text-red-500 mt-2 font-medium">{error}</p>
          <button
            onClick={fetchCartAndDetails}
            className="mt-6 px-6 py-2.5 rounded-full bg-[#ff4d2d] text-white font-semibold hover:bg-[#e64323] transition-colors cursor-pointer"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-[#fff9f6] flex flex-col items-center justify-center p-6">
        <Nav />
        <div className="text-center bg-white p-10 rounded-3xl shadow-md border border-[#ffe4dc] max-w-md mt-20">
          <FiShoppingBag size={48} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-bold text-gray-800">Your Cart is Empty</h2>
          <p className="text-gray-500 mt-2">Add delicious meals from your favorite restaurants and check them out here.</p>
          <button
            onClick={() => navigate("/restaurants")}
            className="mt-6 px-6 py-2.5 rounded-full bg-[#ff4d2d] text-white font-semibold hover:bg-[#e64323] transition-colors cursor-pointer"
          >
            Browse Restaurants
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fff9f6] flex flex-col items-center">
      <Nav />

      <div className="w-full max-w-5xl px-4 md:px-6 pt-24 pb-12">
        <h1 className="text-3xl font-extrabold text-[#222] mb-2 flex items-center gap-2">
          <FiShoppingBag className="text-[#ff4d2d]" /> Complete Your Order
        </h1>
        <p className="text-gray-500 mb-8">Secure checkout from {restaurant?.name || "Restaurant"}</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Checkout Steps Column */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Step 1: Delivery Address */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#ffe4dc]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-extrabold text-lg text-gray-800 flex items-center gap-2">
                  <FiMapPin className="text-[#ff4d2d]" /> 1. Delivery Address
                </h3>
                {!showAddAddress && (
                  <button
                    onClick={() => setShowAddAddress(true)}
                    className="text-xs font-bold text-[#ff4d2d] hover:underline"
                  >
                    + Add New
                  </button>
                )}
              </div>

              {showAddAddress ? (
                <form onSubmit={handleAddAddressSubmit} className="flex flex-col gap-4 border border-[#fff2ee] p-4 rounded-2xl bg-[#fff9f6]">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Add New Address</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1 col-span-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Address Label</label>
                      <select
                        value={addrLabel}
                        onChange={(e) => setAddrLabel(e.target.value)}
                        className="border border-[#ffe4dc] rounded-xl px-3 py-2 text-sm bg-white outline-none"
                      >
                        <option value="Home">Home</option>
                        <option value="Work">Work</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1 col-span-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Street Address</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 56 Baker Street"
                        value={addrStreet}
                        onChange={(e) => setAddrStreet(e.target.value)}
                        className="border border-[#ffe4dc] rounded-xl px-3 py-2 text-sm outline-none bg-white focus:border-[#ff4d2d]"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">City</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Mumbai"
                        value={addrCity}
                        onChange={(e) => setAddrCity(e.target.value)}
                        className="border border-[#ffe4dc] rounded-xl px-3 py-2 text-sm outline-none bg-white focus:border-[#ff4d2d]"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">State</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Maharashtra"
                        value={addrState}
                        onChange={(e) => setAddrState(e.target.value)}
                        className="border border-[#ffe4dc] rounded-xl px-3 py-2 text-sm outline-none bg-white focus:border-[#ff4d2d]"
                      />
                    </div>

                    <div className="flex flex-col gap-1 col-span-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Pincode</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 400001"
                        value={addrPincode}
                        onChange={(e) => setAddrPincode(e.target.value)}
                        className="border border-[#ffe4dc] rounded-xl px-3 py-2 text-sm outline-none bg-white focus:border-[#ff4d2d]"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end mt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddAddress(false)}
                      className="px-4 py-1.5 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[#ff4d2d] text-white hover:bg-[#e64323] cursor-pointer"
                    >
                      Save Address
                    </button>
                  </div>
                </form>
              ) : addresses.length === 0 ? (
                <p className="text-xs text-gray-400">No delivery address saved. Click "+ Add New" to save one.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {addresses.map((addr) => (
                    <label
                      key={addr._id}
                      className={`p-3.5 rounded-2xl border cursor-pointer flex gap-3 transition-all ${
                        selectedAddress?._id === addr._id
                          ? "bg-[#fff2ee] border-[#ff4d2d] font-bold text-[#ff4d2d]"
                          : "bg-white border-gray-200 hover:bg-[#fff9f6]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="address"
                        checked={selectedAddress?._id === addr._id}
                        onChange={() => setSelectedAddress(addr)}
                        className="accent-[#ff4d2d] self-start mt-1"
                      />
                      <div className="text-xs">
                        <span className="bg-[#ff4d2d] text-white text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-wide inline-block mb-1.5">
                          {addr.label}
                        </span>
                        <p className="text-gray-800 line-clamp-1">{addr.street}</p>
                        <p className="text-gray-400 mt-0.5">{addr.city}, {addr.pincode}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Step 2: Payment Method */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#ffe4dc]">
              <h3 className="font-extrabold text-lg text-gray-800 flex items-center gap-2 mb-4">
                <FiCreditCard className="text-[#ff4d2d]" /> 2. Select Payment Method
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: "cod", label: "Cash On Delivery", desc: "Pay with cash at door" },
                  { id: "wallet", label: `Wallet (₹${walletBalance / 100})`, desc: "Fast instant debit" },
                  { id: "online", label: "Online Card/UPI", desc: "Razorpay Secure Gate" },
                ].map((pay) => (
                  <label
                    key={pay.id}
                    className={`p-4 rounded-2xl border cursor-pointer flex flex-col justify-between transition-all ${
                      paymentMethod === pay.id
                        ? "bg-[#fff2ee] border-[#ff4d2d] text-[#ff4d2d] font-bold"
                        : "bg-white border-gray-200 hover:bg-[#fff9f6]"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2 text-xs">
                      <input
                        type="radio"
                        name="payment"
                        checked={paymentMethod === pay.id}
                        onChange={() => setPaymentMethod(pay.id)}
                        className="accent-[#ff4d2d]"
                      />
                      {pay.label}
                    </div>
                    <span className="text-[10px] text-gray-400 font-medium block">{pay.desc}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Cart Items Details Review */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#ffe4dc]">
              <h3 className="font-extrabold text-lg text-gray-800 flex items-center gap-2 mb-4">
                <BiDish className="text-[#ff4d2d]" /> Review Menu Selection
              </h3>

              <div className="flex flex-col gap-3">
                {cart.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-3 rounded-2xl border border-[#fff2ee] bg-[#fff9f6] text-xs"
                  >
                    <div className="flex-1 min-w-0 pr-3">
                      <h4 className="font-bold text-gray-800 truncate">{item.name}</h4>
                      
                      {/* Customization Details label */}
                      <p className="text-[10px] text-gray-400 mt-1">
                        {item.variant ? `Variant: ${item.variant.name}` : "Standard Size"}
                        {item.spiceLevel ? ` • Spice: ${item.spiceLevel}` : ""}
                        {item.extras?.length > 0 ? ` • Extras: ${item.extras.map(e => e.name).join(", ")}` : ""}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 font-bold">
                      <span className="text-gray-500">Qty {item.quantity}</span>
                      <span className="text-[#ff4d2d]">₹{item.price * item.quantity / 100}</span>
                      <button
                        onClick={() => handleRemoveItem(item)}
                        className="text-red-400 hover:text-red-600 cursor-pointer p-1"
                        title="Remove"
                      >
                        <FiTrash size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bill Summary Right Sidebar */}
          <div className="lg:col-span-1 flex flex-col gap-6 sticky top-24">
            {/* Promo Code Coupon applied */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#ffe4dc]">
              <h3 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-1.5">
                <FiGift className="text-[#ff4d2d]" /> Apply Promo Code
              </h3>
              
              {appliedCoupon ? (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl p-3 text-xs text-green-700 font-bold">
                  <div>
                    <span className="uppercase">{appliedCoupon.code}</span>
                    <p className="text-[10px] text-green-500 font-medium">₹{appliedCoupon.discountAmount / 100} coupon saved!</p>
                  </div>
                  <button onClick={handleRemoveCoupon} className="text-red-500 hover:underline text-xs">Remove</button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. VINGO50"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="flex-1 border border-[#ffe4dc] rounded-xl px-3 py-2 text-xs outline-none bg-[#fff9f6] uppercase font-bold text-gray-700"
                  />
                  <button
                    type="submit"
                    disabled={validatingCoupon}
                    className="px-4 py-2 bg-[#ff4d2d] text-white rounded-xl text-xs font-bold hover:bg-[#e64323] cursor-pointer"
                  >
                    Apply
                  </button>
                </form>
              )}
              {couponErr && <p className="text-[10px] text-red-500 mt-1 font-semibold">{couponErr}</p>}
            </div>

            {/* Bill Details */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#ffe4dc] flex flex-col gap-4">
              <h3 className="font-bold text-gray-800 text-sm pb-2 border-b border-[#fff2ee]">Bill Breakdown</h3>
              
              <div className="flex flex-col gap-2.5 text-xs text-gray-500">
                <div className="flex justify-between">
                  <span>Item Total</span>
                  <span className="font-bold text-gray-800">₹{subtotal / 100}</span>
                </div>
                
                <div className="flex justify-between">
                  <span>Delivery Partner Fee</span>
                  <span className="font-bold text-gray-800">₹{deliveryFee / 100}</span>
                </div>
                
                <div className="flex justify-between">
                  <span>Restaurant GST & Service Taxes</span>
                  <span className="font-bold text-gray-800">₹{taxAmount / 100}</span>
                </div>

                {appliedCoupon && (
                  <div className="flex justify-between text-green-600 font-semibold">
                    <span>Coupon Discount</span>
                    <span>-₹{discountAmount / 100}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-[#fff2ee] pt-3 mt-1 flex justify-between items-center text-sm font-extrabold text-gray-800">
                <span>To Pay</span>
                <span className="text-[#ff4d2d] text-lg">₹{grandTotal / 100}</span>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={placing}
                className="w-full mt-2 py-3.5 rounded-xl bg-[#ff4d2d] text-white font-extrabold text-sm hover:bg-[#e64323] transition-colors cursor-pointer text-center flex items-center justify-center gap-2 shadow-lg shadow-[#ff4d2d]/30"
              >
                {placing ? "Processing..." : `Place Order (₹${grandTotal / 100})`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Checkout;

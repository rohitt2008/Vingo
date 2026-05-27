import React, { useEffect, useState, useCallback, useRef } from "react";
import { useSelector } from "react-redux";
import axios from "axios";
import { serverUrl } from "../App";
import Nav from "../components/Nav";
import { FiShoppingBag, FiStar, FiClock, FiCheckCircle, FiChevronRight, FiMapPin, FiTruck, FiCompass, FiMap } from "react-icons/fi";
import { BiDish } from "react-icons/bi";
import { useSocket } from "../hooks/useSocket";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { useToast } from "../context/ToastContext";

function OrderHistory() {
  const { userData } = useSelector((state) => state.user);
  const { showToast } = useToast();
  
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Detailed selected order state
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);

  // Live driver tracking coords state
  const [liveDriverCoords, setLiveDriverCoords] = useState(null);
  const [simStep, setSimStep] = useState(0);
  const [liveOtp, setLiveOtp] = useState("");
  const [liveEta, setLiveEta] = useState(null);
  const [liveDistance, setLiveDistance] = useState(null);

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const riderMarkerRef = useRef(null);
  const restaurantMarkerRef = useRef(null);
  const homeMarkerRef = useRef(null);

  // Instantiates Leaflet Satellite Map on selectedOrder change
  useEffect(() => {
    if (!selectedOrder || !mapContainerRef.current) return;

    // Cleanup previous map instance if exists
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const restLat = 23.2599; // Bhopal defaults
    const restLng = 77.4126;
    const homeLat = 23.2750;
    const homeLng = 77.4350;

    // Initialize Leaflet Map
    const map = L.map(mapContainerRef.current).setView([restLat, restLng], 14);
    mapRef.current = map;

    // Use ESRI High-Resolution Satellite imagery
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      attribution: "Tiles &copy; Esri &mdash; Satellite Image Layer",
      maxZoom: 19,
    }).addTo(map);

    // Overlay transparent street/place labels so it functions as a perfect hybrid map!
    L.tileLayer("https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 19,
    }).addTo(map);

    // Custom Emoji Icons
    const restIcon = L.divIcon({
      html: `<div style="font-size: 26px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));">🏪</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });

    const homeIcon = L.divIcon({
      html: `<div style="font-size: 26px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));">🏠</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });

    const riderIcon = L.divIcon({
      html: `<div style="font-size: 30px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.4)); transition: all 0.3s ease;">🛵</div>`,
      iconSize: [35, 35],
      iconAnchor: [17, 17],
    });

    // Add Restaurant and Home Markers
    restaurantMarkerRef.current = L.marker([restLat, restLng], { icon: restIcon })
      .addTo(map)
      .bindPopup(`<b>${selectedOrder.restaurantId?.name || "Restaurant"}</b><br/>Kitchen Point`)
      .openPopup();

    homeMarkerRef.current = L.marker([homeLat, homeLng], { icon: homeIcon })
      .addTo(map)
      .bindPopup("<b>Your Address</b><br/>Delivery Destination");

    // Add a dashed route polyline
    L.polyline([[restLat, restLng], [homeLat, homeLng]], {
      color: "#ff4d2d",
      weight: 3.5,
      dashArray: "6, 12",
      opacity: 0.8,
    }).addTo(map);

    // Initial Rider Marker (At Restaurant at start)
    const riderLat = liveDriverCoords?.latitude || restLat;
    const riderLng = liveDriverCoords?.longitude || restLng;

    riderMarkerRef.current = L.marker([riderLat, riderLng], { icon: riderIcon })
      .addTo(map)
      .bindPopup("<b>Rider Location</b><br/>En Route");

    // Fit map bounds to show entire route
    const bounds = L.latLngBounds([[restLat, restLng], [homeLat, homeLng]]);
    map.fitBounds(bounds, { padding: [40, 40] });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [selectedOrder]);

  // Sync rider marker when coordinates update
  useEffect(() => {
    if (riderMarkerRef.current && liveDriverCoords) {
      const newPos = [liveDriverCoords.latitude, liveDriverCoords.longitude];
      riderMarkerRef.current.setLatLng(newPos);
      if (mapRef.current) {
        mapRef.current.panTo(newPos);
      }
    }
  }, [liveDriverCoords]);

  useEffect(() => {
    fetchOrderHistory();
  }, []);

  const fetchOrderHistory = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${serverUrl}/api/orders/history`, { withCredentials: true });
      setOrders(res.data?.data?.orders || []);
    } catch (err) {
      setError("Failed to fetch order history.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOrder = async (orderId) => {
    try {
      const res = await axios.get(`${serverUrl}/api/orders/${orderId}`, { withCredentials: true });
      setSelectedOrder(res.data?.data?.order);
      setLiveDriverCoords(null);
    } catch {
      showToast("Failed to load order details.", "error");
    }
  };

  const handleRatingSubmit = async (e) => {
    e.preventDefault();
    setSubmittingRating(true);
    try {
      await axios.patch(
        `${serverUrl}/api/orders/${selectedOrder._id}/status`,
        { status: selectedOrder.status, rating, review: reviewText },
        { withCredentials: true }
      );
      
      setSelectedOrder({ ...selectedOrder, rating, review: reviewText });
      setShowRatingModal(false);
      setReviewText("");
      showToast("Thank you for your rating!", "success");
      await fetchOrderHistory();
    } catch (err) {
      console.error("Rating submission error details:", err);
      showToast(err.response?.data?.message || "Failed to submit rating.", "error");
    } finally {
      setSubmittingRating(false);
    }
  };

  // ── Socket event listeners ──────────────────────────────────────────

  const onOrderStatusUpdate = useCallback((data) => {
    console.log("Live status socket update received:", data);
    // Instant live local update of order detail state
    if (selectedOrder && selectedOrder._id === data.orderId) {
      setSelectedOrder(prev => ({
        ...prev,
        status: data.status,
        statusTimeline: [
          ...prev.statusTimeline,
          { status: data.status, timestamp: data.timestamp, note: data.details?.note || "Status updated" }
        ]
      }));
      if (data.details?.otp) {
        setLiveOtp(data.details.otp);
      }
      fetchOrderHistory(); // Refresh general list too
    }
  }, [selectedOrder]);

  const onLocationUpdate = useCallback((data) => {
    console.log("Live courier location socket update received:", data);
    if (selectedOrder && selectedOrder._id === data.orderId) {
      setLiveDriverCoords({
        latitude: data.latitude,
        longitude: data.longitude,
        timestamp: data.timestamp
      });
    }
  }, [selectedOrder]);

  const onEtaUpdate = useCallback((data) => {
    console.log("ETA socket update:", data);
    setLiveEta(data.etaMinutes);
    setLiveDistance(data.distanceMeters);
  }, []);

  // Wire up active Socket.IO listener hook!
  const { emitDriverLocation } = useSocket(selectedOrder?._id, {
    onOrderStatusUpdate,
    onLocationUpdate,
    onEtaUpdate,
  });

  // Simulated GPS courier movements (Sprint 4 specification test bed)
  const handleSimulateMovement = () => {
    if (!selectedOrder) return;
    const restLat = 23.2599;
    const restLng = 77.4126;
    const homeLat = 23.2750;
    const homeLng = 77.4350;

    const nextStep = (simStep + 1) % 6;
    setSimStep(nextStep);

    const ratio = nextStep / 5;
    const nextLat = restLat + (homeLat - restLat) * ratio;
    const nextLng = restLng + (homeLng - restLng) * ratio;

    emitDriverLocation(nextLat, nextLng);
    setLiveDriverCoords({
      latitude: nextLat,
      longitude: nextLng,
      timestamp: new Date().toISOString()
    });
  };

  // Let store owner advance status instantly inside order details cockpit!
  const handleAdvanceStatus = async (newStatus) => {
    try {
      let endpoint = `${serverUrl}/api/orders/${selectedOrder._id}/status`;
      let payload = { status: newStatus };

      if (newStatus === "accepted") {
        const prepTimeStr = prompt("Enter estimated preparation time (minutes):", "30");
        if (prepTimeStr === null) return;
        const estimatedPrepTime = parseInt(prepTimeStr, 10) || 30;
        endpoint = `${serverUrl}/api/orders/${selectedOrder._id}/accept`;
        payload = { estimatedPrepTime };
      } else if (newStatus === "ready") {
        endpoint = `${serverUrl}/api/orders/${selectedOrder._id}/ready`;
        payload = {};
      }

      const res = await axios.patch(
        endpoint,
        payload,
        { withCredentials: true }
      );
      if (res.data?.success) {
        showToast(`Order status updated to ${newStatus} successfully!`, "success");
        setSelectedOrder(res.data?.data?.order);
        fetchOrderHistory();
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to update order status.", "error");
    }
  };

  const handleCancelOrder = async () => {
    if (!window.confirm("Are you sure you want to cancel this order? Any wallet payment will be fully refunded instantly!")) return;
    try {
      const res = await axios.patch(
        `${serverUrl}/api/orders/${selectedOrder._id}/status`,
        { status: "cancelled" },
        { withCredentials: true }
      );
      if (res.data?.success) {
        showToast("Order cancelled successfully!", "success");
        setSelectedOrder(res.data?.data?.order);
        fetchOrderHistory();
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to cancel order.", "error");
    }
  };

  // Helper colors
  const getStatusColor = (status) => {
    switch (status) {
      case "pending": return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "confirmed": return "text-blue-600 bg-blue-50 border-blue-200";
      case "accepted": return "text-indigo-600 bg-indigo-50 border-indigo-200";
      case "preparing": return "text-purple-600 bg-purple-50 border-purple-200";
      case "ready": return "text-amber-600 bg-amber-50 border-amber-200";
      case "out_for_delivery": return "text-orange-600 bg-orange-50 border-orange-200";
      case "delivered": return "text-green-600 bg-green-50 border-green-200";
      case "cancelled": return "text-red-600 bg-red-50 border-[#ffe4dc]";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fff9f6] flex flex-col items-center">
        <Nav />
        <div className="w-full max-w-4xl px-4 pt-28 pb-12 flex flex-col gap-6 animate-pulse">
          <div className="h-64 bg-white rounded-3xl border border-[#ffe4dc]"></div>
          <div className="h-64 bg-white rounded-3xl border border-[#ffe4dc]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fff9f6] flex flex-col items-center">
      <Nav />

      <div className="w-full max-w-6xl px-4 md:px-6 pt-24 pb-12">
        <h1 className="text-3xl font-extrabold text-[#222] mb-1.5 flex items-center gap-2">
          <FiShoppingBag className="text-[#ff4d2d]" /> 
          {userData?.role === "owner" ? "Store Incoming Orders" : "Your Order History"}
        </h1>
        <p className="text-gray-500 mb-8">
          {userData?.role === "owner" ? "Manage and prepare customer orders" : "Track active deliveries and review past meals"}
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Order List Column */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            {orders.length === 0 ? (
              <div className="text-center bg-white p-10 rounded-3xl border border-[#ffe4dc]">
                <FiShoppingBag className="mx-auto text-gray-300 mb-3" size={40} />
                <h3 className="font-bold text-gray-700">No Orders Found</h3>
                <p className="text-xs text-gray-400 mt-1">Orders placed by you will appear here.</p>
              </div>
            ) : (
              orders.map((order) => (
                <div
                  key={order._id}
                  onClick={() => handleSelectOrder(order._id)}
                  className={`bg-white rounded-2xl p-4 border transition-all cursor-pointer hover:shadow-md flex justify-between items-center ${
                    selectedOrder?._id === order._id ? "border-[#ff4d2d] shadow-sm bg-[#fffdfc]" : "border-[#ffe4dc]"
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${getStatusColor(order.status)}`}>
                        {order.status.replace(/_/g, " ")}
                      </span>
                      <span className="text-[10px] text-gray-400 font-medium">#{order._id.substring(18)}</span>
                    </div>

                    <h3 className="font-extrabold text-sm text-gray-800 truncate">
                      {order.restaurantId?.name || "Vingo Restaurant"}
                    </h3>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {new Date(order.createdAt).toLocaleDateString()} • {order.items?.length || 0} items
                    </p>
                    <p className="text-xs font-bold text-[#ff4d2d] mt-1.5">₹{order.grandTotal / 100}</p>
                  </div>
                  
                  <FiChevronRight className="text-gray-400 shrink-0" size={18} />
                </div>
              ))
            )}
          </div>

          {/* Detailed Order Timeline Card Column */}
          <div className="lg:col-span-2">
            {selectedOrder ? (
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#ffe4dc] flex flex-col gap-6">
                
                {/* Store Owner Action Deck */}
                {userData?.role === "owner" && (
                  <div className="bg-[#fff9f6] border border-[#ffe4dc] p-4 rounded-2xl flex flex-col gap-2">
                    <h4 className="text-[11px] font-black uppercase tracking-wider text-gray-500">Owner Operations Deck</h4>
                    <div className="flex gap-2 flex-wrap">
                      {selectedOrder.status === "pending" && (
                        <button
                          onClick={() => handleAdvanceStatus("confirmed")}
                          className="px-3.5 py-1.5 rounded-lg bg-blue-500 text-white font-bold text-xs hover:bg-blue-600 cursor-pointer"
                        >
                          Confirm Order 📋
                        </button>
                      )}
                      
                      {selectedOrder.status === "confirmed" && (
                        <button
                          onClick={() => handleAdvanceStatus("accepted")}
                          className="px-3.5 py-1.5 rounded-lg bg-green-600 text-white font-bold text-xs hover:bg-green-700 cursor-pointer"
                        >
                          Accept Order 📋
                        </button>
                      )}

                      {selectedOrder.status === "accepted" && (
                        <button
                          onClick={() => handleAdvanceStatus("preparing")}
                          className="px-3.5 py-1.5 rounded-lg bg-amber-500 text-white font-bold text-xs hover:bg-amber-600 cursor-pointer"
                        >
                          Start Cooking 🍳
                        </button>
                      )}

                      {selectedOrder.status === "preparing" && (
                        <button
                          onClick={() => handleAdvanceStatus("ready")}
                          className="px-3.5 py-1.5 rounded-lg bg-[#ff4d2d] text-white font-bold text-xs hover:bg-[#e64323] cursor-pointer"
                        >
                          Mark Ready 📦
                        </button>
                      )}

                      {selectedOrder.status === "ready" && (
                        <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl">
                          Ready & Awaiting Rider Accept... 🛵
                        </span>
                      )}

                      {selectedOrder.status === "out_for_delivery" && (
                        <div className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 px-4 py-2 rounded-xl">
                          Rider is delivering order 🚀
                        </div>
                      )}

                      {selectedOrder.status === "delivered" && (
                        <div className="text-xs font-bold text-green-600 bg-green-50 border border-green-200 px-4 py-2 rounded-xl">
                          Delivered successfully!
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Header */}
                <div className="pb-4 border-b border-[#fff2ee]">
                  <div className="flex justify-between items-start gap-4 flex-wrap">
                    <div>
                      <h2 className="text-lg font-black text-gray-800">Order Detail</h2>
                      <p className="text-[10px] text-gray-400 mt-0.5">Order ID: #{selectedOrder._id}</p>
                    </div>

                    <div className="flex gap-2">
                      {["pending", "confirmed"].includes(selectedOrder.status) && userData?.role !== "owner" && (
                        <button
                          onClick={handleCancelOrder}
                          className="px-3.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 text-[10px] font-extrabold cursor-pointer transition-all uppercase tracking-wider"
                        >
                          Cancel Order ❌
                        </button>
                      )}

                      {selectedOrder.status === "delivered" && !selectedOrder.rating && userData?.role !== "owner" && (
                        <button
                          onClick={() => setShowRatingModal(true)}
                          className="px-3.5 py-1.5 rounded-lg bg-[#ff4d2d] text-white text-[10px] font-bold hover:bg-[#e64323] cursor-pointer"
                        >
                          Rate Order
                        </button>
                      )}
                      
                      {/* Driver Sim movement btn */}
                      {selectedOrder.status === "out_for_delivery" && (
                        <button
                          onClick={handleSimulateMovement}
                          className="px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white text-[10px] font-bold hover:bg-indigo-700 cursor-pointer flex items-center gap-1"
                        >
                          <FiCompass /> Sim Courier Move
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Pulsing Chef Cooking Animation Loader */}
                {selectedOrder.status === "preparing" && (
                  <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 flex flex-col items-center text-center gap-2.5 shadow-sm">
                    <div className="text-4xl animate-bounce">🍳</div>
                    <h4 className="text-sm font-black text-amber-800">Chef is cooking your order!</h4>
                    <p className="text-xs text-amber-600 max-w-xs leading-relaxed">
                      Our kitchen is preparing your dishes using fresh, premium ingredients. We will notify you the moment it leaves the stove!
                    </p>
                  </div>
                )}

                {/* Secure Handover OTP Card */}
                {selectedOrder.status === "out_for_delivery" && (
                  <div className="bg-orange-50 border border-orange-200 rounded-3xl p-5 text-center flex flex-col gap-2.5 items-center shadow-sm">
                    <div className="text-[#ff4d2d] text-xs font-black uppercase tracking-wider">🔑 Handover Verification OTP</div>
                    <div className="text-4xl font-mono font-black text-[#ff4d2d] tracking-[0.15em] pl-[0.15em] bg-white border border-[#ffe4dc] px-6 py-2.5 rounded-2xl shadow-inner mt-1">
                      {liveOtp || "123456"}
                    </div>
                    <p className="text-[10px] text-gray-500 max-w-xs leading-relaxed">
                      Your rider must enter this dynamic 6-digit code on their device. Share this verbally upon arrival at your doorstep!
                    </p>
                  </div>
                )}

                {/* Premium Live Tracking Map Widget */}
                {["confirmed", "accepted", "preparing", "ready", "out_for_delivery"].includes(selectedOrder.status) && (
                  <div className="bg-[#eff6ff] border border-blue-100 rounded-3xl p-5 flex flex-col gap-4 relative overflow-hidden">
                    <div className="flex justify-between items-center z-10 flex-wrap gap-2">
                      <div>
                        <h4 className="font-extrabold text-blue-800 text-sm flex items-center gap-1.5">
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                          </span>
                          Live Satellite Tracking Map
                        </h4>
                        <p className="text-blue-500 text-[10px] mt-0.5">
                          {selectedOrder.status === "out_for_delivery"
                            ? `Bike is en route! ETA: ${liveEta || 8} mins (${liveDistance ? `${(liveDistance/1000).toFixed(1)} km` : "2.5 km"} left)`
                            : selectedOrder.status === "ready"
                            ? "Order is ready! Assigning closest delivery partner..."
                            : "Restaurant is prepping your delicious meal..."}
                        </p>
                      </div>
                      {liveDriverCoords && (
                        <span className="text-[9px] font-bold bg-white text-blue-600 px-2 py-0.5 rounded-full border border-blue-200 shadow-sm shrink-0 animate-pulse">
                          Rider GPS Active
                        </span>
                      )}
                    </div>

                    {/* Live Satellite/Hybrid Map Container */}
                    <div
                      ref={mapContainerRef}
                      className="h-64 w-full rounded-2xl border border-blue-100 shadow-inner z-0"
                      style={{ minHeight: "260px" }}
                    ></div>

                    <div className="text-[10px] text-blue-600 flex justify-between items-center z-10 bg-white/50 p-2.5 rounded-xl border border-blue-50">
                      <span>Telemetry stream connected via Socket.IO</span>
                      {selectedOrder.status === "out_for_delivery" && (
                        <button
                          onClick={handleSimulateMovement}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-black rounded-lg transition-colors cursor-pointer uppercase tracking-wider"
                        >
                          Simulate GPS Move
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Items Breakdown list */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Items Summary</h3>
                  <div className="flex flex-col gap-2">
                    {selectedOrder.items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-xs text-gray-700">
                        <span>{item.quantity} x {item.name} {item.variant ? `(${item.variant.name})` : ""}</span>
                        <span className="font-semibold text-gray-800">₹{(item.price * item.quantity) / 100}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pricing totals */}
                <div className="border-t border-[#fff2ee] pt-3.5 flex flex-col gap-2 text-xs text-gray-500">
                  <div className="flex justify-between">
                    <span>GST Taxes & delivery fees</span>
                    <span>₹{(selectedOrder.taxAmount + selectedOrder.deliveryFee) / 100}</span>
                  </div>
                  {selectedOrder.discountAmount > 0 && (
                    <div className="flex justify-between text-green-600 font-semibold">
                      <span>Coupon Discount</span>
                      <span>-₹{selectedOrder.discountAmount / 100}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-sm font-extrabold text-gray-800 border-t border-dashed border-gray-200 pt-2 mt-1">
                    <span>Grand Total</span>
                    <span className="text-[#ff4d2d]">₹{selectedOrder.grandTotal / 100}</span>
                  </div>
                </div>

                {/* Logistics */}
                <div className="border-t border-[#fff2ee] pt-4 flex flex-col gap-3 text-xs">
                  <div className="flex gap-2">
                    <FiMapPin className="text-[#ff4d2d] shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-gray-700">Delivery Address</h4>
                      <p className="text-gray-400 mt-0.5">{selectedOrder.deliveryAddress?.street}, {selectedOrder.deliveryAddress?.city}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <FiTruck className="text-[#ff4d2d] shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-gray-700">Delivery Driver</h4>
                      <p className="text-gray-400 mt-0.5">{selectedOrder.deliveryBoyId?.name || "Assigning Rider..."}</p>
                    </div>
                  </div>
                </div>

                {/* Live Track Delivery Steps Timeline */}
                <div className="border-t border-[#fff2ee] pt-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Delivery Timeline</h3>
                  <div className="flex flex-col gap-4 relative pl-5 border-l-2 border-[#fff2ee]">
                    {selectedOrder.statusTimeline?.map((time, idx) => (
                      <div key={idx} className="relative">
                        <div className="absolute -left-[27px] top-1 bg-white border-2 border-[#ff4d2d] rounded-full w-3.5 h-3.5 flex items-center justify-center">
                          <div className="bg-[#ff4d2d] rounded-full w-1.5 h-1.5"></div>
                        </div>

                        <span className="text-[10px] text-gray-400 block font-medium">
                          {new Date(time.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <h4 className="text-xs font-bold text-gray-800 capitalize mt-0.5">{time.status.replace(/_/g, " ")}</h4>
                        <p className="text-[10px] text-gray-400 mt-0.5">{time.note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-10 shadow-sm border border-[#ffe4dc] text-center text-gray-400 text-xs font-medium">
                Select an order from the list to view live tracking details and prepare preparation timelines.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Premium Rating Modal */}
      {showRatingModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-[#ffe4dc]">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-extrabold text-gray-800">Rate Your Meal</h3>
              <button onClick={() => setShowRatingModal(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>
            
            <form onSubmit={handleRatingSubmit} className="flex flex-col gap-4">
              <p className="text-xs text-gray-500">How was the food quality from {selectedOrder.restaurantId?.name}?</p>
              
              <div className="flex gap-2 justify-center py-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setRating(star)}
                    className="cursor-pointer hover:scale-110 transition-transform"
                  >
                    <FiStar
                      size={32}
                      className={star <= rating ? "fill-yellow-400 stroke-yellow-500" : "text-gray-300"}
                    />
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Write a Review</label>
                <textarea
                  placeholder="Tell us what you liked or how we can improve..."
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  rows="3"
                  className="border border-[#ffe4dc] rounded-xl px-3 py-2 text-sm outline-none bg-[#fff9f6] resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submittingRating}
                className="mt-2 py-3 bg-[#ff4d2d] text-white rounded-xl text-xs font-bold hover:bg-[#e64323] cursor-pointer"
              >
                {submittingRating ? "Submitting..." : "Submit Feedback"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrderHistory;

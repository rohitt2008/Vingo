import React, { useEffect, useState, useRef } from "react";
import { useSelector } from "react-redux";
import axios from "axios";
import { serverUrl } from "../App";
import {
  FiCheckCircle,
  FiClock,
  FiDollarSign,
  FiMapPin,
  FiNavigation,
  FiPackage,
  FiToggleLeft,
  FiToggleRight,
  FiTruck,
  FiAlertCircle,
  FiSmile,
  FiLock,
  FiMap,
} from "react-icons/fi";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { io } from "socket.io-client";
import { useToast } from "../context/ToastContext";

function DeliveryBoy() {
  const { userData, city } = useSelector((state) => state.user);
  const { showToast } = useToast();
  const firstName = userData?.name?.split(" ")[0] || "Rider";

  const [isOnline, setIsOnline] = useState(userData?.deliveryDetails?.isAvailable || false);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [activeTab, setActiveTab] = useState("available"); // 'available', 'assigned', 'history'

  // Proximity Tracking State
  const [activeOrderForSimulation, setActiveOrderForSimulation] = useState(null);
  const [simStep, setSimStep] = useState(0); // 0 = Restaurant, 10 = Customer
  const [distanceLeft, setDistanceLeft] = useState(2500); // meters
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const restaurantMarkerRef = useRef(null);
  const homeMarkerRef = useRef(null);
  const riderMarkerRef = useRef(null);
  const routePolylineRef = useRef(null);
  const socketRef = useRef(null);

  // Initialize Socket.IO connection
  useEffect(() => {
    const socket = io(serverUrl, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[Rider Socket] Connected to server");
      if (userData?._id) {
        socket.emit("join_user_room", userData._id);
      }
    });

    // Listen for real-time delivery offer broadcasts
    socket.on("delivery_offer", (offer) => {
      showToast(`🎯 NEW JOB OFFER! ${offer.restaurantName} is located ${offer.distance}km away.`, "info");
      fetchOrders();
    });

    return () => {
      socket.disconnect();
    };
  }, [userData]);

  // Leaflet Map Rendering and Coordinate Sync
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    // Defaultभोपाल coordinates
    let restLat = 23.2599;
    let restLng = 77.4126;
    let homeLat = 23.2750;
    let homeLng = 77.4350;

    const currentOrder = activeOrderForSimulation || myOrders.find(o => o.status === "out_for_delivery" || o.status === "ready");
    if (currentOrder) {
      restLat = currentOrder.restaurantId?.location?.coordinates[1] || 23.2599;
      restLng = currentOrder.restaurantId?.location?.coordinates[0] || 77.4126;
      homeLat = currentOrder.deliveryAddress?.coordinates[1] || 23.2750;
      homeLng = currentOrder.deliveryAddress?.coordinates[0] || 77.4350;
    }

    // Compute active simulated rider coordinate based on simStep (0 to 10 ratio)
    const ratio = simStep / 10;
    const riderLat = restLat + (homeLat - restLat) * ratio;
    const riderLng = restLng + (homeLng - restLng) * ratio;

    const map = L.map(mapContainerRef.current).setView([riderLat, riderLng], 14);
    mapRef.current = map;

    // ESRI Satellite imagery tiles
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      attribution: "Esri &mdash; Satellite Base Map",
      maxZoom: 19,
    }).addTo(map);

    // Dynamic borders & names labels overlay
    L.tileLayer("https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 19,
    }).addTo(map);

    const restIcon = L.divIcon({
      html: `<div style="font-size: 26px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">🏪</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });

    const homeIcon = L.divIcon({
      html: `<div style="font-size: 26px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">🏠</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });

    const riderIcon = L.divIcon({
      html: `<div style="font-size: 30px; filter: drop-shadow(0 3px 6px rgba(0,0,0,0.6));" class="animate-bounce">🏍️</div>`,
      iconSize: [35, 35],
      iconAnchor: [17, 17],
    });

    restaurantMarkerRef.current = L.marker([restLat, restLng], { icon: restIcon })
      .addTo(map)
      .bindPopup(`<b>${currentOrder?.restaurantId?.name || "Kitchen"}</b><br/>Food Pickup Point`)
      .openPopup();

    homeMarkerRef.current = L.marker([homeLat, homeLng], { icon: homeIcon })
      .addTo(map)
      .bindPopup("<b>Dropoff Location</b><br/>Customer Residence");

    riderMarkerRef.current = L.marker([riderLat, riderLng], { icon: riderIcon })
      .addTo(map)
      .bindPopup("<b>My Current Position</b><br/>Telemetry GPS Stream Active")
      .openPopup();

    routePolylineRef.current = L.polyline([[restLat, restLng], [homeLat, homeLng]], {
      color: "#ff4d2d",
      weight: 4,
      dashArray: "8, 12",
      opacity: 0.8,
    }).addTo(map);

    const bounds = L.latLngBounds([[restLat, restLng], [homeLat, homeLng]]);
    map.fitBounds(bounds, { padding: [40, 40] });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [activeTab, myOrders, activeOrderForSimulation, simStep]);

  useEffect(() => {
    if (userData?.deliveryDetails) {
      setIsOnline(userData.deliveryDetails.isAvailable || false);
    }
  }, [userData]);

  useEffect(() => {
    fetchOrders();
  }, [isOnline, activeTab]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      if (isOnline) {
        const availRes = await axios.get(`${serverUrl}/api/orders/available?city=${city || ""}`, {
          withCredentials: true,
        });
        setAvailableOrders(availRes.data?.data?.orders || []);
      } else {
        setAvailableOrders([]);
      }

      const historyRes = await axios.get(`${serverUrl}/api/orders/history`, {
        withCredentials: true,
      });
      const allOrders = historyRes.data?.data?.orders || [];
      setMyOrders(allOrders);

      // Automatically select active delivery for route simulation
      const currentActive = allOrders.find(o => o.status === "out_for_delivery" || o.status === "ready");
      if (currentActive) {
        setActiveOrderForSimulation(currentActive);
      } else {
        setActiveOrderForSimulation(null);
      }
    } catch (err) {
      console.error("Failed to fetch delivery orders", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleOnline = async () => {
    const nextStatus = !isOnline;
    try {
      await axios.put(
        `${serverUrl}/api/auth/profile`,
        {
          deliveryDetails: { isAvailable: nextStatus },
        },
        { withCredentials: true }
      );
      setIsOnline(nextStatus);
      showToast(`Rider is now ${nextStatus ? "ONLINE & ready for jobs!" : "OFFLINE"}`, "success");
    } catch (err) {
      showToast("Failed to toggle online status.", "error");
    }
  };

  const handleAcceptOrder = async (orderId) => {
    setUpdatingId(orderId);
    try {
      await axios.patch(`${serverUrl}/api/orders/${orderId}/accept`, {}, { withCredentials: true });
      showToast("Order accepted successfully! Proceed to pickup.", "success");
      fetchOrders();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to accept order.", "error");
    } finally {
      setUpdatingId(null);
    }
  };

  const handlePickupOrder = async (orderId) => {
    setUpdatingId(orderId);
    try {
      const res = await axios.patch(`${serverUrl}/api/orders/${orderId}/pickup`, {}, { withCredentials: true });
      if (res.data?.success) {
        showToast("Food picked up! Route GPS telemetry is now broadcasting.", "success");
        setSimStep(0);
        setDistanceLeft(2500);
        fetchOrders();
      }
    } catch (err) {
      showToast("Failed to pick up order.", "error");
    } finally {
      setUpdatingId(null);
    }
  };

  // Telemetry Step Incrementor Simulator
  const handleSimulateStep = () => {
    if (!activeOrderForSimulation) return;

    const nextStep = Math.min(10, simStep + 1);
    setSimStep(nextStep);

    // Extrapolate distance
    const computedDistance = Math.max(0, 2500 - (nextStep * 250));
    setDistanceLeft(computedDistance);

    // Calculate simulated GPS coordinates
    const restLat = activeOrderForSimulation.restaurantId?.location?.coordinates[1] || 23.2599;
    const restLng = activeOrderForSimulation.restaurantId?.location?.coordinates[0] || 77.4126;
    const homeLat = activeOrderForSimulation.deliveryAddress?.coordinates[1] || 23.2750;
    const homeLng = activeOrderForSimulation.deliveryAddress?.coordinates[0] || 77.4350;

    const ratio = nextStep / 10;
    const curLat = restLat + (homeLat - restLat) * ratio;
    const curLng = restLng + (homeLng - restLng) * ratio;

    // Send telemetry update to customer over WebSocket
    if (socketRef.current) {
      socketRef.current.emit("gps_ping", {
        orderId: activeOrderForSimulation._id,
        latitude: curLat,
        longitude: curLng,
        deliveryBoyId: userData._id,
      });
    }

    // OTP Trigger Proximity gating (<50 meters)
    if (computedDistance <= 50) {
      setShowOtpModal(true);
    }
  };

  const handleVerifyOtpSubmit = async (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 6) {
      setOtpError("Please enter a valid 6-digit OTP code.");
      return;
    }

    setVerifyingOtp(true);
    setOtpError("");
    try {
      const res = await axios.post(
        `${serverUrl}/api/orders/${activeOrderForSimulation._id}/verify-otp`,
        { otp: otpCode },
        { withCredentials: true }
      );
      if (res.data?.success) {
        showToast("🎉 OTP Verified! Order successfully completed and delivered hot.", "success");
        setShowOtpModal(false);
        setOtpCode("");
        setSimStep(0);
        setDistanceLeft(2500);
        setActiveTab("history");
        fetchOrders();
      }
    } catch (err) {
      setOtpError(err.response?.data?.message || "Invalid OTP code. Master bypass is '123456'.");
    } finally {
      setVerifyingOtp(false);
    }
  };

  const completedOrdersCount = myOrders.filter((o) => o.status === "delivered").length;
  const activeOrders = myOrders.filter((o) => o.status === "out_for_delivery" || o.status === "ready" || o.status === "accepted" || o.status === "preparing");
  const todayEarnings = completedOrdersCount * 50;

  const stats = [
    {
      title: "Deliveries Today",
      value: completedOrdersCount,
      subtitle: "Completed drop-offs",
      icon: <FiCheckCircle size={18} className="text-[#ff4d2d]" />,
    },
    {
      title: "Active Jobs",
      value: activeOrders.length,
      subtitle: "In fulfillment pipeline",
      icon: <FiTruck size={18} className="text-[#ff4d2d]" />,
    },
    {
      title: "Earnings Today",
      value: `₹${todayEarnings}`,
      subtitle: "₹50 incentive per order",
      icon: <FiDollarSign size={18} className="text-[#ff4d2d]" />,
    },
  ];

  return (
    <div className="w-full max-w-6xl px-4 md:px-6 pb-10 flex flex-col gap-6 relative">
      {/* Header Banner */}
      <section className="w-full rounded-3xl bg-white p-6 md:p-8 shadow-sm border border-[#ffe4dc] flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <p className="text-xs font-bold text-[#ff4d2d] uppercase tracking-wide">Fulfillment Partner Cockpit</p>
          <h1 className="text-3xl font-extrabold text-[#222] mt-1">
            Welcome, {firstName}!
          </h1>
          <p className="text-gray-500 mt-1">
            Check your dashboard, pick up orders on time, and earn hot incentives {city ? `in ${city}` : ""}.
          </p>
        </div>

        <button
          onClick={handleToggleOnline}
          className={`px-6 py-3 rounded-2xl font-bold flex items-center gap-3 shadow-md transition-all cursor-pointer ${
            isOnline
              ? "bg-green-500 text-white hover:bg-green-600 shadow-green-200"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          {isOnline ? <FiToggleRight size={22} /> : <FiToggleLeft size={22} />}
          <span>{isOnline ? "Rider is ONLINE" : "Rider is OFFLINE"}</span>
        </button>
      </section>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-[#ffe4dc] bg-white p-5 shadow-sm flex items-center justify-between"
          >
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide">{item.title}</h3>
              <p className="text-3xl font-black text-[#222] mt-1">{item.value}</p>
              <p className="text-[10px] text-gray-500 mt-1">{item.subtitle}</p>
            </div>
            <div className="p-3 bg-[#fff2ee] rounded-xl">{item.icon}</div>
          </div>
        ))}
      </div>

      {/* Workspace Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Navigation lists */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex bg-white p-1 rounded-2xl border border-[#ffe4dc] shadow-sm">
            {[
              { id: "available", label: `Available Offers (${availableOrders.length})` },
              { id: "assigned", label: `My Deliveries (${activeOrders.length})` },
              { id: "history", label: `History (${completedOrdersCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-[#ff4d2d] text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-4">
            {loading ? (
              <div className="bg-white rounded-3xl p-10 text-center border border-[#ffe4dc]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff4d2d] mx-auto"></div>
                <p className="text-gray-500 text-xs mt-3">Refreshing active jobs board...</p>
              </div>
            ) : !isOnline && activeTab === "available" ? (
              <div className="bg-white rounded-3xl p-10 text-center border border-[#ffe4dc] flex flex-col items-center">
                <FiAlertCircle size={40} className="text-gray-300 mb-3" />
                <h3 className="font-bold text-gray-700">Rider is Offline</h3>
                <p className="text-xs text-gray-500 max-w-sm mt-1">
                  Go online to dynamically fetch incoming food delivery offers matching your coordinates.
                </p>
              </div>
            ) : activeTab === "available" && availableOrders.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center border border-[#ffe4dc] flex flex-col items-center">
                <FiPackage size={40} className="text-gray-300 mb-3" />
                <h3 className="font-bold text-gray-700">No Job Offers Yet</h3>
                <p className="text-xs text-gray-500 max-w-sm mt-1">
                  Available kitchen jobs and near-coord orders will appear here automatically.
                </p>
              </div>
            ) : activeTab === "assigned" && activeOrders.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center border border-[#ffe4dc] flex flex-col items-center">
                <FiTruck size={40} className="text-gray-300 mb-3" />
                <h3 className="font-bold text-gray-700">No Active Routes</h3>
                <p className="text-xs text-gray-500 max-w-sm mt-1">
                  Select and accept jobs from the available queue to start routing!
                </p>
              </div>
            ) : activeTab === "history" && completedOrdersCount === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center border border-[#ffe4dc] flex flex-col items-center">
                <FiCheckCircle size={40} className="text-gray-300 mb-3" />
                <h3 className="font-bold text-gray-700">No Completed Deliveries</h3>
                <p className="text-xs text-gray-500 max-w-sm mt-1">
                  Drop off your first hot meal to start generating earnings history ledger!
                </p>
              </div>
            ) : (
              (activeTab === "available"
                ? availableOrders
                : activeTab === "assigned"
                ? activeOrders
                : myOrders.filter((o) => o.status === "delivered")
              ).map((order) => (
                <div
                  key={order._id}
                  className={`bg-white rounded-3xl p-5 border shadow-sm flex flex-col gap-4 hover:shadow-md transition-all ${
                    activeOrderForSimulation?._id === order._id ? "border-[#ff4d2d] bg-[#fffcfb]" : "border-[#ffe4dc]"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] bg-[#fff2ee] text-[#ff4d2d] px-2 py-0.5 rounded font-black uppercase">
                        Order #{order._id.substring(18)}
                      </span>
                      <h4 className="font-extrabold text-sm text-gray-800 mt-1.5">
                        {order.restaurantId?.name || "Restaurant Kitchen"}
                      </h4>
                    </div>
                    <span className="text-xs font-extrabold text-green-600 bg-green-50 px-2 py-1 rounded-lg">
                      Payout: ₹50
                    </span>
                  </div>

                  {/* Locations details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs border-t border-[#fff2ee] pt-3">
                    <div className="flex gap-2.5 items-start">
                      <FiMapPin className="text-[#ff4d2d] mt-0.5 shrink-0" />
                      <div>
                        <p className="font-bold text-gray-600">Restaurant Address</p>
                        <p className="text-gray-400 mt-0.5">
                          {order.restaurantId?.address?.street}, {order.restaurantId?.address?.city}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2.5 items-start">
                      <FiNavigation className="text-blue-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-bold text-gray-600">Customer Home Drop</p>
                        <p className="text-gray-400 mt-0.5">
                          {order.deliveryAddress?.street}, {order.deliveryAddress?.city}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex justify-between items-center border-t border-[#fff2ee] pt-3 mt-1">
                    <span className="text-xs text-gray-400">
                      {order.items?.length || 0} items • ₹{order.grandTotal / 100}
                    </span>

                    {activeTab === "available" && (
                      <button
                        onClick={() => handleAcceptOrder(order._id)}
                        disabled={updatingId === order._id}
                        className="px-5 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-green-200 cursor-pointer"
                      >
                        {updatingId === order._id ? "Accepting..." : "Accept Job Offer"}
                      </button>
                    )}

                    {activeTab === "assigned" && (
                      <div className="flex gap-2">
                        {order.status === "ready" && (
                          <button
                            onClick={() => handlePickupOrder(order._id)}
                            disabled={updatingId === order._id}
                            className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md"
                          >
                            Pick Up & Start Route 🚀
                          </button>
                        )}

                        {order.status === "out_for_delivery" && (
                          <>
                            <button
                              onClick={() => {
                                setActiveOrderForSimulation(order);
                                handleSimulateStep();
                              }}
                              className="px-4 py-2 bg-[#ff4d2d]/10 hover:bg-[#ff4d2d]/20 text-[#ff4d2d] rounded-xl text-xs font-bold transition-all cursor-pointer"
                            >
                              🛵 Telemetry Step ({simStep}/10)
                            </button>
                            <button
                              onClick={() => {
                                setActiveOrderForSimulation(order);
                                setShowOtpModal(true);
                              }}
                              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                            >
                              <FiLock /> OTP Verify
                            </button>
                          </>
                        )}

                        {(order.status === "accepted" || order.status === "preparing") && (
                          <span className="text-xs font-bold text-gray-400 bg-gray-50 border border-gray-200 px-4 py-2 rounded-xl">
                            Food is cooking, wait for Ready... 🍳
                          </span>
                        )}
                      </div>
                    )}

                    {activeTab === "history" && (
                      <span className="text-xs font-bold text-green-500 flex items-center gap-1">
                        <FiSmile /> Delivered Successfully
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Live navigation map */}
        <div className="lg:col-span-1 bg-white rounded-3xl p-5 border border-[#ffe4dc] shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[#fff2ee] pb-3">
            <div className="flex items-center gap-2">
              <FiMap className="text-[#ff4d2d]" size={18} />
              <h3 className="font-extrabold text-sm text-gray-800">Satellite Path Tracker</h3>
            </div>
            {activeOrderForSimulation && (
              <span className="text-[10px] bg-red-50 text-red-500 font-bold px-2 py-0.5 rounded-full animate-pulse">
                GPS active
              </span>
            )}
          </div>

          <div
            ref={mapContainerRef}
            className="h-64 w-full rounded-2xl border border-[#ffe4dc] shadow-inner z-0"
            style={{ minHeight: "260px" }}
          ></div>

          {activeOrderForSimulation ? (
            <div className="flex flex-col gap-2 bg-[#fffcfb] p-4 rounded-2xl border border-dashed border-[#ffe4dc] text-xs">
              <div className="flex justify-between items-center text-gray-800 font-bold">
                <span>Rider Telemetry Console</span>
                <span className="text-[#ff4d2d]">{distanceLeft} meters left</span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mt-1.5">
                <div
                  className="bg-[#ff4d2d] h-full transition-all duration-300"
                  style={{ width: `${simStep * 10}%` }}
                ></div>
              </div>
              <p className="text-gray-400 text-[10px] leading-relaxed mt-1">
                Click "Telemetry Step" inside your order card to simulate coordinate increments and test high-precision sat GPS movement.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#ffe4dc] p-4 bg-[#fffcfb] text-xs text-gray-500 text-center leading-relaxed">
              No active route currently. Accept a job and click "Start Route" to engage satellite GPS rendering and live path polyline overlay.
            </div>
          )}
        </div>
      </section>

      {/* OTP Delivery Verification Modal Dialogue Overlay */}
      {showOtpModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#ffe4dc] flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="p-4 bg-[#fff2ee] text-[#ff4d2d] rounded-full mb-3">
                <FiLock size={32} />
              </div>
              <h3 className="text-lg font-black text-gray-800">Secure Delivery Verification</h3>
              <p className="text-xs text-gray-500 max-w-xs mt-1.5">
                Rider has arrived within 50m! Please request the customer to share the dynamic 6-digit confirmation code shown on their receipt.
              </p>
            </div>

            <form onSubmit={handleVerifyOtpSubmit} className="flex flex-col gap-3">
              <input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                placeholder="Enter 6-digit code"
                className="w-full text-center tracking-[0.75em] text-2xl font-black placeholder:tracking-normal placeholder:text-sm placeholder:font-bold py-3.5 border border-[#ffe4dc] rounded-2xl bg-[#fffcfb] focus:outline-none focus:border-[#ff4d2d] focus:ring-1 focus:ring-[#ff4d2d] transition-all"
                disabled={verifyingOtp}
                autoFocus
              />

              {otpError && (
                <p className="text-xs text-red-500 text-center font-bold flex items-center justify-center gap-1">
                  <FiAlertCircle /> {otpError}
                </p>
              )}

              <div className="bg-amber-50 rounded-xl p-2.5 text-[10px] text-amber-700 font-bold border border-amber-200">
                💡 Master bypass/offline testing fallback code: <span className="underline font-mono">123456</span>
              </div>

              <div className="flex gap-2.5 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowOtpModal(false);
                    setOtpCode("");
                    setOtpError("");
                  }}
                  className="flex-1 py-3 text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-all cursor-pointer"
                  disabled={verifyingOtp}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 text-xs font-bold bg-green-500 hover:bg-green-600 text-white rounded-xl transition-all shadow-md shadow-green-100 cursor-pointer flex items-center justify-center gap-1.5"
                  disabled={verifyingOtp}
                >
                  {verifyingOtp ? "Verifying..." : "Verify & Complete"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default DeliveryBoy;

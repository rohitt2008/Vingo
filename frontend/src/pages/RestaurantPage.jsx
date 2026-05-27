import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { serverUrl } from "../App";
import Nav from "../components/Nav";
import { FiStar, FiClock, FiPlus, FiMinus, FiMapPin, FiShoppingBag, FiInfo } from "react-icons/fi";
import { BiDish } from "react-icons/bi";

function RestaurantPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const getImageUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    return `${serverUrl}${url}`;
  };
  
  const [restaurant, setRestaurant] = useState(null);
  const [menu, setMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  
  // Customization Modal State
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedExtras, setSelectedExtras] = useState([]);
  const [selectedSpice, setSelectedSpice] = useState("medium");
  const [itemQuantity, setItemQuantity] = useState(1);

  // Cart Local Simulation (Actual cart integration comes in Sprint 3)
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    fetchRestaurantAndMenu();
  }, [id]);

  const fetchRestaurantAndMenu = async () => {
    setLoading(true);
    setError("");
    try {
      const [restRes, menuRes, cartRes] = await Promise.all([
        axios.get(`${serverUrl}/api/restaurants/${id}`, { withCredentials: true }),
        axios.get(`${serverUrl}/api/menus/${id}`, { withCredentials: true }),
        axios.get(`${serverUrl}/api/cart`, { withCredentials: true }).catch(() => null),
      ]);
      
      setRestaurant(restRes.data?.data?.restaurant);
      
      const fetchedMenu = menuRes.data?.data?.menu;
      setMenu(fetchedMenu);
      
      if (fetchedMenu?.categories?.length > 0) {
        setActiveCategory(fetchedMenu.categories[0].name);
      }

      if (cartRes?.data?.data?.cart?.items) {
        const totalItems = cartRes.data.data.cart.items.reduce((sum, item) => sum + item.quantity, 0);
        setCartCount(totalItems);
      }
    } catch (err) {
      setError("Failed to load restaurant details or menu.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCustomizer = (item) => {
    setSelectedItem(item);
    setSelectedVariant(item.variants?.[0] || null);
    setSelectedExtras([]);
    setSelectedSpice(item.spiceLevels?.[0] || "medium");
    setItemQuantity(1);
  };

  const handleToggleExtra = (extra) => {
    if (selectedExtras.some(e => e._id === extra._id)) {
      setSelectedExtras(selectedExtras.filter(e => e._id !== extra._id));
    } else {
      setSelectedExtras([...selectedExtras, extra]);
    }
  };

  const handleAddToCart = async () => {
    if (!restaurant || !selectedItem) return;

    try {
      const itemPrice = selectedVariant ? Number(selectedVariant.price) : Number(selectedItem.price);
      
      const payload = {
        restaurantId: restaurant._id,
        item: {
          itemId: selectedItem._id,
          name: selectedItem.name,
          price: itemPrice,
          quantity: itemQuantity,
          variant: selectedVariant ? { name: selectedVariant.name, price: Number(selectedVariant.price) } : undefined,
          extras: selectedExtras.map(e => ({ name: e.name, price: Number(e.price) })),
          spiceLevel: selectedSpice,
        }
      };

      const res = await axios.post(`${serverUrl}/api/cart/add`, payload, { withCredentials: true });
      if (res.data?.success) {
        alert(`${selectedItem.name} added to cart successfully!`);
        setCartCount(prev => prev + itemQuantity);
        setSelectedItem(null);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to add item to cart.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fff9f6] flex flex-col items-center">
        <Nav />
        <div className="w-full max-w-4xl px-4 pt-28 pb-12 flex flex-col gap-6 animate-pulse">
          <div className="h-64 bg-white rounded-3xl border border-[#ffe4dc]"></div>
          <div className="h-12 bg-white rounded-xl border border-[#ffe4dc]"></div>
          <div className="h-96 bg-white rounded-3xl border border-[#ffe4dc]"></div>
        </div>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-[#fff9f6] flex flex-col items-center justify-center p-6">
        <Nav />
        <div className="text-center bg-white p-8 rounded-3xl shadow-sm border border-red-100 max-w-md mt-20">
          <FiInfo size={48} className="mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-gray-800">Restaurant Not Found</h2>
          <p className="text-gray-500 mt-2">{error || "The restaurant page you're trying to reach doesn't exist."}</p>
          <button
            onClick={() => navigate("/restaurants")}
            className="mt-6 px-6 py-2.5 rounded-full bg-[#ff4d2d] text-white font-semibold hover:bg-[#e64323] transition-colors cursor-pointer"
          >
            Back to Browse
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fff9f6] flex flex-col items-center">
      <Nav />
      
      {/* Cover Header Banner */}
      <div className="w-full max-w-5xl px-4 md:px-6 pt-24">
        <div className="relative h-64 md:h-80 w-full rounded-3xl overflow-hidden shadow-lg bg-gray-100">
          {restaurant.coverImage ? (
            <img
              src={getImageUrl(restaurant.coverImage)}
              alt={restaurant.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#fff2ee] to-[#fff9f6] flex items-center justify-center">
              <BiDish className="text-[#ff4d2d]/25" size={80} />
            </div>
          )}
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
          
          <div className="absolute bottom-6 left-6 md:left-10 text-white right-6">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {restaurant.cuisines?.slice(0, 3).map((c) => (
                <span key={c} className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold">
                  {c}
                </span>
              ))}
            </div>
            
            <h1 className="text-3xl md:text-4xl font-extrabold">{restaurant.name}</h1>
            <p className="text-sm text-gray-300 mt-1 flex items-center gap-1.5">
              <FiMapPin className="text-[#ff4d2d]" />
              {restaurant.address?.street}, {restaurant.address?.city}
            </p>
          </div>
        </div>

        {/* Info Strip */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#ffe4dc] grid grid-cols-3 md:grid-cols-4 gap-4 mt-6 text-center">
          <div className="flex flex-col items-center border-r border-[#fff2ee]">
            <span className="flex items-center gap-1 text-green-700 font-extrabold text-lg">
              <FiStar className="fill-green-700 stroke-none" />
              {restaurant.avgRating ? restaurant.avgRating.toFixed(1) : "New"}
            </span>
            <span className="text-xs text-gray-400 mt-1">{restaurant.totalReviews || 0} reviews</span>
          </div>
          
          <div className="flex flex-col items-center border-r border-[#fff2ee]">
            <span className="flex items-center gap-1 text-gray-800 font-extrabold text-lg">
              <FiClock className="text-[#ff4d2d]" />
              {restaurant.avgDeliveryMin} min
            </span>
            <span className="text-xs text-gray-400 mt-1">Delivery Time</span>
          </div>

          <div className="flex flex-col items-center border-r md:border-r-0 border-[#fff2ee]">
            <span className="text-gray-800 font-extrabold text-lg">
              ₹{restaurant.priceForTwo / 100}
            </span>
            <span className="text-xs text-gray-400 mt-1">For Two</span>
          </div>

          <div className="hidden md:flex flex-col items-center">
            <span className="text-gray-800 font-extrabold text-lg flex items-center gap-1.5 justify-center">
              <span className={`w-2.5 h-2.5 rounded-full ${restaurant.isOpen ? "bg-green-500" : "bg-red-500"}`}></span>
              {restaurant.isOpen ? "Open" : "Closed"}
            </span>
            <span className="text-xs text-gray-400 mt-1">Status</span>
          </div>
        </div>

        {/* Menu Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8 items-start">
          {/* Categories Sidebar */}
          <div className="md:col-span-1 bg-white rounded-2xl p-4 shadow-sm border border-[#ffe4dc] flex flex-col gap-2 sticky top-24">
            <h3 className="font-bold text-gray-800 px-2 pb-2 border-b border-[#fff2ee] mb-2 text-sm uppercase tracking-wide">
              Menu Categories
            </h3>
            {menu?.categories?.length === 0 ? (
              <p className="text-xs text-gray-400 p-2">No categories found</p>
            ) : (
              menu?.categories?.map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => setActiveCategory(cat.name)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                    activeCategory === cat.name
                      ? "bg-[#ff4d2d] text-white"
                      : "text-gray-600 hover:bg-[#fff2ee] hover:text-[#ff4d2d]"
                  }`}
                >
                  {cat.name} ({cat.items?.length || 0})
                </button>
              ))
            )}
          </div>

          {/* Menu Items Grid */}
          <div className="md:col-span-3 flex flex-col gap-6">
            {menu?.categories?.map((cat) => {
              if (cat.name !== activeCategory) return null;
              
              return (
                <div key={cat._id} className="flex flex-col gap-4">
                  <h2 className="text-2xl font-black text-gray-800 border-b-2 border-[#ff4d2d] pb-2 w-max">
                    {cat.name}
                  </h2>
                  
                  {cat.items?.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
                      <p className="text-gray-500">No dishes in this category yet.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {cat.items?.map((item) => (
                        <div
                          key={item._id}
                          className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-[#ffe4dc] flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between hover:shadow-md transition-shadow duration-300"
                        >
                          <div className="flex-1 flex gap-4 items-start">
                            {/* Veg/Non-Veg type pill */}
                            <div className="flex flex-col gap-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase w-max tracking-wide shrink-0 ${
                                item.foodType === "veg"
                                  ? "bg-green-50 text-green-700 border border-green-200"
                                  : "bg-red-50 text-red-700 border border-red-200"
                              }`}>
                                {item.foodType}
                              </span>
                              
                              <h3 className="font-extrabold text-lg text-gray-800 mt-1">{item.name}</h3>
                              <p className="text-sm font-bold text-[#ff4d2d]">₹{item.price / 100}</p>
                              <p className="text-xs text-gray-400 max-w-md leading-relaxed mt-1">{item.description}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 self-stretch sm:self-auto justify-between sm:justify-start">
                            {/* Dish image preview */}
                            <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 shrink-0">
                              {item.image ? (
                                <img
                                  src={getImageUrl(item.image)}
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[#ff4d2d]/30">
                                  <BiDish size={28} />
                                </div>
                              )}
                            </div>

                            {/* Add Button */}
                            <button
                              onClick={() => handleOpenCustomizer(item)}
                              disabled={!item.isAvailable}
                              className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm cursor-pointer transition-all flex items-center gap-1.5 shrink-0 ${
                                item.isAvailable
                                  ? "bg-[#ff4d2d] text-white hover:bg-[#e64323]"
                                  : "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                              }`}
                            >
                              <FiPlus size={14} />
                              {item.isAvailable ? "ADD" : "OUT OF STOCK"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Floating simulated checkout cart indicator */}
      {cartCount > 0 && (
        <div className="fixed bottom-6 right-6 bg-[#ff4d2d] text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-3 cursor-pointer z-50 hover:bg-[#e64323] transition-colors">
          <FiShoppingBag size={20} />
          <span className="font-bold text-sm">{cartCount} items in cart</span>
        </div>
      )}

      {/* Premium Customization Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-[#ffe4dc] flex flex-col max-h-[85vh]">
            {/* Image header */}
            <div className="relative h-44 bg-gray-100 shrink-0">
              {selectedItem.image ? (
                <img
                  src={getImageUrl(selectedItem.image)}
                  alt={selectedItem.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#fff2ee] to-[#fff9f6] flex items-center justify-center">
                  <BiDish className="text-[#ff4d2d]/25" size={48} />
                </div>
              )}
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute top-4 right-4 bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center cursor-pointer hover:bg-black/80 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Details */}
            <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
              <div>
                <h3 className="text-xl font-extrabold text-gray-800">{selectedItem.name}</h3>
                <p className="text-xs text-gray-400 mt-1">{selectedItem.description}</p>
              </div>

              {/* Variants Section */}
              {selectedItem.variants?.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2.5">
                    Select Variant
                  </h4>
                  <div className="flex flex-col gap-2">
                    {selectedItem.variants.map((v) => (
                      <label
                        key={v._id}
                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                          selectedVariant?._id === v._id
                            ? "bg-[#fff2ee] border-[#ff4d2d] text-[#ff4d2d] font-bold"
                            : "border-gray-200 hover:bg-[#fff9f6]"
                        }`}
                      >
                        <div className="flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name="variant"
                            checked={selectedVariant?._id === v._id}
                            onChange={() => setSelectedVariant(v)}
                            className="accent-[#ff4d2d]"
                          />
                          {v.name}
                        </div>
                        <span className="text-sm">₹{v.price / 100}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Extras Section */}
              {selectedItem.extras?.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2.5">
                    Add Extras
                  </h4>
                  <div className="flex flex-col gap-2">
                    {selectedItem.extras.map((e) => {
                      const isSelected = selectedExtras.some(extra => extra._id === e._id);
                      return (
                        <label
                          key={e._id}
                          className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? "bg-[#fff2ee] border-[#ff4d2d] text-[#ff4d2d] font-bold"
                              : "border-gray-200 hover:bg-[#fff9f6]"
                          }`}
                        >
                          <div className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleExtra(e)}
                              className="accent-[#ff4d2d] rounded"
                            />
                            {e.name}
                          </div>
                          <span className="text-sm">+₹{e.price / 100}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Spice Levels Section */}
              {selectedItem.spiceLevels?.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2.5">
                    Spice Level
                  </h4>
                  <div className="flex gap-2">
                    {selectedItem.spiceLevels.map((spice) => (
                      <button
                        key={spice}
                        onClick={() => setSelectedSpice(spice)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer border ${
                          selectedSpice === spice
                            ? "bg-[#ff4d2d] text-white border-[#ff4d2d]"
                            : "border-gray-200 text-gray-600 hover:bg-[#fff2ee] hover:text-[#ff4d2d]"
                        }`}
                      >
                        {spice}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Modal Footer */}
            <div className="p-6 border-t border-[#fff2ee] shrink-0 flex items-center justify-between gap-4 bg-[#fff9f6]">
              {/* Quantity selectors */}
              <div className="flex items-center gap-3 bg-white border border-[#ffe4dc] rounded-xl px-3 py-2 shadow-sm">
                <button
                  onClick={() => setItemQuantity(prev => Math.max(1, prev - 1))}
                  className="w-8 h-8 rounded-lg text-gray-500 hover:bg-[#fff2ee] hover:text-[#ff4d2d] transition-colors flex items-center justify-center cursor-pointer"
                >
                  <FiMinus />
                </button>
                <span className="font-extrabold text-sm w-4 text-center">{itemQuantity}</span>
                <button
                  onClick={() => setItemQuantity(prev => prev + 1)}
                  className="w-8 h-8 rounded-lg text-gray-500 hover:bg-[#fff2ee] hover:text-[#ff4d2d] transition-colors flex items-center justify-center cursor-pointer"
                >
                  <FiPlus />
                </button>
              </div>

              {/* Add button with total price */}
              <button
                onClick={handleAddToCart}
                className="flex-1 py-3.5 rounded-xl bg-[#ff4d2d] text-white font-bold text-sm hover:bg-[#e64323] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#ff4d2d]/30"
              >
                <span>Add Item</span>
                <span>•</span>
                <span>
                  ₹
                  {((selectedVariant ? selectedVariant.price : selectedItem.price) +
                    selectedExtras.reduce((sum, extra) => sum + extra.price, 0)) *
                    itemQuantity /
                    100}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Premium Floating Bottom Cart Bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-lg px-4">
          <div 
            onClick={() => navigate("/checkout")}
            className="w-full bg-[#ff4d2d] text-white py-4 px-6 rounded-2xl shadow-xl flex items-center justify-between cursor-pointer hover:bg-[#e64323] active:scale-95 transition-all shadow-[#ff4d2d]/30"
          >
            <div className="flex items-center gap-3">
              <span className="bg-white text-[#ff4d2d] text-xs font-black px-2.5 py-1 rounded-full shadow-sm">
                {cartCount} {cartCount === 1 ? "Item" : "Items"}
              </span>
              <span className="font-extrabold text-sm tracking-wide">Basket ready to order!</span>
            </div>
            
            <div className="flex items-center gap-1 font-black text-sm uppercase tracking-wider">
              <span>View Cart</span>
              <FiShoppingBag />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RestaurantPage;

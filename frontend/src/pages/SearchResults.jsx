import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { serverUrl } from "../App";
import Nav from "../components/Nav";
import { FiSearch, FiFilter, FiStar, FiClock, FiDollarSign } from "react-icons/fi";
import { BiDish } from "react-icons/bi";

function SearchResults() {
  const navigate = useNavigate();
  const { city } = useSelector((state) => state.user);
  
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCuisine, setSelectedCuisine] = useState("");
  const [vegOnly, setVegOnly] = useState(false);
  const [sortBy, setSortBy] = useState("rating");
  const [maxPrice, setMaxPrice] = useState(100000); // 1000 INR in paise

  const cuisinesList = [
    "North Indian", "South Indian", "Chinese", "Pizza", "Burgers", 
    "Fast Food", "Desserts", "Snacks", "Biryani", "Beverages"
  ];

  useEffect(() => {
    fetchRestaurants();
  }, [selectedCuisine, sortBy, vegOnly, city]);

  const fetchRestaurants = async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        search: searchQuery,
        cuisine: selectedCuisine,
        vegOnly: vegOnly ? "true" : "false",
        sortBy,
        maxPriceForTwo: maxPrice,
        city: city || undefined,
      };

      const res = await axios.get(`${serverUrl}/api/restaurants`, {
        params,
        withCredentials: true,
      });

      setRestaurants(res.data?.data || []);
    } catch (err) {
      setError("Failed to fetch restaurants. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchRestaurants();
  };

  const getImageUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    return `${serverUrl}${url}`;
  };

  return (
    <div className="min-h-screen bg-[#fff9f6] flex flex-col items-center">
      <Nav />
      
      <div className="w-full max-w-6xl px-4 md:px-6 pt-24 pb-12">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-[#222]">
              Popular Restaurants {city ? `in ${city}` : ""}
            </h1>
            <p className="text-gray-500 mt-1">
              Discover the best food and drinks near you
            </p>
          </div>
          
          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md w-full">
            <input
              type="text"
              placeholder="Search by restaurant or cuisine..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-full border border-[#ffe4dc] bg-white shadow-sm outline-none focus:border-[#ff4d2d] transition-all"
            />
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-full bg-[#ff4d2d] text-white text-xs font-semibold hover:bg-[#e64323] transition-colors cursor-pointer"
            >
              Search
            </button>
          </form>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Filter Sidebar */}
          <div className="lg:col-span-1 bg-white rounded-2xl p-5 shadow-sm border border-[#ffe4dc] flex flex-col gap-6 sticky top-24">
            <div className="flex items-center gap-2 pb-3 border-b border-[#fff2ee]">
              <FiFilter className="text-[#ff4d2d]" size={18} />
              <h2 className="font-bold text-gray-800">Filters</h2>
            </div>

            {/* Sort Options */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Sort By</h3>
              <div className="flex flex-col gap-2">
                {[
                  { value: "rating", label: "Top Rated" },
                  { value: "deliveryTime", label: "Fastest Delivery" },
                  { value: "priceAsc", label: "Cost: Low to High" },
                  { value: "priceDesc", label: "Cost: High to Low" },
                ].map((option) => (
                  <label key={option.value} className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
                    <input
                      type="radio"
                      name="sortBy"
                      checked={sortBy === option.value}
                      onChange={() => setSortBy(option.value)}
                      className="accent-[#ff4d2d]"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Veg Preference */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Dietary Preference</h3>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={vegOnly}
                  onChange={(e) => setVegOnly(e.target.checked)}
                  className="rounded text-[#ff4d2d] accent-[#ff4d2d] w-4 h-4"
                />
                Pure Veg Restaurants Only
              </label>
            </div>

            {/* Cuisine Options */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Cuisines</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCuisine("")}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    selectedCuisine === ""
                      ? "bg-[#ff4d2d] text-white"
                      : "bg-[#fff2ee] text-[#ff4d2d] hover:bg-[#ffe4dc]"
                  }`}
                >
                  All
                </button>
                {cuisinesList.map((cuisine) => (
                  <button
                    key={cuisine}
                    onClick={() => setSelectedCuisine(cuisine)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      selectedCuisine === cuisine
                        ? "bg-[#ff4d2d] text-white"
                        : "bg-[#fff2ee] text-[#ff4d2d] hover:bg-[#ffe4dc]"
                    }`}
                  >
                    {cuisine}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Filter */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-semibold text-gray-700">Max Budget (For Two)</h3>
                <span className="text-xs font-bold text-[#ff4d2d]">₹{maxPrice / 100}</span>
              </div>
              <input
                type="range"
                min="20000"
                max="200000"
                step="10000"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                onMouseUp={fetchRestaurants}
                onTouchEnd={fetchRestaurants}
                className="w-full accent-[#ff4d2d] bg-[#fff2ee] h-1.5 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>₹200</span>
                <span>₹2000</span>
              </div>
            </div>
          </div>

          {/* Restaurant Grid */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="animate-pulse bg-white rounded-2xl h-[320px] border border-[#ffe4dc]"></div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-red-100 p-6 text-red-500 font-semibold shadow-sm">
                {error}
              </div>
            ) : restaurants.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-[#ffe4dc] p-8 shadow-sm">
                <BiDish className="mx-auto text-gray-300 mb-4" size={60} />
                <h3 className="text-xl font-bold text-gray-700">No Restaurants Found</h3>
                <p className="text-gray-500 mt-1">Try resetting your search query or filter selections.</p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCuisine("");
                    setVegOnly(false);
                    setSortBy("rating");
                    setMaxPrice(100000);
                  }}
                  className="mt-4 px-5 py-2.5 rounded-xl bg-[#ff4d2d] text-white font-medium hover:bg-[#e64323] transition-colors cursor-pointer"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {restaurants.map((restaurant) => (
                  <div
                      key={restaurant._id}
                      onClick={() => navigate(`/restaurant/${restaurant._id}`)}
                      className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-[#ffe4dc] hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col h-full"
                  >
                    {/* Cover Image */}
                    <div className="relative h-48 bg-gray-100 overflow-hidden">
                      {restaurant.coverImage ? (
                        <img
                          src={getImageUrl(restaurant.coverImage)}
                          alt={restaurant.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gradient-to-br from-[#fff2ee] to-[#fff9f6]">
                          <BiDish size={48} className="text-[#ff4d2d]/30" />
                        </div>
                      )}
                      
                      {/* Price Badge */}
                      <span className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-semibold">
                        ₹{restaurant.priceForTwo / 100} for two
                      </span>
                    </div>

                    {/* Content */}
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-extrabold text-lg text-gray-800 group-hover:text-[#ff4d2d] transition-colors line-clamp-1">
                            {restaurant.name}
                          </h3>
                          <span className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-0.5 rounded text-xs font-bold shrink-0">
                            <FiStar className="fill-green-700 stroke-none" />
                            {restaurant.avgRating ? restaurant.avgRating.toFixed(1) : "New"}
                          </span>
                        </div>
                        
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1 font-medium">
                          {restaurant.cuisines?.join(", ")}
                        </p>
                        
                        <p className="text-xs text-gray-400 mt-2 line-clamp-1">
                          📍 {restaurant.address?.street}, {restaurant.address?.city}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-[#fff2ee] flex justify-between items-center text-xs text-gray-500 font-medium">
                        <span className="flex items-center gap-1.5">
                          <FiClock className="text-[#ff4d2d]" />
                          {restaurant.avgDeliveryMin} mins delivery
                        </span>
                        <span className="text-[#ff4d2d] group-hover:translate-x-1 transition-transform font-bold text-xs flex items-center gap-0.5">
                          Order Now →
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SearchResults;

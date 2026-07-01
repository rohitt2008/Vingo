import { FaLocationDot } from "react-icons/fa6";
import { IoIosSearch } from "react-icons/io";
import { FiShoppingCart } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { useState } from "react";
import { RxCross2 } from "react-icons/rx";
import axios from "axios";
import { serverUrl } from "../App";
import { setUserData } from "../redux/userSlice";
import { useNavigate } from "react-router-dom";

function Nav() {
  const { userData, city } = useSelector(state => state.user);
  const [showInfo, setShowInfo] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogOut = async () => {
    try {
      await axios.get(`${serverUrl}/api/auth/signout`, { withCredentials: true });
    } catch (error) {
      // Ignored
    } finally {
      dispatch(setUserData(null));
      navigate("/signin");
    }
  };

  return (
    <div className="w-full h-[80px] flex items-center justify-between md:justify-center gap-[30px] px-[20px] fixed top-0 z-[9999] bg-[#fff9f6] border-b border-[#ffe4dc]">
      {showSearch && (
        <div className="w-[95%] max-w-xl h-[60px] bg-white shadow-lg rounded-2xl items-center gap-[15px] flex fixed top-[80px] left-1/2 -translate-x-1/2 md:hidden p-3 border border-[#ffe4dc]">
          {/* Location Section */}
          <div className="flex items-center w-[35%] overflow-hidden gap-[6px] px-[5px] border-r border-[#ffe4dc]">
            <FaLocationDot size={16} className="text-[#ff4d2d]" />
            <span className="truncate text-xs font-semibold text-gray-700">{city || "Select City"}</span>
          </div>

          {/* Search Input */}
          <div className="flex-1 flex items-center gap-[8px]" onClick={() => navigate("/restaurants")}>
            <IoIosSearch size={20} className="text-[#ff4d2d]" />
            <input
              type="text"
              readOnly
              placeholder="Search restaurants..."
              className="outline-none w-full text-xs text-gray-700 cursor-pointer"
            />
          </div>
        </div>
      )}
      
      {/* Logo */}
      <h1 
        onClick={() => navigate("/")}
        className="text-3xl font-extrabold text-[#ff4d2d] cursor-pointer hover:scale-105 transition-transform"
      >
        Vingo
      </h1>

      {/* Search Container (Desktop) */}
      <div 
        onClick={() => navigate("/restaurants")}
        className="md:w-[45%] h-[50px] bg-white shadow-sm border border-[#ffe4dc] rounded-full items-center gap-[15px] hidden md:flex px-4 cursor-pointer hover:shadow-md transition-shadow"
      >
        {/* Location Section */}
        <div className="flex items-center w-[30%] overflow-hidden gap-[8px] border-r border-[#ffe4dc] pr-3 shrink-0">
          <FaLocationDot size={18} className="text-[#ff4d2d]" />
          <span className="truncate text-xs font-semibold text-gray-700">{city || "Select Location"}</span>
        </div>

        {/* Search Input */}
        <div className="flex-1 flex items-center gap-[8px]">
          <IoIosSearch size={22} className="text-[#ff4d2d]" />
          <span className="text-xs text-gray-400 font-medium">Search restaurants and delicious food...</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {showSearch ? (
          <RxCross2 onClick={() => setShowSearch(false)} size={22} className="text-[#ff4d2d] md:hidden cursor-pointer" />
        ) : (
          <IoIosSearch size={22} className="text-[#ff4d2d] md:hidden cursor-pointer" onClick={() => setShowSearch(true)} />
        )}
        
        <div 
          onClick={() => navigate("/checkout")}
          className="relative cursor-pointer hover:scale-110 transition-transform p-1.5"
        >
          <FiShoppingCart size={22} className="text-[#ff4d2d]"/>
        </div>

        <button 
          onClick={() => navigate("/orders")}
          className="hidden md:block px-4 py-1.5 rounded-full bg-[#ff4d2d]/10 text-[#ff4d2d] text-xs font-extrabold hover:bg-[#ff4d2d]/20 transition-colors cursor-pointer"
        >
          My Orders
        </button>

        <div 
          className="w-[38px] h-[38px] rounded-full flex items-center justify-center text-white text-sm shadow-md font-bold cursor-pointer bg-[#ff4d2d] hover:bg-[#e64323] transition-colors"
          onClick={() => setShowInfo(prev => !prev)}
        >
          {(userData?.name || userData?.fullName || "U").slice(0,1).toUpperCase()}
        </div>

        {showInfo && (
          <div className="absolute top-[75px] right-[20px] w-[170px] bg-white shadow-2xl rounded-2xl p-4 flex flex-col gap-3 z-[9999] border border-[#ffe4dc]">
            <div className="text-xs font-black text-gray-800 border-b border-[#fff2ee] pb-2 truncate">
              {userData?.name || userData?.fullName}
            </div>
            
            <div 
              onClick={() => { setShowInfo(false); navigate("/wallet"); }}
              className="text-xs font-bold text-gray-600 hover:text-[#ff4d2d] cursor-pointer"
            >
              Vingo Wallet
            </div>

            {userData?.role === 'admin' && (
              <div 
                onClick={() => { setShowInfo(false); navigate("/admin"); }}
                className="text-xs font-bold text-gray-600 hover:text-[#ff4d2d] cursor-pointer"
              >
                Admin Panel
              </div>
            )}

            <div 
              onClick={() => { setShowInfo(false); navigate("/orders"); }}
              className="text-xs font-bold text-gray-600 hover:text-[#ff4d2d] cursor-pointer"
            >
              My Orders
            </div>

            <div 
              onClick={handleLogOut}
              className="text-xs font-bold text-red-500 hover:text-red-700 cursor-pointer pt-2 border-t border-[#fff2ee]"
            >
              Log Out
            </div>
          </div>
        )}
      </div> 
    </div>
  );
}

export default Nav;

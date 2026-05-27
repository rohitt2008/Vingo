import React from "react";
import { FiEdit2 } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

function OwnerItemCard({ item }) {
  const navigate = useNavigate();

  return (
    <div className="rounded-2xl bg-white p-4 shadow-md border border-[#f1f1f1]">
      <div className="w-full h-[140px] rounded-xl overflow-hidden border border-gray-100 bg-[#fafafa]">
        {item?.image ? (
          <img
            src={item.image}
            alt={item?.name || "Food item"}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            No image
          </div>
        )}
      </div>

      <div className="mt-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-gray-800 truncate">
            {item?.name}
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            {item?.category} • {item?.foodType}
          </p>
          <p className="text-sm font-bold text-[#ff4d2d] mt-2">
            Rs {item?.price}
          </p>
        </div>

        <button
          type="button"
          className="w-[40px] h-[40px] rounded-full border border-[#ff4d2d] text-[#ff4d2d] hover:bg-[#fff2ee] transition-colors cursor-pointer flex items-center justify-center"
          onClick={() => navigate(`/edit-food/${item?._id}`)}
          aria-label="Edit item"
        >
          <FiEdit2 size={18} />
        </button>
      </div>
    </div>
  );
}

export default OwnerItemCard;


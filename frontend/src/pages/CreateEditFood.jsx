import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { serverUrl } from "../App";

const categories = [
  "Snacks",
  "Main Course",
  "Desserts",
  "Pizza",
  "Burgers",
  "Sandwiches",
  "South Indian",
  "North Indian",
  "Chinese",
  "Fast Food",
  "Others",
];

const foodTypes = ["veg", "non veg"];

function CreateEditFood({ mode }) {
  const navigate = useNavigate();
  const { itemId } = useParams();
  const isEdit = mode === "edit";

  const [name, setName] = useState("");
  const [category, setCategory] = useState("Snacks");
  const [foodType, setFoodType] = useState("veg");
  const [price, setPrice] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submitLabel = useMemo(
    () => (isEdit ? "Update Food" : "Add Food"),
    [isEdit]
  );

  useEffect(() => {
    if (!imageFile) {
      setImagePreview(null);
      return;
    }

    const objectUrl = URL.createObjectURL(imageFile);
    setImagePreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");

    if (isEdit && !itemId) {
      return setErr("Item id is missing for edit.");
    }

    if (!name.trim()) return setErr("Food name is required.");
    if (!category) return setErr("Category is required.");
    if (!foodType) return setErr("Food type is required.");
    if (!price || Number(price) < 0) return setErr("Price must be a valid number.");
    if (!imageFile) {
      // Backend schema requires `image`, and edit route updates image.
      return setErr("Food image is required.");
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("name", name);
      formData.append("category", category);
      formData.append("foodType", foodType);
      formData.append("price", Number(price));
      formData.append("image", imageFile);

      if (isEdit) {
        await axios.put(`${serverUrl}/api/item/edit-item/${itemId}`, formData, {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await axios.post(`${serverUrl}/api/item/add-item`, formData, {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      navigate("/");
    } catch (error) {
      const message = error?.response?.data?.message || "Something went wrong.";
      const details = error?.response?.data?.details;
      setErr(details ? `${message}: ${details}` : message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl px-4 md:px-6 pb-10">
      <div className="rounded-2xl bg-white p-5 md:p-8 shadow-md border border-[#ffe4dc]">
        <p className="text-sm text-gray-500">
          {isEdit ? "Edit Food Item" : "Add Food Item"}
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-[#222] mt-1">
          {submitLabel}
        </h1>
        <p className="text-gray-600 mt-2">
          Fill in the details below. Image upload is required.
        </p>

        <form onSubmit={handleSubmit} className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border rounded-lg px-3 py-2 outline-none focus:border-[#ff4d2d]"
                placeholder="e.g. Chicken Biryani"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">Price</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="border rounded-lg px-3 py-2 outline-none focus:border-[#ff4d2d]"
                placeholder="e.g. 149"
                min={0}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="border rounded-lg px-3 py-2 outline-none focus:border-[#ff4d2d]"
              >
                {categories.map((c) => (
                  <option value={c} key={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">Food Type</label>
              <select
                value={foodType}
                onChange={(e) => setFoodType(e.target.value)}
                className="border rounded-lg px-3 py-2 outline-none focus:border-[#ff4d2d]"
              >
                {foodTypes.map((t) => (
                  <option value={t} key={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="text-sm font-medium text-gray-700">Image</label>
            <div className="mt-2 flex flex-col gap-3">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Food preview"
                  className="w-full max-h-[280px] object-cover rounded-xl border"
                />
              ) : (
                <div className="w-full h-[160px] rounded-xl border border-dashed bg-[#fafafa] flex items-center justify-center text-gray-500">
                  Choose an image to preview
                </div>
              )}

              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-600"
              />
            </div>
          </div>

          {err && <p className="mt-4 text-red-500 text-sm">{err}</p>}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-lg bg-[#ff4d2d] text-white font-medium hover:bg-[#e64323] transition-colors cursor-pointer"
            >
              {loading ? "Please wait..." : submitLabel}
            </button>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="px-5 py-2 rounded-lg border border-[#ff4d2d] text-[#ff4d2d] font-medium hover:bg-[#fff2ee] transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateEditFood;


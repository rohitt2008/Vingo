import Item from "../models/item.model.js";
import Shop from "../models/shop.model.js";
import { uploadOnCloudinary } from "../utils/couldinary.js";

export const addItem = async (req , res) =>{
  try {
    const { name , category , foodType , price} = req.body;
    let image;
    if(req.file){
      image = await uploadOnCloudinary(req.file.path);
    }
    let shop = await Shop.findOne({owner: req.userId});
    if(!shop){
      return res.status(400).json({message:"shop not found"})
    }
    if(!image){
      return res.status(400).json({ message: "Food image is required" });
    }

    const item = await Item.create({
      name,
      category,
      foodType,
      price,
      image,
      shop: shop._id,
    })

    // Keep Shop.items in sync for future queries.
    if (!shop.items) shop.items = [];
    shop.items.push(item._id);
    await shop.save();

    return res.status(200).json(item)
  } catch (error) {
    return res.status(500).json({message: `add item error ${error}`})
  }
}

export const getOwnerItems = async (req, res) => {
  try {
    const shop = await Shop.findOne({ owner: req.userId });
    if (!shop) {
      return res.status(200).json([]); // no shop yet => no items
    }

    const items = await Item.find({ shop: shop._id }).sort({ createdAt: -1 });
    return res.status(200).json(items);
  } catch (error) {
    return res.status(500).json({ message: `get owner items error ${error}` });
  }
};

export const editItem = async (req , res) =>{
  try {
    const itemId = req.params.itemId
    const {name , category , foodType ,price } = req.body
    const updateData = { name, category, foodType, price };

    if(req.file){
      updateData.image = await uploadOnCloudinary(req.file.path );
    }

    const item = await Item.findByIdAndUpdate(itemId, updateData, {new : true})
    if(!item){
      return res.status(400).json({message:"item not found"})
    }
    return res.status(200).json(item)
  } catch (error) {
    return res.status(500).json({message: `edit item error ${error}`})
  }
}
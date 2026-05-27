import express from "express";


import isAuth from "../middlewares/isAuth.js";

import { upload } from "../middlewares/multer.js";
import { addItem, editItem, getOwnerItems } from "../controllers/item.controllers.js";



const itemRouter = express.Router();

itemRouter.post("/add-item" , isAuth, upload.single("image") , addItem)
itemRouter.put("/edit-item/:itemId" , isAuth, upload.single("image") , editItem)
itemRouter.get("/owner-items" , isAuth, getOwnerItems)

export default itemRouter;
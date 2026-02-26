import express from "express";
;

import isAuth from "../middlewares/isAuth.js";
import { createEditShop } from "../controllers/shop.controllers.js";



const shopRouter = express.Router();

shopRouter.get("/create-edit" , isAuth , createEditShop)

export default shopRouter;
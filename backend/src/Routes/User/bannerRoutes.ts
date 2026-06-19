import express from "express";
import { getBanners } from "../../controller/bannerController";

const router = express.Router();

router.get("/", getBanners);

export default router;

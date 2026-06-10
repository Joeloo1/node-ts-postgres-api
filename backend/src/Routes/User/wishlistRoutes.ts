import { Router } from "express";
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
} from "../../controller/wishlistController";
import { Protect } from "../../controller/authController";

const router = Router();

router.use(Protect);

router.route("/").get(getWishlist).post(addToWishlist).delete(clearWishlist);
router.route("/:productId").delete(removeFromWishlist);

export default router;

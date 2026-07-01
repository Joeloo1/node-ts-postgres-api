import express from "express";
import { Protect } from "../../controller/authController";
import {
  purchaseGiftCard,
  checkGiftCardBalance,
  getMyGiftCards,
} from "../../controller/giftCardController";

const router = express.Router();

// Public — balance check only needs the code
router.get("/:code/balance", checkGiftCardBalance);

// Protected
router.use(Protect);
router.get("/my", getMyGiftCards);
router.post("/purchase", purchaseGiftCard);

export default router;

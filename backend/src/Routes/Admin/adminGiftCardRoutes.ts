import express from "express";
import {
  adminGetGiftCards,
  adminRevokeGiftCard,
} from "../../controller/giftCardController";

const router = express.Router();

router.get("/", adminGetGiftCards);
router.patch("/:id/revoke", adminRevokeGiftCard);

export default router;

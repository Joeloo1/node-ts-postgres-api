import { Router } from "express";
import { subscribeStockNotify } from "../../controller/stockNotifyController";
import { validateBody } from "../../middleware/validationMiddleware";
import { stockNotifySchema } from "../../Schema/stockNotifySchema";

const router = Router();

router.post("/", validateBody(stockNotifySchema), subscribeStockNotify);

export default router;

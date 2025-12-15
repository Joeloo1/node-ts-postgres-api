import express from "express";
import { Protect, restrictTo } from "../controller/authController";
import { createOrder,  getMyOrder, getOrderById, updateOrder, cancelOrder} from "../controller/orderController";


const router = express.Router();

router.use(Protect);

router
    .route('/')
    .get(getMyOrder)
    .post(createOrder)

router
    .route('/:id')
    .get(getOrderById)
     .patch(cancelOrder)
    .patch(restrictTo('ADMIN'), updateOrder)
   

export default router;


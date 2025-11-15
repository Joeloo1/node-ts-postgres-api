import { Request, Response, NextFunction } from "express";
import pool from "../service/database";

export const products = async (req: Request, res: Response) => {
  try {
    const products = await pool.query('SELECT * FROM products');
    res.status(200).json({
        result: products.rows.length,
        status: 'Success',
        data:{
            products: products.rows
        }
    })
  } catch (err) {
   res.status(401).json({
    status: 'Fail',
    message: err
   })
  }
}

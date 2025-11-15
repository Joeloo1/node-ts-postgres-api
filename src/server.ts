import {Request, Response, NextFunction} from "express"
import dotenv from "dotenv"

import app from "./app"

dotenv.config()

// app.get('/products', async (req: Request, res: Response) => {
//   try {
//     const products = await pool.query('SELECT * FROM products');
//     res.status(200).json({
//         result: products.rows.length,
//         status: 'Success',
//         data:{
//             products: products.rows
//         }
//     })
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Server error' });
//   }
// });

const port = Number(process.env.PORT)

app.listen(port, () => {
    console.log(`App listening on port: ${port}... `)
})
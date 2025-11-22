import express from "express";
import morgan from "morgan";

import productRoutes from "./Routes/productRoutes"

const app = express()
app.use(express.urlencoded({ extended: true }));

app.use(express.json())
app.use(morgan('dev'))

app.use('/api/v1/products', productRoutes)

export default app
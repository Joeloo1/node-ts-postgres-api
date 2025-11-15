import { Pool, PoolClient } from 'pg';
import dotenv from  "dotenv"

dotenv.config()

// const pool = new Pool({
//   user: process.env.DB_USER,
//   host: process.env.DB_HOST,
//   database: process.env.DB_NAME,
//   password: process.env.DB_PASSWORD,
//   port: Number(process.env.DB_PORT), // default PostgreSQL port
// });

// pool.connect()
//   .then(() => {
//     console.log("🟢 Connected to PostgreSQL");
//   })
//   .catch((err) => {
//     console.error("🔴 PostgreSQL connection error:", err);
//   });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.connect()
  .then(() => {
    console.log("🟢 Connected to PostgreSQL");
  })
  .catch((err) => {
    console.error("🔴 PostgreSQL connection error:", err);
  });


export default pool

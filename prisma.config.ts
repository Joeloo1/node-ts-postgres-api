import { defineConfig, env } from "prisma/config";
import { PrismaClient } from '@prisma/client';
// import postgresql from "pg"


export default defineConfig({
  schema: "prisma/schema.prisma",
  // migrations: {
  //   path: "prisma/migrations",
  // },
  datasource: {
    url: "postgresql://postgres:12345@127.0.0.1:5432/nodecurd",
  },
});

export const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL
});

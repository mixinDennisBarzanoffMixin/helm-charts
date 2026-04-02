import { defineConfig } from "drizzle-kit"

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.USIP_DB_PATH || "/data/veritly-usip.db",
  },
})

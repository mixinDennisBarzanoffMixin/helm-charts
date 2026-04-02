import { serve } from "@hono/node-server"
import { createApp } from "./app"

const port = Number(process.env.PORT || "8080")
const apiKey = process.env.USIP_APIKEY?.trim() || ""
const dbPath = process.env.USIP_DB_PATH?.trim() || "/data/veritly-usip.db"
const defaultProjectId = process.env.USIP_DEFAULT_PROJECT_ID?.trim() || "default"
const app = createApp({
  apiKey,
  dbPath,
  defaultProjectId,
})

serve({ fetch: app.fetch, port, hostname: "0.0.0.0" }, () => {
  console.log(`[veritly-usip] listening on http://0.0.0.0:${port}`)
})

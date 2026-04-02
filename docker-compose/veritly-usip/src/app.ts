import { Hono } from "hono"
import { cors } from "hono/cors"
import { createDb, type Role, type UnitKind } from "./db"

type User = { userID: string; name: string; avatar: string }

export function createApp(config: { apiKey: string; dbPath: string; defaultProjectId: string }) {
  const db = createDb(config.dbPath)
  const users = new Map<string, User>([
    [
      "veritly-mock-user",
      {
        userID: "veritly-mock-user",
        name: "Veritly User",
        avatar: "https://api.dicebear.com/9.x/identicon/svg?seed=veritly-mock-user",
      },
    ],
  ])

  function defaultUser(): User {
    return users.get("veritly-mock-user")!
  }

  function ensureApiKey(request: Request): Response | null {
    if (!config.apiKey) return null
    if (request.headers.get("x-api-key") === config.apiKey) return null
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  function roleFor(_unitID: string, _userID: string): Role {
    return "editor"
  }

  function projectIdFromHeaders(request: Request): string {
    const value = request.headers.get("x-veritly-project-id")?.trim()
    return value || config.defaultProjectId
  }

  function normalizePath(input: string): string {
    const clean = input.trim().replace(/\\/g, "/").replace(/^\/+/, "")
    if (!clean) throw new Error("path is required")
    return clean
  }

  function inferUnitKind(filePath: string, mimeType?: string): UnitKind {
    const lower = filePath.toLowerCase()
    const mime = mimeType?.toLowerCase() || ""
    if (/\.(xlsx|xlsm|xls|csv)$/.test(lower) || mime.includes("sheet") || mime.includes("excel")) return "sheet"
    if (/\.(docx|doc|odt)$/.test(lower) || mime.includes("word") || mime.includes("document")) return "doc"
    if (/\.(pptx|ppt|odp)$/.test(lower) || mime.includes("presentation") || mime.includes("powerpoint")) return "slide"
    throw new Error("Unsupported office file type")
  }

  function unitTypeFromKind(kind: UnitKind): number {
    if (kind === "doc") return 1
    if (kind === "sheet") return 2
    return 3
  }

  const app = new Hono()
  const corsOrigins = (process.env.USIP_CORS_ORIGINS?.trim() || "http://localhost:4444,http://127.0.0.1:4444")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
  app.use(
    "*",
    cors({
      origin: (origin) => {
        if (!origin) return corsOrigins[0] || "*"
        if (corsOrigins.includes("*")) return origin
        return corsOrigins.includes(origin) ? origin : ""
      },
      allowMethods: ["GET", "POST", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization", "x-veritly-project-id", "x-api-key"],
      credentials: true,
    }),
  )
  app.get("/health", (c) => c.json({ ok: true }))

  app.post("/v1/files/upload-office", async (c) => {
    const body = (await c.req.json().catch(() => null)) as
      | { path?: string; content?: string; mimeType?: string }
      | null
    if (!body?.path || !body?.content) return c.json({ error: "path and content are required" }, 400)

    const projectId = projectIdFromHeaders(c.req.raw)
    const currentUser = defaultUser()
    const normalizedPath = normalizePath(body.path)
    const unitKind = inferUnitKind(normalizedPath, body.mimeType)
    /** Placeholder until the browser runs `univerAPI.importXLSXToUnitIdAsync` and POST /v1/files/register-unit. */
    const unitId = `pending-${crypto.randomUUID()}`
    const now = Date.now()

    await db.upsertOfficeFile({
      projectId,
      path: normalizedPath,
      unitId,
      unitKind,
      mimeType: body.mimeType,
      contentBase64: body.content,
      ownerUserId: currentUser.userID,
      now,
    })

    return c.json({ path: normalizedPath, projectId, unitId, unitType: unitTypeFromKind(unitKind), unitKind })
  })

  app.post("/v1/files/register-unit", async (c) => {
    const body = (await c.req.json().catch(() => null)) as { path?: string; unitId?: string } | null
    if (!body?.path || !body?.unitId) return c.json({ error: "path and unitId are required" }, 400)

    const projectId = projectIdFromHeaders(c.req.raw)
    const currentUser = defaultUser()
    const normalizedPath = normalizePath(body.path)
    const row = db.getOfficeFileByPath(projectId, normalizedPath)
    if (!row) return c.json({ error: "NotFound" }, 404)

    if (row.unitId === body.unitId) return c.json({ ok: true, path: normalizedPath, unitId: body.unitId })
    if (!row.unitId.startsWith("pending-")) return c.json({ error: "unit already bound" }, 409)

    const now = Date.now()
    db.deleteUnitMembersForUnit(row.unitId)
    db.updateOfficeFileUnitId(projectId, normalizedPath, body.unitId, now)
    db.upsertUnitMember({ unitId: body.unitId, userId: currentUser.userID, role: "owner", createdAt: now })

    return c.json({ ok: true, path: normalizedPath, unitId: body.unitId })
  })

  app.get("/v1/files/content", (c) => {
    const projectId = projectIdFromHeaders(c.req.raw)
    const rawPath = c.req.query("path") || ""
    if (!rawPath) return c.json({ error: "path is required" }, 400)
    const row = db.getOfficeFileByPath(projectId, normalizePath(rawPath))
    if (!row) return c.json({ error: "NotFound" }, 404)
    return c.json({
      type: "binary",
      encoding: "base64",
      content: row.contentBase64,
      mimeType: row.mimeType || undefined,
      unitId: row.unitId,
      unitKind: row.unitKind,
    })
  })

  app.get("/v1/files/resolve", (c) => {
    const projectId = projectIdFromHeaders(c.req.raw)
    const rawPath = c.req.query("path") || ""
    if (!rawPath) return c.json({ error: "path is required" }, 400)
    const normalizedPath = normalizePath(rawPath)
    const row = db.getOfficeFileByPath(projectId, normalizedPath)
    if (!row) return c.json({ kind: "opencode", path: normalizedPath })
    return c.json({
      kind: "univer",
      path: normalizedPath,
      unitId: row.unitId,
      unitKind: row.unitKind,
      unitType: unitTypeFromKind(row.unitKind),
    })
  })

  app.get("/v1/files/list", (c) => {
    const projectId = projectIdFromHeaders(c.req.raw)
    const rawDir = c.req.query("path") || ""
    const dir = rawDir ? normalizePath(rawDir).replace(/\/+$/, "") : ""
    const all = db.listOfficeFiles(projectId)
    const seen = new Set<string>()
    const nodes: Array<{ path: string; name: string; type: "file" | "directory" }> = []
    const prefix = dir ? `${dir}/` : ""

    for (const row of all) {
      const fullPath = row.path
      if (dir && !fullPath.startsWith(prefix)) continue
      const rest = dir ? fullPath.slice(prefix.length) : fullPath
      if (!rest) continue
      const slash = rest.indexOf("/")
      const childPath = slash >= 0 ? `${prefix}${rest.slice(0, slash)}` : fullPath
      if (seen.has(childPath)) continue
      seen.add(childPath)
      nodes.push({
        path: childPath,
        name: childPath.split("/").pop() || childPath,
        type: slash >= 0 ? "directory" : "file",
      })
    }

    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === "directory" ? -1 : 1
      return a.name.localeCompare(b.name)
    })

    return c.json({ data: nodes })
  })

  app.get("/credential", (c) => {
    const denied = ensureApiKey(c.req.raw)
    if (denied) return denied
    return c.json({ user: defaultUser() })
  })

  app.post("/userinfo", async (c) => {
    const denied = ensureApiKey(c.req.raw)
    if (denied) return denied
    const body = (await c.req.json().catch(() => ({}))) as { userIDs?: string[] }
    const userIDs = Array.isArray(body.userIDs) ? body.userIDs : []
    const out = userIDs.map((id) => users.get(id) ?? { ...defaultUser(), userID: id, name: `User-${id}` })
    return c.json({ users: out })
  })

  app.get("/role", (c) => {
    const denied = ensureApiKey(c.req.raw)
    if (denied) return denied
    const userID = c.req.query("userID") || defaultUser().userID
    const unitID = c.req.query("unitID") || ""
    const found = db.getUnitMemberRole(unitID, userID)
    const role = found?.role || roleFor(unitID, userID)
    return c.json({ userID, role })
  })

  app.post("/collaborators", async (c) => {
    const denied = ensureApiKey(c.req.raw)
    if (denied) return denied
    const body = (await c.req.json().catch(() => ({}))) as { unitIDs?: string[] }
    const unitIDs = Array.isArray(body.unitIDs) ? body.unitIDs : []
    const collaborators = unitIDs.map((unitID) => {
      const fromDb = db.getUnitMembers(unitID).map((row) => ({ userID: row.userId, role: row.role }))
      const ownerFallback = db.getOfficeFileByUnit(unitID)
      const entries =
        fromDb.length > 0
          ? fromDb
          : [{ userID: ownerFallback?.ownerUserId || defaultUser().userID, role: "owner" as Role }]
      return {
        unitID,
        subjects: entries.map((entry) => {
          const user = users.get(entry.userID) ?? { ...defaultUser(), userID: entry.userID, name: `User-${entry.userID}` }
          return {
            role: entry.role,
            subject: { type: "user", id: user.userID, name: user.name, avatar: user.avatar },
          }
        }),
      }
    })
    return c.json({ collaborators })
  })

  app.post("/unit-edit-time", async (c) => {
    const denied = ensureApiKey(c.req.raw)
    if (denied) return denied
    await c.req.json().catch(() => null)
    return c.json({})
  })

  return app
}

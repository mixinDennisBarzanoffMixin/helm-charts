import Database from "better-sqlite3"
import { and, eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/better-sqlite3"
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

export type Role = "owner" | "editor" | "reader"
export type UnitKind = "sheet" | "doc" | "slide"

const officeFiles = sqliteTable("office_files", {
  projectId: text("project_id").notNull(),
  path: text("path").notNull(),
  unitId: text("unit_id").notNull(),
  unitKind: text("unit_kind").$type<UnitKind>().notNull(),
  mimeType: text("mime_type"),
  contentBase64: text("content_base64").notNull(),
  ownerUserId: text("owner_user_id").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
})

const unitMembers = sqliteTable("unit_members", {
  unitId: text("unit_id").notNull(),
  userId: text("user_id").notNull(),
  role: text("role").$type<Role>().notNull(),
  createdAt: integer("created_at").notNull(),
})

export function createDb(dbPath: string) {
  const sqlite = new Database(dbPath)
  sqlite.pragma("journal_mode = WAL")
  sqlite.exec(`
CREATE TABLE IF NOT EXISTS office_files (
  project_id TEXT NOT NULL,
  path TEXT NOT NULL,
  unit_id TEXT NOT NULL UNIQUE,
  unit_kind TEXT NOT NULL,
  mime_type TEXT,
  content_base64 TEXT NOT NULL,
  owner_user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(project_id, path)
);
CREATE TABLE IF NOT EXISTS unit_members (
  unit_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY(unit_id, user_id)
);`)
  const db = drizzle(sqlite)

  return {
    async upsertOfficeFile(input: {
      projectId: string
      path: string
      unitId: string
      unitKind: UnitKind
      mimeType?: string
      contentBase64: string
      ownerUserId: string
      now: number
    }) {
      db.insert(officeFiles)
        .values({
          projectId: input.projectId,
          path: input.path,
          unitId: input.unitId,
          unitKind: input.unitKind,
          mimeType: input.mimeType ?? null,
          contentBase64: input.contentBase64,
          ownerUserId: input.ownerUserId,
          createdAt: input.now,
          updatedAt: input.now,
        })
        .onConflictDoUpdate({
          target: [officeFiles.projectId, officeFiles.path],
          set: {
            unitId: input.unitId,
            unitKind: input.unitKind,
            mimeType: input.mimeType ?? null,
            contentBase64: input.contentBase64,
            ownerUserId: input.ownerUserId,
            updatedAt: input.now,
          },
        })
        .run()
    },

    getOfficeFileByPath(projectId: string, path: string) {
      return db
        .select()
        .from(officeFiles)
        .where(and(eq(officeFiles.projectId, projectId), eq(officeFiles.path, path)))
        .get()
    },

    getOfficeFileByUnit(unitId: string) {
      return db.select().from(officeFiles).where(eq(officeFiles.unitId, unitId)).get()
    },

    listOfficeFiles(projectId: string) {
      return db
        .select({
          path: officeFiles.path,
          unitId: officeFiles.unitId,
          unitKind: officeFiles.unitKind,
          mimeType: officeFiles.mimeType,
        })
        .from(officeFiles)
        .where(eq(officeFiles.projectId, projectId))
        .all()
    },

    upsertUnitMember(input: { unitId: string; userId: string; role: Role; createdAt: number }) {
      db.insert(unitMembers)
        .values({
          unitId: input.unitId,
          userId: input.userId,
          role: input.role,
          createdAt: input.createdAt,
        })
        .onConflictDoUpdate({
          target: [unitMembers.unitId, unitMembers.userId],
          set: { role: input.role },
        })
        .run()
    },

    getUnitMembers(unitId: string) {
      return db.select().from(unitMembers).where(eq(unitMembers.unitId, unitId)).all()
    },

    getUnitMemberRole(unitId: string, userId: string) {
      return db
        .select({ role: unitMembers.role })
        .from(unitMembers)
        .where(and(eq(unitMembers.unitId, unitId), eq(unitMembers.userId, userId)))
        .get()
    },

    deleteUnitMembersForUnit(unitId: string) {
      db.delete(unitMembers).where(eq(unitMembers.unitId, unitId)).run()
    },

    updateOfficeFileUnitId(projectId: string, path: string, newUnitId: string, now: number) {
      db.update(officeFiles)
        .set({ unitId: newUnitId, updatedAt: now })
        .where(and(eq(officeFiles.projectId, projectId), eq(officeFiles.path, path)))
        .run()
    },
  }
}

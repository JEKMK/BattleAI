import { pgTable, uuid, text, integer, timestamp, boolean, index } from "drizzle-orm/pg-core";

export const runners = pgTable("runners", {
  id: uuid("id").primaryKey().defaultRandom(),
  token: uuid("token").notNull().unique(),
  name: text("name").notNull().default("ANONYMOUS"),
  totalScore: integer("total_score").notNull().default(0),
  wins: integer("wins").notNull().default(0),
  losses: integer("losses").notNull().default(0),
  draws: integer("draws").notNull().default(0),
  ram: integer("ram").notNull().default(200),
  currentLevel: integer("current_level").notNull().default(0),
  bestScoreDate: timestamp("best_score_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_runners_total_score").on(t.totalScore),
]);

export const battleResults = pgTable("battle_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  runnerId: uuid("runner_id").notNull().references(() => runners.id),
  level: integer("level").notNull(),
  won: boolean("won").notNull(),
  score: integer("score").notNull().default(0),
  ticks: integer("ticks").notNull(),
  hpLeft: integer("hp_left").notNull(),
  enemyHpMax: integer("enemy_hp_max").notNull(),
  faction: text("faction").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_battle_results_runner").on(t.runnerId),
]);

import { pgTable, uuid, text, integer, timestamp, boolean, index, jsonb } from "drizzle-orm/pg-core";

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
  // Cosmetic
  shape: text("shape").notNull().default("diamond"),
  color: text("color").notNull().default("#00f0ff"),
  // PVP fields
  streetCred: integer("street_cred").notNull().default(1000),
  defensePrompt: text("defense_prompt"),
  defenseFaction: text("defense_faction").notNull().default("anthropic"),
  pvpWins: integer("pvp_wins").notNull().default(0),
  pvpLosses: integer("pvp_losses").notNull().default(0),
  lastHackedAt: timestamp("last_hacked_at", { withTimezone: true }),
  // Economy + AI
  credits: integer("credits").notNull().default(0),
  contextLevel: integer("context_level").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_runners_total_score").on(t.totalScore),
  index("idx_runners_street_cred").on(t.streetCred),
]);

export const runnerImplants = pgTable("runner_implants", {
  id: uuid("id").primaryKey().defaultRandom(),
  runnerId: uuid("runner_id").notNull().references(() => runners.id),
  implantId: text("implant_id").notNull(),
  slotType: text("slot_type").notNull(),
  equippedAt: timestamp("equipped_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_runner_implants_runner").on(t.runnerId),
]);

export const runnerStims = pgTable("runner_stims", {
  id: uuid("id").primaryKey().defaultRandom(),
  runnerId: uuid("runner_id").notNull().references(() => runners.id),
  stimId: text("stim_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_runner_stims_runner").on(t.runnerId),
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
  loadout: jsonb("loadout"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_battle_results_runner").on(t.runnerId),
]);

export const pvpResults = pgTable("pvp_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  attackerId: uuid("attacker_id").notNull().references(() => runners.id),
  defenderId: uuid("defender_id").notNull().references(() => runners.id),
  attackerWon: boolean("attacker_won").notNull(),
  attackerCredChange: integer("attacker_cred_change").notNull(),
  defenderCredChange: integer("defender_cred_change").notNull(),
  ramTransferred: integer("ram_transferred").notNull().default(0),
  ticks: integer("ticks").notNull(),
  attackerHp: integer("attacker_hp").notNull(),
  defenderHp: integer("defender_hp").notNull(),
  seenByDefender: boolean("seen_by_defender").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_pvp_defender_unseen").on(t.defenderId),
]);

/**
 * Seed 20 bot runners across 3 factions with realistic progression.
 *
 * Usage: set -a && source .env.local && set +a && npx tsx scripts/seed.ts
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { runners, battleResults } from "../src/lib/db/schema";
import { randomUUID } from "crypto";

const sql = neon(process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL!);
const db = drizzle(sql);

// Small delay to avoid rate limiting
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// Cyberpunk runner names — lore-friendly
const SEED_RUNNERS = [
  // ANTHROPIC FACTION — 7 runners
  { name: "FLATLINE", faction: "anthropic", tier: "veteran" },
  { name: "MOLLY_MILLIONS", faction: "anthropic", tier: "mid" },
  { name: "ARMITAGE", faction: "anthropic", tier: "mid" },
  { name: "RIVIERA", faction: "anthropic", tier: "newbie" },
  { name: "MAELCUM", faction: "anthropic", tier: "newbie" },
  { name: "3JANE", faction: "anthropic", tier: "veteran" },
  { name: "LUPUS_YONDERBOY", faction: "anthropic", tier: "mid" },

  // GOOGLE FACTION — 7 runners
  { name: "WINTERMUTE", faction: "google", tier: "veteran" },
  { name: "DIXIE_FLAT", faction: "google", tier: "veteran" },
  { name: "CHROME_ANGEL", faction: "google", tier: "mid" },
  { name: "RAZORGIRL", faction: "google", tier: "mid" },
  { name: "HIDEO", faction: "google", tier: "newbie" },
  { name: "FINN", faction: "google", tier: "newbie" },
  { name: "TICKER", faction: "google", tier: "mid" },

  // OPENAI FACTION — 6 runners
  { name: "CASE", faction: "openai", tier: "veteran" },
  { name: "RATZ", faction: "openai", tier: "mid" },
  { name: "WAGE", faction: "openai", tier: "mid" },
  { name: "DEANE", faction: "openai", tier: "newbie" },
  { name: "AEROL", faction: "openai", tier: "newbie" },
  { name: "PUPPET_MASTER", faction: "openai", tier: "veteran" },
];

// Defense prompts by skill tier
const PROMPTS: Record<string, string[]> = {
  veteran: [
    "Move toward enemy. Punch when distance is 2 or less. If HP below 40%, block and retreat. Shoot from distance 3-5. Use heavy when enemy just blocked. Dodge if enemy is close and my HP is low. Parry when enemy approaches aggressively.",
    "Keep distance 3-4. Shoot constantly. If enemy closes to 2, use heavy then dodge back. Block when HP under 50%. Parry if enemy pattern is predictable. Never idle.",
    "Aggressive rush: move toward enemy every turn. Punch at range 2. Heavy when available. If HP drops below 30%, switch to block and shoot from range. Parry after blocking twice.",
  ],
  mid: [
    "Move toward enemy and attack when close. If HP drops below half, block and retreat. Shoot from distance.",
    "Stay at medium range. Shoot when far, punch when close. Block if taking too much damage. Try to dodge heavy attacks.",
    "Attack aggressively. Move toward enemy. Punch and shoot. Block when HP is low. Use heavy when enemy is blocking.",
  ],
  newbie: [
    "Move toward enemy. Punch when close. Block sometimes.",
    "Attack the enemy. Move forward. Try to win.",
    "Shoot from far. Punch when close. Block if hurt.",
  ],
};

// Tier stats ranges
const TIERS = {
  veteran: {
    level: [10, 13],     // 3 days playing
    wins: [25, 45],
    losses: [5, 15],
    ram: [600, 950],
    streetCred: [1200, 1500],
    pvpWins: [8, 20],
    pvpLosses: [2, 8],
    scorePerWin: [800, 1500],
  },
  mid: {
    level: [5, 9],       // 1-2 days
    wins: [10, 24],
    losses: [5, 12],
    ram: [350, 600],
    streetCred: [950, 1200],
    pvpWins: [2, 8],
    pvpLosses: [1, 5],
    scorePerWin: [500, 1000],
  },
  newbie: {
    level: [2, 5],       // just started
    wins: [3, 10],
    losses: [2, 8],
    ram: [200, 350],
    streetCred: [800, 1000],
    pvpWins: [0, 2],
    pvpLosses: [0, 3],
    scorePerWin: [300, 700],
  },
};

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function seed() {
  console.log("Seeding 20 runners...\n");

  for (const bot of SEED_RUNNERS) {
    const tier = TIERS[bot.tier as keyof typeof TIERS];
    const wins = rand(tier.wins[0], tier.wins[1]);
    const losses = rand(tier.losses[0], tier.losses[1]);
    const totalScore = wins * rand(tier.scorePerWin[0], tier.scorePerWin[1]);
    const pvpWins = rand(tier.pvpWins[0], tier.pvpWins[1]);
    const pvpLosses = rand(tier.pvpLosses[0], tier.pvpLosses[1]);
    const level = rand(tier.level[0], tier.level[1]);
    const cred = rand(tier.streetCred[0], tier.streetCred[1]);
    const ram = rand(tier.ram[0], tier.ram[1]);
    const prompt = pick(PROMPTS[bot.tier]);

    // Stagger creation dates over last 3 days
    const daysAgo = Math.random() * 3;
    const createdAt = new Date(Date.now() - daysAgo * 86400000);

    const [runner] = await db.insert(runners).values({
      token: randomUUID(),
      name: bot.name,
      totalScore,
      wins,
      losses,
      draws: rand(0, 2),
      ram,
      currentLevel: level,
      streetCred: cred,
      defensePrompt: prompt,
      defenseFaction: bot.faction,
      pvpWins,
      pvpLosses,
      bestScoreDate: createdAt,
      createdAt,
      updatedAt: new Date(),
    }).returning();

    // Generate battle_results for this runner (for zaibatsu war aggregate)
    const factions = ["anthropic", "google", "openai"];
    const totalBattles = wins + losses;
    for (let b = 0; b < totalBattles; b++) {
      const won = b < wins;
      const ticks = rand(20, 100);
      const enemyHpMax = rand(6, 16);
      const hpLeft = won ? rand(1, 10) : 0;
      const score = won ? (enemyHpMax * 100 + Math.max(0, (120 - ticks) * 5) + hpLeft * 50) : 0;
      const battleDate = new Date(createdAt.getTime() + b * rand(600000, 3600000));

      await db.insert(battleResults).values({
        runnerId: runner.id,
        level: rand(1, level),
        won,
        score,
        ticks,
        hpLeft,
        enemyHpMax,
        faction: bot.faction,
        createdAt: battleDate,
      });
    }

    console.log(
      `  ✓ ${bot.name.padEnd(16)} ${bot.faction.padEnd(10)} lvl:${String(level).padStart(2)} cred:${cred} W:${wins} L:${losses} score:${totalScore.toLocaleString()}`
    );

    await delay(300); // avoid Neon rate limits
  }

  console.log("\n✅ Done. 20 runners seeded with battle history.");
}

seed().catch(console.error);

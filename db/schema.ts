import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const arena = sqliteTable('arena', {
  id: text('id').primaryKey(),
  revision: integer('revision').notNull(),
  state: text('state').notNull(),
});

export const runs = sqliteTable('runs', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').notNull(),
  durationMs: integer('duration_ms').notNull(),
  generation: integer('generation').notNull(),
  bot: integer('bot').notNull(),
  diedAt: integer('died_at').notNull(),
}, table => [index('runs_profile_date').on(table.profileId, table.diedAt)]);

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const arena = sqliteTable('arena', {
  id: text('id').primaryKey(),
  revision: integer('revision').notNull(),
  state: text('state').notNull(),
});

import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

// Replace plain UNIQUE constraints with partial unique indexes that only apply
// to non-deleted rows, so a value (code/email/slug) can be reused after the
// owning row is soft-deleted. Soft-deleted rows keep their value for history.
//
// Create the partial index BEFORE dropping the old constraint so uniqueness is
// never briefly unenforced.

await sql`CREATE UNIQUE INDEX IF NOT EXISTS discount_codes_code_active_unq ON discount_codes (code) WHERE deleted_at IS NULL`;
await sql`ALTER TABLE discount_codes DROP CONSTRAINT IF EXISTS discount_codes_code_unique`;

await sql`CREATE UNIQUE INDEX IF NOT EXISTS customers_email_active_unq ON customers (email) WHERE deleted_at IS NULL`;
await sql`ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_email_key`;

await sql`CREATE UNIQUE INDEX IF NOT EXISTS admin_users_email_active_unq ON admin_users (email) WHERE deleted_at IS NULL`;
await sql`ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_email_unique`;

await sql`CREATE UNIQUE INDEX IF NOT EXISTS products_slug_active_unq ON products (slug) WHERE deleted_at IS NULL`;
await sql`ALTER TABLE products DROP CONSTRAINT IF EXISTS products_slug_unique`;

console.log("partial unique indexes ready");

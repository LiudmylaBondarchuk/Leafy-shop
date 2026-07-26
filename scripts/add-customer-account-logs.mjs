import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

await sql`
  CREATE TABLE IF NOT EXISTS customer_account_logs (
    id serial PRIMARY KEY,
    customer_id integer NOT NULL REFERENCES customers(id),
    actor_type text NOT NULL,
    actor_id integer,
    actor_name text NOT NULL,
    actor_role text,
    action text NOT NULL,
    changes text,
    created_at text NOT NULL
  )
`;

await sql`CREATE INDEX IF NOT EXISTS customer_account_logs_customer_id_idx ON customer_account_logs (customer_id)`;

console.log("customer_account_logs ready");

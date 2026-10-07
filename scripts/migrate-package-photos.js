const { Client } = require("pg");
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

function loadEnv() {
  const file = path.join(__dirname, "..", ".env.local");
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
}

async function migrateCatalog(client, table, catalog, refFor) {
  const { rows } = await client.query(`select id, image from public.${table}`);
  let migrated = 0;
  for (const row of rows) {
    const img = String(row.image || "").trim();
    if (!img || img.startsWith("/api/")) continue;
    await client.query(
      `insert into public.package_photos (id, catalog, image, updated_at)
       values ($1, $2, $3, now())
       on conflict (id) do update set catalog = excluded.catalog, image = excluded.image, updated_at = now()`,
      [row.id, catalog, img]
    );
    await client.query(`update public.${table} set image = $1 where id = $2`, [refFor(row.id), row.id]);
    migrated += 1;
  }
  return { total: rows.length, migrated };
}

async function main() {
  loadEnv();
  const dbUrl = new URL(process.env.DATABASE_URL);
  const client = new Client({
    host: dbUrl.hostname,
    port: Number(dbUrl.port || 5432),
    user: decodeURIComponent(dbUrl.username),
    password: decodeURIComponent(dbUrl.password),
    database: dbUrl.pathname.replace(/^\//, "") || "postgres",
    ssl: { rejectUnauthorized: false },
  });
  console.log("connecting as", decodeURIComponent(dbUrl.username), "@", dbUrl.hostname);
  await client.connect();

  await client.query(`
    create table if not exists public.package_photos (
      id text primary key,
      catalog text not null check (catalog in ('car', 'shop')),
      image text not null,
      updated_at timestamptz not null default now()
    );
    alter table public.package_photos enable row level security;
    grant all on public.package_photos to service_role;
    grant all on public.package_photos to postgres;
    notify pgrst, 'reload schema';
  `);
  console.log("package_photos ready");

  const cars = await migrateCatalog(
    client,
    "car_packages",
    "car",
    (id) => `/api/package-photo?id=${encodeURIComponent(id)}`
  );
  console.log("cars", cars);

  try {
    const shops = await migrateCatalog(
      client,
      "shop_packages",
      "shop",
      (id) => `/api/shop-photo?id=${encodeURIComponent(id)}`
    );
    console.log("shops", shops);
  } catch (e) {
    console.log("shop skip", e.message);
  }

  await client.query("notify pgrst, 'reload schema'");
  await client.end();

  await new Promise((r) => setTimeout(r, 2000));
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
  const photos = await sb.from("package_photos").select("id,catalog");
  if (photos.error) {
    console.log("api still missing:", photos.error.message);
  } else {
    console.log("api package_photos rows=", photos.data.length);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

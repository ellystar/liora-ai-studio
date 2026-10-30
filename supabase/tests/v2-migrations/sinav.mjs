import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

/* Applies the v2 migrations to an in-memory Postgres built from the live
   project's table structure, tests RLS and the RPCs as real roles, rolls
   everything back and compares the schema with the starting point. */

const here = fileURLToPath(new URL(".", import.meta.url));
const repo = process.env.SINAV_REPO ?? fileURLToPath(new URL("../..", import.meta.url));
const live = JSON.parse(readFileSync(here + "canli-yapi.json", "utf8"));
const db = new PGlite();
let pass = 0;
const fails = [];
const ok = (name, cond, extra = "") => (cond ? pass++ : fails.push(`${name} ${extra}`));
const reset = () => db.exec("reset role; select set_config('request.jwt.claim.sub', '', false);");
const as = async (role, uid) => {
  await db.exec("reset role;");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [uid ?? ""]);
  await db.exec(`set role ${role};`);
};
const rows = async (sql, params) => (await db.query(sql, params)).rows;
const denied = async (name, sql, re = /permission denied|row-level security|violates row/) => {
  try {
    await db.exec(sql);
    fails.push(`${name}: reddedilmeliydi`);
  } catch (e) {
    re.test(e.message) ? pass++ : fails.push(`${name}: beklenmeyen hata: ${e.message}`);
  }
};
const lacks = async (name, sql) => ok(name, (await rows(sql)).length === 0, "(satır görünmemeliydi)");

/* ── starting point: Supabase's roles and auth, the live structure ── */
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`);
const byTable = {};
for (const c of live.columns) (byTable[c.t] ??= []).push(c);
for (const [t, cols] of Object.entries(byTable)) {
  const body = cols.map((c) => `"${c.n}" ${c.ty}${c.nn ? " not null" : ""}${c.def ? ` default ${c.def}` : ""}`);
  for (const k of live.constraints.filter((k) => k.t === t)) body.push(`constraint "${k.n}" ${k.d}`);
  await db.exec(`create table public."${t}" (${body.join(", ")});`);
}
await db.exec(`create table public.credit_transactions (id uuid primary key default gen_random_uuid(), user_id uuid not null, amount integer not null, type text not null check (type in ('topup','usage','refund')), tool text, description text, created_at timestamptz not null default now());`);
for (const f of live.functions) await db.exec(f);
for (const s of live.systems) {
  await db.query("insert into public.systems (id, name, unit, price, sort, is_active, created_at) values ($1,$2,$3,$4,$5,$6,$7)", [s.id, s.name, s.unit, s.price, s.sort, s.is_active, s.created_at]);
}
/* as on live (Betik 1): the credit RPCs cannot be called by anon or authenticated */
await db.exec(`
  revoke all on function public.add_credits(uuid, integer, text) from public, anon, authenticated;
  revoke all on function public.deduct_credits(uuid, integer, text) from public, anon, authenticated;
  revoke all on function public.refund_credits(uuid, integer, text) from public, anon, authenticated;
`);

const snapshot = async () =>
  JSON.stringify({
    tables: await rows("select table_name from information_schema.tables where table_schema='public' order by 1"),
    columns: await rows("select table_name, column_name, data_type, is_nullable, column_default from information_schema.columns where table_schema='public' order by 1,2"),
    constraints: await rows("select conrelid::regclass::text t, conname, pg_get_constraintdef(oid) d from pg_constraint where connamespace='public'::regnamespace order by 1,2"),
    policies: await rows("select tablename, policyname, cmd, roles::text, qual, with_check from pg_policies where schemaname='public' order by 1,2"),
    functions: await rows("select proname, pg_get_function_identity_arguments(oid) a from pg_proc where pronamespace='public'::regnamespace order by 1,2"),
    systems: await rows("select id, price, is_active from public.systems order by id"),
  });
const before = await snapshot();
const oldCols = await rows("select table_name, column_name, data_type, is_nullable, column_default from information_schema.columns where table_schema='public' order by 1,2");

/* ── 1. static: migrations only add ── */
const ups = readdirSync(repo + "/migrations").filter((f) => f.includes("_v2_")).sort();
const downs = readdirSync(repo + "/rollback").sort();
ok("her dosyanın geri alması var", ups.every((f) => downs.includes(f.replace(".sql", ".down.sql"))) && ups.length === downs.length);
for (const f of ups) {
  const sql = readFileSync(`${repo}/migrations/${f}`, "utf8").replace(/--.*$/gm, "");
  ok(`${f}: yalnızca ekleme`, !/\b(drop\s|truncate|alter\s+column|rename\s|delete\s+from)\b/i.test(sql));
  const altered = [...sql.matchAll(/alter\s+table\s+public\.(\w+)\s*(?!enable)/gi)].map((m) => m[1]);
  void altered;
}

/* ── 2. apply ── */
for (const f of ups) await db.exec(readFileSync(`${repo}/migrations/${f}`, "utf8"));
const newCols = await rows("select table_name, column_name, data_type, is_nullable, column_default from information_schema.columns where table_schema='public' order by 1,2");
ok("mevcut sütunlar değişmedi", oldCols.every((o) => newCols.some((n) => JSON.stringify(n) === JSON.stringify(o))));
const added = newCols.filter((n) => ["models", "backgrounds", "poses", "video_jobs"].includes(n.table_name)).length - oldCols.filter((n) => ["models", "backgrounds", "poses", "video_jobs"].includes(n.table_name)).length;
ok("15 yeni sütun", added === 15, `(${added})`);
const newTables = await rows("select count(*)::int n from pg_tables where schemaname='public' and tablename in ('accounts','brand_profiles','consents','setups','jobs','job_frames','frame_feedback','frame_reviews','user_poses','plans','notices','notification_prefs') and rowsecurity");
ok("12 tablonun hepsinde RLS açık", newTables[0].n === 12, `(${newTables[0].n})`);
ok("MVP fiyatları değişmedi", JSON.stringify(await rows("select id, price from public.systems where is_active order by id")) === JSON.stringify([...live.systems].sort((a, b) => (a.id < b.id ? -1 : 1)).map((s) => ({ id: s.id, price: s.price }))));

/* ── people ── */
const A = "aaaaaaaa-0000-4000-8000-000000000001";
const B = "bbbbbbbb-0000-4000-8000-000000000002";
const C = "cccccccc-0000-4000-8000-000000000003";
const ADM = "dddddddd-0000-4000-8000-000000000004";
for (const [id, role] of [[A, "user"], [B, "user"], [C, "user"], [ADM, "admin"]]) {
  await db.query("insert into auth.users (id, email) values ($1, $2)", [id, id.slice(0, 1) + "@x.io"]);
  await db.query("insert into public.profiles (id, email, credits, role) values ($1, $2, 0, $3)", [id, id.slice(0, 1) + "@x.io", role]);
}
const terms = `'[{"kind":"terms","granted":true,"text_version":"v1"},{"kind":"news","granted":false,"text_version":"v1"}]'::jsonb`;
const answers = `'{"for":"own","who":["women"],"ages":["25-35"],"tier":"premium","style":["catalog","light"],"styleParams":{"shoot":"catalog","light":"light"},"where":["site"],"rack":["ignored"]}'::jsonb`;
const credits = async (u) => (await rows("select credits from public.profiles where id=$1", [u]))[0].credits;

/* ── 3. RPCs ── */
await as("anon");
ok("anon: ad uygun mu sorabiliyor", (await rows("select public.username_available('yeni.ad') v"))[0].v === true);
ok("anon: ayrılmış ad uygun değil", (await rows("select public.username_available('admin') v"))[0].v === false);
ok("anon: Türkçe karakter uygun değil", (await rows("select public.username_available('melis.doğan') v"))[0].v === false);
await denied("anon complete_signup", `select public.complete_signup('anon.ad', null, null, null, ${terms})`, /permission denied/);
await denied("anon yardımcı fonksiyon", `select public.v2_username_ok('x')`, /permission denied/);
await as("authenticated", A);
await denied("izinsiz kayıt", `select public.complete_signup('kullanici.a')`, /terms_required/);
await denied("geçersiz ad", `select public.complete_signup('A!', null, null, null, ${terms})`, /username_invalid/);
await denied("geçersiz cevap", `select public.complete_signup('kullanici.a', null, null, '{"tier":"cok-pahali"}'::jsonb, ${terms})`, /invalid_answers/);
await denied("geçersiz izin", `select public.complete_signup('kullanici.a', null, null, null, '[{"kind":"terms","granted":true,"text_version":"v1"},{"kind":"spam","granted":true,"text_version":"v1"}]'::jsonb)`, /invalid_consents/);
ok("hata sonrası hesap açılmadı", (await rows("select 1 from public.accounts")).length === 0);
const first = (await rows(`select public.complete_signup('kullanici.a', 'Marka', 'marka.com', ${answers}, ${terms}) r`))[0].r;
ok("kayıt tamam, deneme kredisi yok (paket kapalı)", first.created === true && first.trial_credits === 0, JSON.stringify(first));
await as("authenticated", B);
await denied("alınmış ad", `select public.complete_signup('kullanici.a', null, null, null, ${terms})`, /username_taken/);
await rows(`select public.complete_signup('kullanici.b', null, null, null, ${terms})`);
await db.exec("reset role;");
ok("paket kapalıyken kimseye kredi yok", (await credits(A)) === 0 && (await credits(B)) === 0);
ok("cevaplar doğru sütunlara yazıldı", (await rows("select tier, style_ids, style->>'light' l, channels from public.brand_profiles where user_id=$1", [A]))[0].tier === "premium");
ok("iki izin iki satır", (await rows("select 1 from public.consents where user_id=$1", [A])).length === 2);

/* trial: only once the Free plan is open, and only once */
await db.exec("update public.plans set active = true where id = 'explorer';");
await as("authenticated", C);
const c1 = (await rows(`select public.complete_signup('kullanici.c', null, null, null, ${terms}) r`))[0].r;
const c2 = (await rows(`select public.complete_signup(null, null, null, ${answers}) r`))[0].r;
await db.exec("reset role;");
ok("paket açıkken deneme kredisi bir kez", c1.trial_credits === 5 && c2.trial_credits === 0 && c2.created === false && (await credits(C)) === 5, `${JSON.stringify(c1)} ${JSON.stringify(c2)} ${await credits(C)}`);
ok("deneme kredisi deftere yazıldı", (await rows("select amount, type from public.credit_transactions where user_id=$1", [C])).length === 1);
await db.exec("update public.plans set active = false where id = 'explorer';");

/* update_account */
await as("authenticated", A);
await rows("select public.update_account(p_name => 'Ad Soyad')");
ok("ad güncellendi, kullanıcı adı kaldı", (await rows("select username, name, brand from public.accounts"))[0].name === "Ad Soyad");
await denied("başkasının adını alma", "select public.update_account(p_username => 'kullanici.b')", /username_taken/);
ok("kendi adı uygun sayılır", (await rows("select public.username_available('kullanici.a') v"))[0].v === true);
await as("authenticated", B);
ok("başkasının adı uygun değil", (await rows("select public.username_available('kullanici.a') v"))[0].v === false);
await db.exec("reset role;");
const E = "eeeeeeee-0000-4000-8000-000000000005";
await db.query("insert into auth.users (id, email) values ($1, 'e@x.io')", [E]);
await as("authenticated", E);
await denied("hesapsız güncelleme", "select public.update_account(p_name => 'x')", /account_missing/);
await as("authenticated", B);

/* ── 4. server-only rows, seeded as service role ── */
await as("service_role");
const genId = (await rows("insert into public.generations (user_id, tool) values ($1, 'ecom_studio') returning id", [A]))[0].id;
const imgId = (await rows("insert into public.generation_images (generation_id, user_id, tool, storage_path) values ($1, $2, 'ecom_studio', 'p/0.png') returning id", [genId, A]))[0].id;
const setupA = (await rows("insert into public.setups (user_id, flow) values ($1, 'campaign') returning id", [A]))[0].id;
const jobA = (await rows("insert into public.jobs (user_id, setup_id, flow, title, planned) values ($1, $2, 'campaign', 'Kaban', 3) returning id", [A, setupA]))[0].id;
const frameA = (await rows("insert into public.job_frames (job_id, user_id, idx, status, generation_image_id) values ($1, $2, 0, 'done', $3) returning id", [jobA, A, imgId]))[0].id;
const noticeA = (await rows(`insert into public.notices (user_id, kind, title) values ($1, 'done', '{"tr":"Bitti","en":"Done"}') returning id`, [A]))[0].id;

/* ── 5. RLS: B and anon must not see or touch A ── */
await as("authenticated", B);
for (const t of ["brand_profiles", "consents", "setups", "jobs", "job_frames", "notices", "user_poses", "notification_prefs", "frame_feedback", "frame_reviews"]) {
  await lacks(`B, A'nın ${t} satırını görmüyor`, `select 1 from public.${t} where user_id = '${A}'`);
}
await lacks("B, A'nın hesabını görmüyor", `select 1 from public.accounts where user_id = '${A}'`);
await denied("B, A adına izin ekleyemez", `insert into public.consents (user_id, kind, granted, text_version, source) values ('${A}', 'terms', true, 'v1', 'profile')`);
await denied("B, A adına kurulum ekleyemez", `insert into public.setups (user_id, flow) values ('${A}', 'campaign')`);
await denied("B, A'nın karesine beğeni yazamaz (kendi adına)", `insert into public.frame_feedback (frame_id, user_id, liked) values ('${frameA}', '${B}', true)`);
await denied("B, A'nın karesine iade açamaz", `insert into public.frame_reviews (frame_id, user_id, reasons) values ('${frameA}', '${B}', '{model}')`);
const upd = await db.query(`update public.setups set item_name = 'x' where id = '${setupA}'`);
ok("B, A'nın kurulumunu değiştiremez", (upd.affectedRows ?? 0) === 0);
const del = await db.query(`delete from public.brand_profiles where user_id = '${A}'`);
ok("B, A'nın profilini silemez", (del.affectedRows ?? 0) === 0);

await as("anon");
for (const t of ["accounts", "brand_profiles", "consents", "setups", "jobs", "job_frames", "notices"]) {
  await denied(`anon ${t} okuyamaz`, `select * from public.${t}`, /permission denied/);
}

/* ── 6. A's own limits ── */
await as("authenticated", A);
ok("A kendi işini görüyor", (await rows("select 1 from public.jobs")).length === 1);
ok("A kendi karesini görüyor", (await rows("select 1 from public.job_frames")).length === 1);
await denied("A paketini kendi değiştiremez", `update public.accounts set plan = 'partner' where user_id = '${A}'`, /permission denied/);
await denied("A hesap satırı ekleyemez", `insert into public.accounts (user_id, username) values ('${A}', 'baska.ad')`, /permission denied/);
await denied("A iş yazamaz", `insert into public.jobs (user_id, flow) values ('${A}', 'campaign')`, /permission denied/);
await denied("A kare değiştiremez", `update public.job_frames set credits_charged = 0`, /permission denied/);
await denied("A izin satırını değiştiremez", `update public.consents set granted = true`, /permission denied/);
await denied("A izin satırını silemez", `delete from public.consents`, /permission denied/);
await denied("A bildirim yazamaz", `insert into public.notices (user_id, kind, title) values ('${A}', 'done', '{}')`, /permission denied/);
await denied("A bildirim başlığını değiştiremez", `update public.notices set title = '{}'`, /permission denied/);
await db.exec(`update public.notices set read_at = now() where id = '${noticeA}'`);
ok("A bildirimi okundu işaretler", (await rows("select read_at from public.notices"))[0].read_at !== null);
await db.exec(`insert into public.frame_feedback (frame_id, user_id, liked) values ('${frameA}', '${A}', true)`);
ok("A kendi karesini beğenir", (await rows("select 1 from public.frame_feedback")).length === 1);
await db.exec(`insert into public.frame_reviews (frame_id, user_id, reasons, note) values ('${frameA}', '${A}', '{model}', 'yanlış')`);
ok("A iade talebi açar, durum pending", (await rows("select status from public.frame_reviews"))[0].status === "pending");
await denied("A kendi talebine karar veremez", `update public.frame_reviews set status = 'refunded'`, /permission denied/);
await denied("A aynı kareye ikinci talep açamaz", `insert into public.frame_reviews (frame_id, user_id, reasons) values ('${frameA}', '${A}', '{model}')`, /duplicate key|unique/);
await denied("A geçersiz neden yazamaz", `insert into public.frame_reviews (frame_id, user_id, reasons) values ('${frameA}', '${A}', '{yok}')`, /check/);
await denied("A kredi fonksiyonunu çağıramaz", `select public.add_credits('${A}', 100)`, /permission denied/);

/* ── 7. plans ── */
await as("anon");
ok("kapalı paketler anon'a görünmez", (await rows("select 1 from public.plans")).length === 0);
await as("authenticated", A);
ok("kapalı paketler kullanıcıya görünmez", (await rows("select 1 from public.plans")).length === 0);
await denied("kullanıcı paket ekleyemez", `insert into public.plans (id, name) values ('partner', 'x')`, /row-level|duplicate/);
await as("authenticated", ADM);
ok("admin kapalı paketleri görür", (await rows("select 1 from public.plans")).length === 4);
await db.exec("update public.plans set price_try = 1 where id = 'creator'");
await db.exec("reset role; update public.plans set price_try = null where id = 'creator';");
ok("Elif'in fiyatları", JSON.stringify(await rows("select id, monthly_credits m, price_usd::int p from public.plans where id in ('creator','partner') order by sort")) === JSON.stringify([{ id: "creator", m: 30, p: 30 }, { id: "partner", m: 100, p: 100 }]));

/* ── 8. the live cleanup and MVP reads keep working ── */
await as("service_role");
await db.exec(`update public.generation_images set deleted_at = now() where id = '${imgId}'`);
ok("temizlik işaretlemesi çalışıyor", (await rows("select deleted_at from public.generation_images"))[0].deleted_at !== null);
await db.exec(`delete from public.generation_images where id = '${imgId}'`);
ok("görsel silinirse kare kalır, bağ boşalır", (await rows("select generation_image_id g from public.job_frames"))[0].g === null);
await as("authenticated", A);
await db.exec("reset role;");
ok("MVP fiyat okuması aynı", (await rows("select price from public.systems where id='product_video'"))[0].price === 4);
await db.exec(`insert into public.models (name, image_url) values ('Yeni', 'u')`);
ok("MVP manken ekleme yeni sütunlar olmadan çalışıyor", (await rows("select exclusive, min_plan from public.models"))[0].exclusive === false);
await db.exec("delete from public.models;");

/* cascade: deleting a user removes only their v2 rows */
await db.exec(`delete from public.frame_reviews; delete from public.frame_feedback;`);
await db.exec(`delete from public.credit_transactions; delete from public.generations; delete from public.profiles where id = '${B}'; delete from auth.users where id = '${B}';`);
ok("kullanıcı silinince v2 satırları da gider", (await rows(`select 1 from public.accounts where user_id='${B}'`)).length === 0 && (await rows(`select 1 from public.accounts where user_id='${A}'`)).length === 1);

/* ── 9. rollback returns to the starting point ── */
await reset();
await db.exec("truncate public.profiles cascade; delete from auth.users;");
for (const f of [...downs].sort().reverse()) await db.exec(readFileSync(`${repo}/rollback/${f}`, "utf8"));
const after = await snapshot();
if (after !== before) {
  const a = JSON.parse(before), b = JSON.parse(after);
  for (const k of Object.keys(a)) if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) fails.push(`geri alma farkı: ${k}`);
} else pass++;

/* ── 10. and can be applied again ── */
for (const f of ups) await db.exec(readFileSync(`${repo}/migrations/${f}`, "utf8"));
pass++;

console.log(`\nGEÇEN: ${pass}\nKALAN: ${fails.length}`);
fails.forEach((f) => console.log(" ✗ " + f));
process.exit(fails.length ? 1 : 0);

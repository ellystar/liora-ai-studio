import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${Deno.env.get("CLEANUP_SECRET")}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: expired, error } = await supabase
    .from("generation_images")
    .select("id, storage_path")
    .lt("expires_at", new Date().toISOString())
    .is("deleted_at", null)
    .limit(200);

  if (error) return new Response(error.message, { status: 500 });
  if (!expired || expired.length === 0) {
    return new Response(JSON.stringify({ deleted: 0 }), { status: 200 });
  }

  const paths = expired.map((r) => r.storage_path);
  const { error: rmError } = await supabase.storage
    .from("outputs")
    .remove(paths);

  if (rmError) return new Response(rmError.message, { status: 500 });

  const ids = expired.map((r) => r.id);
  const { error: updError } = await supabase
    .from("generation_images")
    .update({ deleted_at: new Date().toISOString() })
    .in("id", ids);

  if (updError) return new Response(updError.message, { status: 500 });

  return new Response(JSON.stringify({ deleted: expired.length }), {
    status: 200,
  });
});

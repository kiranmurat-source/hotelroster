import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Verify the caller is admin
  const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data: { user: caller } } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
  if (!caller) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  
  // Check caller is admin
  const { data: roleData } = await adminClient.from("user_roles").select("role").eq("user_id", caller.id).eq("role", "admin");
  if (!roleData || roleData.length === 0) {
    return new Response(JSON.stringify({ error: "Admin only" }), { status: 403 });
  }

  const { user_id, password } = await req.json();
  
  const { error } = await adminClient.auth.admin.updateUser(user_id, { password });
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
});

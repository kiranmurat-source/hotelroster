Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const { action, email, password, user_id, department, role } = await req.json();

  if (action === "create_user") {
    // Create user via admin API
    const res = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceRoleKey}`,
        "apikey": serviceRoleKey,
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: email.split("@")[0] },
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return new Response(JSON.stringify({ error: data.message || data.msg }), { status: res.status });
    }
    return new Response(JSON.stringify({ success: true, user_id: data.id }), { status: 200 });
  }

  if (action === "set_department") {
    // Update profile department
    const res = await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${user_id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceRoleKey}`,
        "apikey": serviceRoleKey,
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({ department }),
    });
    if (!res.ok) {
      const data = await res.text();
      return new Response(JSON.stringify({ error: data }), { status: res.status });
    }
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  }

  if (action === "set_role") {
    // Update user_roles
    await fetch(`${supabaseUrl}/rest/v1/user_roles?user_id=eq.${user_id}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${serviceRoleKey}`,
        "apikey": serviceRoleKey,
      },
    });
    const res = await fetch(`${supabaseUrl}/rest/v1/user_roles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceRoleKey}`,
        "apikey": serviceRoleKey,
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({ user_id, role }),
    });
    if (!res.ok) {
      const data = await res.text();
      return new Response(JSON.stringify({ error: data }), { status: res.status });
    }
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  }

  return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400 });
});

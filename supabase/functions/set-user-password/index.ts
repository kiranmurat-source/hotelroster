Deno.serve(async () => {
  return new Response(JSON.stringify({ error: "Function disabled" }), { status: 403 });
});

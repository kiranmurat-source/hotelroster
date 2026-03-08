Deno.serve(async (req) => {
  // This function is disabled after initial use
  return new Response(JSON.stringify({ error: "Function disabled" }), { status: 403 });
});

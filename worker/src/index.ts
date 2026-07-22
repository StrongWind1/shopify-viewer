export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({ ok: true });
    }

    return Response.json({ error: "Not found", code: "NOT_FOUND" }, { status: 404 });
  },
} satisfies ExportedHandler;

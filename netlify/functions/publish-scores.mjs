import { getStore } from "@netlify/blobs";

export default async (req) => {
  const store = getStore("march-madness");
  const key = "latest-scores";

  try {
    if (req.method === "GET") {
      const saved = await store.get(key, { type: "json" });

      return new Response(
        JSON.stringify({
          data: saved || null,
          updatedAt: saved?.updatedAt || null,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (req.method === "POST") {
      const body = await req.json();

      if (!body?.data) {
        return new Response(
          JSON.stringify({ error: "Missing data payload." }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      const payload = {
        ...body.data,
        updatedAt: new Date().toISOString(),
        source: body.data?.source || "manual-publish",
      };

      await store.setJSON(key, payload);

      return new Response(
        JSON.stringify({ ok: true, updatedAt: payload.updatedAt }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed." }),
      {
        status: 405,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Server error.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

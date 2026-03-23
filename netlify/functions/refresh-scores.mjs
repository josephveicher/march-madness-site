import { getStore } from "@netlify/blobs";
import { buildLivePayload } from "../lib/standings-engine.mjs";

export default async () => {
  const store = getStore("march-madness");
  const payload = await buildLivePayload();
  await store.setJSON("latest-scores", payload);

  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

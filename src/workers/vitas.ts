interface Env {
  QUERY_LOG: KVNamespace;
}

interface LogPayload {
  query: string;
  answer: string;
  timezone?: string;
  screen?: string;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const { query, answer, timezone, screen } =
      (await request.json()) as LogPayload;

    const cf = request.cf;

    await env.QUERY_LOG.put(
      `${Date.now()}-${crypto.randomUUID()}`,
      JSON.stringify({
        query,
        answer,
        timezone,
        screen,
        ip: request.headers.get("cf-connecting-ip"),
        country: cf?.country,
        city: cf?.city,
        region: cf?.region,
        userAgent: request.headers.get("user-agent"),
        language: request.headers.get("accept-language"),
        timestamp: new Date().toISOString(),
      })
    );

    return new Response("ok", { headers: CORS_HEADERS });
  },
};

const SITE_DATA_KEY = process.env.UPSTASH_SITE_DATA_KEY || "demo-restaurant:site-data";

function sendJson(response, status, payload) {
  response.status(status).setHeader("Content-Type", "application/json");
  response.send(JSON.stringify(payload));
}

function getRedisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error("Missing Upstash Redis environment variables.");
  }

  return { url, token };
}

async function readSiteData() {
  const { url, token } = getRedisConfig();
  const response = await fetch(`${url}/get/${encodeURIComponent(SITE_DATA_KEY)}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error("Upstash read request failed.");
  }

  const payload = await response.json();
  return payload.result ? JSON.parse(payload.result) : null;
}

async function writeSiteData(data) {
  const { url, token } = getRedisConfig();
  const response = await fetch(`${url}/set/${encodeURIComponent(SITE_DATA_KEY)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error("Upstash write request failed.");
  }

  return data;
}

export default async function handler(request, response) {
  try {
    if (request.method === "GET") {
      const data = await readSiteData();
      sendJson(response, 200, { data });
      return;
    }

    if (request.method === "POST") {
      const body = typeof request.body === "string" ? JSON.parse(request.body) : request.body;
      const data = await writeSiteData(body);
      sendJson(response, 200, { data });
      return;
    }

    sendJson(response, 405, { error: "Method not allowed." });
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Unable to process site data."
    });
  }
}

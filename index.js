
const http = require("node:http");

const PORT = Number(process.env.PORT) || 24721;

const server = http.createServer((req, res) => {
  const requestUrl = new URL(
    req.url,
    `http://${req.headers.host || "localhost"}`
  );

  res.setHeader("Content-Type", "application/json; charset=utf-8");

  // API health check
  if (requestUrl.pathname === "/" && req.method === "GET") {
    res.writeHead(200);
    return res.end(JSON.stringify({
      status: "online",
      message: "Fetch API is running"
    }));
  }

  // Trigger a background fetch
  if (requestUrl.pathname === "/fetch" && req.method === "GET") {
    const target = requestUrl.searchParams.get("url");

    if (!target) {
      res.writeHead(400);
      return res.end(JSON.stringify({
        error: "Missing url parameter"
      }));
    }

    let parsed;

    try {
      parsed = new URL(target);
    } catch {
      res.writeHead(400);
      return res.end(JSON.stringify({
        error: "Invalid URL"
      }));
    }

    if (!["http:", "https:"].includes(parsed.protocol)) {
      res.writeHead(400);
      return res.end(JSON.stringify({
        error: "Only HTTP and HTTPS URLs are allowed"
      }));
    }

    // Prevent access to localhost and common private network ranges.
    const hostname = parsed.hostname.toLowerCase();

    if (
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") ||
      hostname === "0.0.0.0" ||
      hostname === "::1" ||
      hostname === "[::1]" ||
      /^127\./.test(hostname) ||
      /^10\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^169\.254\./.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
    ) {
      res.writeHead(403);
      return res.end(JSON.stringify({
        error: "Private network destinations are not allowed"
      }));
    }

    // Return immediately; the fetch continues independently.
    res.writeHead(200);
    res.end(JSON.stringify({ status: "fetch hai bro" }));

    setImmediate(async () => {
      try {
        const response = await fetch(parsed.href, {
          signal: AbortSignal.timeout(15000),
          redirect: "error"
        });

        console.log(
          `[FETCH] ${parsed.hostname} returned HTTP ${response.status}`
        );

        await response.body?.cancel();
      } catch (error) {
        console.error("[FETCH ERROR]", error.message);
      }
    });

    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`API running on port ${PORT}`);
});

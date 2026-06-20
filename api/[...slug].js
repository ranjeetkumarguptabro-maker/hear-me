/**
 * Vercel Serverless Function: Backend Proxy (Catch-all)
 * 
 * This function acts as an HTTPS proxy between the frontend (HTTPS) and backend (HTTP).
 * Route: /api/[...slug]
 * Handles: /api/backend/* -> proxies to backend
 * Handles: /api/test -> test endpoint
 * 
 * Uses Vercel's Node.js runtime format (req, res)
 */

export default async function handler(req, res) {
  // Log that the proxy function was called
  console.log("[Proxy] Function invoked - URL:", req.url, "Method:", req.method);
  console.log("[Proxy] Query params:", JSON.stringify(req.query));
  
  // Handle OPTIONS preflight immediately
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS, PATCH"
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    return res.status(200).end();
  }

  // Extract the path from the catch-all route
  // In Vercel, for [...slug].js, the path segments are in req.query.slug (array)
  // Example: /api/backend/room -> req.query.slug = ['backend', 'room']
  // Example: /api/test -> req.query.slug = ['test']
  let slugPath = "";

  if (req.query.slug) {
    // req.query.slug is an array: ['backend', 'room'] or ['test']
    slugPath = Array.isArray(req.query.slug)
      ? req.query.slug.join("/")
      : req.query.slug;
    console.log("[Proxy Debug] Extracted slug path:", slugPath);
  } else {
    // Fallback: extract from URL
    const urlMatch = req.url.match(/\/api\/(.+?)(\?|$)/);
    if (urlMatch && urlMatch[1]) {
      slugPath = decodeURIComponent(urlMatch[1]);
      console.log("[Proxy Debug] Extracted path from URL:", slugPath);
    }
  }

  // Handle test endpoint
  if (slugPath === "test" || slugPath.startsWith("test/")) {
    return res.status(200).json({
      message: "Serverless function is working!",
      method: req.method,
      url: req.url,
      query: req.query,
      timestamp: new Date().toISOString(),
    });
  }

  // Only proxy requests that start with "backend/"
  if (!slugPath.startsWith("backend/")) {
    return res.status(404).json({
      error: "Not Found",
      message: `Route /api/${slugPath} not found. Use /api/backend/* to proxy to backend.`,
    });
  }

  // Get the backend URL from environment variable (default to Azure VM)
  const BACKEND_URL = process.env.BACKEND_URL || "http://51.124.124.18";

  // Remove "backend/" prefix to get the actual backend path
  // slugPath = "backend/room" -> backendPath = "room"
  // slugPath = "backend/room/ABC123" -> backendPath = "room/ABC123"
  const backendPath = slugPath.replace(/^backend\//, "");

  // Construct the full backend URL
  let backendUrl;
  if (backendPath === "") {
    backendUrl = BACKEND_URL;
  } else {
    backendUrl = `${BACKEND_URL}/${backendPath}`;
  }

  // Preserve query parameters from the original request (except 'slug')
  const queryParams = new URLSearchParams();
  Object.keys(req.query || {}).forEach((key) => {
    if (key !== "slug") {
      const value = req.query[key];
      if (Array.isArray(value)) {
        value.forEach((v) => queryParams.append(key, v));
      } else {
        queryParams.append(key, value);
      }
    }
  });
  const queryString = queryParams.toString();
  const fullBackendUrl = queryString
    ? `${backendUrl}?${queryString}`
    : backendUrl;

  console.log(`[Proxy] ${req.method} ${req.url} -> ${fullBackendUrl}`);

  try {
    // Prepare headers for the backend request
    const headers = { ...req.headers };

    // Remove headers that shouldn't be forwarded
    delete headers.host;
    delete headers.connection;
    delete headers["content-length"];
    delete headers["cf-ray"];
    delete headers["cf-connecting-ip"];
    delete headers["x-forwarded-for"];
    delete headers["x-vercel-id"];

    // Get request body if present
    let body = null;
    if (req.method !== "GET" && req.method !== "HEAD") {
      // For POST/PUT/PATCH, send the body
      if (req.body) {
        body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
      }
    }

    // Forward the request to the backend
    const response = await fetch(fullBackendUrl, {
      method: req.method,
      headers: headers,
      body: body,
    });

    // Get the response body
    const contentType = response.headers.get("content-type") || "";
    let responseData;
    let responseText = "";

    // Always get text first to check if it's HTML
    responseText = await response.text();

    // Check if response is HTML (error page) - check multiple patterns
    const trimmedText = responseText.trim();
    const isHTML =
      trimmedText.startsWith("<!DOCTYPE") ||
      trimmedText.startsWith("<!doctype") ||
      trimmedText.startsWith("<html") ||
      trimmedText.startsWith("<HTML") ||
      trimmedText.toLowerCase().includes("<html") ||
      (trimmedText.startsWith("<") && trimmedText.includes("html"));

    if (isHTML) {
      console.error("[Proxy Error] Backend returned HTML instead of JSON");
      console.error("[Proxy Error] Response status:", response.status);
      console.error("[Proxy Error] Response preview:", trimmedText.substring(0, 500));
      console.error("[Proxy Error] Backend URL:", fullBackendUrl);

      // Return proper JSON error so frontend can handle it
      return res.status(502).json({
        error: "Bad Gateway",
        message:
          "Backend returned HTML error page instead of JSON. The backend may be down or the endpoint doesn't exist.",
        backendUrl: fullBackendUrl,
        statusCode: response.status,
        details: "Check backend logs and ensure the endpoint exists and returns JSON.",
      });
    }

    // Parse as JSON if content-type suggests JSON, or if text looks like JSON
    if (
      contentType.includes("application/json") ||
      trimmedText.startsWith("{") ||
      trimmedText.startsWith("[")
    ) {
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        console.warn("[Proxy] Failed to parse as JSON, returning as text:", e.message);
        responseData = responseText;
      }
    } else {
      responseData = responseText;
    }

    // Set CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS, PATCH"
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );

    // Copy relevant headers from backend response
    response.headers.forEach((value, key) => {
      // Don't forward headers that should be set by Vercel
      const skipHeaders = [
        "content-encoding",
        "transfer-encoding",
        "connection",
        "content-length",
      ];
      if (!skipHeaders.includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    // Return the response
    res.status(response.status).json(responseData);
  } catch (error) {
    console.error(`[Proxy Error] ${error.message}`);
    console.error(`[Proxy Error] Stack:`, error.stack);
    console.error(
      `[Proxy Error] Failed to proxy ${req.method} ${req.url} to ${fullBackendUrl}`
    );

    // Ensure we always return JSON, never HTML
    try {
      res.status(502).json({
        error: "Bad Gateway",
        message: `Failed to connect to backend: ${error.message}`,
        backendUrl: fullBackendUrl,
        requestUrl: req.url,
        requestMethod: req.method,
      });
    } catch (resError) {
      // If we can't send JSON response, log it
      console.error("[Proxy Error] Failed to send error response:", resError);
    }
  }
}


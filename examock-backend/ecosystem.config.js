// pm2 process definitions for examock-backend.
//
// ESM NOTE: package.json sets "type": "module", so pm2 parses this file as an
// ES module. `module.exports = {...}` throws "module is not defined" here —
// it has to be `export default`.

// Single source of truth for the checkout location. Every app below uses it,
// and it must match the real path on the host (pm2 resolves `script` and the
// gitignored .env relative to `cwd`).
const cwd = "/opt/examock/examock-backend";

// V8 heap cap, in MB. Keep this BELOW `max_memory_restart` on purpose: the
// flag makes V8 collect harder as it approaches the ceiling, while
// max_memory_restart is the last-resort net that makes pm2 restart the whole
// process. If the two were equal you'd trade clean GCs for hard restarts
// mid-request.
const maxHeapMb = 512;

// Only one app is defined, and that is correct for this project: the pg-boss
// workers (src/modules/rag/workers/noteIngestion.worker.js) are registered as
// a side-effect import at the top of index.js, so note ingestion runs inside
// the API process. There is no worker.js entrypoint to start as a second app.
export default {
  apps: [
    {
      name: "examock-api",
      script: "index.js",
      cwd,
      // fork + 1 instance: PORT is a single fixed value, and the express-rate-
      // limiter in index.js keeps its counters in-process memory, so clustering
      // would multiply the effective rate limit per worker.
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      max_memory_restart: "700M",
      node_args: [`--max-old-space-size=${maxHeapMb}`],
      // Structured timestamps in the pm2 logs (replaces the vaguer `time: true`).
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      out_file: "logs/out.log",
      error_file: "logs/error.log",
      env: {
        NODE_ENV: "production",
        // Everything else (PORT, DATABASE_URL, DIRECT_URL, QDRANT_*, GEMINI_*,
        // CLOUDINARY_*, JWT_*, GOOGLE_*) is loaded from the .env file beside
        // index.js by dotenv in src/config/config.js — which THROWS on startup
        // if any required key is missing. .env is gitignored, so it has to be
        // present on the host; NODE_ENV is set here only so the process starts
        // in production mode without depending on that file for it.
      },
    },
  ],
};

// pm2 process definitions for examock-backend.
//
// WHY .cjs AND NOT .js:
// package.json sets "type": "module", which makes pm2 parse ecosystem.config.js
// as an ES module. pm2 loads the config with require(), and require() on an ES
// module returns the module NAMESPACE object -- { default: { apps: [...] } } --
// not the config itself. pm2 then looks for `script` at the top level, finds
// nothing, and dies with "Error: No script path - aborting".
//
// The two obvious fixes are both traps:
//   - `export default {...}`  → loads, but hits the namespace problem above.
//   - `module.exports = {...}` → throws "module is not defined" if named .js,
//     because .js under "type": "module" is ESM.
//
// A .cjs extension is unconditionally CommonJS, so require() returns the object
// below as-is. Works on every Node and every pm2 version. Do not rename this
// to .js.

// Single source of truth for the checkout location. Every app below uses it,
// and it must match the real path on the host (pm2 resolves `script`, the
// multer `uploads/` dest, and the gitignored .env relative to `cwd`).
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
module.exports = {
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
      node_args: ["--max-old-space-size=" + maxHeapMb],
      // Structured timestamps in the pm2 logs (replaces the vaguer `time: true`).
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      // Relative to cwd. The dir must already exist and be writable by the
      // user pm2 runs as -- pm2 will not create it for you.
      out_file: "logs/out.log",
      error_file: "logs/error.log",
      env: {
        NODE_ENV: "production",
        // Everything else (PORT, DATABASE_URL, DIRECT_URL, QDRANT_*, GEMINI_*,
        // CLOUDINARY_*, JWT_*, GOOGLE_*) is loaded from the .env file beside
        // index.js by dotenv in src/config/config.js -- which THROWS on startup
        // if any required key is missing. .env is gitignored, so it has to be
        // present on the host; NODE_ENV is set here only so the process starts
        // in production mode without depending on that file for it.
      },
    },
  ],
};

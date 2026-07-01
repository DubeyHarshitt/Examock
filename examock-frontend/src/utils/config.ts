// import dotenv from "dotenv";
// dotenv.config();

const config = {
  API_URL: import.meta.env.VITE_API_URL,
  GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID,
};

if (!config.API_URL) {
  throw new Error("❌ Missing VITE_API_URL in environment");
}

if (!config.GOOGLE_CLIENT_ID) {
  throw new Error("❌ Missing VITE_GOOGLE_CLIENT_ID in environment");
}

export default config;





// const requiredEnv = ["API_URL"];
// requiredEnv.forEach((key) => {
//   if (!process.env[key]) {
//     throw new Error(`❌ Missing env variable: ${key}`);
//   }
// });

// const config = {
//   API_URL: process.env.API_URL,
//   NODE_ENV: process.env.NODE_ENV || "development",
// };
// export default config;
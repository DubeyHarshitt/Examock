import { GoogleGenAI } from "@google/genai";
import config from "../../../config/config.js";
import { AppError } from "../../../utils/AppError.js";

const ai = new GoogleGenAI({
  apiKey: config.GEMINI_API_KEY,
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Gemini's free tier rate-limits embedding (100 req/min). A large PDF can
// exceed that mid-batch, so retry just the throttled call with the server's
// requested backoff instead of failing the whole note. 429 is transient —
// never a data error — so one-off 429s shouldn't kill ingestion/answers.
const MAX_RATE_LIMIT_RETRIES = 3;

function parseRetryDelay(message = "") {
  // Gemini embeds "retryDelay":"48.214779472s" (and/or "Please retry in Xs")
  // in the error payload for quota/resource-exhausted responses.
  const m =
    message.match(/"retryDelay":"([0-9.]+)s"/) ||
    message.match(/retry in ([0-9.]+)s/i);
  const seconds = m ? Math.min(parseFloat(m[1]), 120) : 60;
  return Number.isFinite(seconds) && seconds > 0 ? seconds : 60;
}

async function embedContentWithRetry(text) {
  let lastError;

  for (let attempt = 0; attempt <= MAX_RATE_LIMIT_RETRIES; attempt++) {
    try {
      const response = await ai.models.embedContent({
        model: "gemini-embedding-001",
        contents: text,
      });
      return response.embeddings[0].values;
    } catch (err) {
      lastError = err;
      if (err?.status !== 429) throw err; // not a rate limit — fail fast

      const delay = parseRetryDelay(err.message);
      console.warn(
        `[embedder] Gemini rate limit hit, retrying in ${delay}s ` +
          `(attempt ${attempt + 1}/${MAX_RATE_LIMIT_RETRIES})`,
      );
      await sleep(delay * 1000);
    }
  }

  throw lastError;
}

export const embedTexts = async (texts) => {
  try {
    const vectors = [];

    for (const text of texts) {
      vectors.push(await embedContentWithRetry(text));
    }

    // console.log("Generated vectors:", vectors.length);
    // console.log("Vector dimension:", vectors[0].length);

    return vectors;
  } catch (err) {
    console.error(err);

    throw new AppError(
      "Failed to generate embeddings: " + err.message,
      500
    );
  }
};

export const embedQuery = async (query) => {
  try {
    return await embedContentWithRetry(query);
  } catch (err) {
    console.error(err);
    throw new AppError(
      "Failed to generate query embedding: " + err.message,
      500
    );
  }
};
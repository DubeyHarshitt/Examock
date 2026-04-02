import dotenv from "dotenv";
dotenv.config();

if(!process.env.PORT){
    throw new Error("PORT is not defined");
}

if(!process.env.CLIENT_URI){
    throw new Error("CLIENT URL is not defined");
}

if(!process.env.GOOGLE_CLIENT_ID){
    throw new Error("GOOGLE CLIENT ID is not defined");
}

if(!process.env.GOOGLE_CLIENT_SECRET){
    throw new Error("GOOGLE CLIENT SECRET is not defined");
}

if(!process.env.GOOGLE_REDIRECT_URI){
    throw new Error("GOOGLE REDIRECT URI is not defined");
}

const config = {
  PORT: Number(process.env.PORT),
  CLIENT_URI: process.env.CLIENT_URI,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,
};

export default config;
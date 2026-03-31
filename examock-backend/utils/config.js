import dotenv from "dotenv";
dotenv.config();

if(!process.env.PORT){
    throw new Error("PORT is not defined");
}

if(!process.env.CLIENT_URI){
    throw new Error("CLIENT URL is not defined");
}

const config = {
  PORT: Number(process.env.PORT),
  CLIENT_URI: process.env.CLIENT_URI,
};

export default config;
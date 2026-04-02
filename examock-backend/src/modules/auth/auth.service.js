import prisma from "../../config/prisma.js"
import config from "../../config/config.js"
import { getGoogleUserInfo } from "./google.service.js"

// -----------------------------------------------------------------------------------------------------
// buildGoogleAuthUrl
// Builds the URL that send the user to Google's consent screen
// Called in auth.controller.js -> redirectToGoogle 
// -----------------------------------------------------------------------------------------------------
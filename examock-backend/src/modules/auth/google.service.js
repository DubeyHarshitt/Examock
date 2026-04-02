import axios from 'axios'
import config from '../../config/config.js'

const GOOGLE_TOKEN_URL="";
const GOOGLE_USERINFO_URL="";

// -----------------------------------------------------------------------------------------------------
// buildGoogleAuthUrl
// Builds the URL that send the user to Google's consent screen
// Called in auth.controller.js -> redirectToGoogle 
// -----------------------------------------------------------------------------------------------------

export function buildGoogleAuthUrl(){
    const params = new URLSearchParams({
        client_id: config.GOOGLE_CLIENT_ID,
        redirect_uri: config.GOOGLE_REDIRECT_URI,
        response_type: 'code',
        scope: 'openid email profile',
        access_type: 'offline',
        prompt: 'select_account', // shows account picker
    })
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}


// -----------------------------------------------------------------------------------------------------
// getGoogleUserInfo
// Exchanges the one-time code ( form callback URL ) for an
// access token, then fetches the user's Google profile
// Called in auth.service.js -> handleGoogleCallback 
// -----------------------------------------------------------------------------------------------------

export async function getGoogleUserInfo(code) {
    // Step 1 - exchange code for access token
    const tokenRes = await axios.post(GOOGLE_TOKEN_URL, {
        code,
        client_id: config.GOOGLE_CLIENT_ID,
        client_secret: config.GOOGLE_CLIENT_SECRET,
        redirect_url: config.GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
    })

    const { access_token } = tokenRes.data;

    // Step 2 - featch profile using access token
    const userRes = await axios.get(GOOGLE_USERINFO_URL,{
        headers: { Authorization: `Bearer ${access_token}`}
    })

    if(!userRes.data.email_verified){
        throw new Error('Google account email is not verified')
    }

    // Returns: { sub, email, picture, email_verified }
    // sub = Google's unique user ID - stored as gmailID in DB
    return userRes.data
}
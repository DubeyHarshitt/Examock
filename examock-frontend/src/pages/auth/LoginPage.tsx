import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/auth.store";
import { googleLogin } from "../../api/auth.api";
import config from "../../utils/config";

// Google Sign In button uses the Google Identity Services script
// Add this to your index.html:
// <script src="https://accounts.google.com/gsi/client" async defer></script>

declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: object) => void;
          renderButton: (element: HTMLElement, config: object) => void;
        };
      };
    };
  }
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth, isAuthenticated, isFullyOnboarded } = useAuthStore();

  // If already logged in redirect immediately
  useEffect(() => {
    if (isAuthenticated()) {
      navigate(isFullyOnboarded() ? "/" : "/onboarding", { replace: true });
    }
  }, []);

  // Initialize Google Sign In button after component mounts
  useEffect(() => {
    const initGoogle = () => {
      if (!window.google) return;

      window.google.accounts.id.initialize({
        client_id: config.GOOGLE_CLIENT_ID,
        callback: handleGoogleCallback,
      });

      const buttonEl = document.getElementById("google-signin-btn");
      if (buttonEl) {
        window.google.accounts.id.renderButton(buttonEl, {
          theme: "outline",
          size: "large",
          text: "signin_with",
          width: 300,
        });
      }
    };

    // Script might already be loaded or still loading
    if (window.google) {
      initGoogle();
    } else {
      window.addEventListener("load", initGoogle);
      return () => window.removeEventListener("load", initGoogle);
    }
  }, []);

  const handleGoogleCallback = async (response: { credential: string }) => {
    try {
      const result = await googleLogin(response.credential);

      setAuth(result.accessToken, result.user, result.onboarding);

      // Redirect based on onboarding state
      if (
        result.onboarding.needsExamSelection ||
        result.onboarding.needsMobileVerification
      ) {
        navigate("/onboarding", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    } catch (err) {
      console.error("Google login failed:", err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-lg p-10 w-full max-w-md flex flex-col items-center gap-8">
        {/* Logo + branding */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center">
            <span className="text-white text-2xl font-bold">E</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Examock</h1>
          <p className="text-gray-500 text-sm text-center">
            Prepare smarter for your competitive exam
          </p>
        </div>

        {/* Divider */}
        <div className="w-full border-t border-gray-100" />

        {/* What students get */}
        <div className="w-full flex flex-col gap-3">
          {[
            "Topic-wise video playlists",
            "Free & paid mock tests",
            "AI-powered doubt solving",
            "Progress tracking & analytics",
          ].map((feature) => (
            <div key={feature} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-3 h-3 text-green-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <span className="text-sm text-gray-600">{feature}</span>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="w-full border-t border-gray-100" />

        {/* Google Sign In button — rendered by Google SDK */}
        <div className="flex flex-col items-center gap-3 w-full">
          <p className="text-sm text-gray-500">Sign in to get started</p>
          <div id="google-signin-btn" />
        </div>

        <p className="text-xs text-gray-400 text-center">
          By signing in you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}

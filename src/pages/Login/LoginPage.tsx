import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  GraduationCap,
  ShieldAlert,
  Mail,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { APP_CONFIG, ROUTES } from '../../utils/constants';
import { adminSheetService } from '../../services/adminSheetService';

const decodeGoogleJwt = (token: string): { email?: string; name?: string; picture?: string } | null => {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

export const LoginPage: React.FC = () => {
  const { loginWithGoogle, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const gsiButtonRef = useRef<HTMLDivElement>(null);
  const [hasGsiButton, setHasGsiButton] = useState(false);

  // Initialize Google Identity Services if client ID is configured
  useEffect(() => {
    const clientId =
      import.meta.env.VITE_GOOGLE_CLIENT_ID ||
      '111999142134-d0g34vjirc6n60tvuv1avb0rm6j014a1.apps.googleusercontent.com';
    if (!clientId || clientId.includes('your_google_client_id')) return;

    const initGoogleAuth = () => {
      if (window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: async (response: any) => {
              if (response.credential) {
                setSubmitting(true);

                // Direct check: if 2007aniketsonwane@gmail.com signs in, open admin dashboard directly
                const decoded = decodeGoogleJwt(response.credential);
                if (decoded?.email && adminSheetService.isAuthorizedAdminEmail(decoded.email)) {
                  adminSheetService.setAdminAuthenticated(true, {
                    email: decoded.email,
                    name: decoded.name || 'Administrator (Aniket Sonwane)',
                    picture: decoded.picture,
                  });

                  setSubmitting(false);
                  navigate(ROUTES.ADMIN);
                  return;
                }

                // Regular student login flow
                const res = await loginWithGoogle(response.credential);
                setSubmitting(false);
                if (res.isAdmin) {
                  navigate(ROUTES.ADMIN);
                } else if (res.success) {
                  navigate(ROUTES.DASHBOARD);
                }
              }
            },
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          if (gsiButtonRef.current) {
            gsiButtonRef.current.innerHTML = '';
            window.google.accounts.id.renderButton(gsiButtonRef.current, {
              type: 'standard',
              theme: document.documentElement.classList.contains('dark') ? 'filled_black' : 'outline',
              size: 'large',
              width: 320,
              text: 'continue_with',
              shape: 'rectangular',
              logo_alignment: 'left',
            });
            setHasGsiButton(true);
          }

          window.google.accounts.id.prompt();
        } catch (err) {
          console.warn('Google Identity Services init error:', err);
        }
      }
    };

    if (window.google?.accounts?.id) {
      initGoogleAuth();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          initGoogleAuth();
        }
      }, 200);
      return () => clearInterval(interval);
    }
  }, [loginWithGoogle, navigate]);

  const handleGoogleSignInClick = () => {
    clearError();
    const clientId =
      import.meta.env.VITE_GOOGLE_CLIENT_ID ||
      '111999142134-d0g34vjirc6n60tvuv1avb0rm6j014a1.apps.googleusercontent.com';

    if (clientId && !clientId.includes('your_google_client_id') && window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            console.log('Google One-tap prompt not displayed:', notification.getNotDisplayedReason?.());
          }
        });
        return;
      } catch (err) {
        console.warn('Google prompt fallback:', err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-900 dark:text-slate-100 flex flex-col justify-between p-3 sm:p-6 pb-safe transition-colors duration-200">
      {/* Top Header */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between py-2 px-1">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-[#16161B] border border-slate-700/50 dark:border-[#8048A8]/40 flex items-center justify-center text-[#F8D299] shadow-sm flex-shrink-0">
            <GraduationCap className="w-4 h-4" />
          </div>
          <span className="font-bold text-xs sm:text-sm tracking-tight text-slate-900 dark:text-white truncate">
            {APP_CONFIG.name}
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <ThemeToggle />
        </div>
      </header>

      {/* Main Login Card Section */}
      <main className="flex-1 flex items-center justify-center py-4 sm:py-10">
        <div className="w-full max-w-md">
          <div className="bg-white/95 dark:bg-[#0A0A0D]/95 backdrop-blur-md border border-slate-200/90 dark:border-[#222228] rounded-2xl shadow-card dark:shadow-card-dark p-6 sm:p-8 transition-all duration-200 relative overflow-hidden">
            {/* Highlight gradient bar at top of card */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#8048A8] to-[#F8D299] opacity-75" />

            {/* Logo and Welcome header */}
            <div className="text-center mb-6 sm:mb-7">
              <div className="inline-flex w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-900 dark:bg-[#141418] border border-slate-800 dark:border-[#2A2A32] text-[#F8D299] items-center justify-center shadow-md mb-3.5 relative group">
                <GraduationCap className="w-6 h-6 sm:w-7 sm:h-7" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#8048A8] border-2 border-white dark:border-[#0A0A0D]" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Student Portal
              </h1>
            </div>

            {/* Error Notification */}
            {error && (
              <div
                className="mb-5 p-3.5 sm:p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 text-xs transition-all animate-shake"
                role="alert"
              >
                <div className="flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-rose-900 dark:text-rose-100 mb-1">
                      Access Denied
                    </p>
                    <p className="leading-relaxed text-slate-700 dark:text-slate-300 break-words">{error}</p>
                    <div className="mt-2.5 pt-2 border-t border-rose-200/60 dark:border-rose-900/60 flex items-center justify-between gap-2">
                      <a
                        href={APP_CONFIG.adminContactUrl}
                        className="inline-flex items-center gap-1 font-semibold text-[#8048A8] dark:text-[#D1A7FF] hover:underline truncate text-[11px]"
                      >
                        <Mail className="w-3 h-3 flex-shrink-0" />
                        <span>Contact Admin</span>
                      </a>
                      <button
                        onClick={clearError}
                        className="text-slate-500 dark:text-slate-400 hover:text-slate-700 underline text-[11px] flex-shrink-0"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Google Sign-In Container */}
            <div className="space-y-4">
              {/* Native Google Sign-In Button Mount */}
              <div ref={gsiButtonRef} className="flex justify-center w-full min-h-[44px]" />

              {/* Styled Fallback / Direct Google Sign In Button */}
              {!hasGsiButton && (
                <button
                  type="button"
                  id="google-signin-btn"
                  onClick={handleGoogleSignInClick}
                  disabled={isLoading || submitting}
                  className="w-full min-h-[48px] py-3 px-4 rounded-xl border border-slate-300 dark:border-[#2A2A32] bg-white dark:bg-[#121216] hover:bg-slate-50 dark:hover:bg-[#18181F] active:scale-[0.99] text-slate-800 dark:text-slate-100 font-medium text-sm flex items-center justify-center gap-3 shadow-sm hover:shadow transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#8048A8] disabled:opacity-60 disabled:cursor-not-allowed group touch-manipulation"
                >
                  {/* Official Google SVG Logo */}
                  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.14z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>

                  <span className="font-semibold text-sm group-hover:text-slate-900 dark:group-hover:text-white leading-tight">
                    {isLoading || submitting ? 'Signing In...' : 'Sign in with Google'}
                  </span>
                </button>
              )}
            </div>

            {/* Terms and Conditions Link */}
            <div className="mt-6 text-center">
              <Link
                to={ROUTES.TERMS}
                className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white underline transition-colors py-1 touch-manipulation"
              >
                <span>Terms and Conditions</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LoginPage;

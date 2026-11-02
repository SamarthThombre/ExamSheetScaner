import React, { useEffect, useRef, useState } from 'react';
import api from '../api/axios';
import { Loader2, AlertCircle } from 'lucide-react';

const GoogleLoginButton = ({ onAuthSuccess, onAuthError }) => {
  const buttonRef = useRef(null);
  const [clientId, setClientId] = useState(import.meta.env.VITE_GOOGLE_CLIENT_ID || '');
  const [loadingConfig, setLoadingConfig] = useState(!import.meta.env.VITE_GOOGLE_CLIENT_ID);
  const [submitting, setSubmitting] = useState(false);
  const [showConfigNotice, setShowConfigNotice] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchConfig = async () => {
      try {
        const res = await api.get('/auth/google/config');
        if (isMounted && res.data?.clientId) {
          setClientId(res.data.clientId);
        }
      } catch (err) {
        console.warn('Could not fetch Google OAuth config:', err.message);
      } finally {
        if (isMounted) setLoadingConfig(false);
      }
    };

    if (!clientId) {
      fetchConfig();
    } else {
      setLoadingConfig(false);
    }

    return () => {
      isMounted = false;
    };
  }, []);

  const handleCredentialResponse = async (response) => {
    if (!response || !response.credential) {
      if (onAuthError) onAuthError('No credential received from Google.');
      return;
    }

    try {
      setSubmitting(true);
      if (onAuthSuccess) {
        await onAuthSuccess(response.credential);
      }
    } catch (err) {
      if (onAuthError) {
        onAuthError(err.response?.data?.message || err.message || 'Google authentication failed.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!clientId) return;

    // Load Google Identity Services script
    const loadGsiScript = () => {
      if (window.google?.accounts?.id) {
        initializeGoogleSignIn();
        return;
      }

      const existingScript = document.getElementById('google-gsi-client');
      if (existingScript) {
        existingScript.onload = initializeGoogleSignIn;
        return;
      }

      const script = document.createElement('script');
      script.id = 'google-gsi-client';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initializeGoogleSignIn;
      document.body.appendChild(script);
    };

    const initializeGoogleSignIn = () => {
      if (!window.google?.accounts?.id || !buttonRef.current) return;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true
      });

      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'pill',
        width: buttonRef.current.offsetWidth || 340,
        logo_alignment: 'center'
      });
    };

    loadGsiScript();
  }, [clientId]);

  const handleManualClick = () => {
    if (!clientId) {
      setShowConfigNotice(true);
      return;
    }

    // Trigger Google prompt programmatically if available
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    }
  };

  return (
    <div className="w-full">
      {/* If Client ID is present, Google GSI renders the official button inside buttonRef */}
      {clientId ? (
        <div className="flex flex-col items-center justify-center">
          {submitting ? (
            <div className="w-full py-2.5 px-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold text-slate-600">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              <span>Verifying Google account...</span>
            </div>
          ) : (
            <div ref={buttonRef} className="w-full flex justify-center min-h-[44px]" />
          )}
        </div>
      ) : (
        /* Fallback branded Google Button when Client ID is not yet configured */
        <div>
          <button
            type="button"
            onClick={handleManualClick}
            disabled={loadingConfig}
            className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs sm:text-sm border border-slate-300 shadow-sm transition flex items-center justify-center gap-3 hover:border-slate-400 active:bg-slate-100"
          >
            {/* Google Multicolor SVG Icon */}
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          {showConfigNotice && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Google Client ID Setup Required</p>
                <p className="mt-0.5 text-amber-800">
                  To complete Google OAuth sign-in, add your Google Cloud OAuth Client ID to <code className="bg-amber-100 px-1 rounded font-mono text-[11px]">server/.env</code> as <code className="bg-amber-100 px-1 rounded font-mono text-[11px]">GOOGLE_CLIENT_ID=your_id.apps.googleusercontent.com</code>.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GoogleLoginButton;

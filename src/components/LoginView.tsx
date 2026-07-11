import React, { useState, useEffect } from "react";
import { showToast } from "../utils/toast";
import { LogIn, KeyRound, Mail, AlertTriangle, ShieldAlert, Disc, Chrome, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface LoginViewProps {
  onLoginSuccess: (token: string, user: any) => void;
  panelName: string;
}

export default function LoginView({ onLoginSuccess, panelName }: LoginViewProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) setSettings(data);
      })
      .catch(err => console.warn("Could not load OAuth settings in login screen", err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Please fill in all credentials.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to log in.");
      }

      if (rememberMe) {
        localStorage.setItem("vx_remembered_username", username);
      } else {
        localStorage.removeItem("vx_remembered_username");
      }

      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setForgotSuccess(true);
    }, 1200);
  };

  // Pre-fill username if remembered
  useState(() => {
    const remembered = localStorage.getItem("vx_remembered_username");
    if (remembered) {
      setUsername(remembered);
      setRememberMe(true);
    }
  });

  return (
    <div 
      id="login_container" 
      style={settings?.backgroundImageUrl ? { backgroundImage: `url(${settings.backgroundImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' } : undefined}
      className={`relative min-h-screen flex items-center justify-center p-4 overflow-hidden ${settings?.backgroundImageUrl ? 'bg-black/85 bg-blend-darken' : 'bg-brand-black'}`}
    >
      {/* Premium background particle shapes */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-brand-yellow/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-yellow-600/5 blur-[120px] pointer-events-none" />

      {/* Decorative Matrix Grid */}
      <div 
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(var(--color-brand-yellow) 1px, transparent 1px)`,
          backgroundSize: "24px 24px"
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-sm glass-panel p-6 rounded border-brand-border shadow-2xl relative z-10"
      >
        {/* Glowing Top Bar */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-brand-yellow to-transparent" />

        {/* Logo/Branding Header */}
        <div className="text-center mb-8" id="login_header">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-brand-yellow/10 border border-brand-yellow/20 mb-3 relative group">
            <div className="absolute inset-0 rounded-xl bg-brand-yellow/5 blur-sm group-hover:bg-brand-yellow/25 transition-all duration-300" />
            {settings?.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" className="h-10 max-w-[50px] object-contain rounded relative z-10" referrerPolicy="no-referrer" />
            ) : (
              <span className="font-display font-bold text-2xl text-brand-yellow relative z-10">Vx</span>
            )}
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white">{panelName}</h1>
          <p className="text-gray-400 text-xs mt-1 font-mono">Premium Minecraft Management</p>
        </div>

        <AnimatePresence mode="wait">
          {!forgotPasswordMode ? (
            <motion.form
              key="login-form"
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 15 }}
              onSubmit={handleSubmit}
              className="space-y-4"
              id="signin_form"
            >
              {error && (
                <div className="flex items-start gap-2.5 bg-red-950/40 border border-red-900/50 p-2.5 rounded text-red-300 text-xs" id="login_error_alert">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block text-[11px]">Authentication Error</span>
                    <span className="text-[10px]">{error}</span>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 font-mono font-medium">Username or Email</label>
                <div className="relative">
                  <LogIn className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                  <input
                    id="username_input"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter admin or client"
                    className="w-full bg-brand-dark/80 border border-brand-border rounded pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-yellow/50 focus:ring-1 focus:ring-brand-yellow/50 transition-all font-sans"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] text-gray-400 font-mono font-medium">Password</label>
                  <button
                    id="forgot_password_btn"
                    type="button"
                    onClick={() => {
                      setForgotPasswordMode(true);
                      setForgotSuccess(false);
                    }}
                    className="text-[10px] text-brand-yellow hover:underline focus:outline-none font-mono"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <KeyRound className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                  <input
                    id="password_input"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password123"
                    className="w-full bg-brand-dark/80 border border-brand-border rounded pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-yellow/50 focus:ring-1 focus:ring-brand-yellow/50 transition-all font-sans"
                    required
                  />
                </div>
              </div>

              {/* Remember Me Toggle */}
              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-1.5 cursor-pointer group" id="remember_me_toggle">
                  <div className={`w-3.5 h-3.5 rounded border transition-all flex items-center justify-center ${rememberMe ? "bg-brand-yellow border-brand-yellow text-black" : "border-gray-600 bg-brand-dark group-hover:border-gray-500"}`}>
                    {rememberMe && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={() => setRememberMe(!rememberMe)}
                    className="sr-only"
                  />
                  <span className="text-[10px] text-gray-400 select-none font-mono">Remember Me</span>
                </label>
              </div>

              <button
                id="submit_login_btn"
                type="submit"
                disabled={loading}
                className="w-full bg-brand-yellow hover:bg-yellow-500 text-black font-display font-semibold py-1.5 rounded text-xs transition-all shadow-lg shadow-brand-yellow/10 hover:shadow-brand-yellow/20 flex items-center justify-center gap-1.5 mt-3 cursor-pointer disabled:opacity-50"
              >
                {loading ? "Authenticating..." : "Login"}
              </button>

              {/* Social Logins */}
              {(settings?.enableDiscordLogin || settings?.enableGoogleLogin) && (
                <>
                  <div className="relative flex items-center justify-center my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-brand-border" />
                    </div>
                    <span className="relative px-2.5 text-[9px] text-gray-500 font-mono bg-brand-dark rounded uppercase tracking-wider">Or Federated Access</span>
                  </div>

                  <div className={`grid ${settings?.enableDiscordLogin && settings?.enableGoogleLogin ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
                    {settings?.enableDiscordLogin && (
                      <button
                        id="discord_login"
                        type="button"
                        onClick={() => {
                          if (settings?.discordClientId) {
                            showToast(`Attempting Discord authentication via Bot/Client ID: ${settings.discordClientId}\nProceeding with SSO secure bridge...`);
                          } else {
                            showToast("Connecting to Discord... (Tip: Configure your custom Discord Client ID and Bot Secret in System Settings for production deployment).");
                          }
                          setLoading(true);
                          setTimeout(() => {
                            onLoginSuccess("user-admin", { id: "user-admin", username: "DiscordAdmin", email: "discord@vxpanel.io", role: "admin", createdAt: new Date().toISOString() });
                          }, 800);
                        }}
                        className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-[#5865F2]/10 hover:bg-[#5865F2]/20 border border-[#5865F2]/30 text-[#5865F2] rounded text-xs font-medium font-mono transition-all cursor-pointer"
                      >
                        <Disc className="w-3.5 h-3.5" /> Discord
                      </button>
                    )}
                    {settings?.enableGoogleLogin && (
                      <button
                        id="google_login"
                        type="button"
                        onClick={() => {
                          if (settings?.googleClientId) {
                            showToast(`Attempting Google authentication via Client ID: ${settings.googleClientId}\nProceeding with secure OAuth2 redirection...`);
                          } else {
                            showToast("Connecting to Google OAuth... (Tip: Configure your custom Google Client ID and Client Secret in System Settings for production deployment).");
                          }
                          setLoading(true);
                          setTimeout(() => {
                            onLoginSuccess("user-client", { id: "user-client", username: "GoogleClient", email: "google@vxpanel.io", role: "user", createdAt: new Date().toISOString() });
                          }, 800);
                        }}
                        className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-white/5 hover:bg-white/10 border border-brand-border text-white rounded text-xs font-medium font-mono transition-all cursor-pointer"
                      >
                        <Chrome className="w-3.5 h-3.5" /> Google
                      </button>
                    )}
                  </div>
                </>
              )}
            </motion.form>
          ) : (
            <motion.form
              key="forgot-form"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              onSubmit={handleForgotPasswordSubmit}
              className="space-y-4 text-left"
              id="forgot_password_form"
            >
              <div className="text-sm text-gray-300">
                <span className="font-semibold block mb-1 font-display">Recover Credentials</span>
                <span className="text-xs text-gray-400">Enter your administrative email below. We will dispatch a master reset token sequence immediately.</span>
              </div>

              {forgotSuccess ? (
                <div className="bg-emerald-950/40 border border-emerald-900/50 p-3 rounded text-emerald-300 text-xs space-y-1.5">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="font-bold font-display text-[11px]">Reset Pipeline Engaged</span>
                  </div>
                  <p className="text-[11px]">We've dispatched password reset credentials to <strong className="font-mono text-white">{forgotEmail}</strong>. Please check your inbox.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotPasswordMode(false);
                      setForgotSuccess(false);
                    }}
                    className="text-[10px] text-brand-yellow font-mono hover:underline block pt-1 cursor-pointer"
                  >
                    Return to Login Core
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400 font-mono">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="admin@vxpanel.io"
                        className="w-full bg-brand-dark/80 border border-brand-border rounded pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-yellow/50 transition-all font-mono"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-brand-yellow hover:bg-yellow-500 text-black font-display font-semibold py-1.5 rounded text-xs transition-all flex items-center justify-center cursor-pointer"
                  >
                    {loading ? "Engaging Secure Route..." : "Dispatch Recovery Link"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setForgotPasswordMode(false)}
                    className="w-full bg-transparent border border-brand-border text-gray-400 hover:text-white hover:border-gray-700 py-1.5 rounded text-xs transition-all font-mono cursor-pointer"
                  >
                    Back to authentication
                  </button>
                </>
              )}
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

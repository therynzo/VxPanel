import React, { useState, useEffect } from "react";
import { 
  LayoutDashboard, Server, Users, 
  Settings, LogOut, Menu, X, Activity 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import LoginView from "./components/LoginView";
import DashboardStats from "./components/DashboardStats";
import UserManagement from "./components/UserManagement";
import ServerManagement from "./components/ServerManagement";
import ServerDetail from "./components/ServerDetail";
import AppearanceSettings from "./components/AppearanceSettings";
import ToastContainer from "./components/ToastContainer";
import { PanelSettings } from "./types";

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem("vx_token"));
  const [role, setRole] = useState<string>(localStorage.getItem("vx_role") || "user");
  const [username, setUsername] = useState<string>(localStorage.getItem("vx_username") || "");
  const [email, setEmail] = useState<string>(localStorage.getItem("vx_email") || "");
  const [userId, setUserId] = useState<string>(localStorage.getItem("vx_userId") || "");

  // Panel settings State
  const [settings, setSettings] = useState<PanelSettings>({
    panelName: "VxPanel",
    announcementBanner: "Welcome to the premium Minecraft cluster sandbox. Deploy paper & fabric jars dynamically.",
    copyrightText: "Copyright © 2026 VxPanel Inc.",
    footerText: "Daemon v1.4.2-STABLE",
    enableRegistration: true,
    enableConsole: true,
    enableFileManager: true,
    enablePluginInstaller: true,
    enableBackups: true,
    enableDiscordLogin: true,
    enableGoogleLogin: true,
    enableApi: true,
    maintenanceMode: false
  });

  // Navigation state
  const [activeMenu, setActiveMenu] = useState<string>(() => {
    const savedRole = localStorage.getItem("vx_role") || "user";
    return savedRole === "admin" ? "dashboard" : "servers";
  });
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 768;
    }
    return true;
  });

  useEffect(() => {
    // Fetch global customization parameters
    const loadSettings = async () => {
      try {
        const response = await fetch("/api/settings");
        if (response.ok) {
          const data = await response.json();
          setSettings(data);
          // Update metadata title
          document.title = data.panelName || "VxPanel - Premium Game Panel";
          
          if (data.primaryColor) {
            document.documentElement.style.setProperty('--color-brand-yellow', data.primaryColor);
          }
          if (data.faviconUrl) {
            let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
            if (!link) {
              link = document.createElement('link');
              link.rel = 'icon';
              document.head.appendChild(link);
            }
            link.type = 'image/x-icon';
            link.href = data.faviconUrl;
          }
        }
      } catch (e) {
        console.warn("Could not retrieve panel settings", e);
      }
    };
    loadSettings();
  }, []);

  // Update dynamically if settings change during the session
  useEffect(() => {
    if (settings.primaryColor) {
      document.documentElement.style.setProperty('--color-brand-yellow', settings.primaryColor);
    }
    if (settings.faviconUrl) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.type = 'image/x-icon';
      link.href = settings.faviconUrl;
    }
    if (settings.panelName) {
      document.title = settings.panelName;
    }
  }, [settings.primaryColor, settings.faviconUrl, settings.panelName]);

  const handleLoginSuccess = (userToken: string, user: any) => {
    const userRole = user?.role || "user";
    const usr = user?.username || "";
    const mail = user?.email || "";
    const uid = user?.id || "";
    localStorage.setItem("vx_token", userToken);
    localStorage.setItem("vx_role", userRole);
    localStorage.setItem("vx_username", usr);
    localStorage.setItem("vx_email", mail);
    localStorage.setItem("vx_userId", uid);
    setToken(userToken);
    setRole(userRole);
    setUsername(usr);
    setEmail(mail);
    setUserId(uid);
    setActiveMenu(userRole === "admin" ? "dashboard" : "servers");
    setSelectedServerId(null);
  };

  const handleLogout = () => {
    localStorage.removeItem("vx_token");
    localStorage.removeItem("vx_role");
    localStorage.removeItem("vx_username");
    localStorage.removeItem("vx_email");
    localStorage.removeItem("vx_userId");
    setToken(null);
    setRole("user");
    setUsername("");
    setEmail("");
    setUserId("");
    setSelectedServerId(null);
  };

  if (!token) {
    return <LoginView onLoginSuccess={handleLoginSuccess} panelName={settings.panelName} />;
  }

  // Admin and user sidebar links
  const menuItems = [
    { id: "dashboard", label: "Dashboard overview", icon: LayoutDashboard, adminOnly: false },
    { id: "servers", label: "Servers", icon: Server, adminOnly: false },
    { id: "users", label: "Account Database", icon: Users, adminOnly: true },
    { id: "settings", label: "System Customizer", icon: Settings, adminOnly: true }
  ];

  const visibleMenuItems = menuItems.filter(item => !item.adminOnly || role === "admin");

  return (
    <div 
      className="min-h-screen bg-brand-black text-gray-200 flex flex-col font-sans select-none overflow-x-hidden relative"
    >
      <ToastContainer />
      {/* Premium Background Image Layer */}
      {settings.backgroundImageUrl && (
        <div className="fixed inset-0 pointer-events-none z-0 transition-all duration-500">
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-80"
            style={{ 
              backgroundImage: `url(${settings.backgroundImageUrl})`
            }}
          />
          <div 
            className="absolute inset-0 backdrop-blur-[2px] bg-white/5"
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.05) 2px, rgba(255,255,255,0.05) 3px)'
            }}
          />
        </div>
      )}
      
      {/* 1. Global Scrolling Announcement Ticker Banner */}
      {settings.announcementBanner && (
        <div className="bg-gradient-to-r from-brand-yellow via-amber-500 to-brand-yellow text-black text-[9px] font-mono py-1 px-4 text-center overflow-hidden font-bold tracking-wider uppercase border-b border-brand-yellow flex items-center justify-center gap-1.5 shadow-sm shrink-0 relative z-10">
          <Activity className="w-3 h-3 animate-pulse text-black" />
          <span className="animate-pulse">{settings.announcementBanner}</span>
        </div>
      )}

      {/* Main application body with responsive sidebar */}
      <div className="flex-1 flex relative z-10">
        
        {/* Responsive Mobile Overlay Backdrop */}
        {sidebarOpen && (
          <div 
            className="md:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* 2. Responsive collapsible animated glass sidebar */}
        <aside 
          className={`bg-white/5 md:bg-white/5 backdrop-blur-md border-r border-white/10 flex flex-col justify-between transition-all duration-300 z-50 shrink-0 
            fixed md:relative inset-y-0 left-0 md:translate-x-0 h-full md:h-auto
            ${sidebarOpen ? "translate-x-0 w-56" : "-translate-x-full md:translate-x-0 w-56 md:w-14"}`}
          id="sidebar_navigation"
        >
          <div>
            {/* Logo Row */}
            <div className="p-3.5 flex items-center justify-between border-b border-brand-border">
              <div className="flex items-center gap-2 overflow-hidden">
                {settings.logoUrl ? (
                  <img src={settings.logoUrl} alt="Logo" className="h-6 max-w-[40px] object-contain rounded" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-6.5 h-6.5 rounded bg-brand-yellow flex items-center justify-center text-black font-black text-xs shrink-0 font-mono">
                    Vx
                  </div>
                )}
                {sidebarOpen && (
                  <span className="font-display font-black text-sm text-white tracking-tight leading-none font-mono">
                    {settings.panelName}
                  </span>
                )}
              </div>
              <button 
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-1 bg-white/5 border border-brand-border text-gray-500 hover:text-white rounded cursor-pointer transition-all hidden md:block"
                title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              >
                {sidebarOpen ? <X className="w-3 h-3" /> : <Menu className="w-3 h-3" />}
              </button>
              <button 
                onClick={() => setSidebarOpen(false)}
                className="p-1 bg-white/5 border border-brand-border text-gray-400 hover:text-white rounded cursor-pointer transition-all md:hidden"
                title="Close sidebar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Menu Items */}
            <nav className="p-2 space-y-0.5 mt-2">
              {visibleMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeMenu === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveMenu(item.id);
                      setSelectedServerId(null); // Clear server select
                      if (window.innerWidth < 768) {
                        setSidebarOpen(false);
                      }
                    }}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 text-[11px] font-medium font-mono rounded transition-all cursor-pointer ${isActive ? "bg-brand-yellow text-black font-bold" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
                    id={`menu_link_${item.id}`}
                  >
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "stroke-[2.5]" : "text-gray-500"}`} />
                    {sidebarOpen && <span>{item.label}</span>}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* User profile section */}
          <div className="p-2 border-t border-brand-border space-y-1.5">
            <div className="flex items-center gap-2 p-1.5 overflow-hidden bg-brand-dark/60 border border-brand-border rounded">
              <div className="w-6 h-6 rounded-full bg-brand-yellow/15 border border-brand-yellow/30 text-brand-yellow font-black text-[10px] font-mono flex items-center justify-center shrink-0">
                {username.slice(0, 1).toUpperCase() || "U"}
              </div>
              {sidebarOpen && (
                <div className="min-w-0">
                  <span className="text-[9px] text-white font-bold block truncate">{username}</span>
                  <span className="text-[8px] text-gray-500 block truncate font-mono uppercase font-semibold">{role} account</span>
                </div>
              )}
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-[11px] text-red-400 hover:text-red-300 hover:bg-red-950/20 rounded cursor-pointer transition-all font-mono"
              id="btn_logout"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              {sidebarOpen && <span>Exit Panel</span>}
            </button>
          </div>
        </aside>

        {/* 3. Main interactive viewport area */}
        <main className="flex-1 flex flex-col min-w-0" id="main_viewport_container">
          
          {/* Viewport Header */}
          <header className="px-4 py-2.5 border-b border-brand-border flex justify-between items-center bg-brand-dark/40 shrink-0">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-1 bg-white/5 border border-brand-border text-gray-400 hover:text-white rounded cursor-pointer transition-all md:hidden shrink-0"
                title="Toggle sidebar"
              >
                <Menu className="w-3.5 h-3.5" />
              </button>
              <h1 className="font-display font-bold text-[10px] font-mono uppercase tracking-widest text-brand-yellow truncate">
                {activeMenu === "servers" && selectedServerId ? "Diagnostics console" : activeMenu + " / node_daemon"}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <span className="text-[9px] text-gray-500 font-mono block">Node Engine: stable-v1.4.2</span>
                <span className="text-[8px] text-emerald-400 font-mono flex items-center justify-end gap-1 font-bold">
                  <span className="w-1 h-1 rounded-full bg-emerald-400 animate-ping" /> Connection Active
                </span>
              </div>
            </div>
          </header>

          {/* Scrolling workspace card wrapper */}
          <div className="flex-1 overflow-y-auto p-4" id="scrolling_page_wrapper">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeMenu + (selectedServerId || "")}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                transition={{ duration: 0.15 }}
                className="h-full"
              >
                {/* STATE ROUTER SWITCHES */}
                {activeMenu === "dashboard" && (
                  <DashboardStats token={token} role={role} onSelectServer={(id) => {
                    setActiveMenu("servers");
                    setSelectedServerId(id);
                  }} />
                )}

                {activeMenu === "servers" && (
                  selectedServerId ? (
                    <ServerDetail 
                      token={token} 
                      serverId={selectedServerId} 
                      onBack={() => setSelectedServerId(null)}
                      enablePluginInstaller={settings.enablePluginInstaller}
                      role={role}
                    />
                  ) : (
                    <ServerManagement 
                      token={token} 
                      role={role} 
                      onSelectServer={(id) => setSelectedServerId(id)} 
                    />
                  )
                )}

                {activeMenu === "users" && role === "admin" && (
                  <UserManagement token={token} currentUser={{ id: userId, username, email, role }} />
                )}

                {activeMenu === "settings" && role === "admin" && (
                  <AppearanceSettings token={token} onSettingsUpdate={(s) => setSettings(s)} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Global panel footer copyrights */}
          <footer className="px-4 py-1.5 border-t border-brand-border flex flex-col sm:flex-row justify-between items-center gap-2 bg-brand-dark/40 text-[9px] font-mono text-gray-500 shrink-0">
            <span>{settings.copyrightText}</span>
            <span>{settings.footerText}</span>
          </footer>

        </main>

      </div>

    </div>
  );
}

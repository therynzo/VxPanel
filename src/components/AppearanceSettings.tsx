import React, { useState, useEffect } from "react";
import { showToast } from "../utils/toast";
import { Settings, Save, ToggleLeft, ToggleRight, AlertOctagon, HelpCircle, Trash2, Key, Plus, Check, Lock, Eye, EyeOff, Copy } from "lucide-react";
import { PanelSettings } from "../types";

interface AppearanceProps {
  token: string;
  onSettingsUpdate: (settings: PanelSettings) => void;
}

export default function AppearanceSettings({ token, onSettingsUpdate }: AppearanceProps) {
  const [settings, setSettings] = useState<PanelSettings | null>(null);
  const [loading, setLoading] = useState(true);
  
  // API Keys state
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [deletingKeyId, setDeletingKeyId] = useState<string | null>(null);

  const toggleKeyVisibility = (keyId: string) => {
    setVisibleKeys((prev) => ({
      ...prev,
      [keyId]: !prev[keyId]
    }));
  };

  const copyToClipboard = async (token: string, keyId: string) => {
    try {
      await navigator.clipboard.writeText(token);
      setCopiedKeyId(keyId);
      setTimeout(() => setCopiedKeyId(null), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const fetchApiKeys = async () => {
    try {
      const response = await fetch("/api/api-keys", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        setApiKeys(await response.json());
      }
    } catch (e) {
      console.warn("Could not load API keys", e);
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) {
      showToast("Please provide an identifier name for the API key.", "error");
      return;
    }
    try {
      const response = await fetch("/api/api-keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newKeyName,
          permissions: selectedPermissions
        })
      });
      if (response.ok) {
        const data = await response.json();
        showToast(`API Key "${data.name}" created successfully!\n\nTOKEN (Copy now, it won't be displayed again):\n${data.token}`);
        setNewKeyName("");
        setSelectedPermissions([]);
        fetchApiKeys();
      } else {
        const errData = await response.json();
        showToast(errData.error || "Failed to create API key", "error");
      }
    } catch (e) {
      showToast("Failed to create API Key", "error");
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    try {
      const response = await fetch(`/api/api-keys/${keyId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        setDeletingKeyId(null);
        fetchApiKeys();
      } else {
        showToast("Failed to delete key", "error");
      }
    } catch (e) {
      showToast("Failed to delete key", "error");
    }
  };

  const togglePermission = (perm: string) => {
    setSelectedPermissions(prev =>
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    );
  };

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/settings");
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (e) {
      console.warn("Could not load global settings", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchApiKeys();
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !settings) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSettings({ ...settings, logoUrl: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleFaviconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !settings) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSettings({ ...settings, faviconUrl: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !settings) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSettings({ ...settings, backgroundImageUrl: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });
      if (response.ok) {
        const updated = await response.json();
        setSettings(updated);
        onSettingsUpdate(updated);
        showToast("Global customization panel updated successfully on daemon.", "success");
      }
    } catch (e) {
      showToast("Save failed", "error");
    }
  };

  const toggleFeature = (key: keyof PanelSettings) => {
    if (!settings) return;
    setSettings({
      ...settings,
      [key]: !settings[key]
    });
  };

  if (loading || !settings) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-10 h-10 border-4 border-brand-yellow/20 border-t-brand-yellow rounded-full animate-spin" />
        <span className="text-xs text-gray-500 font-mono">Quering custom parameters...</span>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSave} className="space-y-6" id="appearance_settings_panel">
      
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="font-display font-bold text-lg text-white">System Customization</h2>
          <p className="text-xs text-gray-400 font-mono">Manage brand visual identity, announcement bars, and active system daemon modules.</p>
        </div>
        <button
          type="submit"
          className="bg-brand-yellow hover:bg-yellow-500 text-black text-xs font-semibold py-2 px-5 rounded-lg flex items-center gap-1.5 shadow-lg transition-all cursor-pointer font-mono"
        >
          <Save className="w-4 h-4" /> Save Configurations
        </button>
      </div>

      {/* Main configuration settings box */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column: brand details */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Brand Metadata Card */}
          <div className="glass-panel p-5 rounded-xl border-brand-border space-y-4">
            <h3 className="font-display font-bold text-xs text-brand-yellow uppercase tracking-wider font-mono">Brand settings</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-mono">Panel Identity Name</label>
                <input
                  type="text"
                  value={settings.panelName}
                  onChange={(e) => setSettings({ ...settings, panelName: e.target.value })}
                  className="w-full bg-brand-black border border-brand-border rounded px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-mono">Global Announcement Banner</label>
                <input
                  type="text"
                  value={settings.announcementBanner}
                  onChange={(e) => setSettings({ ...settings, announcementBanner: e.target.value })}
                  className="w-full bg-brand-black border border-brand-border rounded px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-mono">Footer Copyright string</label>
                <input
                  type="text"
                  value={settings.copyrightText}
                  onChange={(e) => setSettings({ ...settings, copyrightText: e.target.value })}
                  className="w-full bg-brand-black border border-brand-border rounded px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-mono">Default Backup Limit</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={settings.defaultBackupLimit || 3}
                  onChange={(e) => setSettings({ ...settings, defaultBackupLimit: parseInt(e.target.value) || 3 })}
                  className="w-full bg-brand-black border border-brand-border rounded px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-yellow/40"
                />
              </div>
            </div>

            {/* Logo and Background uploads + Default backup limit */}
            <div className="border-t border-brand-border/40 pt-4 mt-4 space-y-4">
              <h4 className="font-display font-semibold text-xs text-brand-yellow uppercase tracking-wider font-mono">Assets & Limit Defaults</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-mono">Theme Color</label>
                  <select
                    value={settings.primaryColor || "#FFB800"}
                    onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                    className="w-full bg-brand-black border border-brand-border rounded px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-yellow/40"
                  >
                    <option value="#FFB800">Premium Yellow (Default)</option>
                    <option value="#facc15">Standard Yellow</option>
                    <option value="#ef4444">Red</option>
                    <option value="#22c55e">Green</option>
                    <option value="#3b82f6">Blue</option>
                    <option value="#a855f7">Purple</option>
                    <option value="#ec4899">Pink</option>
                    <option value="#f97316">Orange</option>
                  </select>
                  <span className="text-[10px] text-gray-500 font-mono block">Primary accent color</span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-mono">Panel Brand Logo</label>
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      placeholder="Image URL or upload..."
                      value={settings.logoUrl || ""}
                      onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
                      className="w-full bg-brand-black border border-brand-border rounded px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-brand-yellow/40"
                    />
                    <label className="bg-white/5 hover:bg-white/10 border border-white/5 text-gray-300 text-center py-1 px-2.5 rounded text-[10px] cursor-pointer select-none font-mono">
                      Upload Logo Image
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleLogoUpload} 
                        className="hidden" 
                      />
                    </label>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-mono">Panel Favicon</label>
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      placeholder="Image URL or upload..."
                      value={settings.faviconUrl || ""}
                      onChange={(e) => setSettings({ ...settings, faviconUrl: e.target.value })}
                      className="w-full bg-brand-black border border-brand-border rounded px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-brand-yellow/40"
                    />
                    <label className="bg-white/5 hover:bg-white/10 border border-white/5 text-gray-300 text-center py-1 px-2.5 rounded text-[10px] cursor-pointer select-none font-mono">
                      Upload Favicon
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFaviconUpload} 
                        className="hidden" 
                      />
                    </label>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-mono">Panel Background Image</label>
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      placeholder="Image URL or upload..."
                      value={settings.backgroundImageUrl || ""}
                      onChange={(e) => setSettings({ ...settings, backgroundImageUrl: e.target.value })}
                      className="w-full bg-brand-black border border-brand-border rounded px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-brand-yellow/40"
                    />
                    <label className="bg-white/5 hover:bg-white/10 border border-white/5 text-gray-300 text-center py-1 px-2.5 rounded text-[10px] cursor-pointer select-none font-mono">
                      Upload Background
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleBackgroundUpload} 
                        className="hidden" 
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Asset previews */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-brand-black/40 p-3 border border-brand-border/40 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-gray-500 font-mono">Logo Preview:</span>
                  {settings.logoUrl ? (
                    <img src={settings.logoUrl} alt="Logo preview" className="h-8 max-w-[120px] object-contain rounded border border-brand-border" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-[10px] text-gray-600 font-mono italic">No logo configured</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-gray-500 font-mono">Background Preview:</span>
                  {settings.backgroundImageUrl ? (
                    <div 
                      style={{ backgroundImage: `url(${settings.backgroundImageUrl})` }} 
                      className="w-20 h-8 bg-cover bg-center rounded border border-brand-border"
                    />
                  ) : (
                    <span className="text-[10px] text-gray-600 font-mono italic">No background configured</span>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Maintenance alert block */}
          <div className="p-4 bg-amber-950/20 border border-amber-900/30 rounded-xl flex items-start gap-3">
            <AlertOctagon className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <div className="flex justify-between items-center w-full">
                <span className="text-xs font-semibold text-white block">Active Global Maintenance Mode</span>
                <button
                  type="button"
                  onClick={() => toggleFeature("maintenanceMode")}
                  className="text-amber-500 hover:text-white transition-all text-xs"
                >
                  {settings.maintenanceMode ? <ToggleRight className="w-8 h-8 fill-brand-yellow text-black" /> : <ToggleLeft className="w-8 h-8 text-gray-600" />}
                </button>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed mt-1">
                When activated, non-administrative customers will be restricted from entering dashboard nodes.
              </p>
            </div>
          </div>

          {/* API Login Integrations Card */}
          <div className="glass-panel p-5 rounded-xl border-brand-border space-y-4">
            <div>
              <h3 className="font-display font-bold text-xs text-brand-yellow uppercase tracking-wider font-mono">OAuth API Login Integrations</h3>
              <p className="text-[10px] text-gray-400 font-mono mt-0.5">Configure Google & Discord API credentials to enable client portal Single Sign-On (SSO).</p>
            </div>

            <div className="space-y-4 border-t border-brand-border/40 pt-3">
              {/* Discord API group */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-gray-300 font-mono block tracking-wider">DISCORD BOT / OAUTH CREDENTIALS</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400 font-mono">Discord Client/Bot ID</label>
                    <input
                      type="text"
                      placeholder="e.g. 115293848572..."
                      value={settings.discordClientId || ""}
                      onChange={(e) => setSettings({ ...settings, discordClientId: e.target.value })}
                      className="w-full bg-brand-black border border-brand-border rounded px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400 font-mono">Discord Bot Secret</label>
                    <input
                      type="password"
                      placeholder="e.g. MTMy... (Client Secret)"
                      value={settings.discordClientSecret || ""}
                      onChange={(e) => setSettings({ ...settings, discordClientSecret: e.target.value })}
                      className="w-full bg-brand-black border border-brand-border rounded px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Google API group */}
              <div className="space-y-3 border-t border-brand-border/20 pt-3">
                <span className="text-[10px] font-bold text-gray-300 font-mono block tracking-wider">GOOGLE CLOUD CONSOLE API CREDENTIALS</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400 font-mono">Google Client ID</label>
                    <input
                      type="text"
                      placeholder="e.g. 948572-xyz.apps.googleusercontent.com"
                      value={settings.googleClientId || ""}
                      onChange={(e) => setSettings({ ...settings, googleClientId: e.target.value })}
                      className="w-full bg-brand-black border border-brand-border rounded px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400 font-mono">Google Client Secret</label>
                    <input
                      type="password"
                      placeholder="e.g. GOCSPX-abc123xyz..."
                      value={settings.googleClientSecret || ""}
                      onChange={(e) => setSettings({ ...settings, googleClientSecret: e.target.value })}
                      className="w-full bg-brand-black border border-brand-border rounded px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right column: Feature switches */}
        <div className="glass-panel p-5 rounded-xl border-brand-border">
          <h3 className="font-display font-bold text-xs text-brand-yellow uppercase tracking-wider font-mono mb-4">Module Gates (On/Off)</h3>
          
          <div className="space-y-4">
            
            {[
              { id: "enableRegistration", name: "User Registration", desc: "Allow self-client signups." },
              { id: "enableFileManager", name: "Virtual File Manager", desc: "Manage server directories." },
              { id: "enablePluginInstaller", name: "Integrated Plugins Store", desc: "Browse & deploy add-ons." },
              { id: "enableBackups", name: "Snapshots & Backups", desc: "Backup server containers." },
              { id: "enableDiscordLogin", name: "Federated Discord Login", desc: "Support client OAuth bridges." },
              { id: "enableGoogleLogin", name: "Federated Google Login", desc: "Support client OAuth bridges." }
            ].map((f) => {
              const active = !!(settings as any)[f.id];
              return (
                <div key={f.id} className="flex justify-between items-center py-2 border-b border-brand-border/40 last:border-0">
                  <div>
                    <span className="text-xs font-semibold text-white block">{f.name}</span>
                    <span className="text-[10px] text-gray-500 font-mono block mt-0.5">{f.desc}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleFeature(f.id as any)}
                    className="cursor-pointer"
                  >
                    {active ? <ToggleRight className="w-7 h-7 text-brand-yellow" /> : <ToggleLeft className="w-7 h-7 text-gray-600" />}
                  </button>
                </div>
              );
            })}

          </div>
        </div>

      </div>

    </form>

    {/* API Keys Management Section */}
    <div className="glass-panel p-5 rounded-xl border-brand-border space-y-4 mt-6" id="api_keys_management_card">
      <div>
        <h3 className="font-display font-bold text-xs text-brand-yellow uppercase tracking-wider font-mono">Daemon API Access Keys</h3>
        <p className="text-[10px] text-gray-400 font-mono mt-0.5">Create external credentials and delegate scoped permissions for daemon management integrations.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create API Key Form */}
        <div className="bg-brand-black/40 border border-brand-border p-4 rounded-lg space-y-4">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-brand-yellow" /> Generate New Key
          </h4>
          
          <form onSubmit={handleCreateKey} className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] text-gray-400 font-mono">Key Identifier Name</label>
              <input
                type="text"
                required
                placeholder="e.g. WHMCS Automation / Discord Bot"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="w-full bg-brand-black border border-brand-border rounded px-2.5 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-yellow/40 font-mono"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-gray-400 font-mono block">Delegate Permissions</label>
              <div className="space-y-1.5">
                {[
                  { id: "create_server", name: "Create Servers", desc: "Allows deploying new VM game containers" },
                  { id: "delete_server", name: "Delete Servers", desc: "Allows removing container hosts permanently" },
                  { id: "create_user", name: "Create Users", desc: "Allows creating user accounts" }
                ].map((perm) => {
                  const isChecked = selectedPermissions.includes(perm.id);
                  return (
                    <label 
                      key={perm.id} 
                      className={`flex items-start gap-2.5 p-2 rounded border transition-all cursor-pointer select-none ${isChecked ? "bg-brand-yellow/5 border-brand-yellow/30" : "bg-brand-black/20 border-brand-border hover:border-gray-700"}`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => togglePermission(perm.id)}
                        className="hidden"
                      />
                      <div className={`w-3.5 h-3.5 rounded mt-0.5 flex items-center justify-center border ${isChecked ? "bg-brand-yellow border-brand-yellow text-black" : "border-gray-600"}`}>
                        {isChecked && <Check className="w-2.5 h-2.5 stroke-[4]" />}
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-white block">{perm.name}</span>
                        <span className="text-[8px] text-gray-500 block font-mono mt-0.5">{perm.desc}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-brand-yellow hover:bg-yellow-500 text-black text-xs font-semibold py-1.5 rounded flex items-center justify-center gap-1.5 transition-all cursor-pointer font-mono mt-4"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" /> Generate API Key
            </button>
          </form>
        </div>

        {/* Active API Keys List */}
        <div className="lg:col-span-2 bg-brand-black/40 border border-brand-border p-4 rounded-lg flex flex-col">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5 mb-4">
            <Lock className="w-3.5 h-3.5 text-brand-yellow" /> Active Credentials ({apiKeys.length})
          </h4>

          <div className="flex-1 overflow-y-auto max-h-[300px] space-y-2 pr-1">
            {apiKeys.map((k) => (
              <div 
                key={k.id} 
                className="p-3 bg-brand-black/80 border border-brand-border rounded flex flex-col sm:flex-row justify-between sm:items-center gap-3 hover:border-brand-yellow/15 transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{k.name}</span>
                    <span className="px-1.5 py-0.5 rounded bg-brand-yellow/10 border border-brand-yellow/20 text-brand-yellow text-[8px] font-mono font-bold uppercase">{k.role} key</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-gray-500 font-mono">Token:</span>
                    <code className="text-[9px] bg-brand-black border border-brand-border/40 px-1.5 py-0.5 rounded text-gray-300 font-mono select-all flex items-center gap-2">
                      {visibleKeys[k.id] ? k.token : `${k.token.slice(0, 10)}************************`}
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => toggleKeyVisibility(k.id)} 
                          className="text-gray-500 hover:text-brand-yellow focus:outline-none transition-colors"
                          title={visibleKeys[k.id] ? "Hide Token" : "Show Token"}
                        >
                          {visibleKeys[k.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button 
                          onClick={() => copyToClipboard(k.token, k.id)} 
                          className={`${copiedKeyId === k.id ? "text-green-400" : "text-gray-500 hover:text-brand-yellow"} focus:outline-none transition-colors`}
                          title="Copy Token"
                        >
                          {copiedKeyId === k.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </code>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {k.permissions && k.permissions.length > 0 ? (
                      k.permissions.map((p: string) => (
                        <span key={p} className="text-[8px] font-mono bg-white/5 border border-white/5 px-1.5 py-0.5 rounded text-gray-400 capitalize">
                          {p.replace("_", " ")}
                        </span>
                      ))
                    ) : (
                      <span className="text-[8px] font-mono text-gray-600 italic">No custom permissions delegated.</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-brand-border/40 font-mono">
                  <span className="text-[8px] text-gray-500">Created: {new Date(k.createdAt).toLocaleDateString()}</span>
                  {deletingKeyId === k.id ? (
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setDeletingKeyId(null)} type="button" className="text-[9px] text-gray-400 hover:text-white px-2 py-1 rounded bg-white/5 transition-all cursor-pointer">Cancel</button>
                      <button onClick={() => handleDeleteKey(k.id)} type="button" className="text-[9px] text-white hover:text-red-100 px-2 py-1 rounded bg-red-600 transition-all cursor-pointer">Confirm</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeletingKeyId(k.id)}
                      type="button"
                      className="p-1.5 bg-red-950/40 border border-red-900/40 text-red-400 hover:text-red-300 rounded hover:bg-red-900/20 cursor-pointer transition-all"
                      title="Revoke API Key"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {apiKeys.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center py-12 text-center">
                <Key className="w-6 h-6 text-gray-600 mb-2" />
                <p className="text-[10px] text-gray-500 font-mono">No active cluster API credentials generated yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

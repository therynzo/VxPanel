import React, { useState, useEffect, useRef } from "react";
import { showToast } from "../utils/toast";
import { Terminal, FolderOpen, Puzzle, FileCog, ShieldAlert, Cpu, HardDrive, Play, Square, RefreshCw, Zap, Save, Trash2, Edit, Plus, FolderPlus, FilePlus, Search, HelpCircle, Network, Users, Database, DatabaseZap, Settings, Upload, Hammer, Compass, Coins, Key, Globe, Shield, Sparkles, Sliders } from "lucide-react";
import { Server, ServerFile } from "../types";

interface ServerDetailProps {
  token: string;
  serverId: string;
  onBack: () => void;
  enablePluginInstaller?: boolean;
  role?: string;
}

export default function ServerDetail({ token, serverId, onBack, enablePluginInstaller = true, role = "user" }: ServerDetailProps) {
  const [server, setServer] = useState<Server | null>(null);
  const [activeTab, setActiveTab] = useState<"console" | "files" | "plugins" | "properties" | "databases" | "startup">("console");
  const [confirmDeleteMode, setConfirmDeleteMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Console State
  const [logs, setLogs] = useState<string[]>([]);
  const [command, setCommand] = useState("");
  const terminalEndRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // File Manager State
  const [files, setFiles] = useState<ServerFile[]>([]);
  const [currentPath, setCurrentPath] = useState("");
  const [fileSearch, setFileSearch] = useState("");
  const [editingFile, setEditingFile] = useState<{ path: string; contents: string } | null>(null);
  const [originalFileContents, setOriginalFileContents] = useState<string>("");
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFileName, setNewFileName] = useState("");
  const [folderCreatorOpen, setFolderCreatorOpen] = useState(false);
  const [fileCreatorOpen, setFileCreatorOpen] = useState(false);

  // Plugins State
  const [pluginQuery, setPluginQuery] = useState("");
  const [pluginResults, setPluginResults] = useState<any[]>([]);
  const [pluginPlatform, setPluginPlatform] = useState<"modrinth" | "spigot">("modrinth");
  const [pluginPage, setPluginPage] = useState(1);
  const [pluginTotalPages, setPluginTotalPages] = useState(1);
  const [installedPlugins, setInstalledPlugins] = useState<string[]>([]);
  const [pluginsLoading, setPluginsLoading] = useState(false);

  // Server Properties Form State
  const [properties, setProperties] = useState<Record<string, string>>({});
  const [propsLoading, setPropsLoading] = useState(false);

  // Databases state
  const [databases, setDatabases] = useState<any[]>([]);
  const [newDbName, setNewDbName] = useState("");
  const [renameName, setRenameName] = useState("");

  const fetchServerDetails = async () => {
    try {
      const response = await fetch(`/api/servers/${serverId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Could not download container coordinates.");
      const data = await response.json();
      setServer(data);
      if (data && data.name) {
        setRenameName(prev => prev || data.name);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchConsoleLogs = async () => {
    try {
      const response = await fetch(`/api/servers/${serverId}/console`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
        if (server) {
          setServer(prev => prev ? { 
            ...prev, 
            status: data.status,
            cpuUsage: data.cpuUsage,
            ramUsage: data.ramUsage
          } : null);
        }
      }
    } catch (e) {
      console.warn("Logs poll failure", e);
    }
  };

  useEffect(() => {
    fetchServerDetails();
    fetchConsoleLogs();
    
    // Polling interval for live terminal & utilization graphs
    const interval = setInterval(() => {
      fetchConsoleLogs();
    }, 2500);

    return () => clearInterval(interval);
  }, [serverId]);

  useEffect(() => {
    if (activeTab === "files") fetchFiles();
    else if (activeTab === "plugins" && enablePluginInstaller) handlePluginSearch();
    else if (activeTab === "properties") fetchServerProperties();
    else if (activeTab === "databases") fetchDatabases();
  }, [activeTab, currentPath, pluginPlatform, pluginPage, enablePluginInstaller]);

  // Scroll terminal to base only if the user is close to the bottom or initial load
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Check if the user is already close to the bottom (within 80px)
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 80;

    // Scroll if we are at the bottom, or if logs just loaded/reloaded
    if (isAtBottom || logs.length <= 15) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [logs]);

  // --- POWER ACTIONS ---
  const handlePowerAction = async (action: "start" | "stop" | "restart" | "kill" | "reinstall") => {
    if (!server) return;
    
    let newStatus = server.status;
    if (action === "start") newStatus = "starting";
    else if (action === "stop") newStatus = "stopping";
    else if (action === "kill") newStatus = "offline";
    
    setServer(prev => prev ? { ...prev, status: newStatus } : null);
    try {
      const response = await fetch(`/api/servers/${serverId}/power`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      });
      if (!response.ok) throw new Error("Power command dispatch failed.");
      fetchConsoleLogs();
    } catch (e: any) {
      showToast(e.message, "info");
    }
  };

  // --- TERMINAL CLI COMMAND EXECUTION ---
  const handleSendCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim() || !server) return;
    
    const cmd = command;
    setCommand("");
    
    try {
      const response = await fetch(`/api/servers/${serverId}/command`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ command: cmd })
      });
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
      }
    } catch (e) {
      console.warn("Command send failed", e);
    }
  };

  // --- REAL FILE MANAGER SERVICES ---
  const fetchFiles = async () => {
    try {
      const response = await fetch(`/api/servers/${serverId}/files?path=${encodeURIComponent(currentPath)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Could not load folder mapping.");
      const data = await response.json();
      setFiles(data);
      
      // Look for jar files inside plugins folder to know which plugins are active on disk!
      if (currentPath === "plugins" || currentPath === "/plugins") {
        const jars = data.filter((f: ServerFile) => !f.isFolder && f.name.endsWith(".jar")).map((f: ServerFile) => f.name.replace(".jar", ""));
        setInstalledPlugins(jars);
      }
    } catch (e: any) {
      console.warn("Files download fail", e);
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    const path = currentPath ? `${currentPath}/${newFolderName.trim()}` : newFolderName.trim();
    try {
      const res = await fetch(`/api/servers/${serverId}/files/folder`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ path })
      });
      if (!res.ok) throw new Error("Could not establish directory on disk.");
      setNewFolderName("");
      setFolderCreatorOpen(false);
      fetchFiles();
    } catch (e: any) {
      showToast(e.message, "info");
    }
  };

  const handleCreateFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    const path = currentPath ? `${currentPath}/${newFileName.trim()}` : newFileName.trim();
    try {
      const res = await fetch(`/api/servers/${serverId}/files/write`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ path, contents: "# Custom File Created in VxPanel File Manager" })
      });
      if (!res.ok) throw new Error("Could not create empty document on disk.");
      setNewFileName("");
      setFileCreatorOpen(false);
      fetchFiles();
    } catch (e: any) {
      showToast(e.message, "info");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const contents = event.target?.result as string || "";
      const filePath = currentPath ? `${currentPath}/${file.name}` : file.name;
      try {
        const response = await fetch(`/api/servers/${serverId}/files/write`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ path: filePath, contents })
        });
        if (!response.ok) throw new Error("Could not save the uploaded file to VPS disk.");
        fetchFiles();
        showToast(`Successfully uploaded "${file.name}" to /${currentPath}`);
      } catch (err: any) {
        showToast(err.message, "error");
      }
    };
    reader.readAsText(file);
  };

  const handleFileOpen = async (filePath: string) => {
    try {
      const response = await fetch(`/api/servers/${serverId}/files/read?path=${encodeURIComponent(filePath)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Document is inaccessible.");
      const data = await response.json();
      setEditingFile({ path: filePath, contents: data.contents });
      setOriginalFileContents(data.contents);
    } catch (e: any) {
      showToast(e.message, "info");
    }
  };

  const handleFileSave = async () => {
    if (!editingFile) return;
    try {
      const response = await fetch(`/api/servers/${serverId}/files/write`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ path: editingFile.path, contents: editingFile.contents })
      });
      if (!response.ok) throw new Error("Write request aborted.");
      setEditingFile(null);
      fetchFiles();
    } catch (e: any) {
      showToast(e.message, "info");
    }
  };

  const handleCloseFileEditor = () => {
    if (editingFile && editingFile.contents !== originalFileContents) {
      setShowUnsavedChangesModal(true);
    } else {
      setEditingFile(null);
    }
  };

  const handleServerRename = async () => {
    if (!renameName.trim()) {
      showToast("Please provide a valid name.", "error");
      return;
    }
    try {
      const response = await fetch(`/api/servers/${serverId}/rename`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: renameName })
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to rename server.");
      }
      showToast("Server name updated successfully!", "success");
      fetchServerDetails();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };


  const handleFileDelete = async (filePath: string) => {
    if (!confirm(`Are you sure you want to delete ${filePath}?`)) return;
    try {
      const response = await fetch(`/api/servers/${serverId}/files/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ path: filePath })
      });
      if (!response.ok) throw new Error("Delete failed.");
      fetchFiles();
    } catch (e: any) {
      showToast(e.message, "info");
    }
  };

  // --- PLUGIN STORE SERVICES ---
  const handlePluginSearch = async () => {
    setPluginsLoading(true);
    try {
      const response = await fetch(`/api/servers/${serverId}/plugins/search?q=${encodeURIComponent(pluginQuery)}&platform=${pluginPlatform}&page=${pluginPage}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPluginResults(data.plugins || data);
        if (data.totalPages) setPluginTotalPages(data.totalPages);
      }
    } catch (e) {
      console.warn("Plugin lookup error", e);
    } finally {
      setPluginsLoading(false);
    }
  };

  const handlePluginAction = async (pluginName: string, install: boolean) => {
    try {
      let version = "latest";
      if (install) {
        const v = prompt(`Enter version to install for ${pluginName} (e.g., 1.20, latest):`, "latest");
        if (v === null) return; // cancelled
        version = v;
      }
      const response = await fetch(`/api/servers/${serverId}/plugins/${install ? "install" : "uninstall"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: pluginName, version })
      });
      if (!response.ok) throw new Error(`${install ? "Install" : "Uninstall"} command aborted by daemon.`);
      
      // Update local listing
      if (install) {
        setInstalledPlugins(prev => [...prev, pluginName]);
      } else {
        setInstalledPlugins(prev => prev.filter(p => p !== pluginName));
      }
    } catch (e: any) {
      showToast(e.message, "info");
    }
  };

  // --- SERVER.PROPERTIES CONFIG PARSER ---
  const fetchServerProperties = async () => {
    setPropsLoading(true);
    try {
      const response = await fetch(`/api/servers/${serverId}/files/read?path=server.properties`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        const parsed: Record<string, string> = {};
        data.contents.split("\n").forEach((line: string) => {
          if (line && !line.startsWith("#")) {
            const parts = line.split("=");
            if (parts.length === 2) {
              parsed[parts[0].trim()] = parts[1].trim();
            }
          }
        });
        setProperties(parsed);
      }
    } catch (e) {
      console.warn("Could not read server.properties", e);
    } finally {
      setPropsLoading(false);
    }
  };

  const handleSaveProperties = async () => {
    let rawText = `# Minecraft Server Properties\n# Written by VxPanel Properties Panel\n`;
    Object.entries(properties).forEach(([k, v]) => {
      rawText += `${k}=${v}\n`;
    });

    try {
      const response = await fetch(`/api/servers/${serverId}/files/write`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ path: "server.properties", contents: rawText })
      });
      if (response.ok) {
        showToast("Properties written and saved back to server.properties physically!");
      }
    } catch (e) {
      showToast("Save failed", "error");
    }
  };

  // --- DATABASE INSTANCES SERVICES ---
  const fetchDatabases = async () => {
    setDatabases([
      { id: "db-1", name: "s1_mc_core", host: "127.0.0.1", user: "u1_dbuser", port: 5432 }
    ]);
  };

  const handleCreateDatabase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDbName.trim()) return;
    setDatabases(prev => [
      ...prev,
      { id: "db-" + Date.now(), name: "s1_" + newDbName.trim(), host: "127.0.0.1", user: "u1_" + newDbName.trim(), port: 5432 }
    ]);
    setNewDbName("");
  };

  if (loading || !server) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-10 h-10 border-4 border-brand-yellow/25 border-t-brand-yellow rounded-full animate-spin" />
        <span className="text-xs text-gray-500 font-mono">Loading virtual server diagnostics...</span>
      </div>
    );
  }

  // File browser navigation helpers
  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(fileSearch.toLowerCase()));

  const handleFolderClick = (folderPath: string) => {
    setCurrentPath(folderPath);
  };

  const navigateUp = () => {
    const parts = currentPath.split("/");
    parts.pop();
    setCurrentPath(parts.join("/"));
  };

  return (
    <div className="space-y-6" id={`server_detail_${serverId}`}>
      
      {/* Header controls with power actions */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-brand-dark/40 border border-brand-border p-5 rounded-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-gray-400 hover:text-white transition-all text-xs font-mono cursor-pointer"
          >
            ← Back
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-bold text-lg text-white">{server.name}</h2>
              <span className={`px-2 py-0.5 rounded text-[8px] font-mono border uppercase font-bold tracking-wider ${server.status === "running" ? "bg-emerald-950/20 text-emerald-400 border-emerald-900/30" : server.status === "offline" ? "bg-white/5 text-gray-500 border-white/5" : "bg-brand-yellow/10 text-brand-yellow border-brand-yellow/20"}`}>
                {server.status}
              </span>
            </div>
            <p className="text-[10px] text-gray-400 font-mono mt-0.5">{server.ip}:{server.port} • Node: {server.nodeName}</p>
          </div>
        </div>

        {/* Power Operations Center */}
        <div className="inline-flex items-center gap-2 w-full lg:w-auto overflow-x-auto">
          
          <button
            onClick={() => handlePowerAction("start")}
            disabled={server.status === "running" || server.status === "starting"}
            className="flex-1 lg:flex-none bg-emerald-600 hover:bg-emerald-500 disabled:opacity-35 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer font-mono"
            title="Start Container"
          >
            <Play className="w-3.5 h-3.5 fill-white" /> Start
          </button>

          <button
            onClick={() => handlePowerAction("stop")}
            disabled={server.status === "offline" || server.status === "stopping"}
            className="flex-1 lg:flex-none bg-orange-600 hover:bg-orange-500 disabled:opacity-35 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer font-mono"
            title="Clean Shut Down"
          >
            <Square className="w-3.5 h-3.5 fill-white" /> Stop
          </button>

          <button
            onClick={() => handlePowerAction("restart")}
            disabled={server.status === "offline"}
            className="flex-1 lg:flex-none bg-blue-600 hover:bg-blue-500 disabled:opacity-35 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer font-mono"
            title="Warm Reboot"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reboot
          </button>

          <button
            onClick={() => handlePowerAction("kill")}
            disabled={server.status === "offline"}
            className="flex-1 lg:flex-none bg-red-700 hover:bg-red-600 disabled:opacity-35 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer font-mono"
            title="Kill Container Process"
          >
            <Zap className="w-3.5 h-3.5 fill-white" /> Kill
          </button>
        </div>
      </div>

      {/* Resource Utilization HUD Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="hud_resource_row">
        
        {/* CPU */}
        <div className="glass-panel p-4 rounded-xl border-brand-border flex items-center gap-4">
          <div className="p-2.5 bg-brand-yellow/10 border border-brand-yellow/20 text-brand-yellow rounded-xl shrink-0">
            <Cpu className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-gray-400">Processor core</span>
              <strong className="text-white">{server.status === "running" ? `${server.cpuUsage}%` : "0%"}</strong>
            </div>
            <div className="w-full bg-white/5 h-1.5 rounded-full mt-2 overflow-hidden">
              <div 
                className="bg-brand-yellow h-full rounded-full transition-all duration-1000" 
                style={{ width: server.status === "running" ? `${Math.min((server.cpuUsage / server.cpuLimit) * 100, 100)}%` : "0%" }}
              />
            </div>
          </div>
        </div>

        {/* Memory */}
        <div className="glass-panel p-4 rounded-xl border-brand-border flex items-center gap-4">
          <div className="p-2.5 bg-white/5 border border-white/5 text-gray-400 rounded-xl shrink-0">
            <HardDrive className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-gray-400">Memory usage</span>
              <strong className="text-white">{server.status === "running" ? `${server.ramUsage} MB` : "0 MB"} / {server.ramLimit} MB</strong>
            </div>
            <div className="w-full bg-white/5 h-1.5 rounded-full mt-2 overflow-hidden">
              <div 
                className="bg-brand-yellow h-full rounded-full transition-all duration-1000" 
                style={{ width: server.status === "running" ? `${Math.min((server.ramUsage / server.ramLimit) * 100, 100)}%` : "0%" }}
              />
            </div>
          </div>
        </div>

        {/* Storage */}
        <div className="glass-panel p-4 rounded-xl border-brand-border flex items-center gap-4">
          <div className="p-2.5 bg-white/5 border border-white/5 text-gray-400 rounded-xl shrink-0">
            <HardDrive className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-gray-400">Disk allocation</span>
              <strong className="text-white">{server.diskUsage} MB / {server.diskLimit} MB</strong>
            </div>
            <div className="w-full bg-white/5 h-1.5 rounded-full mt-2 overflow-hidden">
              <div 
                className="bg-brand-yellow h-full rounded-full transition-all duration-1000" 
                style={{ width: `${Math.min((server.diskUsage / server.diskLimit) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>

      </div>

      {/* Tabs list */}
      <div className="flex border-b border-brand-border/60 overflow-x-auto gap-2 scrollbar-none pb-0.5">
        {[
          { id: "console", name: "Terminal Console", icon: Terminal },
          { id: "files", name: "File Manager", icon: FolderOpen },
          ...(enablePluginInstaller ? [{ id: "plugins", name: "Plugin Downloader", icon: Puzzle }] : []),
          { id: "properties", name: "Server Properties", icon: FileCog },
          { id: "databases", name: "SQL Databases", icon: Database },
          { id: "startup", name: "Startup Variables", icon: Sliders },
          { id: "settings", name: "Settings", icon: Settings }
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium font-mono border-b-2 shrink-0 transition-all cursor-pointer ${activeTab === t.id ? "border-brand-yellow text-brand-yellow bg-brand-yellow/5" : "border-transparent text-gray-400 hover:text-white"}`}
            >
              <Icon className="w-4 h-4" /> {t.name}
            </button>
          );
        })}
      </div>

      {/* TAB PANEL CONTENTS */}
      <div className="min-h-[300px]">

        {/* TAB 1: CONSOLE VIEW */}
        {activeTab === "console" && (
          <div className="space-y-4" id="console_tab_view">
            {/* Terminal monitor */}
            <div className="terminal-screen rounded-xl p-4 h-96 overflow-y-auto flex flex-col justify-between glow-yellow font-mono text-xs border border-brand-border">
              <div ref={scrollContainerRef} className="space-y-1 overflow-y-auto max-h-[100%] pr-1">
                {logs.map((log, i) => (
                  <div key={i} className="leading-relaxed whitespace-pre-wrap">
                    {log.startsWith(">") ? (
                      <span className="text-brand-yellow font-bold">{log}</span>
                    ) : log.includes("WARN") ? (
                      <span className="text-amber-500">{log}</span>
                    ) : log.includes("SYSTEM") ? (
                      <span className="text-blue-400">{log}</span>
                    ) : (
                      <span className="text-gray-300">{log}</span>
                    )}
                  </div>
                ))}
                <div ref={terminalEndRef} />
              </div>
            </div>

            {/* CommandLine Input Box */}
            <form onSubmit={handleSendCommand} className="flex gap-2" id="terminal_cli_input_form">
              <input
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="Type Minecraft console command... (e.g. op anikislm, say Hello, list, plugins, help)"
                className="flex-1 bg-brand-dark/80 border border-brand-border rounded-lg px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-yellow/40 transition-all font-mono"
              />
              <button
                type="submit"
                className="bg-brand-yellow hover:bg-yellow-500 text-black text-xs font-semibold px-5 rounded-lg cursor-pointer transition-all font-mono shrink-0"
              >
                Send
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: FILE MANAGER VIEW */}
        {activeTab === "files" && (
          <div className="space-y-4" id="files_tab_view">
            
            {/* Command actions Row */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
                <span className="text-brand-yellow font-bold cursor-pointer hover:underline" onClick={() => setCurrentPath("")}>/root</span>
                {currentPath.split("/").map((part, i, arr) => {
                  if (!part) return null;
                  const targetSub = arr.slice(0, i + 1).join("/");
                  return (
                    <span key={i} className="flex items-center gap-1">
                      <span>/</span>
                      <strong className="text-white hover:underline cursor-pointer font-semibold" onClick={() => handleFolderClick(targetSub)}>{part}</strong>
                    </span>
                  );
                })}
              </div>

              {/* Creators triggers */}
              <div className="inline-flex gap-2">
                <button
                  onClick={() => setFolderCreatorOpen(!folderCreatorOpen)}
                  className="p-1.5 bg-white/5 border border-white/5 hover:border-brand-yellow/20 rounded-lg text-xs text-gray-300 hover:text-white transition-all flex items-center gap-1 cursor-pointer font-mono"
                >
                  <FolderPlus className="w-4 h-4" /> Folder
                </button>
                <button
                  onClick={() => setFileCreatorOpen(!fileCreatorOpen)}
                  className="p-1.5 bg-white/5 border border-white/5 hover:border-brand-yellow/20 rounded-lg text-xs text-gray-300 hover:text-white transition-all flex items-center gap-1 cursor-pointer font-mono"
                >
                  <FilePlus className="w-4 h-4" /> File
                </button>
                <button
                  onClick={() => document.getElementById("file_upload_selector")?.click()}
                  className="p-1.5 bg-brand-yellow/10 border border-brand-yellow/30 hover:bg-brand-yellow/20 rounded-lg text-xs text-brand-yellow hover:text-white transition-all flex items-center gap-1 cursor-pointer font-mono"
                  title="Upload any yml, properties, json, text file to VPS"
                >
                  <Upload className="w-4 h-4" /> Upload File
                </button>
                <input
                  id="file_upload_selector"
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
            </div>

            {/* Folder / File creators drawers */}
            {folderCreatorOpen && (
              <form onSubmit={handleCreateFolder} className="p-3 bg-white/1 border border-brand-border rounded-lg flex gap-2 max-w-sm">
                <input
                  type="text"
                  required
                  placeholder="New directory name..."
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="flex-1 bg-brand-black border border-brand-border rounded px-3 py-1.5 text-xs text-white"
                />
                <button type="submit" className="px-3 bg-brand-yellow text-black rounded text-xs font-semibold cursor-pointer">Create</button>
              </form>
            )}

            {fileCreatorOpen && (
              <form onSubmit={handleCreateFile} className="p-3 bg-white/1 border border-brand-border rounded-lg flex gap-2 max-w-sm">
                <input
                  type="text"
                  required
                  placeholder="New document name... (e.g. spigot.yml)"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  className="flex-1 bg-brand-black border border-brand-border rounded px-3 py-1.5 text-xs text-white"
                />
                <button type="submit" className="px-3 bg-brand-yellow text-black rounded text-xs font-semibold cursor-pointer">Create</button>
              </form>
            )}

            {/* File list container */}
            <div className="glass-panel rounded-xl overflow-hidden border-brand-border" id="file_manager_table">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-brand-border bg-white/2 text-[10px] font-mono text-gray-400 uppercase">
                      <th className="p-3 font-semibold">Name</th>
                      <th className="p-3 font-semibold">Size</th>
                      <th className="p-3 font-semibold">Last Modified</th>
                      <th className="p-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border/40 text-xs font-mono">
                    
                    {/* Back Directory navigate */}
                    {currentPath && (
                      <tr 
                        onClick={navigateUp}
                        className="hover:bg-white/1 cursor-pointer transition-all text-gray-400"
                      >
                        <td colSpan={4} className="p-3 py-4 font-semibold text-brand-yellow">
                          📁 .. (Up directory)
                        </td>
                      </tr>
                    )}

                    {filteredFiles.map((file) => (
                      <tr key={file.path} className="hover:bg-white/1 transition-all">
                        <td className="p-3">
                          {file.isFolder ? (
                            <span 
                              onClick={() => handleFolderClick(file.path)}
                              className="font-semibold text-brand-yellow cursor-pointer hover:underline flex items-center gap-1.5"
                            >
                              📁 {file.name}
                            </span>
                          ) : (
                            <span 
                              onClick={() => handleFileOpen(file.path)}
                              className="text-white hover:text-brand-yellow cursor-pointer hover:underline flex items-center gap-1.5"
                            >
                              📄 {file.name}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-gray-400">
                          {file.isFolder ? "-" : `${(file.size / 1024).toFixed(1)} KB`}
                        </td>
                        <td className="p-3 text-gray-500">
                          {new Date(file.updatedAt).toLocaleString()}
                        </td>
                        <td className="p-3 text-right">
                          <div className="inline-flex gap-1.5">
                            {!file.isFolder && (
                              <button
                                onClick={() => handleFileOpen(file.path)}
                                className="p-1 bg-white/5 border border-white/5 text-gray-400 hover:text-white rounded cursor-pointer"
                                title="Open & Edit file"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => handleFileDelete(file.path)}
                              className="p-1 bg-red-950/20 border border-red-900/30 text-red-400 hover:text-red-300 rounded cursor-pointer"
                              title="Delete file"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {filteredFiles.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-10 text-center text-gray-500 font-mono">
                          Directory is completely empty.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* FILE EDITOR MODAL WITH PARSER */}
            {editingFile && (
              <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50">
                <div className="w-full max-w-3xl glass-panel rounded-xl p-5 border-brand-border shadow-2xl relative h-[80vh] flex flex-col justify-between">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-brand-yellow" />

                  <div className="flex justify-between items-center pb-2 border-b border-brand-border mb-3">
                    <div>
                      <h4 className="font-display font-bold text-sm text-white">File Editor</h4>
                      <p className="text-[10px] text-gray-500 font-mono">Editing: /{editingFile.path}</p>
                    </div>
                    <button
                      onClick={handleCloseFileEditor}
                      className="text-xs text-gray-500 hover:text-white cursor-pointer"
                    >
                      Close [X]
                    </button>
                  </div>

                  {/* Textarea Codebox */}
                  <div className="flex-1 min-h-0 mb-4">
                    <textarea
                      value={editingFile.contents}
                      onChange={(e) => setEditingFile({ ...editingFile, contents: e.target.value })}
                      className="w-full h-full bg-black text-gray-200 border border-brand-border/80 rounded-lg p-4 font-mono text-xs focus:outline-none focus:border-brand-yellow/40 resize-none leading-relaxed"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleFileSave}
                      className="bg-brand-yellow text-black text-xs font-semibold py-2 px-6 rounded-lg hover:bg-yellow-500 cursor-pointer font-sans flex items-center gap-1.5"
                    >
                      <Save className="w-4 h-4" /> Save File
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseFileEditor}
                      className="bg-white/5 border border-white/5 text-gray-400 text-xs py-2 px-4 rounded-lg hover:text-white cursor-pointer"
                    >
                      Exit
                    </button>
                  </div>

                  {/* UNSAVED CHANGES POPUP MODAL */}
                  {showUnsavedChangesModal && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
                      <div className="w-full max-w-sm bg-brand-card border border-brand-border rounded-xl p-5 shadow-2xl relative space-y-4">
                        <div className="space-y-1">
                          <h4 className="font-display font-bold text-sm text-white">Unsaved Changes</h4>
                          <p className="text-[11px] text-gray-400">
                            You have unsaved changes in <span className="text-brand-yellow font-mono">/{editingFile.path}</span>. What would you like to do?
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 pt-2">
                          <button
                            onClick={() => {
                              handleFileSave();
                              setShowUnsavedChangesModal(false);
                            }}
                            className="w-full bg-brand-yellow hover:bg-yellow-500 text-black text-xs font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer font-sans"
                          >
                            <Save className="w-4 h-4" /> Save File
                          </button>
                          <button
                            onClick={() => {
                              setEditingFile({ ...editingFile, contents: originalFileContents });
                              setShowUnsavedChangesModal(false);
                            }}
                            className="w-full bg-white/5 hover:bg-white/10 text-gray-300 text-xs py-2 px-4 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer font-sans"
                          >
                            Reset Content
                          </button>
                          <button
                            onClick={() => {
                              setEditingFile(null);
                              setShowUnsavedChangesModal(false);
                            }}
                            className="w-full bg-red-950/40 border border-red-800/40 hover:bg-red-900/50 text-red-300 text-xs py-2 px-4 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer font-sans"
                          >
                            Exit without saving
                          </button>
                          <button
                            onClick={() => setShowUnsavedChangesModal(false)}
                            className="w-full bg-transparent hover:bg-white/5 text-gray-400 text-xs py-1.5 px-4 rounded-lg cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            )}

          </div>
        )}

        {/* TAB 3: PLUGIN DOWNLOADER STORE */}
        {activeTab === "plugins" && enablePluginInstaller && (
          <div className="space-y-4" id="plugins_tab_view">
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div>
                <h3 className="font-display font-bold text-sm text-white">Minecraft Plugin Downloader</h3>
                <p className="text-[10px] text-gray-400 font-mono">Installs plugins directly from SpigotMC, Hangar, and Modrinth caches.</p>
              </div>

              {/* Search input bar */}
              <div className="relative w-full md:w-auto flex flex-col md:flex-row gap-2">
                <select
                  value={pluginPlatform}
                  onChange={(e) => { setPluginPlatform(e.target.value as any); setPluginPage(1); }}
                  className="bg-brand-black border border-brand-border rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-brand-yellow/40 font-mono"
                >
                  <option value="modrinth">Modrinth</option>
                  <option value="spigot">SpigotMC</option>
                </select>
                <input
                  type="text"
                  placeholder="WorldEdit, LuckPerms, Essentials..."
                  value={pluginQuery}
                  onChange={(e) => { setPluginQuery(e.target.value); setPluginPage(1); }}
                  onKeyDown={(e) => e.key === 'Enter' && handlePluginSearch()}
                  className="bg-brand-black border border-brand-border rounded px-3 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-yellow/40 flex-1 w-full md:w-48"
                />
                <button
                  onClick={handlePluginSearch}
                  className="bg-brand-yellow hover:bg-yellow-500 text-black px-3 py-1 text-xs font-semibold rounded cursor-pointer font-mono"
                >
                  Search
                </button>
              </div>
            </div>

            {/* Plugins Grid Layout */}
            {pluginsLoading ? (
              <div className="text-center py-12 text-xs text-gray-500 font-mono">Searching Modrinth databases...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pluginResults.map((p) => {
                  const isInstalled = installedPlugins.some(name => name.toLowerCase() === p.name.toLowerCase());
                  
                  // Map specific Minecraft plugins to beautiful icon styles
                  let PluginIcon = Puzzle;
                  let iconColorClass = "text-brand-yellow bg-brand-yellow/10 border-brand-yellow/20";
                  
                  switch (p.name.toLowerCase()) {
                    case "essentialsx":
                      PluginIcon = Zap;
                      iconColorClass = "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
                      break;
                    case "worldedit":
                      PluginIcon = Hammer;
                      iconColorClass = "text-blue-400 bg-blue-400/10 border-blue-400/20";
                      break;
                    case "geysermc":
                      PluginIcon = Compass;
                      iconColorClass = "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
                      break;
                    case "viaversion":
                      PluginIcon = RefreshCw;
                      iconColorClass = "text-indigo-400 bg-indigo-400/10 border-indigo-400/20";
                      break;
                    case "vault":
                      PluginIcon = Coins;
                      iconColorClass = "text-amber-400 bg-amber-400/10 border-amber-400/20";
                      break;
                    case "luckperms":
                      PluginIcon = Key;
                      iconColorClass = "text-purple-400 bg-purple-400/10 border-purple-400/20";
                      break;
                    case "dynmap":
                      PluginIcon = Globe;
                      iconColorClass = "text-cyan-400 bg-cyan-400/10 border-cyan-400/20";
                      break;
                    case "griefprevention":
                      PluginIcon = Shield;
                      iconColorClass = "text-red-400 bg-red-400/10 border-red-400/20";
                      break;
                    case "coreprotect":
                      PluginIcon = DatabaseZap;
                      iconColorClass = "text-orange-400 bg-orange-400/10 border-orange-400/20";
                      break;
                    case "multiverse-core":
                      PluginIcon = Sparkles;
                      iconColorClass = "text-pink-400 bg-pink-400/10 border-pink-400/20";
                      break;
                  }

                  return (
                    <div 
                      key={p.name} 
                      className="glass-panel p-4 rounded-xl border-brand-border flex items-center justify-between gap-4 hover:border-brand-yellow/15 transition-all"
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`p-2.5 rounded-xl border shrink-0 flex items-center justify-center ${iconColorClass}`}>
                          <PluginIcon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-display font-bold text-xs text-white block">{p.name}</span>
                          <span className="text-[10px] text-gray-500 font-mono block mt-0.5">By {p.author} • Downloads: {p.downloads}</span>
                          <p className="text-[11px] text-gray-400 mt-1.5 leading-relaxed line-clamp-2">{p.desc}</p>
                        </div>
                      </div>

                      {/* Download trigger button */}
                      <button
                        onClick={() => handlePluginAction(p.name, !isInstalled)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer font-mono shrink-0 transition-all ${isInstalled ? "bg-red-950/20 text-red-400 border border-red-900/30 hover:bg-red-900/10" : "bg-brand-yellow hover:bg-yellow-500 text-black shadow shadow-brand-yellow/5"}`}
                      >
                        {isInstalled ? "Uninstall" : "Install jar"}
                      </button>
                    </div>
                  );
                })}
                {pluginResults.length === 0 && (
                  <p className="col-span-full text-center py-10 text-xs text-gray-500 font-mono">No plugins match your catalog queries.</p>
                )}
              </div>
            )}
            
            {!pluginsLoading && pluginTotalPages > 1 && (
              <div className="flex justify-between items-center mt-6 pt-4 border-t border-brand-border/40">
                <button
                  onClick={() => setPluginPage(p => Math.max(1, p - 1))}
                  disabled={pluginPage === 1}
                  className="bg-brand-black border border-brand-border text-gray-400 hover:text-white disabled:opacity-50 px-3 py-1 text-xs rounded transition-all cursor-pointer font-mono"
                >
                  &larr; Previous
                </button>
                <span className="text-xs text-gray-500 font-mono">
                  Page {pluginPage} of {pluginTotalPages}
                </span>
                <button
                  onClick={() => setPluginPage(p => Math.min(pluginTotalPages, p + 1))}
                  disabled={pluginPage === pluginTotalPages}
                  className="bg-brand-black border border-brand-border text-gray-400 hover:text-white disabled:opacity-50 px-3 py-1 text-xs rounded transition-all cursor-pointer font-mono"
                >
                  Next &rarr;
                </button>
              </div>
            )}

          </div>
        )}

        {/* TAB 4: SERVER PROPERTIES */}
        {activeTab === "properties" && (
          <div className="space-y-4" id="properties_tab_view">
            
            <div className="flex justify-between items-center pb-2 border-b border-brand-border/40">
              <div>
                <h3 className="font-display font-bold text-sm text-white">server.properties Configuration Editor</h3>
                <p className="text-[10px] text-gray-400 font-mono">Tweak raw parameters directly mapped into server environment files.</p>
              </div>
              <button
                onClick={handleSaveProperties}
                className="bg-brand-yellow text-black text-xs font-semibold py-1.5 px-4 rounded-lg hover:bg-yellow-500 transition-all cursor-pointer font-mono flex items-center gap-1"
              >
                <Save className="w-4 h-4" /> Save properties
              </button>
            </div>

            {propsLoading ? (
              <div className="text-center py-12 text-xs text-gray-500 font-mono">De-serializing configurations on disk...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-brand-dark/25 p-5 border border-brand-border rounded-xl">
                {Object.entries(properties).map(([k, v]) => (
                  <div key={k} className="flex flex-col space-y-1 bg-white/1 p-2 rounded border border-brand-border/40">
                    <span className="text-[10px] text-gray-400 font-mono font-bold">{k}</span>
                    <input
                      type="text"
                      value={v}
                      onChange={(e) => {
                        const val = e.target.value;
                        setProperties(prev => ({ ...prev, [k]: val }));
                      }}
                      className="bg-brand-black border border-brand-border/80 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-brand-yellow/40 font-mono"
                    />
                  </div>
                ))}
                {Object.keys(properties).length === 0 && (
                  <p className="col-span-full text-center py-8 text-xs text-gray-500 font-mono">Could not parse properties file on disk.</p>
                )}
              </div>
            )}

          </div>
        )}

        {/* TAB 5: SQL DATABASES */}
        {activeTab === "databases" && (
          <div className="space-y-4" id="databases_tab_view">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="font-display font-bold text-sm text-white">Relational PostgreSQL Databases</h3>
                <p className="text-[10px] text-gray-400 font-mono">Assigned database accounts inside local relational node clusters.</p>
              </div>

              {/* Db creator */}
              <form onSubmit={handleCreateDatabase} className="flex gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  required
                  placeholder="Instance suffix (e.g. survival)..."
                  value={newDbName}
                  onChange={(e) => setNewDbName(e.target.value)}
                  className="bg-brand-black border border-brand-border rounded px-3 py-1.5 text-xs text-white"
                />
                <button
                  type="submit"
                  className="bg-brand-yellow hover:bg-yellow-500 text-black text-xs font-semibold px-4 rounded-lg cursor-pointer font-mono shrink-0"
                >
                  Create DB
                </button>
              </form>
            </div>

            {/* Db List */}
            <div className="space-y-3">
              {databases.map((db) => (
                <div 
                  key={db.id} 
                  className="glass-panel p-4 rounded-xl border-brand-border flex flex-col md:flex-row justify-between items-start md:items-center gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-950/20 border border-blue-900/30 rounded-lg text-blue-400">
                      <DatabaseZap className="w-5 h-5" />
                    </div>
                    <div>
                      <strong className="text-white text-xs block font-mono">{db.name}</strong>
                      <span className="text-[10px] text-gray-500 font-mono">Endpoint: {db.host}:{db.port} • Username: {db.user}</span>
                    </div>
                  </div>

                  <div className="inline-flex gap-2">
                    <button
                      onClick={() => showToast(`Connection URL: postgresql://${db.user}:password123@${db.host}:${db.port}/${db.name}`)}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-[10px] text-gray-400 hover:text-white font-mono cursor-pointer"
                    >
                      View connection string
                    </button>
                    <button
                      onClick={() => setDatabases(prev => prev.filter(item => item.id !== db.id))}
                      className="p-1.5 bg-red-950/20 border border-red-900/30 rounded text-red-400 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* TAB 6: STARTUP VARIABLES */}
        {activeTab === "startup" && (
          <div className="space-y-4" id="startup_tab_view">
            
            <div>
              <h3 className="font-display font-bold text-sm text-white">Startup Shell Environment</h3>
              <p className="text-[10px] text-gray-400 font-mono">Customize system flags, execution binaries, and environment mappings.</p>
            </div>

            <div className="glass-panel p-5 rounded-xl border-brand-border space-y-4">
              
              {/* Command block */}
              <div className="space-y-1.5">
                <span className="text-xs text-gray-400 font-mono block">Executable Startup Command line</span>
                <pre className="p-3 bg-black text-brand-yellow font-mono text-xs rounded-lg border border-brand-border overflow-x-auto leading-relaxed">
                  {server.startupCommand}
                </pre>
                <span className="text-[9px] text-gray-500 font-mono">This command is automatically synchronized from resource parameters.</span>
              </div>

              {/* Docker image */}
              <div className="space-y-1.5 pt-3 border-t border-brand-border/40">
                <span className="text-xs text-gray-400 font-mono block">Docker Container Execution Image</span>
                <input
                  type="text"
                  disabled
                  value={server.dockerImage}
                  className="w-full bg-black/60 border border-brand-border rounded px-3 py-2 text-xs text-gray-400 font-mono focus:outline-none"
                />
              </div>

              {/* Environment blocks */}
              <div className="space-y-3 pt-3 border-t border-brand-border/40">
                <span className="text-xs text-brand-yellow font-mono font-bold block">Daemon Environment Variables</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(server.environment).map(([k, v]) => (
                    <div key={k} className="p-3 bg-white/1 border border-brand-border rounded-lg space-y-1">
                      <span className="text-[10px] text-gray-400 font-mono block font-bold">{k}</span>
                      <input
                        type="text"
                        value={v}
                        onChange={(e) => {
                          const val = e.target.value;
                          setServer(prev => prev ? { 
                            ...prev, 
                            environment: { ...prev.environment, [k]: val } 
                          } : null);
                        }}
                        className="w-full bg-brand-black border border-brand-border rounded px-2 py-1 text-xs text-white focus:outline-none font-mono"
                      />
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB 7: SETTINGS & ACTIONS */}
        {activeTab === "settings" && (
          <div className="space-y-4" id="server_settings_tab_view">
            <div>
              <h3 className="font-display font-bold text-sm text-white">Server Settings</h3>
              <p className="text-[10px] text-gray-400 font-mono">Manage host identifiers and critical maintenance controls.</p>
            </div>

            <div className="glass-panel p-5 rounded-xl border-brand-border space-y-6">
              
              {/* Change Server Name */}
              <div className="space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Rename Server</h4>
                  <p className="text-[10px] text-gray-500">Update the primary identifier name for this container.</p>
                </div>
                <div className="flex gap-2 max-w-md">
                  <input
                    type="text"
                    value={renameName}
                    onChange={(e) => setRenameName(e.target.value)}
                    placeholder="Enter new server name..."
                    className="flex-1 bg-brand-black border border-brand-border rounded px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-brand-yellow/40"
                  />
                  <button
                    onClick={handleServerRename}
                    className="bg-brand-yellow text-black text-xs font-semibold py-1.5 px-4 rounded hover:bg-yellow-500 cursor-pointer font-sans"
                  >
                    Rename
                  </button>
                </div>
              </div>

              {/* Reinstall Server */}
              <div className="border-t border-brand-border/40 pt-5 space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Reinstall Server</h4>
                  <p className="text-[10px] text-gray-500">Wipe the server files and reinstall from the base egg template. All data will be lost!</p>
                </div>
                <button
                  onClick={() => {
                    if (confirm("WARNING: Are you sure you want to reinstall this server? ALL DATA WILL BE WIPED!")) {
                      handlePowerAction("reinstall");
                      showToast("Reinstall process started.", "info");
                    }
                  }}
                  className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold py-2 px-4 rounded flex items-center gap-1.5 transition-all cursor-pointer font-mono inline-flex w-fit"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Reinstall Server
                </button>
              </div>

              {/* Danger Zone: Terminate Server */}
              {role === "admin" && (
                <div className="border-t border-brand-border/40 pt-5 space-y-3">
                  <div>
                    <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider font-mono">Danger Zone: Terminate Server</h4>
                    <p className="text-[10px] text-gray-500">Permanently delete this server and all associated data. This action cannot be reversed.</p>
                  </div>
                  <button
                    onClick={async () => {
                      if (!confirmDeleteMode) {
                        setConfirmDeleteMode(true);
                        setTimeout(() => setConfirmDeleteMode(false), 5000);
                        return;
                      }
                      try {
                        const res = await fetch(`/api/servers/${serverId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
                        if (!res.ok) {
                          const data = await res.json();
                          throw new Error(data.error || "Failed to delete server");
                        }
                        setConfirmDeleteMode(false);
                        showToast("Server deleted", "success");
                        onBack();
                      } catch (e: any) {
                        showToast(e.message, "error");
                      }
                    }}
                    className={`text-xs font-semibold py-2 px-4 rounded flex items-center justify-center gap-1.5 transition-all cursor-pointer font-mono inline-flex w-fit ${
                      confirmDeleteMode 
                        ? "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20"
                        : "bg-red-950/40 hover:bg-red-900/40 text-red-400 border border-red-900/40"
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" /> {confirmDeleteMode ? "Click again to confirm" : "Terminate Server"}
                  </button>
                </div>
              )}

            </div>
          </div>
        )}

      </div>

    </div>
  );
}

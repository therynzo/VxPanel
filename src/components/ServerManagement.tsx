import React, { useState, useEffect } from "react";
import { showToast } from "../utils/toast";
import { motion, AnimatePresence } from "motion/react";
import { Server, Plus, Search, Layers, Cpu, HardDrive, CpuIcon, Check, Settings, ShieldAlert, ShieldCheck, HelpCircle, MoreVertical, Edit3, Trash2 } from "lucide-react";
import { Server as ServerType, Node, EggGroup, User } from "../types";

interface ServerManagementProps {
  token: string;
  role: string;
  onSelectServer: (serverId: string) => void;
}

export default function ServerManagement({ token, role, onSelectServer }: ServerManagementProps) {
  const [servers, setServers] = useState<ServerType[]>([]);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [eggs, setEggs] = useState<EggGroup[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Create Server State
  const [createOpen, setCreateOpen] = useState(false);
  const [newSrvName, setNewSrvName] = useState("");
  const [newSrvDesc, setNewSrvDesc] = useState("");
  const [newSrvOwner, setNewSrvOwner] = useState("");
  const [newSrvNode, setNewSrvNode] = useState("");
  const [newSrvEgg, setNewSrvEgg] = useState("");
  const [newSrvRam, setNewSrvRam] = useState(2048); // default 2GB
  const [newSrvCpu, setNewSrvCpu] = useState(100); // 1 core
  const [newSrvDisk, setNewSrvDisk] = useState(10240); // 10GB
  const [newSrvPort, setNewSrvPort] = useState(25565);
  const [newSrvBackups, setNewSrvBackups] = useState(3);

  // Edit Server State
  const [confirmDeleteMode, setConfirmDeleteMode] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<ServerType | null>(null);
  const [editSrvName, setEditSrvName] = useState("");
  const [editSrvDesc, setEditSrvDesc] = useState("");
  const [editSrvRam, setEditSrvRam] = useState(2048);
  const [editSrvCpu, setEditSrvCpu] = useState(100);
  const [editSrvDisk, setEditSrvDisk] = useState(10240);
  const [editSrvPort, setEditSrvPort] = useState(25565);

  const handleEditServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingServer) return;
    if (!editSrvName.trim()) {
      showToast("Please provide a valid server name.", "error");
      return;
    }
    try {
      const response = await fetch(`/api/servers/${editingServer.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editSrvName,
          description: editSrvDesc,
          ramLimit: editSrvRam,
          cpuLimit: editSrvCpu,
          diskLimit: editSrvDisk,
          port: editSrvPort
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update server configurations.");
      }

      setEditOpen(false);
      setEditingServer(null);
      showToast("Server configuration updated successfully!", "success");
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleDeleteServer = async () => {
    if (!editingServer) return;
    if (!confirmDeleteMode) {
      setConfirmDeleteMode(true);
      setTimeout(() => setConfirmDeleteMode(false), 5000);
      return;
    }
    
    try {
      const response = await fetch(`/api/servers/${editingServer.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete server.");
      }
      setEditOpen(false);
      setEditingServer(null);
      setConfirmDeleteMode(false);
      showToast("Server successfully terminated and deleted.", "success");
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const fetchData = async () => {
    try {
      // Parallel fetches for complete dropdown dependencies
      const [srvRes, nodeRes, eggRes, userRes] = await Promise.all([
        fetch("/api/servers", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/admin/nodes", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/admin/eggs", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/admin/users", { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (!srvRes.ok) throw new Error("Could not download virtual host tables.");
      
      const srvs = await srvRes.json();
      setServers(srvs);

      if (role === "admin") {
        if (nodeRes.ok) {
          const fetchedNodes = await nodeRes.json();
          setNodes(fetchedNodes);
          if (fetchedNodes.length > 0) {
            setNewSrvNode(fetchedNodes[0].id);
          }
        }
        if (eggRes.ok) setEggs(await eggRes.json());
        if (userRes.ok) setUsers(await userRes.json());
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Periodically update resource bars
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSrvName || !newSrvOwner || !newSrvNode || !newSrvEgg) {
      showToast("Please fill in all mandatory deployment metrics.");
      return;
    }

    try {
      const response = await fetch("/api/servers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newSrvName,
          description: newSrvDesc,
          ownerId: newSrvOwner,
          nodeId: newSrvNode,
          eggId: newSrvEgg,
          ramLimit: newSrvRam,
          cpuLimit: newSrvCpu,
          diskLimit: newSrvDisk,
          port: newSrvPort,
          backupLimit: newSrvBackups
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to boot container deployment.");
      }

      setCreateOpen(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const resetForm = () => {
    setNewSrvName("");
    setNewSrvDesc("");
    setNewSrvOwner("");
    setNewSrvNode("");
    setNewSrvEgg("");
    setNewSrvRam(2048);
    setNewSrvCpu(100);
    setNewSrvDisk(10240);
    setNewSrvPort(25565);
    setNewSrvBackups(3);
  };

  const filteredServers = servers.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.ip.includes(searchQuery);
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4" id="server_catalog_panel">
      {/* Upper command row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="font-display font-bold text-lg text-white">Virtual Game Hosts</h2>
          <p className="text-xs text-gray-400 font-mono">Select a virtual machine container to access real-time diagnostic cabin.</p>
        </div>
        {role === "admin" && (
          <button
            onClick={() => {
              resetForm();
              setCreateOpen(true);
            }}
            className="bg-brand-yellow hover:bg-yellow-500 text-black text-xs font-semibold py-1.5 px-3 rounded flex items-center gap-1.5 shadow-lg shadow-brand-yellow/5 hover:shadow-brand-yellow/10 transition-all cursor-pointer font-mono"
            id="btn_deploy_server"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" /> Deploy Server
          </button>
        )}
      </div>

      {/* Catalog Search & Status filtering tabs */}
      <div className="flex flex-col md:flex-row gap-2.5 justify-between items-center bg-brand-dark/40 border border-brand-border p-2 rounded">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            type="text"
            placeholder="Query servers by name or allocated IP structure..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-brand-black/40 border border-brand-border rounded pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-yellow/40 transition-all font-sans"
          />
        </div>

        <div className="flex gap-1.5 w-full md:w-auto overflow-x-auto">
          {["all", "running", "starting", "stopping", "offline"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-2.5 py-1 rounded text-[9px] font-mono border capitalize transition-all cursor-pointer ${statusFilter === status ? "bg-brand-yellow text-black border-brand-yellow font-bold" : "bg-white/2 border-white/5 text-gray-400 hover:text-white"}`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Grid listing */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5" id="server_grid_list">
        {filteredServers.map((s) => {
          const ramPct = Math.round((s.ramUsage / s.ramLimit) * 100) || 0;
          const cpuPct = Math.round((s.cpuUsage / s.cpuLimit) * 100) || 0;

          return (
            <div
              key={s.id}
              onClick={() => onSelectServer(s.id)}
              className="glass-panel p-3.5 rounded border-brand-border hover:border-brand-yellow/30 shadow-lg hover:shadow-brand-yellow/2 transition-all duration-300 cursor-pointer group relative flex flex-col justify-between min-h-[170px]"
              id={`server_item_${s.id}`}
            >
              {/* Top Accent glow depending on status */}
              <div className={`absolute top-0 left-0 right-0 h-[1.5px] rounded-t ${s.status === "running" ? "bg-emerald-500" : s.status === "offline" ? "bg-gray-700" : "bg-brand-yellow animate-pulse"}`} />

              <div>
                {/* Server identification header */}
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h3 className="font-display font-bold text-xs text-white group-hover:text-brand-yellow transition-all">{s.name}</h3>
                    <p className="text-[9px] text-gray-400 font-mono mt-0.5">{s.ip}:{s.port}</p>
                  </div>

                  {/* Status badge with 3-line edit option */}
                  <div className="flex items-center gap-1" id={`server_actions_${s.id}`}>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-semibold flex items-center gap-1 border uppercase ${s.status === "running" ? "bg-emerald-950/20 text-emerald-400 border-emerald-900/30" : s.status === "offline" ? "bg-white/5 text-gray-500 border-white/5" : "bg-brand-yellow/10 text-brand-yellow border-brand-yellow/20"}`}>
                      <span className={`w-1 h-1 rounded-full ${s.status === "running" ? "bg-emerald-400 animate-pulse" : s.status === "offline" ? "bg-gray-500" : "bg-brand-yellow animate-ping"}`} />
                      {s.status}
                    </span>
                    {role === "admin" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingServer(s);
                          setEditSrvName(s.name);
                          setEditSrvDesc(s.description || "");
                          setEditSrvRam(s.ramLimit);
                          setEditSrvCpu(s.cpuLimit);
                          setEditSrvDisk(s.diskLimit);
                          setEditSrvPort(s.port);
                          setEditOpen(true);
                        }}
                        className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-brand-yellow transition-all cursor-pointer"
                        title="Edit server configuration (RAM, CPU, Disk, Name)"
                        id={`edit_btn_${s.id}`}
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Sub-meta details */}
                <p className="text-gray-500 text-[10px] mt-1.5 line-clamp-1 italic">{s.description || "No description provided."}</p>
              </div>

              {/* Resource usage bars */}
              <div className="space-y-1.5 mt-3 pt-3 border-t border-brand-border/40">
                
                {/* CPU usage */}
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[9px] font-mono">
                    <span className="text-gray-500 flex items-center gap-1"><Cpu className="w-3 h-3" /> CPU core</span>
                    <span className="text-gray-300 font-medium">{s.status === "running" ? `${s.cpuUsage}%` : "0%"}</span>
                  </div>
                  <div className="w-full bg-white/5 h-1 rounded overflow-hidden">
                    <div 
                      className={`h-full rounded transition-all duration-1000 ${cpuPct > 85 ? "bg-red-500" : "bg-brand-yellow"}`}
                      style={{ width: s.status === "running" ? `${Math.min(cpuPct, 100)}%` : "0%" }}
                    />
                  </div>
                </div>

                {/* RAM usage */}
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[9px] font-mono">
                    <span className="text-gray-500 flex items-center gap-1"><HardDrive className="w-3 h-3" /> Memory allocation</span>
                    <span className="text-gray-300 font-medium">{s.status === "running" ? `${s.ramUsage} MB` : "0 MB"} / {s.ramLimit} MB</span>
                  </div>
                  <div className="w-full bg-white/5 h-1 rounded overflow-hidden">
                    <div 
                      className={`h-full rounded transition-all duration-1000 ${ramPct > 85 ? "bg-red-500" : "bg-brand-yellow"}`}
                      style={{ width: s.status === "running" ? `${Math.min(ramPct, 100)}%` : "0%" }}
                    />
                  </div>
                </div>

              </div>

              {/* Server configuration details */}
              <div className="flex justify-between items-center text-[9px] text-gray-500 font-mono mt-2.5 pt-2 border-t border-brand-border/20">
                <span>{s.eggName} • {s.nodeName}</span>
                <span className="text-gray-400 group-hover:text-brand-yellow font-semibold flex items-center gap-0.5">Control Panel →</span>
              </div>

            </div>
          );
        })}

        {filteredServers.length === 0 && (
          <div className="col-span-full py-12 text-center glass-panel rounded border-brand-border">
            <HelpCircle className="w-7 h-7 text-gray-500 mx-auto mb-2" />
            <p className="text-xs text-gray-400 font-mono">No host containers active in this catalog node segment.</p>
          </div>
        )}
      </div>

      {/* CREATE SERVER DRAWER DIALOG */}
      <AnimatePresence>
        {createOpen && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="w-full max-w-2xl glass-panel rounded p-4.5 border-brand-border shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-brand-yellow animate-pulse" />

              <div className="mb-4">
                <h3 className="font-display font-bold text-base text-white">Deploy Virtual Minecraft Host</h3>
                <p className="text-[11px] text-gray-400 font-mono">Boot a fresh Sandboxed Container on cluster nodes.</p>
              </div>

              <form onSubmit={handleCreateServer} className="space-y-4">
                
                {/* Primary server details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400 font-mono">Server Identifer Name *</label>
                    <input
                      type="text"
                      required
                      value={newSrvName}
                      onChange={(e) => setNewSrvName(e.target.value)}
                      placeholder="Lobby server / Factions MC"
                      className="w-full bg-brand-black/60 border border-brand-border rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-yellow/40"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400 font-mono">Allocated IP Port *</label>
                    <input
                      type="number"
                      required
                      value={newSrvPort}
                      onChange={(e) => setNewSrvPort(parseInt(e.target.value) || 25565)}
                      className="w-full bg-brand-black/60 border border-brand-border rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-yellow/40 font-mono"
                    />
                    <span className="text-[9px] text-gray-500 font-mono block">Set custom IP Port</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400 font-mono">Max Backups Limit *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={20}
                      value={newSrvBackups}
                      onChange={(e) => setNewSrvBackups(parseInt(e.target.value) || 3)}
                      className="w-full bg-brand-black/60 border border-brand-border rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-yellow/40 font-mono"
                    />
                    <span className="text-[9px] text-gray-500 font-mono block">Max snapshots allowed</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 font-mono">Host Description / Notes</label>
                  <input
                    type="text"
                    value={newSrvDesc}
                    onChange={(e) => setNewSrvDesc(e.target.value)}
                    placeholder="Vanilla minecraft setup on paper engine..."
                    className="w-full bg-brand-black/60 border border-brand-border rounded px-2.5 py-1.5 text-xs text-white focus:outline-none"
                  />
                </div>

                {/* Owner and Nest configs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  
                  {/* Client Owner */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400 font-mono">Assigned Owner ID *</label>
                    <select
                      required
                      value={newSrvOwner}
                      onChange={(e) => setNewSrvOwner(e.target.value)}
                      className="w-full bg-brand-black/60 border border-brand-border rounded px-2 py-1.5 text-xs text-gray-300 focus:outline-none"
                    >
                      <option value="">Select account...</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.username} ({u.email})</option>
                      ))}
                    </select>
                  </div>

                  {/* Target Node */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400 font-mono">Target Deploy Node *</label>
                    <div className="w-full bg-brand-black/60 border border-brand-border rounded px-2.5 py-1.5 text-xs text-brand-yellow font-mono font-bold">
                      Local VPS Host Node (Auto)
                    </div>
                  </div>

                  {/* Egg Selector */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400 font-mono">Server Engine Egg *</label>
                    <select
                      required
                      value={newSrvEgg}
                      onChange={(e) => setNewSrvEgg(e.target.value)}
                      className="w-full bg-brand-black/60 border border-brand-border rounded px-2 py-1.5 text-xs text-gray-300"
                    >
                      <option value="">Select Egg jar template...</option>
                      {eggs.flatMap(g => g.eggs).map(e => (
                        <option key={e.id} value={e.id}>{e.name} (Nest: Minecraft)</option>
                      ))}
                    </select>
                  </div>

                </div>

                {/* Resource constraints sliders changed to custom text/number inputs */}
                <div className="space-y-4 pt-2 border-t border-brand-border/40">
                  <h4 className="font-display font-semibold text-xs text-brand-yellow">Resource Constraints (Custom Set)</h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    
                    {/* Memory */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-mono">
                        <span>Maximum Memory (MB)</span>
                      </div>
                      <input
                        type="number"
                        min={128}
                        required
                        value={newSrvRam}
                        onChange={(e) => setNewSrvRam(parseInt(e.target.value) || 0)}
                        className="w-full bg-brand-black/60 border border-brand-border rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-yellow/40 font-mono"
                        placeholder="e.g. 2048"
                      />
                      <span className="text-[9px] text-gray-500 font-mono block">{(newSrvRam / 1024).toFixed(2)} GB allocated</span>
                    </div>

                    {/* CPU share */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-mono">
                        <span>CPU Share Core (%)</span>
                      </div>
                      <input
                        type="number"
                        min={10}
                        required
                        value={newSrvCpu}
                        onChange={(e) => setNewSrvCpu(parseInt(e.target.value) || 0)}
                        className="w-full bg-brand-black/60 border border-brand-border rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-yellow/40 font-mono"
                        placeholder="e.g. 100"
                      />
                      <span className="text-[9px] text-gray-500 font-mono block">100% = 1 Virtual Core</span>
                    </div>

                    {/* Disk size */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-mono">
                        <span>Assigned Storage (MB)</span>
                      </div>
                      <input
                        type="number"
                        min={100}
                        required
                        value={newSrvDisk}
                        onChange={(e) => setNewSrvDisk(parseInt(e.target.value) || 0)}
                        className="w-full bg-brand-black/60 border border-brand-border rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-yellow/40 font-mono"
                        placeholder="e.g. 10240"
                      />
                      <span className="text-[9px] text-gray-500 font-mono block">{(newSrvDisk / 1024).toFixed(2)} GB storage</span>
                    </div>

                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t border-brand-border/20">
                  <button
                    type="submit"
                    className="flex-1 bg-brand-yellow text-black text-xs font-semibold py-1.5 rounded hover:bg-yellow-500 cursor-pointer font-mono"
                  >
                    Deploy
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateOpen(false)}
                    className="flex-1 bg-white/5 border border-white/5 text-gray-400 text-xs py-1.5 rounded hover:text-white cursor-pointer font-mono"
                  >
                    Exit
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT SERVER DIALOG */}
      <AnimatePresence>
        {editOpen && editingServer && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="w-full max-w-2xl glass-panel rounded p-4.5 border-brand-border shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-brand-yellow animate-pulse" />

              <div className="mb-4 flex justify-between items-start">
                <div>
                  <h3 className="font-display font-bold text-base text-white">Edit Server Configuration</h3>
                  <p className="text-[11px] text-gray-400 font-mono">Modify container properties for {editingServer.name}</p>
                </div>
                <button
                  type="button"
                  onClick={handleDeleteServer}
                  className={`px-2.5 py-1 text-[10px] rounded flex items-center gap-1 cursor-pointer transition-all font-mono ${
                    confirmDeleteMode 
                      ? "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20"
                      : "bg-red-950/40 border border-red-900/40 hover:bg-red-900/20 text-red-400"
                  }`}
                  title="Destroy Server permanently"
                >
                  <Trash2 className="w-3.5 h-3.5" /> {confirmDeleteMode ? "Click again to confirm" : "Terminate Server"}
                </button>
              </div>

              <form onSubmit={handleEditServer} className="space-y-4">
                
                {/* Primary server details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400 font-mono">Server Identifier Name *</label>
                    <input
                      type="text"
                      required
                      value={editSrvName}
                      onChange={(e) => setEditSrvName(e.target.value)}
                      className="w-full bg-brand-black/60 border border-brand-border rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-yellow/40 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400 font-mono">Allocated IP Port *</label>
                    <input
                      type="number"
                      required
                      value={editSrvPort}
                      onChange={(e) => setEditSrvPort(parseInt(e.target.value) || 25565)}
                      className="w-full bg-brand-black/60 border border-brand-border rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-yellow/40 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 font-mono">Host Description / Notes</label>
                  <input
                    type="text"
                    value={editSrvDesc}
                    onChange={(e) => setEditSrvDesc(e.target.value)}
                    className="w-full bg-brand-black/60 border border-brand-border rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-yellow/40 font-mono"
                  />
                </div>

                {/* Core Allocation metrics */}
                <div className="border border-brand-border/40 p-3 rounded bg-brand-black/20 space-y-3">
                  <span className="text-[10px] font-bold text-gray-400 font-mono block uppercase tracking-wider">HARDWARE ALLOCATION SEGMENT</span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* RAM limit */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-mono">
                        <span>Memory (RAM MB)</span>
                      </div>
                      <input
                        type="number"
                        min={512}
                        required
                        value={editSrvRam}
                        onChange={(e) => setEditSrvRam(parseInt(e.target.value) || 0)}
                        className="w-full bg-brand-black/60 border border-brand-border rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-yellow/40 font-mono"
                      />
                      <span className="text-[9px] text-gray-500 font-mono block">{(editSrvRam / 1024).toFixed(2)} GB allocated</span>
                    </div>

                    {/* CPU share */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-mono">
                        <span>CPU Share Core (%)</span>
                      </div>
                      <input
                        type="number"
                        min={10}
                        required
                        value={editSrvCpu}
                        onChange={(e) => setEditSrvCpu(parseInt(e.target.value) || 0)}
                        className="w-full bg-brand-black/60 border border-brand-border rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-yellow/40 font-mono"
                      />
                      <span className="text-[9px] text-gray-500 font-mono block">100% = 1 Virtual Core</span>
                    </div>

                    {/* Disk size */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-mono">
                        <span>Assigned Storage (MB)</span>
                      </div>
                      <input
                        type="number"
                        min={100}
                        required
                        value={editSrvDisk}
                        onChange={(e) => setEditSrvDisk(parseInt(e.target.value) || 0)}
                        className="w-full bg-brand-black/60 border border-brand-border rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-yellow/40 font-mono"
                      />
                      <span className="text-[9px] text-gray-500 font-mono block">{(editSrvDisk / 1024).toFixed(2)} GB storage</span>
                    </div>

                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t border-brand-border/20">
                  <button
                    type="submit"
                    className="flex-1 bg-brand-yellow text-black text-xs font-semibold py-1.5 rounded hover:bg-yellow-500 cursor-pointer font-mono"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditOpen(false);
                      setEditingServer(null);
                    }}
                    className="flex-1 bg-white/5 border border-white/5 text-gray-400 text-xs py-1.5 rounded hover:text-white cursor-pointer font-mono"
                  >
                    Cancel
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

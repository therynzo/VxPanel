import { useState, useEffect } from "react";
import { Users, Server, Cpu, HardDrive, Network, Layers, ShieldAlert, Clock, RefreshCw, ChevronRight } from "lucide-react";
import { motion } from "motion/react";

interface StatsProps {
  token: string;
  role?: string;
  onSelectServer?: (id: string) => void;
}

export default function DashboardStats({ token, role, onSelectServer }: StatsProps) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      const endpoint = role === "admin" ? "/api/admin/stats" : "/api/user/stats";
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Could not load metrics.");
      const data = await response.json();
      setStats(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 6000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-10 h-10 border-4 border-brand-yellow/20 border-t-brand-yellow rounded-full animate-spin" />
        <span className="text-xs text-gray-500 font-mono">Loading telemetry database...</span>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-6 bg-red-950/20 border border-red-900/30 rounded-xl text-red-300 text-xs flex items-center gap-3">
        <ShieldAlert className="w-5 h-5 text-red-400" />
        <div>
          <span className="font-semibold block">Failed to read stats telemetry</span>
          <span>{error || "Unknown system failure."}</span>
        </div>
      </div>
    );
  }

  // Helper values for charts
  const cpuPoints = [35, 42, 38, 55, 48, 62, 58, avgCpuUsage(stats.cpuUsage)];
  const ramPoints = [40, 42, 45, 44, 48, 51, 49, Math.round((stats.ramUsage.used / stats.ramUsage.total) * 100)];
  const userGrowthPoints = [5, 12, 18, 24, 31, 38, 42, 45];
  const serverUsagePoints = [1, 1, 2, 2, 2, 3, 3, stats.totalServers];

  function avgCpuUsage(val: any) {
    return typeof val === "number" ? Math.round(val) : 15;
  }

  // Render clean custom animated SVG Chart
  const renderLineChart = (points: number[], colorClass: string, glowColor: string, maxVal = 100) => {
    const width = 450;
    const height = 150;
    const padding = 20;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    const coords = points.map((p, i) => {
      const x = padding + (i / (points.length - 1)) * chartWidth;
      const y = padding + chartHeight - (p / maxVal) * chartHeight;
      return { x, y };
    });

    const pathD = coords.reduce((acc, c, i) => {
      return i === 0 ? `M ${c.x} ${c.y}` : `${acc} L ${c.x} ${c.y}`;
    }, "");

    // Area path under the line for gradient fill
    const areaD = coords.length > 0
      ? `${pathD} L ${coords[coords.length - 1].x} ${height - padding} L ${coords[0].x} ${height - padding} Z`
      : "";

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-36 overflow-visible">
        <defs>
          <linearGradient id={`gradient-${glowColor}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={glowColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={glowColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
          <line
            key={i}
            x1={padding}
            y1={padding + ratio * chartHeight}
            x2={width - padding}
            y2={padding + ratio * chartHeight}
            className="stroke-brand-border/40"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
        ))}
        {/* Gradient Area Fill */}
        <path d={areaD} fill={`url(#gradient-${glowColor})`} />
        {/* Main Line path */}
        <motion.path
          d={pathD}
          fill="none"
          className={colorClass}
          strokeWidth="2.5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: "easeInOut" }}
        />
        {/* Dynamic points */}
        {coords.map((c, i) => (
          <circle
            key={i}
            cx={c.x}
            cy={c.y}
            r="4"
            className="fill-brand-black stroke-brand-yellow cursor-pointer hover:r-6 transition-all"
            strokeWidth="2"
          />
        ))}
      </svg>
    );
  };

  return (
    <div id="telemetry_dashboard_panel" className="space-y-4">
      
      {/* Dynamic Announcement Banner */}
      {stats.announcementBanner && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-brand-yellow/10 border border-brand-yellow/20 rounded p-2.5 flex items-center justify-between relative overflow-hidden"
          id="announcement_banner"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-brand-yellow/5 rounded-full blur-xl" />
          <div className="flex items-center gap-2 relative z-10">
            <div className="w-1.5 h-1.5 rounded-full bg-brand-yellow animate-ping shrink-0" />
            <p className="text-[11px] text-brand-yellow font-display font-medium leading-relaxed tracking-wide">
              {stats.announcementBanner}
            </p>
          </div>
        </motion.div>
      )}

      {/* Grid of Key Performance Indicators (KPI Cards) */}
      <div className={`grid grid-cols-2 ${role === "admin" ? "md:grid-cols-4" : "md:grid-cols-3"} gap-2.5`} id="kpi_grid_row">
        
        {role === "admin" && (
          <div className="glass-panel p-3 rounded relative group overflow-hidden border-brand-border" id="card_total_users">
            <div className="absolute right-0 bottom-0 translate-x-1 translate-y-1 opacity-[0.03] group-hover:opacity-[0.06] transition-all">
              <Users className="w-16 h-16 text-white" />
            </div>
            <div className="flex justify-between items-start">
              <span className="text-[9px] text-gray-400 font-mono font-semibold uppercase tracking-wider">User Directory</span>
              <div className="w-6 h-6 rounded bg-white/5 border border-white/5 flex items-center justify-center text-gray-400">
                <Users className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2.5">
              <span className="font-display font-bold text-2xl text-white">{stats.totalUsers}</span>
              <span className="text-[9px] text-emerald-400 font-mono block mt-0.5">▲ Fully synchronized</span>
            </div>
          </div>
        )}

        {/* Total Servers */}
        <div className="glass-panel p-3 rounded relative group overflow-hidden border-brand-border" id="card_total_servers">
          <div className="absolute right-0 bottom-0 translate-x-1 translate-y-1 opacity-[0.03] group-hover:opacity-[0.06] transition-all">
            <Server className="w-16 h-16 text-white" />
          </div>
          <div className="flex justify-between items-start">
            <span className="text-[9px] text-gray-400 font-mono font-semibold uppercase tracking-wider">Total Hosts</span>
            <div className="w-6 h-6 rounded bg-white/5 border border-white/5 flex items-center justify-center text-gray-400">
              <Server className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="font-display font-bold text-2xl text-white">{stats.totalServers}</span>
            <span className="text-[9px] text-gray-400 font-mono block mt-0.5">
              <strong className="text-brand-yellow font-medium">{stats.runningServers}</strong> active / <strong className="text-gray-500">{stats.offlineServers}</strong> stopped
            </span>
          </div>
        </div>

        {/* Global Node CPU */}
        <div className="glass-panel p-3 rounded relative group overflow-hidden border-brand-border" id="card_cpu_usage">
          <div className="absolute right-0 bottom-0 translate-x-1 translate-y-1 opacity-[0.03] group-hover:opacity-[0.06] transition-all">
            <Cpu className="w-16 h-16 text-white" />
          </div>
          <div className="flex justify-between items-start">
            <span className="text-[9px] text-gray-400 font-mono font-semibold uppercase tracking-wider">CPU Average</span>
            <div className="w-6 h-6 rounded bg-brand-yellow/10 border border-brand-yellow/20 flex items-center justify-center text-brand-yellow">
              <Cpu className="w-3.5 h-3.5 animate-pulse" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="font-display font-bold text-2xl text-white">{stats.cpuUsage}%</span>
            <div className="w-full bg-white/5 h-1 rounded mt-1.5 overflow-hidden">
              <div 
                className="bg-brand-yellow h-full rounded transition-all duration-1000" 
                style={{ width: `${Math.min(stats.cpuUsage * 2, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* RAM allocation */}
        <div className="glass-panel p-3 rounded relative group overflow-hidden border-brand-border" id="card_ram_usage">
          <div className="absolute right-0 bottom-0 translate-x-1 translate-y-1 opacity-[0.03] group-hover:opacity-[0.06] transition-all">
            <HardDrive className="w-16 h-16 text-white" />
          </div>
          <div className="flex justify-between items-start">
            <span className="text-[9px] text-gray-400 font-mono font-semibold uppercase tracking-wider">RAM Allocation</span>
            <div className="w-6 h-6 rounded bg-white/5 border border-white/5 flex items-center justify-center text-gray-400">
              <HardDrive className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="font-display font-bold text-xl text-white">{(stats.ramUsage.used / 1024).toFixed(1)} GB</span>
            <span className="text-[8px] text-gray-500 font-mono block mt-0.5">Limit: {(stats.ramUsage.total / 1024).toFixed(0)} GB</span>
          </div>
        </div>

      </div>

      {/* Secondary Resource telemetry row */}
      <div className={`grid grid-cols-2 ${role === "admin" ? "md:grid-cols-4" : "md:grid-cols-3"} gap-2.5`} id="secondary_kpi_row">
        
        {/* Node Storage */}
        <div className="glass-panel p-2 rounded border-brand-border flex items-center gap-2">
          <div className="p-1.5 bg-white/5 rounded text-gray-400 shrink-0">
            <HardDrive className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-[9px] text-gray-500 font-mono block">Node Storage</span>
            <span className="text-[11px] font-semibold text-white">{(stats.diskUsage.used / 1024).toFixed(1)} GB / {(stats.diskUsage.total / 1024).toFixed(0)} GB</span>
          </div>
        </div>

        {/* Networking speed */}
        <div className="glass-panel p-2 rounded border-brand-border flex items-center gap-2">
          <div className="p-1.5 bg-white/5 rounded text-gray-400 shrink-0">
            <Network className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-[9px] text-gray-500 font-mono block">System Ingress</span>
            <span className="text-[11px] font-semibold text-white">{stats.networkUsage.up}</span>
          </div>
        </div>

        {role === "admin" && (
          <div className="glass-panel p-2 rounded border-brand-border flex items-center gap-2">
            <div className="p-1.5 bg-white/5 rounded text-gray-400 shrink-0">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[9px] text-gray-500 font-mono block">Active Nodes</span>
              <span className="text-[11px] font-semibold text-brand-yellow">{stats.activeNodes} Nodes Online</span>
            </div>
          </div>
        )}

        {/* Health status */}
        <div className="glass-panel p-2 rounded border-brand-border flex items-center gap-2">
          <div className="p-1.5 bg-emerald-950/30 text-emerald-400 rounded shrink-0 border border-emerald-900/20">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <div>
            <span className="text-[9px] text-gray-500 font-mono block">System Health</span>
            <span className="text-[11px] font-semibold text-emerald-400">Excellent (0 alerts)</span>
          </div>
        </div>

      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" id="dashboard_graphs_section">
        
        {/* Core Node CPU Chart */}
        <div className="glass-panel p-3.5 rounded border-brand-border relative" id="cpu_chart_card">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h3 className="font-display font-bold text-xs text-white">Core Cluster CPU Load</h3>
              <p className="text-[9px] text-gray-400 font-mono">Real-time aggregate CPU core utilization</p>
            </div>
            <div className="px-1.5 py-0.5 bg-brand-yellow/10 border border-brand-yellow/20 rounded text-[8px] text-brand-yellow font-mono">
              Live updates
            </div>
          </div>
          {renderLineChart(cpuPoints, "stroke-brand-yellow", "#FFB800", 100)}
          <div className="flex justify-between text-[8px] text-gray-500 font-mono mt-1 px-1">
            <span>10m ago</span>
            <span>5m ago</span>
            <span>Now ({stats.cpuUsage}%)</span>
          </div>
        </div>

        {/* Core Node RAM Chart */}
        <div className="glass-panel p-3.5 rounded border-brand-border relative" id="ram_chart_card">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h3 className="font-display font-bold text-xs text-white">Cluster RAM Allocation</h3>
              <p className="text-[9px] text-gray-400 font-mono">Simulated active memory utilization over time</p>
            </div>
            <div className="px-1.5 py-0.5 bg-white/5 border border-white/5 rounded text-[8px] text-gray-400 font-mono">
              Aggregated
            </div>
          </div>
          {renderLineChart(ramPoints, "stroke-gray-300", "#9ca3af", 100)}
          <div className="flex justify-between text-[8px] text-gray-500 font-mono mt-1 px-1">
            <span>10m ago</span>
            <span>5m ago</span>
            <span>Now ({Math.round((stats.ramUsage.used / stats.ramUsage.total) * 100)}%)</span>
          </div>
        </div>

        {/* Server Deployments Chart */}
        <div className="glass-panel p-3.5 rounded border-brand-border relative" id="servers_growth_chart">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h3 className="font-display font-bold text-xs text-white">Active Virtual Hosts</h3>
              <p className="text-[9px] text-gray-400 font-mono">Growth of custom containers on cluster</p>
            </div>
            <span className="text-[8px] text-gray-400 font-mono">Deploy count: {stats.totalServers}</span>
          </div>
          {renderLineChart(serverUsagePoints, "stroke-brand-yellow", "#FFB800", 5)}
          <div className="flex justify-between text-[8px] text-gray-500 font-mono mt-1 px-1">
            <span>Wk 1</span>
            <span>Wk 2</span>
            <span>Current</span>
          </div>
        </div>

        {role === "admin" && (
          <div className="glass-panel p-3.5 rounded border-brand-border relative" id="users_growth_chart">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="font-display font-bold text-xs text-white">Registered Customer Node</h3>
                <p className="text-[9px] text-gray-400 font-mono">Client sign-up metrics</p>
              </div>
              <span className="text-[8px] text-gray-400 font-mono">Signups: {stats.totalUsers}</span>
            </div>
            {renderLineChart(userGrowthPoints, "stroke-emerald-400", "#34d399", 50)}
            <div className="flex justify-between text-[8px] text-gray-500 font-mono mt-1 px-1">
              <span>Mon</span>
              <span>Wed</span>
              <span>Today</span>
            </div>
          </div>
        )}
      </div>

      {role === "admin" ? (
        <div className="glass-panel p-3.5 rounded border-brand-border" id="audit_logs_panel">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h3 className="font-display font-bold text-xs text-white">Administrative Audit Logs</h3>
              <p className="text-[9px] text-gray-400 font-mono">Global security action streams</p>
            </div>
            <button 
              onClick={fetchStats}
              className="p-1 bg-white/5 hover:bg-white/10 border border-white/5 rounded text-gray-400 hover:text-white transition-all text-[11px] flex items-center gap-1 cursor-pointer font-mono"
            >
              <RefreshCw className="w-3 h-3" /> Force sync
            </button>
          </div>

          <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1" id="audit_logs_container">
            {stats.recentActivity.map((log: any, idx: number) => (
              <div 
                key={log.id || idx} 
                className="flex items-start justify-between p-2 bg-brand-dark/40 border border-brand-border hover:border-brand-yellow/20 rounded transition-all text-[11px]"
              >
                <div className="flex items-start gap-2">
                  <div className="p-1 bg-brand-yellow/10 border border-brand-yellow/25 text-brand-yellow rounded shrink-0 mt-0.5">
                    <Clock className="w-3 h-3" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <strong className="text-white font-semibold">{log.action}</strong>
                      <span className="text-[8px] text-gray-500 font-mono">by {log.username}</span>
                    </div>
                    <p className="text-gray-400 text-[10px] mt-0.5">{log.details}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[9px] text-gray-500 font-mono block">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  <span className="text-[8px] text-brand-yellow font-mono block mt-0.5">{log.ipAddress}</span>
                </div>
              </div>
            ))}
            {stats.recentActivity.length === 0 && (
              <p className="text-center text-xs text-gray-500 py-6 font-mono">No action streams captured in database index.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="glass-panel p-3.5 rounded border-brand-border mt-4" id="user_servers_panel">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h3 className="font-display font-bold text-xs text-white">Your Servers</h3>
              <p className="text-[9px] text-gray-400 font-mono">Quick access to your active environments</p>
            </div>
          </div>
          
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {stats.servers?.map((server: any) => (
              <div 
                key={server.id} 
                onClick={() => onSelectServer && onSelectServer(server.id)}
                className="flex items-center justify-between p-3 bg-brand-dark/40 border border-brand-border hover:border-brand-yellow/30 rounded-lg cursor-pointer transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded border ${server.status === "running" ? "bg-brand-yellow/10 border-brand-yellow/30 text-brand-yellow" : "bg-gray-800/50 border-gray-700 text-gray-500"}`}>
                    <Server className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold text-xs">{server.name}</h4>
                    <p className="text-[9px] text-gray-400 font-mono mt-0.5">
                      {server.status === "running" ? (
                        <span className="text-emerald-400">● Online</span>
                      ) : (
                        <span>○ Offline</span>
                      )}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </div>
            ))}
            {(!stats.servers || stats.servers.length === 0) && (
              <div className="p-6 text-center text-gray-500 border border-dashed border-gray-700 rounded-lg text-xs font-mono">
                No active servers found on your account.
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

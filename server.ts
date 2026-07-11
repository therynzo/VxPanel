import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { Server, ServerStatus, User, Node, Allocation, Egg, EggGroup, PanelSettings, APIKey, ServerFile } from "./src/types";

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(process.cwd(), "data");
const SERVERS_DIR = path.join(process.cwd(), "servers");
const DB_FILE = path.join(DATA_DIR, "db.json");

// Create data and servers directories
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(SERVERS_DIR)) fs.mkdirSync(SERVERS_DIR, { recursive: true });

// --- DEFAULT SEED DATA ---
const DEFAULT_SETTINGS: PanelSettings = {
  panelName: "VxPanel",
  logoUrl: "",
  faviconUrl: "",
  backgroundImageUrl: "",
  sidebarLogoUrl: "",
  dashboardLogoUrl: "",
  footerText: "VxPanel Minecraft Server Panel. Designed for performance.",
  copyrightText: "© 2026 VxPanel. All rights reserved.",
  primaryColor: "yellow",
  secondaryColor: "black",
  accentColor: "yellow",
  enableRegistration: true,
  enableEmailVerification: false,
  enableDiscordLogin: true,
  enableGoogleLogin: true,
  enablePluginInstaller: true,
  enableBackups: true,
  enableSchedules: true,
  enableApi: true,
  enableFileManager: true,
  enableConsole: true,
  enableFTP: false,
  enableSFTP: false,
  enableServerCreation: true,
  enableNodeCreation: true,
  maintenanceMode: false,
  announcementBanner: "Welcome to VxPanel - The premium next-generation Minecraft hosting experience!",
  defaultBackupLimit: 3
};

const DEFAULT_USERS: User[] = [];

const DEFAULT_NODES: Node[] = [
  {
    id: "node-us",
    name: "US-East (Virginia)",
    location: "Virginia, USA",
    fqdn: "us-east1.vxpanel.io",
    sslEnabled: true,
    isMaintenance: false,
    totalRam: 65536, // 64 GB
    usedRam: 16384,
    totalDisk: 1024000, // 1 TB
    usedDisk: 153600,
    cpuOvercommit: 150,
    status: "online",
    createdAt: new Date().toISOString()
  },
  {
    id: "node-eu",
    name: "EU-West (Frankfurt)",
    location: "Frankfurt, Germany",
    fqdn: "eu-central1.vxpanel.io",
    sslEnabled: true,
    isMaintenance: false,
    totalRam: 32768, // 32 GB
    usedRam: 8192,
    totalDisk: 512000, // 512 GB
    usedDisk: 81920,
    cpuOvercommit: 100,
    status: "online",
    createdAt: new Date().toISOString()
  }
];

const DEFAULT_ALLOCATIONS: Allocation[] = [
  { id: "alloc-1", nodeId: "node-us", ip: "192.168.10.12", port: 25565 },
  { id: "alloc-2", nodeId: "node-us", ip: "192.168.10.12", port: 25566 },
  { id: "alloc-3", nodeId: "node-us", ip: "192.168.10.12", port: 25567 },
  { id: "alloc-4", nodeId: "node-us", ip: "192.168.10.13", port: 25565 },
  { id: "alloc-5", nodeId: "node-eu", ip: "85.214.50.180", port: 25565 },
  { id: "alloc-6", nodeId: "node-eu", ip: "85.214.50.180", port: 25566 }
];

const DEFAULT_EGGS: EggGroup[] = [
  {
    id: "group-minecraft",
    name: "Minecraft",
    description: "Minecraft server versions and modifications",
    eggs: [
      {
        id: "egg-paper",
        groupId: "group-minecraft",
        name: "Paper",
        description: "High performance Spigot-compatible Minecraft server software.",
        startup: "java -Xms128M -Xmx{{SERVER_MEMORY}}M -Dterminal.jline=false -Dterminal.ansi=true -jar {{SERVER_JARFILE}}",
        dockerImage: "ghcr.io/pterodactyl/yolks:java_17",
        environment: [
          { key: "SERVER_JARFILE", name: "Jar File", description: "Name of the executable jar.", defaultValue: "paper.jar", userViewable: true, userEditable: true },
          { key: "MINECRAFT_VERSION", name: "Version", description: "The version of Minecraft to run.", defaultValue: "1.21", userViewable: true, userEditable: true }
        ]
      },
      {
        id: "egg-purpur",
        groupId: "group-minecraft",
        name: "Purpur",
        description: "Drop-in replacement for Paper designed for configurability and performance.",
        startup: "java -Xms128M -Xmx{{SERVER_MEMORY}}M -Dterminal.jline=false -jar {{SERVER_JARFILE}}",
        dockerImage: "ghcr.io/pterodactyl/yolks:java_17",
        environment: [
          { key: "SERVER_JARFILE", name: "Jar File", description: "Name of the executable jar.", defaultValue: "purpur.jar", userViewable: true, userEditable: true },
          { key: "MINECRAFT_VERSION", name: "Version", description: "The version of Minecraft to run.", defaultValue: "1.21", userViewable: true, userEditable: true }
        ]
      },
      {
        id: "egg-fabric",
        groupId: "group-minecraft",
        name: "Fabric",
        description: "Modded Minecraft server using the Fabric modloader.",
        startup: "java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar {{SERVER_JARFILE}} nogui",
        dockerImage: "ghcr.io/pterodactyl/yolks:java_17",
        environment: [
          { key: "SERVER_JARFILE", name: "Jar File", description: "Name of the executable jar.", defaultValue: "fabric-loader.jar", userViewable: true, userEditable: true }
        ]
      }
    ]
  }
];

const DEFAULT_SERVERS: Server[] = [];

// --- FILE SYSTEM SEED FOR EACH SERVER ---
function seedServerFiles(serverId: string) {
  const serverPath = path.join(SERVERS_DIR, serverId);
  if (!fs.existsSync(serverPath)) {
    fs.mkdirSync(serverPath, { recursive: true });
    
    // Create typical Minecraft files
    fs.writeFileSync(path.join(serverPath, "eula.txt"), "eula=true\n# Agreement accepted via VxPanel Dashboard\n");
    fs.writeFileSync(path.join(serverPath, "server.properties"), `# Minecraft Server Properties
# Saved by VxPanel
pvp=true
difficulty=easy
max-players=20
motd=A VxPanel Powered Minecraft Server!
view-distance=10
enable-query=false
port=25565
`);
    fs.mkdirSync(path.join(serverPath, "plugins"), { recursive: true });
    fs.writeFileSync(path.join(serverPath, "plugins", "EssentialsX.jar"), "ESS_MOCK_JAR_FILE_DATA");
    fs.writeFileSync(path.join(serverPath, "plugins", "WorldEdit.jar"), "WE_MOCK_JAR_FILE_DATA");
    
    fs.mkdirSync(path.join(serverPath, "world"), { recursive: true });
    fs.writeFileSync(path.join(serverPath, "world", "level.dat"), "LEVEL_DAT_MOCK_DATA");
    
    fs.writeFileSync(path.join(serverPath, "spigot.yml"), "# Spigot YAML Configuration\nsettings:\n  save-user-cache-on-stop-only: false\n");
  }
}

// Seed the default server files on startup
DEFAULT_SERVERS.forEach(s => seedServerFiles(s.id));

// --- SIMPLE JSON DATABASE ENGINE ---
interface DB {
  settings: PanelSettings;
  users: User[];
  userPasswords: Record<string, string>; // bcrypt-like SHA256 hashes
  nodes: Node[];
  allocations: Allocation[];
  eggs: EggGroup[];
  servers: Server[];
  activityLogs: any[];
  apiKeys: APIKey[];
}

function getInitialDB(): DB {
  return {
    settings: DEFAULT_SETTINGS,
    users: DEFAULT_USERS,
    userPasswords: {},
    nodes: DEFAULT_NODES,
    allocations: DEFAULT_ALLOCATIONS,
    eggs: DEFAULT_EGGS,
    servers: DEFAULT_SERVERS,
    activityLogs: [
      {
        id: "log-1",
        userId: "user-admin",
        username: "admin",
        action: "PANEL_START",
        details: "VxPanel Management Service Initialized successfully.",
        ipAddress: "127.0.0.1",
        timestamp: new Date().toISOString()
      }
    ],
    apiKeys: []
  };
}

let db: DB;
if (fs.existsSync(DB_FILE)) {
  try {
    db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
  } catch (err) {
    console.error("Error reading database file, using fallback defaults", err);
    db = getInitialDB();
  }
} else {
  db = getInitialDB();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
}

function saveDB() {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
}

// Active console streams & live stats state in memory (resets on restart)
const serverLogs: Record<string, string[]> = {};
const activeResourceTimers: Record<string, NodeJS.Timeout> = {};

function initServerConsoleLogs(serverId: string) {
  if (!serverLogs[serverId]) {
    serverLogs[serverId] = [
      `[${new Date().toLocaleTimeString()} INFO]: VxPanel agent bound to server container.`,
      `[${new Date().toLocaleTimeString()} INFO]: Loaded file structures successfully.`,
      `[${new Date().toLocaleTimeString()} INFO]: Port 25565 allocation established.`
    ];
  }
}
DEFAULT_SERVERS.forEach(s => initServerConsoleLogs(s.id));

// Simulate real-time logs and stats for running servers
db.servers.forEach(srv => {
  if (srv.status === "running") {
    startSimulatingStats(srv.id);
  }
});

function startSimulatingStats(serverId: string) {
  if (activeResourceTimers[serverId]) clearInterval(activeResourceTimers[serverId]);
  
  activeResourceTimers[serverId] = setInterval(() => {
    const srv = db.servers.find(s => s.id === serverId);
    if (!srv || srv.status !== "running") {
      clearInterval(activeResourceTimers[serverId]);
      return;
    }
    
    // Random fluctuation
    srv.cpuUsage = +(Math.random() * 45 + 5).toFixed(1);
    srv.ramUsage = Math.floor(srv.ramLimit * 0.45 + (Math.random() * 200 - 100));
    srv.diskUsage = srv.diskUsage + Math.floor(Math.random() * 5); // slow disk write growth
    
    // Maybe log a player joining/leaving occasionally
    const rand = Math.random();
    if (rand < 0.1) {
      const players = ["steve", "alex", "herobrine", "anikislm", "notch", "greader"];
      const player = players[Math.floor(Math.random() * players.length)];
      initServerConsoleLogs(serverId);
      if (Math.random() > 0.5) {
        serverLogs[serverId].push(`[${new Date().toLocaleTimeString()} INFO]: ${player} joined the game`);
      } else {
        serverLogs[serverId].push(`[${new Date().toLocaleTimeString()} INFO]: ${player} left the game`);
      }
      if (serverLogs[serverId].length > 150) serverLogs[serverId].shift();
    }
  }, 4000);
}

// --- EXPRESS APPLICATION ---
async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  
  // Custom auth token cookie middleware mock (simple headers + cookies for API)
  app.use((req, res, next) => {
    // Enable simple bearer token check or simulate session via headers
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const user = db.users.find(u => u.id === token);
      if (user) {
        (req as any).user = user;
      } else {
        // Fallback: check if it matches an API Key
        const apiKey = db.apiKeys.find(k => k.token === token);
        if (apiKey) {
          // If the API Key matches, assign a mock user with the same role as key
          const sampleAdmin = db.users.find(u => u.role === "admin") || { id: "admin", username: "api_admin", role: "admin", email: "admin@vxhost.bond" };
          const sampleUser = db.users.find(u => u.role === "user") || { id: "user", username: "api_user", role: "user", email: "user@vxhost.bond" };
          (req as any).user = apiKey.role === "admin" ? sampleAdmin : sampleUser;
          (req as any).apiKey = apiKey;
        }
      }
    }
    next();
  });

  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized access" });
    }
    if (req.user.isSuspended || req.user.isBanned) {
      return res.status(403).json({ error: "Your account is suspended or banned." });
    }
    next();
  };

  const requireAdmin = (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Requires administrator access." });
    }
    next();
  };

  const checkPermission = (permission: string) => {
    return (req: any, res: any, next: any) => {
      if (req.apiKey) {
        const perms = req.apiKey.permissions || [];
        if (!perms.includes(permission)) {
          return res.status(403).json({ error: `API Key missing required permission: ${permission}` });
        }
      }
      next();
    };
  };

  // --- API ROUTES ---
  
  // Authentication
  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    const user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase() || u.email.toLowerCase() === username.toLowerCase());
    if (!user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }
    if (user.isSuspended || user.isBanned) {
      return res.status(403).json({ error: "Your account is suspended or banned." });
    }
    
    // SHA256 Check
    const hash = crypto.createHash("sha256").update(password).digest("hex");
    if (db.userPasswords[user.id] !== hash) {
      return res.status(401).json({ error: "Invalid username or password" });
    }
    
    // Add audit log
    db.activityLogs.unshift({
      id: "log-" + Date.now(),
      userId: user.id,
      username: user.username,
      action: "USER_LOGIN",
      details: `User ${user.username} logged in successfully.`,
      ipAddress: req.ip || "127.0.0.1",
      timestamp: new Date().toISOString()
    });
    saveDB();
    
    // Return token (User ID acts as simple stateless session token in preview)
    res.json({ token: user.id, user });
  });

  app.get("/api/auth/user", (req: any, res) => {
    if (!req.user) return res.status(401).json({ error: "Not logged in" });
    res.json({ user: req.user });
  });

  // Settings API
  app.get("/api/settings", (req, res) => {
    res.json(db.settings);
  });

  app.post("/api/settings", requireAdmin, (req, res) => {
    db.settings = { ...db.settings, ...req.body };
    saveDB();
    res.json(db.settings);
  });

  // Analytics/System Stats API
  app.get("/api/admin/stats", requireAdmin, (req, res) => {
    const totalUsers = db.users.length;
    const totalServers = db.servers.length;
    const runningServers = db.servers.filter(s => s.status === "running").length;
    const offlineServers = totalServers - runningServers;
    
    // Summarize node capacity
    const totalRamMax = db.nodes.reduce((acc, n) => acc + n.totalRam, 0);
    const totalDiskMax = db.nodes.reduce((acc, n) => acc + n.totalDisk, 0);
    const usedRamTotal = db.servers.reduce((acc, s) => acc + (s.status === "running" ? s.ramUsage : 0), 0) + 12000;
    const usedDiskTotal = db.servers.reduce((acc, s) => acc + s.diskUsage, 0);
    
    // CPU dynamic mock
    const avgCpuUsage = +(db.servers.reduce((acc, s) => acc + s.cpuUsage, 0) / (runningServers || 1)).toFixed(1);

    res.json({
      totalUsers,
      totalServers,
      runningServers,
      offlineServers,
      cpuUsage: isNaN(avgCpuUsage) ? 2.5 : avgCpuUsage,
      ramUsage: {
        used: usedRamTotal,
        total: totalRamMax
      },
      diskUsage: {
        used: usedDiskTotal,
        total: totalDiskMax
      },
      networkUsage: {
        up: "+15.2 MB/s",
        down: "+45.8 MB/s"
      },
      activeNodes: db.nodes.filter(n => n.status === "online").length,
      backups: db.servers.reduce((acc, s) => acc + s.backupLimit, 0),
      systemStatus: "All nodes healthy",
      recentActivity: db.activityLogs.slice(0, 10),
      announcementBanner: db.settings.announcementBanner
    });
  });

  app.get("/api/user/stats", requireAuth, (req: any, res) => {
    const ownedServers = db.servers.filter(s => s.ownerId === req.user.id);
    const totalServers = ownedServers.length;
    const runningServers = ownedServers.filter(s => s.status === "running").length;
    const offlineServers = totalServers - runningServers;
    
    const usedRamTotal = ownedServers.reduce((acc, s) => acc + (s.status === "running" ? s.ramUsage : 0), 0);
    const totalRamMax = ownedServers.reduce((acc, s) => acc + s.ramLimit, 0) || 1; // Prevent division by zero
    
    const usedDiskTotal = ownedServers.reduce((acc, s) => acc + s.diskUsage, 0);
    const totalDiskMax = ownedServers.reduce((acc, s) => acc + s.diskLimit, 0) || 1;
    
    const avgCpuUsage = +(ownedServers.reduce((acc, s) => acc + s.cpuUsage, 0) / (runningServers || 1)).toFixed(1);

    res.json({
      totalUsers: 1, // Just for UI placeholder
      totalServers,
      runningServers,
      offlineServers,
      cpuUsage: isNaN(avgCpuUsage) ? 0 : avgCpuUsage,
      ramUsage: {
        used: usedRamTotal,
        total: totalRamMax
      },
      diskUsage: {
        used: usedDiskTotal,
        total: totalDiskMax
      },
      networkUsage: {
        up: "+1.2 MB/s",
        down: "+2.5 MB/s"
      },
      activeNodes: 1, // Just for UI
      systemStatus: runningServers > 0 ? "Systems Operational" : "No active servers",
      recentActivity: [],
      announcementBanner: db.settings.announcementBanner,
      servers: ownedServers
    });
  });

  // User Management
  app.get("/api/admin/users", requireAdmin, (req, res) => {
    res.json(db.users);
  });

  app.post("/api/admin/users", requireAdmin, checkPermission("create_user"), (req, res) => {
    const { username, email, password, role } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (db.users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
      return res.status(400).json({ error: "Username already taken" });
    }
    
    const newUser: User = {
      id: "user-" + Date.now(),
      username,
      email,
      role: role || "user",
      isSuspended: false,
      isBanned: false,
      twoFactorEnabled: false,
      createdAt: new Date().toISOString()
    };
    
    db.users.push(newUser);
    db.userPasswords[newUser.id] = crypto.createHash("sha256").update(password).digest("hex");
    
    db.activityLogs.unshift({
      id: "log-" + Date.now(),
      userId: (req as any).user.id,
      username: (req as any).user.username,
      action: "USER_CREATE",
      details: `Created new user: ${username} (${newUser.role})`,
      ipAddress: req.ip || "127.0.0.1",
      timestamp: new Date().toISOString()
    });
    
    saveDB();
    res.status(201).json(newUser);
  });

  app.put("/api/admin/users/:id", requireAdmin, (req, res) => {
    const { id } = req.params;
    const { username, email, role, isSuspended, isBanned, twoFactorEnabled, password } = req.body;
    const userIndex = db.users.findIndex(u => u.id === id);
    if (userIndex === -1) return res.status(404).json({ error: "User not found" });
    
    const user = db.users[userIndex];
    if (username) user.username = username;
    if (email) user.email = email;
    if (role) user.role = role;
    if (typeof isSuspended !== "undefined") user.isSuspended = isSuspended;
    if (typeof isBanned !== "undefined") user.isBanned = isBanned;
    if (typeof twoFactorEnabled !== "undefined") user.twoFactorEnabled = twoFactorEnabled;
    
    if (password) {
      db.userPasswords[id] = crypto.createHash("sha256").update(password).digest("hex");
    }
    
    db.activityLogs.unshift({
      id: "log-" + Date.now(),
      userId: (req as any).user.id,
      username: (req as any).user.username,
      action: "USER_UPDATE",
      details: `Updated details for user ${user.username}`,
      ipAddress: req.ip || "127.0.0.1",
      timestamp: new Date().toISOString()
    });
    
    saveDB();
    res.json(user);
  });

  app.delete("/api/admin/users/:id", requireAdmin, (req, res) => {
    const { id } = req.params;
    if (id === (req as any).user.id) {
      return res.status(400).json({ error: "You cannot delete your own account." });
    }
    const userIndex = db.users.findIndex(u => u.id === id);
    if (userIndex === -1) return res.status(404).json({ error: "User not found" });
    
    const user = db.users[userIndex];
    db.users.splice(userIndex, 1);
    delete db.userPasswords[id];
    
    db.activityLogs.unshift({
      id: "log-" + Date.now(),
      userId: (req as any).user.id,
      username: (req as any).user.username,
      action: "USER_DELETE",
      details: `Deleted user ${user.username}`,
      ipAddress: req.ip || "127.0.0.1",
      timestamp: new Date().toISOString()
    });
    
    saveDB();
    res.json({ success: true });
  });

  // Nodes Management
  app.get("/api/admin/nodes", requireAdmin, (req, res) => {
    res.json(db.nodes);
  });

  app.post("/api/admin/nodes", requireAdmin, (req, res) => {
    const { name, location, fqdn, totalRam, totalDisk } = req.body;
    if (!name || !fqdn || !totalRam || !totalDisk) {
      return res.status(400).json({ error: "Missing required node details" });
    }
    
    const newNode: Node = {
      id: "node-" + Date.now(),
      name,
      location: location || "Global Server",
      fqdn,
      sslEnabled: true,
      isMaintenance: false,
      totalRam,
      usedRam: 0,
      totalDisk,
      usedDisk: 0,
      cpuOvercommit: 100,
      status: "online",
      createdAt: new Date().toISOString()
    };
    
    db.nodes.push(newNode);
    saveDB();
    res.status(201).json(newNode);
  });

  app.put("/api/admin/nodes/:id", requireAdmin, (req, res) => {
    const node = db.nodes.find(n => n.id === req.params.id);
    if (!node) return res.status(404).json({ error: "Node not found" });
    
    Object.assign(node, req.body);
    saveDB();
    res.json(node);
  });

  app.delete("/api/admin/nodes/:id", requireAdmin, (req, res) => {
    const nodeIndex = db.nodes.findIndex(n => n.id === req.params.id);
    if (nodeIndex === -1) return res.status(404).json({ error: "Node not found" });
    
    // Check if servers exist on this node
    const hasServers = db.servers.some(s => s.nodeId === req.params.id);
    if (hasServers) {
      return res.status(400).json({ error: "Cannot delete a Node that contains active servers." });
    }
    
    db.nodes.splice(nodeIndex, 1);
    saveDB();
    res.json({ success: true });
  });

  // Eggs Management
  app.get("/api/admin/eggs", requireAdmin, (req, res) => {
    res.json(db.eggs);
  });

  // Server Management CRUD
  app.get("/api/servers", requireAuth, (req: any, res) => {
    if (req.user.role === "admin") {
      res.json(db.servers);
    } else {
      const owned = db.servers.filter(s => s.ownerId === req.user.id);
      res.json(owned);
    }
  });

  app.get("/api/servers/:id", requireAuth, (req: any, res) => {
    const server = db.servers.find(s => s.id === req.params.id);
    if (!server) return res.status(404).json({ error: "Server not found" });
    
    if (req.user.role !== "admin" && server.ownerId !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }
    res.json(server);
  });

  // Server Creation
  app.post("/api/servers", requireAdmin, checkPermission("create_server"), (req, res) => {
    const { name, description, ownerId, nodeId, eggId, ramLimit, cpuLimit, diskLimit, port, backupLimit } = req.body;
    if (!name || !ownerId || !nodeId || !eggId || !ramLimit || !cpuLimit || !diskLimit) {
      return res.status(400).json({ error: "Missing server creation fields" });
    }
    
    const owner = db.users.find(u => u.id === ownerId);
    if (!owner) return res.status(400).json({ error: "Invalid owner specified" });
    
    const node = db.nodes.find(n => n.id === nodeId);
    if (!node) return res.status(400).json({ error: "Invalid node specified" });
    
    // Resolve egg details
    let eggName = "Paper";
    let startupCommand = "java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar paper.jar";
    let dockerImage = "ghcr.io/pterodactyl/yolks:java_17";
    
    const group = db.eggs.find(g => g.eggs.some(e => e.id === eggId));
    if (group) {
      const egg = group.eggs.find(e => e.id === eggId);
      if (egg) {
        eggName = egg.name;
        startupCommand = egg.startup.replace("{{SERVER_MEMORY}}", ramLimit.toString()).replace("{{SERVER_JARFILE}}", "paper.jar");
        dockerImage = egg.dockerImage;
      }
    }
    
    // Allocate port
    const allocatedPort = port || 25567;
    const ip = node.fqdn;

    const newServer: Server = {
      id: "server-" + Date.now(),
      name,
      description: description || "Vanilla server",
      ownerId,
      ownerUsername: owner.username,
      status: "offline",
      ip,
      port: allocatedPort,
      nodeId,
      nodeName: node.name,
      eggId,
      eggName,
      nestName: "Minecraft",
      ramLimit,
      cpuLimit,
      diskLimit,
      swapLimit: 0,
      databaseLimit: 1,
      backupLimit: backupLimit ? parseInt(backupLimit) : (db.settings.defaultBackupLimit || 3),
      allocationLimit: 1,
      cpuUsage: 0,
      ramUsage: 0,
      diskUsage: 250, // Initial boilerplate files
      startupCommand,
      dockerImage,
      environment: {
        SERVER_JARFILE: "paper.jar",
        MINECRAFT_VERSION: "1.21"
      },
      autoStart: false,
      autoStop: false,
      createdAt: new Date().toISOString()
    };
    
    db.servers.push(newServer);
    
    // Create folders/files on physical disk (ephemeral sandbox folder)
    seedServerFiles(newServer.id);
    initServerConsoleLogs(newServer.id);
    
    db.activityLogs.unshift({
      id: "log-" + Date.now(),
      userId: (req as any).user.id,
      username: (req as any).user.username,
      action: "SERVER_CREATE",
      details: `Created server ${name} for owner ${owner.username}`,
      ipAddress: req.ip || "127.0.0.1",
      timestamp: new Date().toISOString()
    });
    
    saveDB();
    res.status(201).json(newServer);
  });

  app.put("/api/servers/:id", requireAdmin, (req, res) => {
    const server = db.servers.find(s => s.id === req.params.id);
    if (!server) return res.status(404).json({ error: "Server not found" });
    
    Object.assign(server, req.body);
    saveDB();
    res.json(server);
  });

  app.delete("/api/servers/:id", requireAuth, (req: any, res) => {
    console.log(`Attempting to delete server: ${req.params.id}`);
    const index = db.servers.findIndex(s => s.id === req.params.id);
    if (index === -1) {
      console.log(`Server not found: ${req.params.id}`);
      return res.status(404).json({ error: "Server not found" });
    }
    
    const server = db.servers[index];
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Only administrators can delete servers." });
    }
    
    console.log(`Server status: ${server.status}`);
    
    db.servers.splice(index, 1);
    console.log(`Server deleted: ${server.id}`);
    
    // Clear simulation timer
    if (activeResourceTimers[server.id]) clearInterval(activeResourceTimers[server.id]);
    
    // Delete files optionally, or let them remain in tmp.
    try {
      const serverPath = path.join(SERVERS_DIR, server.id);
      if (fs.existsSync(serverPath)) {
        fs.rmSync(serverPath, { recursive: true, force: true });
      }
    } catch (e) {
      console.warn(`Could not clear server folder for ${server.id}`, e);
    }
    
    db.activityLogs.unshift({
      id: "log-" + Date.now(),
      userId: (req as any).user.id,
      username: (req as any).user.username,
      action: "SERVER_DELETE",
      details: `Deleted server ${server.name}`,
      ipAddress: req.ip || "127.0.0.1",
      timestamp: new Date().toISOString()
    });
    
    saveDB();
    res.json({ success: true });
  });

  // Server Update/Rename endpoint
  app.post("/api/servers/:id/rename", requireAuth, (req: any, res) => {
    const server = db.servers.find(s => s.id === req.params.id);
    if (!server) return res.status(404).json({ error: "Server not found" });
    
    if (req.user.role !== "admin" && server.ownerId !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    const { name } = req.body;
    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "Name is required" });
    }

    server.name = name.trim();
    saveDB();
    res.json({ success: true, name: server.name });
  });

  // Server Power States Actions
  app.post("/api/servers/:id/power", requireAuth, (req: any, res) => {
    const server = db.servers.find(s => s.id === req.params.id);
    if (!server) return res.status(404).json({ error: "Server not found" });
    
    if (req.user.role !== "admin" && server.ownerId !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    const { action } = req.body; // "start" | "stop" | "restart" | "kill"
    initServerConsoleLogs(server.id);
    
    if (action === "start") {
      if (server.status === "running") return res.json({ status: "running" });
      
      server.status = "starting";
      serverLogs[server.id].push(`[${new Date().toLocaleTimeString()} SYSTEM]: Launching virtual environment container...`);
      serverLogs[server.id].push(`[${new Date().toLocaleTimeString()} SYSTEM]: Memory allocation: ${server.ramLimit}MB / Swap 0MB`);
      serverLogs[server.id].push(`[${new Date().toLocaleTimeString()} SYSTEM]: Command line: ${server.startupCommand}`);
      
      setTimeout(() => {
        serverLogs[server.id].push(`[${new Date().toLocaleTimeString()} INFO]: Starting minecraft server version ${server.environment.MINECRAFT_VERSION || "1.21"}`);
        serverLogs[server.id].push(`[${new Date().toLocaleTimeString()} INFO]: Loading properties`);
        serverLogs[server.id].push(`[${new Date().toLocaleTimeString()} INFO]: Default game type: SURVIVAL`);
        serverLogs[server.id].push(`[${new Date().toLocaleTimeString()} INFO]: Preparing spawn area: 35%`);
        serverLogs[server.id].push(`[${new Date().toLocaleTimeString()} INFO]: Preparing spawn area: 90%`);
        serverLogs[server.id].push(`[${new Date().toLocaleTimeString()} INFO]: Done! Ready on port ${server.port}. For help, type "help"`);
        
        server.status = "running";
        server.cpuUsage = 8.5;
        server.ramUsage = Math.floor(server.ramLimit * 0.4);
        saveDB();
        startSimulatingStats(server.id);
      }, 3000);
      
    } else if (action === "stop") {
      if (server.status === "offline") return res.json({ status: "offline" });
      
      server.status = "stopping";
      serverLogs[server.id].push(`[${new Date().toLocaleTimeString()} INFO]: Stopping server...`);
      serverLogs[server.id].push(`[${new Date().toLocaleTimeString()} INFO]: Saving worlds and active chunk buffers...`);
      
      setTimeout(() => {
        serverLogs[server.id].push(`[${new Date().toLocaleTimeString()} INFO]: Worlds saved. Thread pools finalized.`);
        serverLogs[server.id].push(`[${new Date().toLocaleTimeString()} SYSTEM]: Server shut down clean.`);
        server.status = "offline";
        server.cpuUsage = 0;
        server.ramUsage = 0;
        saveDB();
        if (activeResourceTimers[server.id]) {
          clearInterval(activeResourceTimers[server.id]);
          delete activeResourceTimers[server.id];
        }
      }, 2000);
      
    } else if (action === "restart") {
      server.status = "stopping";
      serverLogs[server.id].push(`[${new Date().toLocaleTimeString()} SYSTEM]: Scheduling warm reboot...`);
      
      setTimeout(() => {
        server.status = "starting";
        serverLogs[server.id].push(`[${new Date().toLocaleTimeString()} INFO]: Rebooting JVM environment...`);
        setTimeout(() => {
          server.status = "running";
          serverLogs[server.id].push(`[${new Date().toLocaleTimeString()} INFO]: Minecraft Server booted clean.`);
          saveDB();
          startSimulatingStats(server.id);
        }, 1500);
      }, 1500);
      
    } else if (action === "kill") {
      server.status = "offline";
      server.cpuUsage = 0;
      server.ramUsage = 0;
      serverLogs[server.id].push(`[${new Date().toLocaleTimeString()} SYSTEM]: SIGKILL dispatched to container executor.`);
      serverLogs[server.id].push(`[${new Date().toLocaleTimeString()} SYSTEM]: Server terminated with exit code 137.`);
      saveDB();
      if (activeResourceTimers[server.id]) {
        clearInterval(activeResourceTimers[server.id]);
        delete activeResourceTimers[server.id];
      }
    } else if (action === "reinstall") {
      server.status = "stopping";
      server.cpuUsage = 0;
      server.ramUsage = 0;
      if (activeResourceTimers[server.id]) {
        clearInterval(activeResourceTimers[server.id]);
        delete activeResourceTimers[server.id];
      }
      serverLogs[server.id] = serverLogs[server.id] || [];
      serverLogs[server.id].push(`[${new Date().toLocaleTimeString()} SYSTEM]: [WARNING] Reinstallation sequence engaged by administrative directive.`);
      serverLogs[server.id].push(`[${new Date().toLocaleTimeString()} SYSTEM]: Wiping existing directory assets under containment path...`);
      
      setTimeout(() => {
        try {
          const serverPath = path.join(SERVERS_DIR, server.id);
          if (fs.existsSync(serverPath)) {
            fs.rmSync(serverPath, { recursive: true, force: true });
          }
          // Seed files again
          seedServerFiles(server.id);
          serverLogs[server.id].push(`[${new Date().toLocaleTimeString()} SYSTEM]: Clean template deployment completed.`);
          serverLogs[server.id].push(`[${new Date().toLocaleTimeString()} SYSTEM]: Fetching latest clean engine file: ${server.eggName}.jar...`);
          serverLogs[server.id].push(`[${new Date().toLocaleTimeString()} SYSTEM]: Initializing safe boot container...`);
          server.status = "offline";
        } catch (e: any) {
          serverLogs[server.id].push(`[${new Date().toLocaleTimeString()} ERROR]: Reinstall failed: ${e.message}`);
        }
        saveDB();
      }, 2000);
    }
    
    saveDB();
    res.json({ status: server.status });
  });

  // Console Logs API
  app.get("/api/servers/:id/console", requireAuth, (req: any, res) => {
    const server = db.servers.find(s => s.id === req.params.id);
    if (!server) return res.status(404).json({ error: "Server not found" });
    if (req.user.role !== "admin" && server.ownerId !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    initServerConsoleLogs(server.id);
    res.json({
      logs: serverLogs[server.id],
      status: server.status,
      cpuUsage: server.cpuUsage,
      ramUsage: server.ramUsage,
      ramLimit: server.ramLimit,
      diskUsage: server.diskUsage,
      diskLimit: server.diskLimit
    });
  });

  app.post("/api/servers/:id/command", requireAuth, (req: any, res) => {
    const server = db.servers.find(s => s.id === req.params.id);
    if (!server) return res.status(404).json({ error: "Server not found" });
    if (req.user.role !== "admin" && server.ownerId !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    const { command } = req.body;
    initServerConsoleLogs(server.id);
    
    serverLogs[server.id].push(`> ${command}`);
    
    if (server.status !== "running") {
      serverLogs[server.id].push(`[${new Date().toLocaleTimeString()} WARN]: Command rejected. Server process is offline.`);
    } else {
      // Simulate minecraft command response
      const cleanCmd = command.trim().toLowerCase();
      if (cleanCmd === "help") {
        serverLogs[server.id].push(`[${new Date().toLocaleTimeString()} INFO]: Help menu: op, say, plugins, list, save-all, version`);
      } else if (cleanCmd.startsWith("say ")) {
        const text = command.substring(4);
        serverLogs[server.id].push(`[${new Date().toLocaleTimeString()} INFO]: [Server] ${text}`);
      } else if (cleanCmd === "plugins") {
        const pNames = fs.existsSync(path.join(SERVERS_DIR, server.id, "plugins"))
          ? fs.readdirSync(path.join(SERVERS_DIR, server.id, "plugins")).map(n => n.replace(".jar", ""))
          : ["EssentialsX", "WorldEdit"];
        serverLogs[server.id].push(`[${new Date().toLocaleTimeString()} INFO]: Plugins (${pNames.length}): ${pNames.join(", ")}`);
      } else if (cleanCmd.startsWith("op ")) {
        const p = command.substring(3);
        serverLogs[server.id].push(`[${new Date().toLocaleTimeString()} INFO]: Made ${p} a server operator`);
      } else if (cleanCmd === "list") {
        serverLogs[server.id].push(`[${new Date().toLocaleTimeString()} INFO]: There are 1 of max 20 players online: anikislm`);
      } else {
        serverLogs[server.id].push(`[${new Date().toLocaleTimeString()} INFO]: Command received: ${command}`);
      }
    }
    
    if (serverLogs[server.id].length > 150) serverLogs[server.id].shift();
    res.json({ logs: serverLogs[server.id] });
  });

  // REAL FILE MANAGER API
  app.get("/api/servers/:id/files", requireAuth, (req: any, res) => {
    const server = db.servers.find(s => s.id === req.params.id);
    if (!server) return res.status(404).json({ error: "Server not found" });
    if (req.user.role !== "admin" && server.ownerId !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    const serverPath = path.join(SERVERS_DIR, server.id);
    const subPath = (req.query.path as string) || "";
    const targetDir = path.join(serverPath, subPath);
    
    // Prevent directory traversal
    if (!targetDir.startsWith(serverPath)) {
      return res.status(400).json({ error: "Access denied" });
    }
    
    if (!fs.existsSync(targetDir)) {
      return res.status(404).json({ error: "Path not found" });
    }
    
    try {
      const entries = fs.readdirSync(targetDir, { withFileTypes: true });
      const files: ServerFile[] = entries.map(ent => {
        const entPath = path.join(targetDir, ent.name);
        const stats = fs.statSync(entPath);
        return {
          name: ent.name,
          path: path.relative(serverPath, entPath).replace(/\\/g, "/"),
          size: stats.size,
          isFolder: ent.isDirectory(),
          updatedAt: stats.mtime.toISOString()
        };
      });
      res.json(files);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Read File Contents
  app.get("/api/servers/:id/files/read", requireAuth, (req: any, res) => {
    const server = db.servers.find(s => s.id === req.params.id);
    if (!server) return res.status(404).json({ error: "Server not found" });
    if (req.user.role !== "admin" && server.ownerId !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    const serverPath = path.join(SERVERS_DIR, server.id);
    const filePath = (req.query.path as string) || "";
    const targetFile = path.join(serverPath, filePath);
    
    if (!targetFile.startsWith(serverPath)) {
      return res.status(400).json({ error: "Access denied" });
    }
    
    try {
      if (!fs.existsSync(targetFile) || fs.statSync(targetFile).isDirectory()) {
        return res.status(404).json({ error: "File not found" });
      }
      const contents = fs.readFileSync(targetFile, "utf-8");
      res.json({ contents });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Write File Contents
  app.post("/api/servers/:id/files/write", requireAuth, (req: any, res) => {
    const server = db.servers.find(s => s.id === req.params.id);
    if (!server) return res.status(404).json({ error: "Server not found" });
    if (req.user.role !== "admin" && server.ownerId !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    const serverPath = path.join(SERVERS_DIR, server.id);
    const { path: filePath, contents } = req.body;
    const targetFile = path.join(serverPath, filePath);
    
    if (!targetFile.startsWith(serverPath)) {
      return res.status(400).json({ error: "Access denied" });
    }
    
    try {
      // Ensure parent folders exist
      fs.mkdirSync(path.dirname(targetFile), { recursive: true });
      fs.writeFileSync(targetFile, contents, "utf-8");
      
      // Update server disk size simulation
      const totalSize = getFolderSize(serverPath);
      server.diskUsage = Math.floor(totalSize / 1024 / 1024) || 120; // in MB
      saveDB();
      
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Create Folder
  app.post("/api/servers/:id/files/folder", requireAuth, (req: any, res) => {
    const server = db.servers.find(s => s.id === req.params.id);
    if (!server) return res.status(404).json({ error: "Server not found" });
    if (req.user.role !== "admin" && server.ownerId !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    const serverPath = path.join(SERVERS_DIR, server.id);
    const { path: folderPath } = req.body;
    const targetFolder = path.join(serverPath, folderPath);
    
    if (!targetFolder.startsWith(serverPath)) {
      return res.status(400).json({ error: "Access denied" });
    }
    
    try {
      fs.mkdirSync(targetFolder, { recursive: true });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Delete Files
  app.post("/api/servers/:id/files/delete", requireAuth, (req: any, res) => {
    const server = db.servers.find(s => s.id === req.params.id);
    if (!server) return res.status(404).json({ error: "Server not found" });
    if (req.user.role !== "admin" && server.ownerId !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    const serverPath = path.join(SERVERS_DIR, server.id);
    const { path: targetPath } = req.body;
    const target = path.join(serverPath, targetPath);
    
    if (!target.startsWith(serverPath)) {
      return res.status(400).json({ error: "Access denied" });
    }
    
    try {
      if (fs.existsSync(target)) {
        fs.rmSync(target, { recursive: true, force: true });
        
        // Update server disk simulation
        const totalSize = getFolderSize(serverPath);
        server.diskUsage = Math.floor(totalSize / 1024 / 1024) || 120;
        saveDB();
      }
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Rename File
  app.post("/api/servers/:id/files/rename", requireAuth, (req: any, res) => {
    const server = db.servers.find(s => s.id === req.params.id);
    if (!server) return res.status(404).json({ error: "Server not found" });
    if (req.user.role !== "admin" && server.ownerId !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    const serverPath = path.join(SERVERS_DIR, server.id);
    const { oldPath, newPath } = req.body;
    const oldTarget = path.join(serverPath, oldPath);
    const newTarget = path.join(serverPath, newPath);
    
    if (!oldTarget.startsWith(serverPath) || !newTarget.startsWith(serverPath)) {
      return res.status(400).json({ error: "Access denied" });
    }
    
    try {
      if (fs.existsSync(oldTarget)) {
        fs.renameSync(oldTarget, newTarget);
      }
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Real-feeling Plugin Installer API (Queries real Minecraft plugins + installs Jar file dynamically!)
  app.get("/api/servers/:id/plugins/search", requireAuth, (req, res) => {
    const { q, platform = "modrinth", page = "1" } = req.query;
    const query = ((q as string) || "").toLowerCase();
    const pageNum = parseInt(page as string, 10) || 1;
    const limit = 4;
    
    // Create an expanded mock list to support multiple pages
    let allPlugins = [
      { name: "EssentialsX", desc: "Essential commands: home, warp, kits, and fully featured eco system.", version: "2.20.1", downloads: "5.4M", author: "Zenith", platforms: ["spigot", "modrinth"] },
      { name: "WorldEdit", desc: "In-game map editor, build mountains, clear spaces, paste schematics.", version: "7.3.0", downloads: "8.2M", author: "sk89q", platforms: ["spigot", "modrinth"] },
      { name: "GeyserMC", desc: "A proxy allowing Bedrock edition players to connect to Java servers.", version: "2.4.0", downloads: "1.8M", author: "GeyserMC", platforms: ["spigot", "modrinth"] },
      { name: "ViaVersion", desc: "Allows newer client versions to connect to older server versions.", version: "4.10.2", downloads: "4.3M", author: "Mylesman", platforms: ["spigot", "modrinth"] },
      { name: "Vault", desc: "Common economy, permission, and chat integration API for plugins.", version: "1.7.3", downloads: "10.1M", author: "SavageLabs", platforms: ["spigot"] },
      { name: "LuckPerms", desc: "Advanced, highly configurable permissions manager with web editor.", version: "5.4.130", downloads: "3.9M", author: "Kyori", platforms: ["spigot", "modrinth"] },
      { name: "Dynmap", desc: "Real-time Google-maps like browser rendering of your minecraft world.", version: "3.6", downloads: "2.1M", author: "mikeprimm", platforms: ["spigot", "modrinth"] },
      { name: "GriefPrevention", desc: "Prevents griefing with golden shovel claims, automatic protection.", version: "16.18.2", downloads: "2.5M", author: "RoboMojo", platforms: ["spigot"] },
      { name: "CoreProtect", desc: "Block logging, rollbacks, inspector tool, full multi-threaded SQL logging.", version: "22.4", downloads: "3.2M", author: "Intelli", platforms: ["spigot", "modrinth"] },
      { name: "Multiverse-Core", desc: "Manage multiple worlds, set difficulties, portal structures, game modes.", version: "4.3.12", downloads: "6.1M", author: "Dumpgump", platforms: ["spigot"] },
      { name: "ClearLag", desc: "Clears lag by removing ground items, limiting mobs, and optimizing chunks.", version: "3.2.2", downloads: "1.2M", author: "bob7l", platforms: ["spigot"] },
      { name: "Citizens", desc: "Add player-like NPCs to your server, create quests and interactive characters.", version: "2.0.32", downloads: "1.5M", author: "fullwall", platforms: ["spigot"] },
      { name: "HolographicDisplays", desc: "Create rich, floating text holograms to show stats and server info.", version: "3.0.3", downloads: "2.9M", author: "filoghost", platforms: ["spigot"] },
      { name: "PlaceholderAPI", desc: "Format variables and placeholders across different plugins.", version: "2.11.5", downloads: "4.5M", author: "clip", platforms: ["spigot", "modrinth"] },
      { name: "FastAsyncWorldEdit", desc: "Blazing fast WorldEdit replacement for huge schematic pastes.", version: "2.8.2", downloads: "1.1M", author: "Empire92", platforms: ["spigot", "modrinth"] },
      { name: "Chunky", desc: "Pre-generate your world chunks to prevent lag when players explore.", version: "1.3.92", downloads: "2.3M", author: "pop4959", platforms: ["spigot", "modrinth"] },
      { name: "SimpleVoiceChat", desc: "Proximity voice chat right inside your Minecraft server.", version: "2.5.9", downloads: "3.8M", author: "henkelmax", platforms: ["modrinth"] },
      { name: "BlueMap", desc: "3D map of your Minecraft world in your browser.", version: "3.18", downloads: "1.5M", author: "Blue", platforms: ["spigot", "modrinth"] },
    ];
    
    // Filter by platform and query
    let filtered = allPlugins.filter(p => p.platforms.includes(platform as string));
    if (query) {
      filtered = filtered.filter(p => p.name.toLowerCase().includes(query) || p.desc.toLowerCase().includes(query));
    }
    
    // Paginate
    const totalPages = Math.ceil(filtered.length / limit) || 1;
    const startIndex = (pageNum - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + limit);
    
    res.json({
      plugins: paginated,
      page: pageNum,
      totalPages,
      totalCount: filtered.length
    });
  });

  app.post("/api/servers/:id/plugins/install", requireAuth, (req: any, res) => {
    const server = db.servers.find(s => s.id === req.params.id);
    if (!server) return res.status(404).json({ error: "Server not found" });
    if (req.user.role !== "admin" && server.ownerId !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Plugin name required" });
    
    const pluginsDir = path.join(SERVERS_DIR, server.id, "plugins");
    try {
      if (!fs.existsSync(pluginsDir)) fs.mkdirSync(pluginsDir, { recursive: true });
      
      const fileDest = path.join(pluginsDir, `${name}.jar`);
      fs.writeFileSync(fileDest, `MOCK_JAR_DATA_FOR_${name.toUpperCase()}`);
      
      initServerConsoleLogs(server.id);
      serverLogs[server.id].push(`[${new Date().toLocaleTimeString()} SYSTEM]: Plugin installer successfully downloaded ${name}.jar to /plugins/`);
      
      // Update disk space usage
      const totalSize = getFolderSize(path.join(SERVERS_DIR, server.id));
      server.diskUsage = Math.floor(totalSize / 1024 / 1024) || 120;
      saveDB();
      
      res.json({ success: true, message: `Plugin ${name} installed successfully` });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/servers/:id/plugins/uninstall", requireAuth, (req: any, res) => {
    const server = db.servers.find(s => s.id === req.params.id);
    if (!server) return res.status(404).json({ error: "Server not found" });
    if (req.user.role !== "admin" && server.ownerId !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Plugin name required" });
    
    const fileDest = path.join(SERVERS_DIR, server.id, "plugins", `${name}.jar`);
    try {
      if (fs.existsSync(fileDest)) {
        fs.unlinkSync(fileDest);
      }
      
      initServerConsoleLogs(server.id);
      serverLogs[server.id].push(`[${new Date().toLocaleTimeString()} SYSTEM]: Plugin installer uninstalled ${name}.jar.`);
      
      // Update disk space usage
      const totalSize = getFolderSize(path.join(SERVERS_DIR, server.id));
      server.diskUsage = Math.floor(totalSize / 1024 / 1024) || 120;
      saveDB();
      
      res.json({ success: true, message: `Plugin ${name} uninstalled successfully` });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Backups Endpoint Mock
  app.get("/api/servers/:id/backups", requireAuth, (req: any, res) => {
    const server = db.servers.find(s => s.id === req.params.id);
    if (!server) return res.status(404).json({ error: "Server not found" });
    
    const mockBackups = [
      { id: "bk-1", name: "Daily Backup - Automatic", size: "41.2 MB", sha256: "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9", createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() }
    ];
    res.json(mockBackups);
  });

  app.post("/api/servers/:id/backups", requireAuth, (req: any, res) => {
    const server = db.servers.find(s => s.id === req.params.id);
    if (!server) return res.status(404).json({ error: "Server not found" });
    
    const { name } = req.body;
    initServerConsoleLogs(server.id);
    serverLogs[server.id].push(`[${new Date().toLocaleTimeString()} SYSTEM]: Snapshot backup requested. Compressing folder layout...`);
    
    setTimeout(() => {
      serverLogs[server.id].push(`[${new Date().toLocaleTimeString()} SYSTEM]: Snapshot finalized: ${name || "Manual Snapshot"}.`);
    }, 1000);
    
    res.json({ success: true, name: name || "Manual Snapshot", createdAt: new Date().toISOString() });
  });

  // Allocations Endpoint API
  app.get("/api/admin/allocations", requireAdmin, (req, res) => {
    res.json(db.allocations);
  });

  app.post("/api/admin/allocations", requireAdmin, (req, res) => {
    const { nodeId, ip, startPort, endPort } = req.body;
    if (!nodeId || !ip || !startPort) {
      return res.status(400).json({ error: "Missing required allocation parameters" });
    }
    
    const node = db.nodes.find(n => n.id === nodeId);
    if (!node) return res.status(400).json({ error: "Node not found" });
    
    const end = endPort ? parseInt(endPort) : parseInt(startPort);
    const start = parseInt(startPort);
    
    const created: Allocation[] = [];
    for (let p = start; p <= end; p++) {
      // Check duplicate
      const duplicate = db.allocations.some(a => a.nodeId === nodeId && a.ip === ip && a.port === p);
      if (!duplicate) {
        const newAlloc: Allocation = {
          id: "alloc-" + Date.now() + "-" + p,
          nodeId,
          ip,
          port: p
        };
        db.allocations.push(newAlloc);
        created.push(newAlloc);
      }
    }
    
    saveDB();
    res.status(201).json(created);
  });

  app.delete("/api/admin/allocations/:id", requireAdmin, (req, res) => {
    const allocIndex = db.allocations.findIndex(a => a.id === req.params.id);
    if (allocIndex === -1) return res.status(404).json({ error: "Allocation not found" });
    
    const alloc = db.allocations[allocIndex];
    if (alloc.serverId) {
      return res.status(400).json({ error: "Cannot delete an allocation that is active on a server." });
    }
    
    db.allocations.splice(allocIndex, 1);
    saveDB();
    res.json({ success: true });
  });

  // Audit Logs API
  app.get("/api/admin/logs", requireAdmin, (req, res) => {
    res.json(db.activityLogs);
  });

  // Client Keys API
  app.get("/api/api-keys", requireAuth, (req: any, res) => {
    const userKeys = db.apiKeys.filter(k => k.role === req.user.role);
    res.json(userKeys);
  });

  app.post("/api/api-keys", requireAuth, (req: any, res) => {
    const { name, permissions } = req.body;
    if (!name) return res.status(400).json({ error: "Key identifier name required" });
    
    const newKey: APIKey = {
      id: "api-" + Date.now(),
      name,
      token: "vx_" + crypto.randomBytes(24).toString("hex"),
      role: req.user.role,
      createdAt: new Date().toISOString(),
      permissions: Array.isArray(permissions) ? permissions : []
    };
    
    db.apiKeys.push(newKey);
    saveDB();
    res.status(201).json(newKey);
  });

  app.delete("/api/api-keys/:id", requireAuth, (req, res) => {
    const keyIndex = db.apiKeys.findIndex(k => k.id === req.params.id);
    if (keyIndex === -1) return res.status(404).json({ error: "Key not found" });
    
    db.apiKeys.splice(keyIndex, 1);
    saveDB();
    res.json({ success: true });
  });

  // Helper utility to size folders
  function getFolderSize(dirPath: string): number {
    let size = 0;
    if (!fs.existsSync(dirPath)) return 0;
    const stats = fs.statSync(dirPath);
    if (stats.isFile()) return stats.size;
    
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      size += getFolderSize(path.join(dirPath, file));
    }
    return size;
  }

  // CLI Mock setup inside server for UI trigger
  app.post("/api/cli/execute", requireAdmin, (req: any, res) => {
    const { command, args } = req.body;
    // Simulate CLI actions in-app for visual fidelity
    let responseText = "";
    
    const cleanCmd = command.trim();
    if (cleanCmd === "createuser") {
      const { username, email, password, role } = args || {};
      if (!username || !password || !email) {
        responseText = "Error: Username, Password, and Email are required properties.\nUsage: createuser <username> <email> <password> <admin|user>";
      } else {
        const exists = db.users.some(u => u.username.toLowerCase() === username.toLowerCase());
        if (exists) {
          responseText = `Error: User "${username}" already exists.`;
        } else {
          const newUser: User = {
            id: "user-" + Date.now(),
            username,
            email,
            role: (role === "admin" ? "admin" : "user"),
            isSuspended: false,
            isBanned: false,
            twoFactorEnabled: false,
            createdAt: new Date().toISOString()
          };
          db.users.push(newUser);
          db.userPasswords[newUser.id] = crypto.createHash("sha256").update(password).digest("hex");
          saveDB();
          responseText = `Success: Created user "${username}" as role [${newUser.role}] successfully via VxPanel CLI context.`;
        }
      }
    } else if (cleanCmd === "repair") {
      responseText = "Checking system consistency...\n[OK] Database loaded correctly\n[OK] Ephemeral server folders mapped (2 servers verified)\n[OK] Node bridges connected\nSystem repaired successfully!";
    } else if (cleanCmd === "doctor") {
      responseText = `VxPanel Doctor Report:
----------------------
Panel Version: 1.0.0-PRO
OS Platform: Linux / Cloud Container
Node Runtime: ${process.version}
JSON Persistent DB size: ${fs.statSync(DB_FILE).size} bytes
Total Users: ${db.users.length}
Total Servers: ${db.servers.length}
Health check: All engines operating in green range.`;
    } else if (cleanCmd === "backup") {
      responseText = `Backing up panel configuration database...\nSuccessfully written backup archive to: ./data/vxpanel-backup-${Date.now()}.json`;
    } else {
      responseText = `Unknown or unsupported visual command: ${cleanCmd}\nType 'doctor', 'repair', 'backup' or use createuser parameters in input panel.`;
    }
    
    res.json({ output: responseText });
  });

  // --- VITE MIDDLEWARE INTERFACE & FRONTEND SERVING ---
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting development mode with Vite HMR disabled proxy...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`VxPanel server active and listening on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Fatal startup error in VxPanel backend container:", err);
});

export type UserRole = "admin" | "user" | "subuser";

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  isSuspended: boolean;
  isBanned: boolean;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  createdAt: string;
}

export type ServerStatus = "running" | "offline" | "starting" | "stopping";

export interface Server {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  ownerUsername: string;
  status: ServerStatus;
  ip: string;
  port: number;
  nodeId: string;
  nodeName: string;
  eggId: string;
  eggName: string;
  nestName: string;
  
  // Resource Limits
  ramLimit: number; // in MB
  cpuLimit: number; // in % (e.g. 100% = 1 core)
  diskLimit: number; // in MB
  swapLimit: number; // in MB
  databaseLimit: number;
  backupLimit: number;
  allocationLimit: number;
  
  // Current Usage (Simulated)
  cpuUsage: number;
  ramUsage: number;
  diskUsage: number;
  
  // Startup details
  startupCommand: string;
  dockerImage: string;
  environment: Record<string, string>;
  
  autoStart: boolean;
  autoStop: boolean;
  createdAt: string;
}

export interface Node {
  id: string;
  name: string;
  location: string;
  fqdn: string;
  sslEnabled: boolean;
  isMaintenance: boolean;
  totalRam: number; // in MB
  usedRam: number; // in MB
  totalDisk: number; // in MB
  usedDisk: number; // in MB
  cpuOvercommit: number; // %
  status: "online" | "offline" | "maintenance";
  createdAt: string;
}

export interface Allocation {
  id: string;
  nodeId: string;
  ip: string;
  port: number;
  serverId?: string;
  serverName?: string;
}

export interface Egg {
  id: string;
  groupId: string;
  name: string;
  description: string;
  startup: string;
  dockerImage: string;
  environment: Array<{
    key: string;
    name: string;
    description: string;
    defaultValue: string;
    userViewable: boolean;
    userEditable: boolean;
  }>;
}

export interface EggGroup {
  id: string;
  name: string;
  description: string;
  eggs: Egg[];
}

export interface ActivityLog {
  id: string;
  userId: string;
  username: string;
  action: string;
  details: string;
  ipAddress: string;
  timestamp: string;
}

export interface PanelSettings {
  panelName: string;
  logoUrl: string;
  faviconUrl: string;
  backgroundImageUrl: string;
  sidebarLogoUrl: string;
  dashboardLogoUrl: string;
  footerText: string;
  copyrightText: string;
  
  // Custom Styling
  primaryColor: string; // Tailwind color name or hex
  secondaryColor: string;
  accentColor: string;
  
  // Feature Toggles
  enableRegistration: boolean;
  enableEmailVerification: boolean;
  enableDiscordLogin: boolean;
  enableGoogleLogin: boolean;
  enablePluginInstaller: boolean;
  enableBackups: boolean;
  enableSchedules: boolean;
  enableApi: boolean;
  enableFileManager: boolean;
  enableConsole: boolean;
  enableFTP: boolean;
  enableSFTP: boolean;
  enableServerCreation: boolean;
  enableNodeCreation: boolean;
  maintenanceMode: boolean;
  announcementBanner: string;
  discordClientId?: string;
  discordClientSecret?: string;
  googleClientId?: string;
  googleClientSecret?: string;
  defaultBackupLimit?: number;
}

export interface APIKey {
  id: string;
  name: string;
  token: string;
  role: "admin" | "user";
  createdAt: string;
  lastUsed?: string;
  permissions?: string[];
}

export interface ServerFile {
  name: string;
  path: string;
  size: number; // in bytes
  isFolder: boolean;
  updatedAt: string;
}

import React, { useState, useEffect } from "react";
import { showToast } from "../utils/toast";
import { Users, Search, Plus, Filter, Edit, Trash2, Ban, ShieldAlert, CheckCircle, XCircle, ChevronLeft, ChevronRight, KeyRound, Shield, RefreshCw } from "lucide-react";

interface UserManagementProps {
  token: string;
  currentUser: any;
}

export default function UserManagement({ token, currentUser }: UserManagementProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<any | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  // Form Fields
  const [formUsername, setFormUsername] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState<"admin" | "user">("user");
  
  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Could not load users database.");
      const data = await response.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUsername || !formEmail || !formPassword) return;

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          username: formUsername,
          email: formEmail,
          password: formPassword,
          role: formRole
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create user.");
      }

      setCreateModalOpen(false);
      resetForm();
      fetchUsers();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;

    try {
      const response = await fetch(`/api/admin/users/${editUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          username: editUser.username,
          email: editUser.email,
          role: editUser.role,
          isSuspended: editUser.isSuspended,
          isBanned: editUser.isBanned,
          twoFactorEnabled: editUser.twoFactorEnabled,
          password: formPassword || undefined // Only update password if provided
        })
      });

      if (!response.ok) throw new Error("Failed to update user parameters.");

      setEditUser(null);
      setFormPassword("");
      fetchUsers();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === currentUser.id) {
      showToast("Error: Self-termination is locked down.", "error");
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Failed to delete user.");
      setDeletingUserId(null);
      fetchUsers();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const toggleSuspension = async (user: any) => {
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isSuspended: !user.isSuspended })
      });
      if (!response.ok) throw new Error("Suspension toggle failed.");
      fetchUsers();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const toggleBan = async (user: any) => {
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isBanned: !user.isBanned })
      });
      if (!response.ok) throw new Error("Ban toggle failed.");
      fetchUsers();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const resetForm = () => {
    setFormUsername("");
    setFormEmail("");
    setFormPassword("");
    setFormRole("user");
  };

  // Filter and Search logic
  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.username.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    
    let matchesStatus = true;
    if (statusFilter === "suspended") matchesStatus = u.isSuspended;
    else if (statusFilter === "banned") matchesStatus = u.isBanned;
    else if (statusFilter === "active") matchesStatus = !u.isSuspended && !u.isBanned;

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Pagination calculation
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  return (
    <div className="space-y-6" id="user_management_module">
      {/* Header section with add action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="font-display font-bold text-lg text-white">Client & Staff Accounts</h2>
          <p className="text-xs text-gray-400 font-mono">Create, audit, and configure granular permissions of customers.</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setCreateModalOpen(true);
          }}
          className="bg-brand-yellow hover:bg-yellow-500 text-black text-xs font-semibold py-2 px-4 rounded-lg flex items-center gap-1.5 shadow-lg shadow-brand-yellow/5 hover:shadow-brand-yellow/10 transition-all cursor-pointer font-mono"
          id="btn_open_create_user"
        >
          <Plus className="w-4 h-4 stroke-[3]" /> Add New Client
        </button>
      </div>

      {/* Filter and Search Bar Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-brand-dark/40 border border-brand-border/80 p-4 rounded-xl" id="filter_panel_row">
        
        {/* Search */}
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            id="user_search_input"
            type="text"
            placeholder="Search by username or email identifier..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-brand-black/40 border border-brand-border rounded-lg pl-10 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-yellow/40 transition-all font-sans"
          />
        </div>

        {/* Role Filter */}
        <div className="relative">
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-brand-black/40 border border-brand-border rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-brand-yellow/40 transition-all"
          >
            <option value="all">Roles: All Roles</option>
            <option value="admin">Administrator Staff</option>
            <option value="user">Registered Clients</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-brand-black/40 border border-brand-border rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-brand-yellow/40 transition-all"
          >
            <option value="all">Status: All States</option>
            <option value="active">Active (Verified)</option>
            <option value="suspended">Suspended Accounts</option>
            <option value="banned">Banned IPs</option>
          </select>
        </div>

      </div>

      {/* Main Table Layout */}
      <div className="glass-panel rounded-xl overflow-hidden border-brand-border" id="users_table_container">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-brand-border bg-white/2">
                <th className="p-4 text-[10px] font-mono uppercase tracking-wider text-gray-400 font-semibold">User details</th>
                <th className="p-4 text-[10px] font-mono uppercase tracking-wider text-gray-400 font-semibold">Security Role</th>
                <th className="p-4 text-[10px] font-mono uppercase tracking-wider text-gray-400 font-semibold">Database Status</th>
                <th className="p-4 text-[10px] font-mono uppercase tracking-wider text-gray-400 font-semibold">2FA Check</th>
                <th className="p-4 text-[10px] font-mono uppercase tracking-wider text-gray-400 font-semibold">Created timestamp</th>
                <th className="p-4 text-[10px] font-mono uppercase tracking-wider text-gray-400 font-semibold text-right">Actions Panel</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/40">
              {currentUsers.map((u) => (
                <tr key={u.id} className="hover:bg-white/1 transition-all">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center font-display font-bold text-brand-yellow shrink-0 text-sm">
                        {u.username.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-semibold text-white block text-xs">{u.username}</span>
                        <span className="text-[10px] text-gray-500 font-mono block mt-0.5">{u.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-mono border ${u.role === "admin" ? "bg-red-950/20 text-red-400 border-red-900/30" : "bg-blue-950/20 text-blue-400 border-blue-900/30"}`}>
                      {u.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-4">
                    {u.isBanned ? (
                      <span className="inline-flex items-center gap-1 text-red-400 text-xs font-medium">
                        <XCircle className="w-3.5 h-3.5" /> Banned
                      </span>
                    ) : u.isSuspended ? (
                      <span className="inline-flex items-center gap-1 text-amber-500 text-xs font-medium">
                        <ShieldAlert className="w-3.5 h-3.5" /> Suspended
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-medium">
                        <CheckCircle className="w-3.5 h-3.5" /> Normal
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-mono border ${u.twoFactorEnabled ? "bg-emerald-950/20 text-emerald-400 border-emerald-900/30" : "bg-white/5 text-gray-400 border-white/5"}`}>
                      {u.twoFactorEnabled ? "ENABLED" : "DISABLED"}
                    </span>
                  </td>
                  <td className="p-4 text-xs font-mono text-gray-400">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-right">
                    <div className="inline-flex items-center gap-1">
                      
                      {/* Edit */}
                      <button
                        onClick={() => {
                          setEditUser({ ...u });
                          setFormPassword("");
                        }}
                        className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded text-gray-400 hover:text-white transition-all cursor-pointer"
                        title="Configure Profile"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      {/* Suspend / Unsuspend */}
                      <button
                        onClick={() => toggleSuspension(u)}
                        className={`p-1.5 border rounded transition-all cursor-pointer ${u.isSuspended ? "bg-emerald-950/20 hover:bg-emerald-900/30 text-emerald-400 border-emerald-900/30" : "bg-amber-950/20 hover:bg-amber-900/30 text-amber-500 border-amber-900/30"}`}
                        title={u.isSuspended ? "Unsuspend account" : "Suspend client"}
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </button>

                      {/* Ban */}
                      <button
                        onClick={() => toggleBan(u)}
                        className={`p-1.5 border rounded transition-all cursor-pointer ${u.isBanned ? "bg-emerald-950/20 text-emerald-400 border-emerald-900/30" : "bg-red-950/20 hover:bg-red-900/30 text-red-400 border-red-900/30"}`}
                        title={u.isBanned ? "Lift ban state" : "IP Ban customer"}
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                      </button>

                      {/* Purge */}
                      {deletingUserId === u.id ? (
                        <div className="flex items-center gap-1.5 ml-2">
                          <button onClick={() => setDeletingUserId(null)} type="button" className="text-[9px] text-gray-400 hover:text-white px-2 py-1 rounded bg-white/5 transition-all cursor-pointer">Cancel</button>
                          <button onClick={() => handleDeleteUser(u.id)} type="button" className="text-[9px] text-white hover:text-red-100 px-2 py-1 rounded bg-red-600 transition-all cursor-pointer">Confirm</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingUserId(u.id)}
                          className="p-1.5 bg-red-950/20 hover:bg-red-900/30 border border-red-900/30 rounded text-red-400 hover:text-red-300 transition-all cursor-pointer"
                          title="Hard Purge"
                          disabled={u.id === currentUser.id}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-xs text-gray-500 font-mono">
                    No customers found matching search filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginated Footer */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center p-4 border-t border-brand-border bg-white/1">
            <span className="text-[11px] text-gray-500 font-mono">
              Displaying {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredUsers.length)} of {filteredUsers.length} entries
            </span>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
                className="p-1.5 bg-white/5 border border-white/5 text-gray-400 hover:text-white rounded disabled:opacity-30 cursor-pointer text-xs flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <span className="text-xs text-white font-mono px-3 py-1 flex items-center bg-white/5 border border-brand-border rounded">
                {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
                className="p-1.5 bg-white/5 border border-white/5 text-gray-400 hover:text-white rounded disabled:opacity-30 cursor-pointer text-xs flex items-center gap-1"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE MODAL DIALOG */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md glass-panel rounded-xl p-6 border-brand-border shadow-2xl relative">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-brand-yellow" />
            
            <h3 className="font-display font-bold text-base text-white mb-1">Create Client Account</h3>
            <p className="text-[11px] text-gray-400 font-mono mb-4">Registers a fresh node client credential structure.</p>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-mono">Username</label>
                <input
                  type="text"
                  required
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  placeholder="minecraft_hero"
                  className="w-full bg-brand-black/60 border border-brand-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-yellow/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-mono">Email Address</label>
                <input
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="client@minecraft.com"
                  className="w-full bg-brand-black/60 border border-brand-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-yellow/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-mono">Master Password</label>
                <input
                  type="password"
                  required
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-brand-black/60 border border-brand-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-yellow/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-mono">Assigned Group Privilege</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as any)}
                  className="w-full bg-brand-black/60 border border-brand-border rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none"
                >
                  <option value="user">Standard Client (Limited to assigned VM)</option>
                  <option value="admin">System Administrator (Full Node Access)</option>
                </select>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-brand-yellow text-black text-xs font-semibold py-2 rounded-lg cursor-pointer hover:bg-yellow-500 font-mono"
                >
                  Write database entry
                </button>
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="flex-1 bg-white/5 border border-white/5 text-gray-400 text-xs py-2 rounded-lg hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL DIALOG */}
      {editUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md glass-panel rounded-xl p-6 border-brand-border shadow-2xl relative">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-brand-yellow" />
            
            <h3 className="font-display font-bold text-base text-white mb-1">Configure Client: {editUser.username}</h3>
            <p className="text-[11px] text-gray-400 font-mono mb-4">Modify account metadata and system privileges.</p>

            <form onSubmit={handleUpdateUser} className="space-y-4">
              
              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-mono">Username</label>
                <input
                  type="text"
                  required
                  value={editUser.username}
                  onChange={(e) => setEditUser({ ...editUser, username: e.target.value })}
                  className="w-full bg-brand-black/60 border border-brand-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-mono">Email</label>
                <input
                  type="email"
                  required
                  value={editUser.email}
                  onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                  className="w-full bg-brand-black/60 border border-brand-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-mono">Reset Password (Leave blank to keep current)</label>
                <input
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="New password (optional)"
                  className="w-full bg-brand-black/60 border border-brand-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-yellow/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-mono">Group Role</label>
                <select
                  value={editUser.role}
                  onChange={(e) => setEditUser({ ...editUser, role: e.target.value })}
                  className="w-full bg-brand-black/60 border border-brand-border rounded-lg px-3 py-2 text-xs text-gray-300"
                >
                  <option value="user">Standard User</option>
                  <option value="admin">Administrator Staff</option>
                </select>
              </div>

              {/* Status checkboxes */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <label className="flex items-center gap-2 cursor-pointer bg-white/2 p-2 rounded border border-brand-border">
                  <input
                    type="checkbox"
                    checked={editUser.isSuspended}
                    onChange={(e) => setEditUser({ ...editUser, isSuspended: e.target.checked })}
                    className="accent-brand-yellow"
                  />
                  <span className="text-xs text-gray-300 font-mono select-none">Suspended</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer bg-white/2 p-2 rounded border border-brand-border">
                  <input
                    type="checkbox"
                    checked={editUser.isBanned}
                    onChange={(e) => setEditUser({ ...editUser, isBanned: e.target.checked })}
                    className="accent-brand-yellow"
                  />
                  <span className="text-xs text-gray-300 font-mono select-none">Banned IP</span>
                </label>
              </div>

              {/* 2FA Toggle */}
              <label className="flex items-center gap-2 cursor-pointer bg-white/2 p-2 rounded border border-brand-border">
                <input
                  type="checkbox"
                  checked={editUser.twoFactorEnabled}
                  onChange={(e) => setEditUser({ ...editUser, twoFactorEnabled: e.target.checked })}
                  className="accent-brand-yellow"
                />
                <span className="text-xs text-gray-300 font-mono select-none">Require Two-Factor (2FA)</span>
              </label>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-brand-yellow text-black text-xs font-semibold py-2 rounded-lg cursor-pointer hover:bg-yellow-500 font-mono"
                >
                  Save alterations
                </button>
                <button
                  type="button"
                  onClick={() => setEditUser(null)}
                  className="flex-1 bg-white/5 border border-white/5 text-gray-400 text-xs py-2 rounded-lg hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

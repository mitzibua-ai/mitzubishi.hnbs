/**
 * Fetches live Discord status from your DeLuca bot API (not Lanyard).
 * Run discord-status-server first. Override URL: window.STATUS_API_URL = "http://localhost:8787"
 */
(function (global) {
  const DEFAULT_API = "http://localhost:8787";

  function apiBase() {
    return String(global.STATUS_API_URL || DEFAULT_API).replace(/\/$/, "");
  }

  async function fetchUser(userId) {
    if (!userId) return null;
    try {
      const res = await fetch(apiBase() + "/api/user/" + encodeURIComponent(userId));
      const json = await res.json();
      if (!json.success || !json.data) return null;
      return json.data;
    } catch (err) {
      console.warn(
        "Discord status API unreachable. Start discord-status-server (see .env.example).",
        err
      );
      return null;
    }
  }

  async function fetchUsers(userIds) {
    const ids = [...new Set((userIds || []).filter(Boolean))];
    if (!ids.length) return {};
    try {
      const res = await fetch(
        apiBase() + "/api/users?ids=" + encodeURIComponent(ids.join(","))
      );
      const json = await res.json();
      if (!json.success || !json.data) return {};
      return json.data;
    } catch (err) {
      console.warn("Discord status API batch failed:", err);
      return {};
    }
  }

  global.DiscordStatus = {
    apiBase,
    fetchUser,
    fetchUsers,
  };
})(window);

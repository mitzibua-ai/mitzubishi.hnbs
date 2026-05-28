require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Client, GatewayIntentBits } = require("discord.js");

const PORT = Number(process.env.PORT) || 8787;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const TOKEN = process.env.DISCORD_BOT_TOKEN;

if (!TOKEN || !GUILD_ID) {
  console.error("Missing DISCORD_BOT_TOKEN or DISCORD_GUILD_ID in .env");
  console.error("Copy .env.example to .env and fill in values.");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
  ],
});

const app = express();
app.use(cors());

function activityToJson(activity) {
  if (!activity) return null;
  return {
    type: activity.type,
    name: activity.name,
    state: activity.state ?? null,
    details: activity.details ?? null,
    emoji: activity.emoji
      ? {
          name: activity.emoji.name ?? null,
          id: activity.emoji.id ?? null,
          animated: !!activity.emoji.animated,
        }
      : null,
  };
}

function memberToPayload(member) {
  const user = member.user;
  const presence = member.presence;
  const activities = (presence?.activities ?? []).map(activityToJson).filter(Boolean);

  return {
    discord_user: {
      id: user.id,
      username: user.username,
      global_name: user.globalName ?? null,
      display_name: user.globalName || user.username,
      avatar: user.avatar,
      avatarURL: user.displayAvatarURL({ size: 256, extension: "png" }),
      discriminator: user.discriminator ?? "0",
      bot: user.bot,
      avatar_decoration_data: user.avatarDecorationData
        ? { asset: user.avatarDecorationData.asset }
        : null,
    },
    discord_status: presence?.status || "offline",
    activities,
    active_on_discord_desktop: !!presence?.clientStatus?.desktop,
    active_on_discord_mobile: !!presence?.clientStatus?.mobile,
    active_on_discord_web: !!presence?.clientStatus?.web,
  };
}

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    ready: client.isReady(),
    guildId: GUILD_ID,
  });
});

app.get("/api/user/:id", async (req, res) => {
  if (!client.isReady()) {
    return res.status(503).json({ success: false, error: "Bot not ready yet" });
  }

  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    const member = await guild.members.fetch(req.params.id).catch(() => null);

    if (!member) {
      return res.status(404).json({
        success: false,
        error: "User not in your Discord server (or unknown ID)",
      });
    }

    res.json({ success: true, data: memberToPayload(member) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/users", async (req, res) => {
  if (!client.isReady()) {
    return res.status(503).json({ success: false, error: "Bot not ready yet" });
  }

  const ids = String(req.query.ids || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!ids.length) {
    return res.status(400).json({ success: false, error: "Missing ids query" });
  }

  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    const out = {};

    for (const id of ids) {
      const member = await guild.members.fetch(id).catch(() => null);
      if (member) out[id] = memberToPayload(member);
    }

    res.json({ success: true, data: out });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

client.once("ready", () => {
  console.log("Bot logged in as", client.user.tag);
  client.guilds
    .fetch(GUILD_ID)
    .then((guild) => guild.members.fetch())
    .then(() => console.log("Guild member cache loaded"))
    .catch((err) => console.warn("Cache warm-up:", err.message));
});

client.login(TOKEN);

app.listen(PORT, () => {
  console.log("DeLuca status API: http://localhost:" + PORT);
  console.log("Test: http://localhost:" + PORT + "/health");
});

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Search Roblox Usernames
  // In a real app, this would call Roblox APIs. 
  // For this demo, we simulate a "backend" that searches a predefined list.
  app.get("/api/search-roblox", async (req, res) => {
    const q = (req.query.q as string || "").trim();
    if (!q || q.length < 3) return res.json([]);
    
    try {
      // 1. Search for users by keyword
      const searchUrl = `https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(q)}&limit=10`;
      const searchRes = await fetch(searchUrl);
      const searchData = await searchRes.json();

      if (!searchData.data || searchData.data.length === 0) {
        return res.json([]);
      }

      // 2. Get user IDs to fetch thumbnails
      const userIds = searchData.data.map((u: any) => u.id).join(",");
      const thumbUrl = `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userIds}&size=150x150&format=Png&isCircular=false`;
      const thumbRes = await fetch(thumbUrl);
      const thumbData = await thumbRes.json();

      // 3. Map results together
      const results = searchData.data.map((u: any) => {
        const thumb = thumbData.data?.find((t: any) => t.targetId === u.id);
        return {
          display: u.displayName,
          username: u.name,
          avatarUrl: thumb ? thumb.imageUrl : null,
          avatarLetter: u.displayName.charAt(0).toUpperCase()
        };
      });

      res.json(results);
    } catch (error) {
      console.error("Roblox API Error:", error);
      res.status(500).json({ error: "Failed to fetch from Roblox" });
    }
  });

  // API Route: Send Robux (Simulated)
  app.post("/api/send-robux", (req, res) => {
    const { from, to, amount } = req.body;
    console.log(`[BACKEND] ${amount} Robux sent from @${from} to @${to}`);
    res.json({ success: true, message: `Successfully sent ${amount} Robux!` });
  });

  // API Route: Log Access to Discord
  app.post("/api/log-access", async (req, res) => {
    const { key, ip, status, msg } = req.body;
    const webhookUrl = "https://discord.com/api/webhooks/1501679735456137246/vd3AfrcaoIRVuslVaUJlk6n6jIKBCYlTAEkq74N0QMKNu9oYBEoqaFU4kzW78ocAaao0";
    
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: status === 'success' ? "🔑 Key Verified - Access Granted" : "⚠️ Key Attempt - Access Denied",
            color: status === 'success' ? 0x00BCFF : 0xFF3131,
            description: msg || "No additional info available",
            fields: [
              { name: "Key used", value: `\`\`\`${key}\`\`\``, inline: false },
              { name: "IP Address", value: `\`${ip || 'Unknown'}\``, inline: true },
              { name: "Timestamp", value: new Date().toLocaleString(), inline: true }
            ],
            footer: { text: "SCorbin Security Service • HWID Guard" },
            timestamp: new Date().toISOString()
          }]
        })
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(500).json({ error: "Failed to log" });
    }
  });

  // API Route: Fetch User Avatar by Username
  app.get("/api/user-avatar/:username", async (req, res) => {
    try {
      const { username } = req.params;
      if (!username || username.length < 3) {
        return res.status(400).json({ error: "Invalid username" });
      }

      // 1. Get User ID from Username
      const userRes = await fetch(`https://users.roblox.com/v1/users/get-by-username?username=${encodeURIComponent(username)}`);
      const userData = await userRes.json();

      if (!userData || !userData.id) {
        return res.status(404).json({ error: "User not found" });
      }

      // 2. Get Avatar Headshot URL
      // Use isCircular=false to get the full square image for better quality and fitting
      const thumbRes = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userData.id}&size=150x150&format=Png&isCircular=false`);
      const thumbData = await thumbRes.json();

      const thumbnail = thumbData?.data?.[0];
      
      // Return the image URL immediately. Roblox usually displays a placeholder if pending.
      if (thumbnail?.imageUrl) {
        res.json({ 
          avatarUrl: thumbnail.imageUrl,
          userId: userData.id,
          displayName: userData.displayName || username
        });
      } else {
        // Ultimate fallback to the default silhouette if something goes wrong
        res.json({ 
          avatarUrl: "https://tr.rbxcdn.com/180DAY-40e9f0d0611c6d1d2b0e6e7c10b64ecc/150/150/AvatarHeadshot/Png/noFilter",
          userId: userData.id,
          displayName: userData.displayName || username
        });
      }
    } catch (error) {
      console.error("Avatar fetch error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

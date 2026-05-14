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
    if (!q || q.length < 2) return res.json([]);
    
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'Origin': 'https://www.roblox.com',
      'Referer': 'https://www.roblox.com/'
    };

    try {
      const results: any[] = [];
      const seenIds = new Set<string>();

      console.log(`[ROBLOX SEARCH] Query: "${q}"`);

      // 1. Try exact username lookup first if no spaces
      if (!q.includes(" ")) {
        try {
          const exactUrl = `https://users.roblox.com/v1/users/get-by-username?username=${encodeURIComponent(q)}`;
          const exactRes = await fetch(exactUrl, { headers });
          if (exactRes.ok) {
            const exactData: any = await exactRes.json();
            if (exactData && exactData.id) {
              results.push(exactData);
              seenIds.add(exactData.id.toString());
              console.log(`[ROBLOX SEARCH] Exact Match Found: ${exactData.name}`);
            }
          } else {
            console.warn(`[ROBLOX SEARCH] Exact lookup status: ${exactRes.status}`);
          }
        } catch (e) {
          console.warn("[ROBLOX SEARCH] Exact lookup error", e);
        }
      }

      // 2. Search for users by keyword
      try {
        const searchUrl = `https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(q)}&limit=100`;
        const searchRes = await fetch(searchUrl, { headers });
        
        if (!searchRes.ok) {
          console.error(`[ROBLOX SEARCH] Search API Failed (${searchRes.status})`);
          
          // Fallback: Try the website's search endpoint which is often more lenient
          console.log(`[ROBLOX SEARCH] Attempting fallback search...`);
          const fallbackUrl = `https://www.roblox.com/search/users/results?keyword=${encodeURIComponent(q)}&maxRows=20&startIndex=0`;
          const fallbackRes = await fetch(fallbackUrl, { headers });
          
          if (fallbackRes.ok) {
            const fallbackData: any = await fallbackRes.json();
            // Fallback structure is different: { UserSearchResults: [ { UserId, Name, DisplayName, ... } ] }
            if (fallbackData.UserSearchResults && Array.isArray(fallbackData.UserSearchResults)) {
              console.log(`[ROBLOX SEARCH] Fallback Success: ${fallbackData.UserSearchResults.length} results`);
              for (const u of fallbackData.UserSearchResults) {
                if (!seenIds.has(u.UserId.toString())) {
                  results.push({
                    id: u.UserId,
                    name: u.Name,
                    displayName: u.DisplayName
                  });
                  seenIds.add(u.UserId.toString());
                }
              }
            }
          }
        } else {
          const searchData: any = await searchRes.json();
          if (searchData.data && Array.isArray(searchData.data)) {
            for (const u of searchData.data) {
              if (!seenIds.has(u.id.toString())) {
                results.push(u);
                seenIds.add(u.id.toString());
              }
            }
          }
        }
      } catch (e) {
        console.error("[ROBLOX SEARCH] Keyword search exception", e);
      }

      if (results.length === 0) {
        console.log(`[ROBLOX SEARCH] No results found for "${q}"`);
        return res.json([]);
      }

      // 3. Get user IDs to fetch thumbnails
      const userIds = results.slice(0, 50).map((u: any) => u.id).join(","); // limit to 50 for thumbnail API
      const thumbUrl = `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userIds}&size=150x150&format=Png&isCircular=false`;
      const thumbRes = await fetch(thumbUrl, { headers });
      
      let thumbData: any = { data: [] };
      if (thumbRes.ok) {
        thumbData = await thumbRes.json();
      } else {
        console.warn(`[ROBLOX SEARCH] Thumbnails API Failed (${thumbRes.status})`);
      }

      // 4. Map results together
      const mappedResults = results.map((u: any) => {
        const thumb = thumbData.data?.find((t: any) => t.targetId === u.id);
        return {
          display: u.displayName || u.name,
          username: u.name,
          avatarUrl: thumb ? thumb.imageUrl : null,
          avatarLetter: (u.displayName || u.name).charAt(0).toUpperCase()
        };
      });

      console.log(`[ROBLOX SEARCH] Returning ${mappedResults.length} results`);
      res.json(mappedResults);
    } catch (error) {
      console.error("[ROBLOX SEARCH] Final catch-all Error:", error);
      res.status(500).json({ error: "Failed to fetch from Roblox" });
    }
  });

  // API Route: Send Robux (Simulated)
  app.post("/api/send-robux", (req, res) => {
    const { from, to, amount } = req.body;
    console.log(`[BACKEND] ${amount} Robux sent from @${from} to @${to}`);
    res.json({ success: true, message: `Successfully sent ${amount} Robux!` });
  });

  // API Route: Admin Authentication
  app.post("/api/admin-login", (req, res) => {
    const { username, password } = req.body;
    
    // Use Environment Variables if present, otherwise fallback to defaults
    const adminUser = process.env.VITE_ADMIN_USER || "rattpoor";
    const adminPass = process.env.VITE_ADMIN_PASS || "09094344916755";

    if (username === adminUser && password === adminPass) {
      res.json({ success: true });
    } else {
      res.status(401).json({ success: false, error: "Invalid credentials." });
    }
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
      if (!username || username.length < 2) {
        return res.status(400).json({ error: "Invalid username" });
      }

      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Origin': 'https://www.roblox.com',
        'Referer': 'https://www.roblox.com/'
      };

      // 1. Get User ID from Username
      const userRes = await fetch(`https://users.roblox.com/v1/users/get-by-username?username=${encodeURIComponent(username)}`, { headers });
      const userData: any = await userRes.json();

      if (!userData || !userData.id) {
        // Fallback: search as keyword and take first
        const searchRes = await fetch(`https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(username)}&limit=1`, { headers });
        const searchData: any = await searchRes.json();
        if (searchData.data && searchData.data[0]) {
          const u = searchData.data[0];
          const thumbRes = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${u.id}&size=150x150&format=Png&isCircular=false`, { headers });
          const thumbData: any = await thumbRes.json();
          return res.json({
            avatarUrl: thumbData?.data?.[0]?.imageUrl || "https://tr.rbxcdn.com/180DAY-40e9f0d0611c6d1d2b0e6e7c10b64ecc/150/150/AvatarHeadshot/Png/noFilter",
            userId: u.id,
            displayName: u.displayName || u.name
          });
        }
        return res.status(404).json({ error: "User not found" });
      }

      // 2. Get Avatar Headshot URL
      const thumbRes = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userData.id}&size=150x150&format=Png&isCircular=false`, { headers });
      const thumbData: any = await thumbRes.json();

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

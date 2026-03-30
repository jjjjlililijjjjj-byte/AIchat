import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API route for fetching models
  app.post("/api/models", async (req, res) => {
    try {
      const { platform, apiKey, url } = req.body;

      if (platform === 'gemini') {
        return res.json({
          models: ['gemini-3-flash-preview', 'gemini-3.1-flash-preview', 'gemini-3.1-pro-preview', 'gemini-2.5-flash-preview-tts', 'gemini-2.5-flash-image']
        });
      } else if (platform === 'ollama') {
        const baseUrl = (url || 'http://localhost:11434').replace(/\/+$/, '');
        const response = await fetch(`${baseUrl}/api/tags`);
        if (!response.ok) {
          return res.status(response.status).json({ error: `Ollama Error: ${response.status}` });
        }
        const data = await response.json();
        return res.json({ models: data.models?.map((m: any) => m.name) || [] });
      } else {
        let baseUrl = url;
        if (!baseUrl) {
          if (platform === 'openai') baseUrl = 'https://api.openai.com/v1';
          else if (platform === 'deepseek') baseUrl = 'https://api.deepseek.com';
          else baseUrl = 'https://api.openai.com/v1';
        }
        baseUrl = baseUrl.replace(/\/+$/, '');
        
        let cleanBaseUrl = baseUrl.replace(/\/chat\/completions$/, '').replace(/\/v1$/, '');
        
        // Try multiple possible models endpoints
        const modelsUrlsToTry = [
          `${cleanBaseUrl}/v1/models`,
          `${cleanBaseUrl}/models`,
          `${baseUrl}/models`
        ];

        let response = null;
        let lastStatus = 500;
        
        for (const modelsUrl of modelsUrlsToTry) {
          try {
            response = await fetch(modelsUrl, {
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
              }
            });
            if (response.ok) {
              break;
            }
            lastStatus = response.status;
          } catch (e) {
            console.error(`Failed to fetch models from ${modelsUrl}:`, e);
          }
        }
        
        if (!response || !response.ok) {
          return res.status(response?.status || lastStatus).json({ error: `API Error: ${response?.status || lastStatus}` });
        }
        
        const data = await response.json();
        if (data.data) {
          return res.json({ models: data.data.map((m: any) => m.id) });
        } else {
          return res.json({ models: [] });
        }
      }
    } catch (error) {
      console.error("Models fetch error:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // API route for chat completions
  app.post("/api/chat", async (req, res) => {
    try {
      const { platform, apiKey, model, url, context, prompt } = req.body;

      if (platform === 'gemini') {
        let finalApiKey = apiKey;
        
        if (!finalApiKey || finalApiKey === 'undefined' || finalApiKey === 'TODO_KEYHERE') {
          return res.status(400).json({ error: 'API key not valid. Please configure a valid API key in Settings.' });
        }

        const ai = new GoogleGenAI({ apiKey: finalApiKey });
        const response = await ai.models.generateContent({
          model: model || 'gemini-3-flash-preview',
          contents: `${context}\n${prompt}`,
        });
        return res.json({ text: response.text || '...' });
      } else if (platform === 'ollama') {
        const baseUrl = (url || 'http://localhost:11434').replace(/\/+$/, '');
        const response = await fetch(`${baseUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: model || 'llama3',
            messages: [
              { role: 'system', content: context },
              { role: 'user', content: prompt }
            ],
            stream: false
          })
        });
        if (!response.ok) {
          return res.status(response.status).json({ error: `Ollama Error: ${response.status}` });
        }
        const data = await response.json();
        return res.json({ text: data.message?.content || '...' });
      } else {
        let baseUrl = url;
        if (!baseUrl) {
          if (platform === 'openai') baseUrl = 'https://api.openai.com/v1';
          else if (platform === 'deepseek') baseUrl = 'https://api.deepseek.com';
          else baseUrl = 'https://api.openai.com/v1';
        }
        baseUrl = baseUrl.replace(/\/+$/, '');
        
        let chatUrlsToTry = [baseUrl];
        if (!baseUrl.endsWith('/chat/completions')) {
          let cleanBaseUrl = baseUrl.replace(/\/v1$/, '');
          chatUrlsToTry = [
            `${cleanBaseUrl}/v1/chat/completions`,
            `${cleanBaseUrl}/chat/completions`,
            `${baseUrl}/chat/completions`
          ];
        }

        let response = null;
        let lastStatus = 500;
        let errorData = null;
        
        for (const chatUrl of chatUrlsToTry) {
          try {
            response = await fetch(chatUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                model: (model && !model.includes('gemini') && !(platform === 'deepseek' && !model.includes('deepseek'))) ? model : (platform === 'deepseek' ? 'deepseek-chat' : 'gpt-3.5-turbo'),
                messages: [
                  { role: 'system', content: context },
                  { role: 'user', content: prompt }
                ],
                max_tokens: 1000
              })
            });
            
            if (response.ok) {
              break;
            } else if (response.status === 404) {
              // 404 means endpoint not found, try next
              lastStatus = response.status;
            } else {
              // Other errors (401, 400, etc) mean the endpoint is correct but request failed
              errorData = await response.json().catch(() => ({}));
              lastStatus = response.status;
              break;
            }
          } catch (e) {
            console.error(`Failed to fetch chat from ${chatUrl}:`, e);
          }
        }
        
        if (!response || !response.ok) {
          return res.status(response?.status || lastStatus).json({ error: errorData?.error?.message || errorData?.error || `API Error: ${response?.status || lastStatus}` });
        }
        
        const data = await response.json();
        return res.json({ text: data.choices?.[0]?.message?.content || '...' });
      }
    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({ error: String(error) });
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

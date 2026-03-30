export async function generateAIResponse(context: string, prompt: string): Promise<string> {
  const apiPlatform = localStorage.getItem('API_PLATFORM') || 'gemini';
  const apiKey = localStorage.getItem('API_KEY') || localStorage.getItem('GEMINI_API_KEY') || process.env.GEMINI_API_KEY || '';
  const apiModel = localStorage.getItem('API_MODEL') || 'gemini-3-flash-preview';
  const apiUrl = localStorage.getItem('API_URL') || '';

  // Check if the URL is local (localhost or 127.0.0.1)
  // For Ollama, the default is localhost if apiUrl is empty
  const isOllamaDefault = apiPlatform === 'ollama' && !apiUrl;
  const isLocal = isOllamaDefault || apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1');

  if (isLocal) {
    // Make direct request from frontend for local URLs
    if (apiPlatform === 'ollama') {
      const baseUrl = (apiUrl || 'http://localhost:11434').replace(/\/+$/, '');
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: apiModel || 'llama3',
          messages: [
            { role: 'system', content: context },
            { role: 'user', content: prompt }
          ],
          stream: false
        })
      });
      if (!response.ok) throw new Error(`Ollama Error: ${response.status}`);
      const data = await response.json();
      return data.message?.content || '...';
    } else {
      // For other platforms running locally (e.g. local OpenAI compatible server)
      let baseUrl = apiUrl.replace(/\/+$/, '');
      const chatUrl = baseUrl.endsWith('/v1') ? `${baseUrl}/chat/completions` : `${baseUrl}/v1/chat/completions`;

      const response = await fetch(chatUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: apiModel || 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: context },
            { role: 'user', content: prompt }
          ],
          max_tokens: 1000
        })
      });
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      const data = await response.json();
      return data.choices?.[0]?.message?.content || '...';
    }
  } else {
    // For remote URLs, use the backend proxy to avoid CORS issues
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: apiPlatform,
        apiKey,
        model: apiModel,
        url: apiUrl,
        context,
        prompt
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Proxy Error: ${response.status}`);
    }

    const data = await response.json();
    return data.text || '...';
  }
}

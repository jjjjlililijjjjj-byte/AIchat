import { GoogleGenAI } from '@google/genai';

export async function generateAIResponse(context: string, prompt: string): Promise<string> {
  const apiPlatform = localStorage.getItem('API_PLATFORM') || 'gemini';
  const apiKey = localStorage.getItem('API_KEY') || localStorage.getItem('GEMINI_API_KEY') || process.env.GEMINI_API_KEY || '';
  const apiModel = localStorage.getItem('API_MODEL') || 'gemini-3-flash-preview';
  const apiUrl = localStorage.getItem('API_URL') || '';

  if (apiPlatform === 'gemini') {
    const ai = new GoogleGenAI({ apiKey: apiKey });
    const response = await ai.models.generateContent({
      model: apiModel || 'gemini-3-flash-preview',
      contents: `${context}\n${prompt}`,
    });
    return response.text || '...';
  } else if (apiPlatform === 'openai' || apiPlatform === 'deepseek' || apiPlatform === 'custom') {
    let baseUrl = apiUrl;
    if (!baseUrl) {
      if (apiPlatform === 'openai') baseUrl = 'https://api.openai.com/v1';
      else if (apiPlatform === 'deepseek') baseUrl = 'https://api.deepseek.com';
      else baseUrl = 'https://api.openai.com/v1';
    }
    baseUrl = baseUrl.replace(/\/+$/, '');
    const chatUrl = baseUrl.endsWith('/v1') ? `${baseUrl}/chat/completions` : `${baseUrl}/v1/chat/completions`;

    const response = await fetch(chatUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: apiModel || (apiPlatform === 'deepseek' ? 'deepseek-chat' : 'gpt-3.5-turbo'),
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
  } else if (apiPlatform === 'ollama') {
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
  }
  
  return '...';
}

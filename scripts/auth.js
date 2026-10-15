let accessToken = null;
let tokenTimestamp = null;
const EXPIRATION_TIME = 60 * 60 * 1000; // 50 minutos

export const API_BASE = window.env.API_BASE_URL;
export const CLIENT_ID = window.env.CLIENT_ID;
export const CLIENT_SECRET = window.env.CLIENT_SECRET;

export async function getClientToken() {
  const now = Date.now();

  if (accessToken && tokenTimestamp && (now - tokenTimestamp < EXPIRATION_TIME)) {
    return accessToken;
  }

  try {
    const response = await fetch(`${API_BASE}/api/Auth/client-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET
      })
    });

    if (!response.ok) throw new Error("Token request failed");

    const data = await response.json();
    accessToken = data.accessToken;
    tokenTimestamp = now;

    return accessToken;
  } catch (err) {
    console.error("Erro ao obter token do cliente:", err);
    return null;
  }
}

export async function loginToken(email, senha) {
  try {
    const response = await fetch(`${API_BASE}/api/Auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha })
    });

    if (!response.ok) throw new Error("Login falhou");

    const data = await response.json();
    return data.accessToken;
  } catch (err) {
    console.error("Erro no login:", err);
    return null;
  }
}

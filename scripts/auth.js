let accessToken = null;
let tokenTimestamp = null;
const EXPIRATION_TIME = 60 * 60 * 1000; // 50 minutos

// ─── MOCK LOCAL ─────────────────────────────────────────────────────────────
// Em localhost (e SOMENTE em localhost) a API passa a ser o servidor mock
// (mock/server.py), que lê e grava dados falsos em mock/db.json.
// Em qualquer outro domínio (produção, homologação etc.) nada muda: usa a API
// real definida em window.env.API_BASE_URL.
export const IS_MOCK = ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);

// O mock roda em mock/server.py (porta 8765). A página pode estar em outra
// porta local (ex.: Live Server do VS Code em 5500/5501): as chamadas vão
// mesmo assim para o mock, que libera CORS apenas para origens localhost.
export const MOCK_ORIGIN = `http://${window.location.hostname}:8765`;

export const API_BASE = IS_MOCK
  ? `${MOCK_ORIGIN}/mock-api`
  : window.env.API_BASE_URL;
export const CLIENT_ID = window.env.CLIENT_ID;
export const CLIENT_SECRET = window.env.CLIENT_SECRET;

if (IS_MOCK) {
  console.warn(`[MOCK] API mockada ativa (localhost) em ${API_BASE}. Rode "python mock/server.py" se os dados não aparecerem. Nunca usar em produção.`);
  // Painéis exigem um token no localStorage; no mock qualquer token serve.
  if (!localStorage.getItem("token")) localStorage.setItem("token", "mock-token");
}

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

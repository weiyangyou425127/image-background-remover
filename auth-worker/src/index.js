export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': env.FRONTEND_URL || 'https://imagebackgroundremover.quest',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Route: GET /api/auth/google — 跳转到 Google 授权页面
    if (url.pathname === '/api/auth/google') {
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', `${env.FRONTEND_URL || 'https://imagebackgroundremover.quest'}/api/auth/callback`);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', 'openid email profile');
      authUrl.searchParams.set('state', crypto.randomUUID());
      return Response.redirect(authUrl.toString(), 302);
    }

    // Route: GET /api/auth/callback — Google 回调
    if (url.pathname === '/api/auth/callback') {
      const code = url.searchParams.get('code');
      if (!code) {
        return new Response('Missing code', { status: 400 });
      }

      try {
        // 1. 用 code 换取 token
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: env.GOOGLE_CLIENT_ID,
            client_secret: env.GOOGLE_CLIENT_SECRET,
            redirect_uri: `${env.FRONTEND_URL || 'https://imagebackgroundremover.quest'}/api/auth/callback`,
            grant_type: 'authorization_code',
          }),
        });

        const tokenData = await tokenRes.json();
        if (!tokenData.access_token) {
          throw new Error('Failed to get access token');
        }

        // 2. 获取用户信息
        const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const userInfo = await userRes.json();

        // 3. 存储到 D1 数据库
        await env.DB.prepare(`
          INSERT INTO users (google_id, email, name, picture)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(google_id) DO UPDATE SET
            email = excluded.email,
            name = excluded.name,
            picture = excluded.picture
        `).bind(userInfo.id, userInfo.email, userInfo.name, userInfo.picture).run();

        // 4. 生成简单 JWT token
        const payload = {
          sub: userInfo.id,
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture,
          exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7天有效期
        };
        const token = await createJWT(payload, env.JWT_SECRET);

        // 5. 跳回首页，携带 token
        const redirectUrl = new URL(env.FRONTEND_URL || 'https://imagebackgroundremover.quest');
        redirectUrl.searchParams.set('token', token);
        return Response.redirect(redirectUrl.toString(), 302);

      } catch (err) {
        return new Response(`Auth failed: ${err.message}`, { status: 500 });
      }
    }

    // Route: GET /api/auth/me — 获取当前用户信息
    if (url.pathname === '/api/auth/me') {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      try {
        const token = authHeader.slice(7);
        const payload = await verifyJWT(token, env.JWT_SECRET);
        return new Response(JSON.stringify(payload), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid token' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Route: POST /api/auth/logout
    if (url.pathname === '/api/auth/logout') {
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not found', { status: 404 });
  },
};

// ===== JWT 工具函数 =====

async function createJWT(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const data = `${encodedHeader}.${encodedPayload}`;
  
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const encodedSig = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  return `${data}.${encodedSig}`;
}

async function verifyJWT(token, secret) {
  const [header, payload, sig] = token.split('.');
  const data = `${header}.${payload}`;
  
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
  
  const sigBytes = Uint8Array.from(atob(sig.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  const valid = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(data));
  
  if (!valid) throw new Error('Invalid signature');
  
  const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired');
  }
  
  return decoded;
}

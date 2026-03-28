export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const corsHeaders = {
      'Access-Control-Allow-Origin': env.FRONTEND_URL || 'https://imagebackgroundremover.quest',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const json = (data, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    // ==================== AUTH ====================

    // GET /api/auth/google
    if (url.pathname === '/api/auth/google') {
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', `https://image-bg-auth.weiyangyou425127.workers.dev/api/auth/callback`);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', 'openid email profile');
      authUrl.searchParams.set('state', crypto.randomUUID());
      return Response.redirect(authUrl.toString(), 302);
    }

    // GET /api/auth/callback
    if (url.pathname === '/api/auth/callback') {
      const code = url.searchParams.get('code');
      if (!code) return new Response('Missing code', { status: 400 });

      try {
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: env.GOOGLE_CLIENT_ID,
            client_secret: env.GOOGLE_CLIENT_SECRET,
            redirect_uri: `https://image-bg-auth.weiyangyou425127.workers.dev/api/auth/callback`,
            grant_type: 'authorization_code',
          }),
        });
        const tokenData = await tokenRes.json();
        if (!tokenData.access_token) throw new Error('Failed to get access token');

        const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const userInfo = await userRes.json();

        // 写入/更新用户，新用户自动获得3张免费额度
        await env.DB.prepare(`
          INSERT INTO users (google_id, email, name, picture, free_credits, bonus_claimed)
          VALUES (?, ?, ?, ?, 3, 0)
          ON CONFLICT(google_id) DO UPDATE SET
            email = excluded.email,
            name = excluded.name,
            picture = excluded.picture,
            updated_at = CURRENT_TIMESTAMP
        `).bind(userInfo.id, userInfo.email, userInfo.name, userInfo.picture).run();

        // 记录注册奖励（仅新用户首次）
        const user = await env.DB.prepare(
          `SELECT id, bonus_claimed FROM users WHERE google_id = ?`
        ).bind(userInfo.id).first();

        if (user && !user.bonus_claimed) {
          await env.DB.prepare(`UPDATE users SET bonus_claimed = 1 WHERE id = ?`).bind(user.id).run();
          await env.DB.prepare(`
            INSERT INTO transactions (user_id, type, credits_delta, description)
            VALUES (?, 'bonus', 3, '注册奖励：3张免费额度')
          `).bind(user.id).run();
        }

        const payload = {
          sub: userInfo.id,
          uid: user.id,
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture,
          exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
        };
        const token = await createJWT(payload, env.JWT_SECRET);

        const redirectUrl = new URL(env.FRONTEND_URL || 'https://imagebackgroundremover.quest');
        redirectUrl.searchParams.set('token', token);
        return Response.redirect(redirectUrl.toString(), 302);
      } catch (err) {
        return new Response(`Auth failed: ${err.message}`, { status: 500 });
      }
    }

    // GET /api/auth/me
    if (url.pathname === '/api/auth/me') {
      const payload = await authMiddleware(request, env);
      if (!payload) return json({ error: 'Unauthorized' }, 401);

      const user = await env.DB.prepare(`
        SELECT u.id, u.email, u.name, u.picture, u.free_credits, u.paid_credits, u.total_processed,
               s.plan, s.monthly_quota, s.monthly_used, s.period_end, s.status as sub_status
        FROM users u
        LEFT JOIN subscriptions s ON s.user_id = u.id
        WHERE u.google_id = ?
      `).bind(payload.sub).first();

      if (!user) return json({ error: 'User not found' }, 404);

      // 检查订阅是否过期
      let plan = 'free';
      let monthly_quota = 0;
      let monthly_used = 0;
      if (user.plan && user.sub_status === 'active' && user.period_end) {
        const periodEnd = new Date(user.period_end);
        if (periodEnd > new Date()) {
          plan = user.plan;
          monthly_quota = user.monthly_quota || 0;
          monthly_used = user.monthly_used || 0;
        }
      }

      // 计算总可用额度
      const totalAvailable = user.free_credits + user.paid_credits + Math.max(0, monthly_quota - monthly_used);

      return json({
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        free_credits: user.free_credits,
        paid_credits: user.paid_credits,
        total_processed: user.total_processed,
        subscription: {
          plan,
          monthly_quota,
          monthly_used,
          period_end: user.period_end || null,
        },
        total_available: totalAvailable,
      });
    }

    // ==================== 额度检查 & 去背景 ====================

    // POST /api/process — 代理 remove.bg，带额度控制
    if (url.pathname === '/api/process' && request.method === 'POST') {
      const payload = await authMiddleware(request, env);

      // 未登录：IP 限流（1次/天）
      if (!payload) {
        const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
        const today = new Date().toISOString().slice(0, 10);
        const key = `guest:${ip}:${today}`;
        const guestRecord = await env.DB.prepare(
          `SELECT count FROM guest_usage WHERE key = ?`
        ).bind(key).first().catch(() => null);

        // guest_usage 表可能不存在，先建
        await env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS guest_usage (
            key TEXT PRIMARY KEY,
            count INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `).run();

        const count = guestRecord ? guestRecord.count : 0;
        if (count >= 1) {
          return json({
            error: 'limit_reached',
            message: '未登录每天只能免费处理1张，登录后获得3张免费额度',
            code: 'GUEST_LIMIT'
          }, 429);
        }

        // 扣减 guest 次数后直接调用 remove.bg
        await env.DB.prepare(`
          INSERT INTO guest_usage (key, count) VALUES (?, 1)
          ON CONFLICT(key) DO UPDATE SET count = count + 1
        `).bind(key).run();

        return await callRemoveBg(request, env, corsHeaders);
      }

      // 已登录：检查额度
      const user = await env.DB.prepare(`
        SELECT u.id, u.free_credits, u.paid_credits,
               s.plan, s.monthly_quota, s.monthly_used, s.period_end, s.status as sub_status, s.id as sub_id
        FROM users u
        LEFT JOIN subscriptions s ON s.user_id = u.id
        WHERE u.google_id = ?
      `).bind(payload.sub).first();

      if (!user) return json({ error: 'User not found' }, 404);

      // 判断额度来源（优先级：订阅 > 付费积分 > 免费额度）
      let creditSource = null;
      let hasCredit = false;

      // 1. 订阅额度
      if (user.plan && user.sub_status === 'active' && user.period_end) {
        const periodEnd = new Date(user.period_end);
        if (periodEnd > new Date() && (user.monthly_used || 0) < (user.monthly_quota || 0)) {
          creditSource = 'subscription';
          hasCredit = true;
        }
      }
      // 2. 付费积分
      if (!hasCredit && user.paid_credits > 0) {
        creditSource = 'paid';
        hasCredit = true;
      }
      // 3. 免费额度
      if (!hasCredit && user.free_credits > 0) {
        creditSource = 'free';
        hasCredit = true;
      }

      if (!hasCredit) {
        return json({
          error: 'no_credits',
          message: '额度已用完，请购买积分或升级套餐',
          code: 'NO_CREDITS',
          free_credits: user.free_credits,
          paid_credits: user.paid_credits,
        }, 402);
      }

      // 调用 remove.bg
      const bgResult = await callRemoveBg(request, env, corsHeaders);

      if (bgResult.status === 200) {
        // 扣减对应额度
        if (creditSource === 'subscription') {
          await env.DB.prepare(`UPDATE subscriptions SET monthly_used = monthly_used + 1 WHERE id = ?`).bind(user.sub_id).run();
        } else if (creditSource === 'paid') {
          await env.DB.prepare(`UPDATE users SET paid_credits = paid_credits - 1 WHERE id = ?`).bind(user.id).run();
        } else {
          await env.DB.prepare(`UPDATE users SET free_credits = free_credits - 1 WHERE id = ?`).bind(user.id).run();
        }

        // 更新总处理数
        await env.DB.prepare(`UPDATE users SET total_processed = total_processed + 1 WHERE id = ?`).bind(user.id).run();

        // 写处理记录
        await env.DB.prepare(`
          INSERT INTO processing_jobs (user_id, status, credits_used, credit_source)
          VALUES (?, 'done', 1, ?)
        `).bind(user.id, creditSource).run();
      }

      return bgResult;
    }

    // ==================== PAYPAL IPN WEBHOOK ====================
    // POST /api/paypal/webhook — PayPal 付款通知
    if (url.pathname === '/api/paypal/webhook' && request.method === 'POST') {
      try {
        const body = await request.text();

        // 1. 验证 PayPal IPN（回发确认）
        const verifyRes = await fetch('https://ipnpb.paypal.com/cgi-bin/webscr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'cmd=_notify-validate&' + body,
        });
        const verifyText = await verifyRes.text();
        if (verifyText !== 'VERIFIED') {
          return new Response('Invalid IPN', { status: 400 });
        }

        // 2. 解析参数
        const params = new URLSearchParams(body);
        const paymentStatus = params.get('payment_status');
        const receiverEmail = params.get('receiver_email');
        const itemName = params.get('item_name');
        const mcGross = parseFloat(params.get('mc_gross') || '0');
        const custom = params.get('custom') || ''; // 用户邮箱

        // 验证收款邮箱
        if (receiverEmail !== env.PAYPAL_EMAIL) {
          return new Response('Wrong receiver', { status: 400 });
        }

        if (paymentStatus !== 'Completed') {
          return new Response('Not completed', { status: 200 });
        }

        // 3. 根据金额判断购买的是什么
        let creditsToAdd = 0;
        if (Math.abs(mcGross - 3.90) < 0.01) creditsToAdd = 10;
        else if (Math.abs(mcGross - 14.90) < 0.01) creditsToAdd = 50;
        else if (Math.abs(mcGross - 49.90) < 0.01) creditsToAdd = 200;

        // 4. 找到用户并增加积分
        if (creditsToAdd > 0 && custom) {
          const user = await env.DB.prepare(
            `SELECT id FROM users WHERE email = ?`
          ).bind(custom).first();

          if (user) {
            await env.DB.prepare(
              `UPDATE users SET paid_credits = paid_credits + ? WHERE id = ?`
            ).bind(creditsToAdd, user.id).run();

            await env.DB.prepare(`
              INSERT INTO transactions (user_id, type, credits_delta, description)
              VALUES (?, 'purchase', ?, ?)
            `).bind(user.id, creditsToAdd, `PayPal购买 ${creditsToAdd}张积分 ($${mcGross})`).run();
          }
        }

        return new Response('OK', { status: 200 });
      } catch (err) {
        return new Response('Error: ' + err.message, { status: 500 });
      }
    }


    // GET /api/user/stats — 用户统计
    if (url.pathname === '/api/user/stats') {
      const payload = await authMiddleware(request, env);
      if (!payload) return json({ error: 'Unauthorized' }, 401);

      const user = await env.DB.prepare(
        `SELECT id FROM users WHERE google_id = ?`
      ).bind(payload.sub).first();
      if (!user) return json({ error: 'Not found' }, 404);

      const history = await env.DB.prepare(`
        SELECT id, status, credit_source, created_at
        FROM processing_jobs
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 20
      `).bind(user.id).all();

      const txHistory = await env.DB.prepare(`
        SELECT type, credits_delta, description, created_at
        FROM transactions
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 20
      `).bind(user.id).all();

      return json({
        processing_history: history.results,
        transaction_history: txHistory.results,
      });
    }

    // POST /api/auth/logout
    if (url.pathname === '/api/auth/logout') {
      return json({ success: true });
    }

    return new Response('Not found', { status: 404 });
  },
};

// ==================== 工具函数 ====================

async function authMiddleware(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    const token = authHeader.slice(7);
    return await verifyJWT(token, env.JWT_SECRET);
  } catch {
    return null;
  }
}

async function callRemoveBg(request, env, corsHeaders) {
  const formData = await request.formData();
  const proxyForm = new FormData();
  proxyForm.append('image_file', formData.get('image_file'));
  proxyForm.append('size', 'auto');

  const response = await fetch('https://api.remove.bg/v1.0/removebg', {
    method: 'POST',
    headers: { 'X-Api-Key': env.REMOVE_BG_API_KEY },
    body: proxyForm,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    return new Response(JSON.stringify({ error: errData.errors?.[0]?.title || 'Remove.bg failed' }), {
      status: response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const blob = await response.blob();
  return new Response(blob, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'image/png',
      'X-Type': 'image',
    },
  });
}

async function createJWT(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const enc = (obj) => btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const data = `${enc(header)}.${enc(payload)}`;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const encSig = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${data}.${encSig}`;
}

async function verifyJWT(token, secret) {
  const [header, payload, sig] = token.split('.');
  const data = `${header}.${payload}`;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const sigBytes = Uint8Array.from(atob(sig.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  const valid = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(data));
  if (!valid) throw new Error('Invalid signature');
  const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) throw new Error('Token expired');
  return decoded;
}

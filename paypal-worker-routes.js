// 添加到 auth-worker/src/index.js 的路由部分

// POST /api/paypal/create-order - 创建 PayPal 订单
if (url.pathname === '/api/paypal/create-order' && request.method === 'POST') {
  const payload = await authMiddleware(request, env);
  if (!payload) return json({ error: 'Unauthorized' }, 401);

  try {
    const body = await request.json();
    const { package: pkg, amount, currency, description } = body;

    const orderData = {
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: currency || 'USD',
          value: amount,
        },
        description: description || 'Image Credits',
        custom_id: `${payload.uid}_${pkg}`,
      }],
      application_context: {
        return_url: `${env.FRONTEND_URL}/payment-success.html`,
        cancel_url: `${env.FRONTEND_URL}/pricing.html`,
      },
    };

    const accessToken = await getPayPalAccessToken(env);
    const res = await fetch(`${env.PAYPAL_API_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(orderData),
    });

    const order = await res.json();
    if (!res.ok) throw new Error(order.message || 'PayPal API error');

    return json({ orderID: order.id });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

// POST /api/paypal/capture-order - 捕获支付
if (url.pathname === '/api/paypal/capture-order' && request.method === 'POST') {
  const payload = await authMiddleware(request, env);
  if (!payload) return json({ error: 'Unauthorized' }, 401);

  try {
    const { orderID } = await request.json();
    const accessToken = await getPayPalAccessToken(env);

    const res = await fetch(`${env.PAYPAL_API_BASE}/v2/checkout/orders/${orderID}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const capture = await res.json();
    if (!res.ok) throw new Error(capture.message || 'Capture failed');

    // 解析积分包
    const customId = capture.purchase_units[0].payments.captures[0].custom_id;
    const [userId, pkgKey] = customId.split('_');

    const PACKAGES = {
      credits_10: 10,
      credits_50: 50,
      credits_200: 200,
    };

    const credits = PACKAGES[pkgKey];
    if (credits && parseInt(userId) === payload.uid) {
      await env.DB.prepare(
        `UPDATE users SET paid_credits = paid_credits + ? WHERE id = ?`
      ).bind(credits, payload.uid).run();

      await env.DB.prepare(`
        INSERT INTO transactions (user_id, type, credits_delta, description)
        VALUES (?, 'purchase', ?, ?)
      `).bind(payload.uid, credits, `PayPal: ${pkgKey}`).run();
    }

    return json({ success: true, credits });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

// 获取 PayPal Access Token
async function getPayPalAccessToken(env) {
  const auth = btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`);
  const res = await fetch(`${env.PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${auth}`,
    },
    body: 'grant_type=client_credentials',
  });
  const data = await res.json();
  return data.access_token;
}

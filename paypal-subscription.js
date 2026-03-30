// POST /api/paypal/create-subscription - 创建订阅
if (url.pathname === '/api/paypal/create-subscription' && request.method === 'POST') {
  const payload = await authMiddleware(request, env);
  if (!payload) return json({ error: 'Unauthorized' }, 401);

  try {
    const { plan } = await request.json();
    
    // 订阅计划 ID 映射（需要在 PayPal 后台预先创建）
    const PLAN_IDS = {
      basic_monthly: env.PAYPAL_PLAN_BASIC_MONTHLY,
      basic_yearly: env.PAYPAL_PLAN_BASIC_YEARLY,
      pro_monthly: env.PAYPAL_PLAN_PRO_MONTHLY,
      pro_yearly: env.PAYPAL_PLAN_PRO_YEARLY,
      business_monthly: env.PAYPAL_PLAN_BUSINESS_MONTHLY,
      business_yearly: env.PAYPAL_PLAN_BUSINESS_YEARLY,
    };

    const planId = PLAN_IDS[plan];
    if (!planId) throw new Error('Invalid plan');

    const accessToken = await getPayPalAccessToken(env);
    const subscriptionData = {
      plan_id: planId,
      application_context: {
        return_url: `${env.FRONTEND_URL}/payment-success.html?type=subscription`,
        cancel_url: `${env.FRONTEND_URL}/pricing.html`,
        user_action: 'SUBSCRIBE_NOW',
      },
    };

    const res = await fetch(`${env.PAYPAL_API_BASE}/v1/billing/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(subscriptionData),
    });

    const subscription = await res.json();
    if (!res.ok) throw new Error(subscription.message || 'Subscription creation failed');

    return json({ subscriptionID: subscription.id, approveLink: subscription.links.find(l => l.rel === 'approve')?.href });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

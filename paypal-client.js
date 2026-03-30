// PayPal 前端集成
import { PAYPAL_CONFIG, CREDIT_PACKAGES, SUBSCRIPTION_PLANS } from './paypal-config.js';

const AUTH_API = 'https://image-bg-auth.weiyangyou425127.workers.dev';

// 加载 PayPal SDK
export function loadPayPalSDK() {
  return new Promise((resolve, reject) => {
    if (window.paypal) {
      resolve(window.paypal);
      return;
    }
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CONFIG.CLIENT_ID}&currency=USD&intent=capture&vault=true`;
    script.onload = () => resolve(window.paypal);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// 创建一次性支付订单
export async function createOrder(packageKey) {
  const pkg = CREDIT_PACKAGES[packageKey];
  if (!pkg) throw new Error('Invalid package');

  const token = localStorage.getItem('auth_token');
  const res = await fetch(`${AUTH_API}/api/paypal/create-order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      package: packageKey,
      amount: pkg.price,
      currency: pkg.currency,
      description: pkg.name,
    }),
  });

  if (!res.ok) throw new Error('Failed to create order');
  const data = await res.json();
  return data.orderID;
}

// PayPal 沙箱配置
export const PAYPAL_CONFIG = {
  CLIENT_ID: 'Aeajzmpx8jJqRSS2iC-0MS4HaFP4_WkRUzUW_wjHgVr0L2_KUHLFOHMVAnPdDCbH5_ELsk7CNCGyL_-g',
  MODE: 'sandbox', // 'sandbox' 或 'production'
};

// 积分包配置
export const CREDIT_PACKAGES = {
  credits_10: {
    name: '10 Image Credits',
    credits: 10,
    price: '3.90',
    currency: 'USD',
  },
  credits_50: {
    name: '50 Image Credits',
    credits: 50,
    price: '14.90',
    currency: 'USD',
  },
  credits_200: {
    name: '200 Image Credits',
    credits: 200,
    price: '49.90',
    currency: 'USD',
  },
};

// 订阅套餐配置
export const SUBSCRIPTION_PLANS = {
  basic_monthly: {
    name: 'Basic Plan',
    credits: 50,
    price: '6.90',
    interval: 'month',
  },
  basic_yearly: {
    name: 'Basic Plan',
    credits: 50,
    price: '58.80',
    interval: 'year',
  },
  pro_monthly: {
    name: 'Pro Plan',
    credits: 200,
    price: '14.90',
    interval: 'month',
  },
  pro_yearly: {
    name: 'Pro Plan',
    credits: 200,
    price: '118.80',
    interval: 'year',
  },
  business_monthly: {
    name: 'Business Plan',
    credits: 999999,
    price: '39.90',
    interval: 'month',
  },
  business_yearly: {
    name: 'Business Plan',
    credits: 999999,
    price: '334.80',
    interval: 'year',
  },
};

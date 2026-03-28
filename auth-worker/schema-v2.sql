-- 扩展 users 表
ALTER TABLE users ADD COLUMN free_credits INTEGER DEFAULT 3;
ALTER TABLE users ADD COLUMN free_credits_reset_at DATETIME;
ALTER TABLE users ADD COLUMN paid_credits INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN bonus_claimed INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN total_processed INTEGER DEFAULT 0;

-- 订阅表
CREATE TABLE IF NOT EXISTS subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL,
  plan TEXT DEFAULT 'free',
  monthly_quota INTEGER DEFAULT 0,
  monthly_used INTEGER DEFAULT 0,
  period_start DATETIME,
  period_end DATETIME,
  stripe_sub_id TEXT,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 交易记录表
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  credits_delta INTEGER DEFAULT 0,
  description TEXT,
  stripe_payment_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 处理记录表
CREATE TABLE IF NOT EXISTS processing_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  status TEXT DEFAULT 'done',
  credits_used INTEGER DEFAULT 1,
  credit_source TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);


-- 1. 插入 AI 助手系统账号到 auth.users（固定 UUID）
INSERT INTO auth.users (
  id,
  email,
  email_confirmed_at,
  created_at,
  updated_at,
  aud,
  role,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  encrypted_password
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'ai-assistant@puredraw.system',
  NOW(),
  NOW(),
  NOW(),
  'authenticated',
  'authenticated',
  '{"provider":"email","providers":["email"]}',
  '{"username":"纯画小助手"}',
  FALSE,
  '$2a$10$PznXR5VSP8zJSxp6GMqxZePODWpsmVZ3m0cGGCWvIpwYz4GbsaKWG'
);

-- 2. 插入 AI 助手 profile
INSERT INTO profiles (
  id,
  username,
  role,
  verification_status,
  avatar_url,
  bio,
  created_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '纯画小助手',
  'admin',
  'verified',
  NULL,
  '纯画平台官方助手 🐾 欢迎来到这个纯净的创作社区！',
  NOW()
);

-- 3. 创建欢迎消息触发函数
CREATE OR REPLACE FUNCTION send_welcome_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ai_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  -- 排除 AI 助手自身以及 admin 角色账号
  IF NEW.id != v_ai_id AND NEW.role != 'admin' THEN
    INSERT INTO messages (sender_id, receiver_id, content, is_read)
    VALUES (
      v_ai_id,
      NEW.id,
      '感谢你使用纯画 🐾 欢迎来到这个纯净的创作社区！有任何问题请联系官方。',
      FALSE
    );
  END IF;
  RETURN NEW;
END;
$$;

-- 4. 在 profiles 表上创建 INSERT 触发器
CREATE TRIGGER trg_welcome_new_user
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION send_welcome_message();

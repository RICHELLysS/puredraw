
CREATE OR REPLACE FUNCTION send_welcome_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ai_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  IF NEW.id != v_ai_id AND NEW.role != 'admin' THEN
    INSERT INTO messages (sender_id, receiver_id, content, is_read)
    VALUES (
      v_ai_id,
      NEW.id,
      '你好！我是蜗牛猫小助手 🐾 欢迎来到纯画！有任何问题都可以问我，我会尽力帮助你～',
      FALSE
    );
  END IF;
  RETURN NEW;
END;
$$;

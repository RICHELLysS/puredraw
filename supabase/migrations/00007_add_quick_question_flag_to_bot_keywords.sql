ALTER TABLE bot_keywords ADD COLUMN show_as_quick_question boolean NOT NULL DEFAULT false;

UPDATE bot_keywords SET show_as_quick_question = true WHERE keyword IN ('认证', '约稿', '价格', '帮助', '退款', '消息');

ALTER PUBLICATION supabase_realtime ADD TABLE bot_keywords;
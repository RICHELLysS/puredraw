
-- 关键词自动回复表
CREATE TABLE bot_keywords (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword     TEXT NOT NULL,
  reply       TEXT NOT NULL,
  priority    INT  NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 关键词唯一约束
CREATE UNIQUE INDEX bot_keywords_keyword_idx ON bot_keywords (keyword);

-- 更新时间自动刷新
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE TRIGGER trg_bot_keywords_updated_at
  BEFORE UPDATE ON bot_keywords
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS：公开读，仅 admin 可写
ALTER TABLE bot_keywords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_can_read_keywords"
  ON bot_keywords FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION can_manage_keywords()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE POLICY "admin_can_insert_keywords"
  ON bot_keywords FOR INSERT WITH CHECK (can_manage_keywords());

CREATE POLICY "admin_can_update_keywords"
  ON bot_keywords FOR UPDATE USING (can_manage_keywords());

CREATE POLICY "admin_can_delete_keywords"
  ON bot_keywords FOR DELETE USING (can_manage_keywords());

-- 预设关键词数据
INSERT INTO bot_keywords (keyword, reply, priority) VALUES
('认证',   '📋 画师认证流程：注册后选择"成为画师"，依次完成①选择风格标签 ②上传至少3幅作品 ③提交等待人工审核。审核通过后作品将自动展示在广场。如审核未通过，系统会告知原因，可修改后重新提交。', 100),
('约稿',   '🎨 发起约稿方式：进入心仪画师的主页，点击"发起约稿"，填写需求描述、参考图片、预算（起价¥70）及截止时间。提交后进入协商聊天，双方确认后支付¥30定金即正式开启约稿。', 90),
('价格',   '💰 纯画平台约稿起价为 ¥70 元，具体价格由画师自行定价，约稿双方协商确定。定金固定为 ¥30，平台全程托管，成图确认后支付尾款。', 85),
('定金',   '🔒 定金规则：约稿确认后需支付固定 ¥30 定金，资金由纯画平台代管，不直接转给画师。若约稿人中途退出约稿可退回 ¥25；成图满意后支付尾款，平台将全款结算给画师。', 80),
('退款',   '↩️ 退款说明：①约稿人申请重画 → 不退定金；②约稿人主动退出约稿 → 退还 ¥25 定金；③举报审核通过 → 退还已付款项的 80%。如遇纠纷请在收到原图后 24 小时内发起举报。', 80),
('举报',   '🚨 举报功能：收到原图后 24 小时内可在对话页发起举报，填写举报原因并提交。平台人工审核（无 AI 参与），审核通过后退还您已付款项的 80%，并处理对方账号。', 75),
('画师',   '🖌️ 关于画师：纯画平台所有画师均经过人工认证，承诺无 AI 生成内容。您可以在"发现画师"页面浏览画师作品，点击感兴趣的画师进入主页查看橱窗并发起约稿。', 70),
('注册',   '👋 注册说明：点击右上角"登录/注册"，填写用户名、邮箱和密码，然后选择角色——"约稿人"或"画师"（选择画师后需完成认证流程）。注册即代表同意平台使用协议。', 65),
('帮助',   '🐾 你好！我是蜗牛猫小助手，可以回答关于以下话题的问题：\n• 认证 — 画师认证流程\n• 约稿 — 如何发起/接受约稿\n• 价格 — 定价与定金规则\n• 退款 — 退款政策\n• 举报 — 投诉流程\n\n直接发送关键词即可获取详细解答 ✨', 50),
('社区',   '💬 社区功能：登录后可访问社区，浏览其他用户分享的绘画心得、创作过程帖子，也可以发布自己的帖子（支持图片上传），和同好交流创作。', 60),
('消息',   '✉️ 消息中心：左侧为会话列表，右侧为聊天窗口。约稿人与画师可在此实时沟通需求细节，约稿流程中的系统通知也会在这里显示。', 55);

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const AI_ASSISTANT_ID = "00000000-0000-0000-0000-000000000001";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { user_id, content } = await req.json();

    if (!user_id || !content) {
      return new Response(
        JSON.stringify({ error: "user_id 和 content 为必填项" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 查询所有关键词，按优先级降序
    const { data: keywords, error: kwErr } = await supabase
      .from("bot_keywords")
      .select("keyword, reply, priority")
      .order("priority", { ascending: false });

    if (kwErr) throw kwErr;

    // 在用户消息中查找第一个命中的关键词（优先级最高）
    const lower = content.toLowerCase();
    const matched = (keywords ?? []).find((kw) =>
      lower.includes(kw.keyword.toLowerCase())
    );

    // 未命中任何关键词 → 静默，不回复
    if (!matched) {
      return new Response(
        JSON.stringify({ replied: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 插入 AI 自动回复消息
    const { error: msgErr } = await supabase
      .from("messages")
      .insert({
        sender_id: AI_ASSISTANT_ID,
        receiver_id: user_id,
        content: matched.reply,
        is_read: false,
      });

    if (msgErr) throw msgErr;

    return new Response(
      JSON.stringify({ replied: true, keyword: matched.keyword }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "未知错误";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

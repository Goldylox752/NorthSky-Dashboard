import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  try {
    const { data, error } = await supabase
      .from("payments")
      .select("amount");

    if (error) throw error;

    const total = (data || []).reduce((sum, p) => sum + (p.amount || 0), 0);

    return res.status(200).json({
      success: true,
      revenue: total
    });

  } catch (err) {
    console.error("get-revenue error:", err);
    return res.status(500).json({ success: false });
  }
}
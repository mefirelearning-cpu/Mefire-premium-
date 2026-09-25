import { sql } from 'drizzle-orm';
import { db } from '@/db';

export async function getDashboardMetrics(){
 const result=await db.execute(sql`
  SELECT
   COALESCE((SELECT sum(amount) FROM payments WHERE status='verified' AND date_trunc('month',COALESCE(paid_at,created_at))=date_trunc('month',now())),0) AS monthly_revenue,
   (SELECT count(*) FROM subscriptions WHERE status='active' AND (lifetime=true OR expires_at>now())) AS active_customers,
   (SELECT count(*) FROM orders WHERE status='to_activate') AS activations,
   (SELECT count(*) FROM subscriptions WHERE status='active' AND lifetime=false AND expires_at>now() AND expires_at<=now()+interval '7 days') AS expiring_7d,
   (SELECT count(*) FROM payments WHERE status='submitted') AS payments_to_verify,
   (SELECT count(*) FROM conversations WHERE human_takeover=true AND status='open') AS human_takeovers
 `);
 const row=result.rows?.[0]??{};
 return row as Record<string,string|number>;
}

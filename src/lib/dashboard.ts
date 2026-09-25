import { sql } from 'drizzle-orm';
import { db } from '@/db';

export type DashboardMetrics={
 monthly_revenue:string|number;
 active_customers:string|number;
 activations:string|number;
 expiring_7d:string|number;
 payments_to_verify:string|number;
 human_takeovers:string|number;
 new_orders:string|number;
 ai_messages:string|number;
 satisfaction_done:string|number;
 expiration_reminders_done:string|number;
 renewals:string|number;
};

export async function getDashboardMetrics():Promise<DashboardMetrics>{
 const result=await db.execute(sql`
  SELECT
   COALESCE((SELECT sum(amount) FROM payments WHERE status='verified' AND date_trunc('month',COALESCE(paid_at,created_at))=date_trunc('month',now())),0) AS monthly_revenue,
   (SELECT count(*) FROM subscriptions WHERE status='active' AND (lifetime=true OR expires_at>now())) AS active_customers,
   (SELECT count(*) FROM subscriptions WHERE status='pending') AS activations,
   (SELECT count(*) FROM subscriptions WHERE status='active' AND lifetime=false AND expires_at>now() AND expires_at<=now()+interval '7 days') AS expiring_7d,
   (SELECT count(*) FROM payments WHERE status='submitted') AS payments_to_verify,
   (SELECT count(*) FROM conversations WHERE human_takeover=true AND status='open') AS human_takeovers,
   (SELECT count(*) FROM orders WHERE status='new') AS new_orders,
   (SELECT count(*) FROM messages WHERE ai_generated=true) AS ai_messages,
   (SELECT count(*) FROM scheduled_jobs WHERE status='done' AND job_type='satisfaction_j2') AS satisfaction_done,
   (SELECT count(*) FROM scheduled_jobs WHERE status='done' AND job_type IN ('expiration_j7','expiration_j3','expiration_j1')) AS expiration_reminders_done,
   COALESCE((SELECT sum(renewal_count) FROM subscriptions),0) AS renewals
 `);
 const row=result.rows?.[0]??{};
 return {
  monthly_revenue:row.monthly_revenue??0,
  active_customers:row.active_customers??0,
  activations:row.activations??0,
  expiring_7d:row.expiring_7d??0,
  payments_to_verify:row.payments_to_verify??0,
  human_takeovers:row.human_takeovers??0,
  new_orders:row.new_orders??0,
  ai_messages:row.ai_messages??0,
  satisfaction_done:row.satisfaction_done??0,
  expiration_reminders_done:row.expiration_reminders_done??0,
  renewals:row.renewals??0
 };
}

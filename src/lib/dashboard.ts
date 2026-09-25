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
 const row=(result.rows?.[0]??{}) as Record<string,unknown>;
 const value=(key:string):string|number=>{
  const v=row[key];
  return typeof v==='string'||typeof v==='number'?v:0;
 };
 return {
  monthly_revenue:value('monthly_revenue'),
  active_customers:value('active_customers'),
  activations:value('activations'),
  expiring_7d:value('expiring_7d'),
  payments_to_verify:value('payments_to_verify'),
  human_takeovers:value('human_takeovers'),
  new_orders:value('new_orders'),
  ai_messages:value('ai_messages'),
  satisfaction_done:value('satisfaction_done'),
  expiration_reminders_done:value('expiration_reminders_done'),
  renewals:value('renewals')
 };
}

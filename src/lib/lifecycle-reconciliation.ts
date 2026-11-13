import {db} from '@/db';
import {sql} from 'drizzle-orm';

/**
 * Reconstruit les échéances à partir des abonnements actifs, y compris ceux créés
 * manuellement. Les tâches sont uniques par abonnement, étape et date d'expiration.
 * Aucune notification n'est envoyée par cette fonction.
 */
export async function reconcileLifecycleJobs(){
 const result=await db.execute(sql`
 WITH eligible AS (
   SELECT s.id AS subscription_id,c.business_id,s.started_at,s.expires_at,s.lifetime
   FROM subscriptions s JOIN customers c ON c.id=s.customer_id
   WHERE c.business_id=(SELECT id FROM businesses ORDER BY created_at LIMIT 1)
     AND s.status='active' AND s.started_at IS NOT NULL
 ),
 wanted AS (
   SELECT e.business_id,e.subscription_id,v.job_type,v.run_at,e.expires_at
   FROM eligible e
   CROSS JOIN LATERAL (
     VALUES
      ('satisfaction_j2',e.started_at+interval '2 days'),
      ('expiration_j7',e.expires_at-interval '7 days'),
      ('expiration_j3',e.expires_at-interval '3 days'),
      ('expiration_j1',e.expires_at-interval '1 day')
   ) v(job_type,run_at)
   WHERE v.run_at>now() AND v.run_at>e.started_at
     AND (v.job_type='satisfaction_j2' OR (NOT e.lifetime AND e.expires_at>now()))
 ),
 cancelled AS (
   UPDATE scheduled_jobs j SET status='cancelled',updated_at=now()
   WHERE j.status IN ('pending','paused')
    AND j.job_type IN ('satisfaction_j2','expiration_j7','expiration_j3','expiration_j1')
    AND j.business_id=(SELECT id FROM businesses ORDER BY created_at LIMIT 1)
    AND NOT EXISTS (
      SELECT 1 FROM wanted w WHERE w.subscription_id=j.subscription_id
       AND w.job_type=j.job_type AND w.run_at=j.run_at
    )
   RETURNING j.id
 ),
 inserted AS (
   INSERT INTO scheduled_jobs(business_id,subscription_id,job_type,run_at,status,idempotency_key,payload)
   SELECT w.business_id,w.subscription_id,w.job_type,w.run_at,
    CASE WHEN EXISTS(SELECT 1 FROM automation_rules r
      WHERE r.business_id=w.business_id AND r.name='__GLOBAL_PAUSE__' AND r.enabled)
    THEN 'paused' ELSE 'pending' END,
    concat(w.subscription_id,':',w.job_type,':',to_char(w.run_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
    jsonb_build_object('subscriptionId',w.subscription_id,'expiresAt',w.expires_at)
   FROM wanted w
   ON CONFLICT (idempotency_key) DO NOTHING
   RETURNING id
 )
 SELECT (SELECT count(*) FROM inserted)::int AS created,
        (SELECT count(*) FROM cancelled)::int AS cancelled
 `);
 const row=result.rows?.[0];
 return {created:Number(row?.created||0),cancelled:Number(row?.cancelled||0)};
}

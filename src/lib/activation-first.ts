import {db} from '@/db';
import {sql} from 'drizzle-orm';
import {reconcileLifecycleJobs} from '@/lib/lifecycle-reconciliation';

const RFC_UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function parseExpiry(raw:string):Date|null{
 const value=raw.trim();
 if(!value)return null;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new Error('Date d’expiration invalide');
 const date=new Date(value+'T12:00:00+01:00');
 if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==value)throw new Error('Date d’expiration invalide');
 if(date.getTime()<=Date.now())throw new Error('L’expiration doit être postérieure à aujourd’hui.');
 return date;
}

/**
 * Le vendeur atteste que l'accès a bien été activé (manuellement ou par
 * une procédure autorisée). Cette action NE se connecte à aucun service tiers.
 * L'activation n'est pas bloquée par l'encaissement.
 */
export async function confirmSubscriptionActivation(input:{subscriptionId:string;expiresAt?:string}){
 if(!RFC_UUID.test(input.subscriptionId))throw new Error('Identifiant d’abonnement incorrect');
 const customExpiry=parseExpiry(input.expiresAt||'');
 const result=await db.execute(sql`
 WITH target AS (
  SELECT s.id, s.order_id, s.expires_at AS previous_expiry,
   sp.duration_days, sp.lifetime, c.business_id
  FROM subscriptions s
  JOIN customers c ON c.id=s.customer_id
  JOIN service_plans sp ON sp.id=s.service_plan_id
  WHERE s.id=${input.subscriptionId}::uuid
    AND c.business_id=(SELECT id FROM businesses ORDER BY created_at LIMIT 1)
    AND s.status IN ('pending','awaiting_payment')
 ),
 dates AS (
  SELECT t.id,t.order_id,t.business_id,t.lifetime,
   CASE WHEN t.lifetime THEN NULL::timestamptz
    WHEN ${customExpiry}::timestamptz IS NOT NULL THEN ${customExpiry}::timestamptz
    WHEN t.previous_expiry>now() THEN t.previous_expiry
    WHEN t.duration_days IS NOT NULL AND t.duration_days>0 THEN now()+t.duration_days*interval '1 day'
    ELSE NULL::timestamptz
   END AS expiry
  FROM target t
 ),
 activated AS (
  UPDATE subscriptions s SET status='active',started_at=now(),
   expires_at=d.expiry,lifetime=d.lifetime,updated_at=now()
  FROM dates d
  WHERE s.id=d.id AND s.status IN ('pending','awaiting_payment')
    AND (d.lifetime OR d.expiry>now())
  RETURNING s.id,s.order_id,s.started_at,s.expires_at
 ),
 updated_order AS (
  UPDATE orders o SET status='active',updated_at=now()
  WHERE o.id IN(SELECT order_id FROM activated)
  RETURNING o.id
 ),
 audit AS (
  INSERT INTO audit_logs(business_id,actor_type,action,entity_type,entity_id,metadata)
  SELECT d.business_id,'admin','subscription.activation_confirmed_by_admin',
   'subscription',a.id,
   jsonb_build_object('orderId',a.order_id,'expiresAt',a.expires_at,'paymentCanFollowActivation',true)
  FROM activated a JOIN dates d ON d.id=a.id
  RETURNING id
 )
 SELECT a.id,a.order_id,a.started_at,a.expires_at FROM activated a
 `);
 const row=result.rows?.[0];
 if(!row)throw new Error('Activation impossible. Vérifie le statut de la commande et indique une date d’expiration si la formule n’a pas de durée.');
 // Les rappels suivent les données enregistrées; leur synchronisation n'envoie pas de messages.
 try{await reconcileLifecycleJobs();}catch(e){console.error('Activation enregistrée, synchronisation des rappels à reprendre',e);}
 return {subscriptionId:String(row.id),orderId:String(row.order_id),paymentReminderAt:new Date(new Date(String(row.started_at)).getTime()+10*60_000)};
}

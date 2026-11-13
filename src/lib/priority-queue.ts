import {db} from '@/db';
import {sql} from 'drizzle-orm';

export type PriorityItem={id:string;customerId:string;customerName:string;phone:string;serviceName:string;expiresAt:string|null;status:string;paymentStatus:string;kind:'expiring'|'expired'|'payment'|'payment_overdue'|'activation';priority:number;description:string};
export async function getPriorityQueue(limit=100){
 const result=await db.execute(sql`
 SELECT s.id,s.customer_id,trim(concat_ws(' ',c.first_name,c.last_name)) AS customer_name,c.phone,
 sv.name AS service_name,s.expires_at,s.status,
 coalesce(p.status,'unpaid') AS payment_status,
 CASE WHEN p.status='submitted' THEN 'payment'
      WHEN s.status='active' AND s.started_at<=now()-interval '10 minutes' AND p.status IS DISTINCT FROM 'verified' THEN 'payment_overdue'
      WHEN s.status='active' AND NOT s.lifetime AND s.expires_at<=now() THEN 'expired'
      WHEN s.status='active' AND NOT s.lifetime AND s.expires_at>now() AND s.expires_at<=now()+interval '7 days' THEN 'expiring'
      ELSE 'activation' END AS kind
 FROM subscriptions s
 JOIN customers c ON c.id=s.customer_id
 JOIN service_plans sp ON sp.id=s.service_plan_id
 JOIN services sv ON sv.id=sp.service_id
 LEFT JOIN LATERAL (SELECT status FROM payments WHERE order_id=s.order_id ORDER BY created_at DESC LIMIT 1) p ON true
 WHERE c.business_id=(SELECT id FROM businesses ORDER BY created_at LIMIT 1)
 AND (
  (s.status='active' AND NOT s.lifetime AND s.expires_at<=now()+interval '7 days')
  OR p.status='submitted'
  OR (s.status='active' AND s.started_at<=now()-interval '10 minutes' AND p.status IS DISTINCT FROM 'verified')
  OR s.status IN ('pending','awaiting_payment')
 )
 ORDER BY CASE
  WHEN p.status='submitted' THEN 1
  WHEN s.status='active' AND s.started_at<=now()-interval '10 minutes' AND p.status IS DISTINCT FROM 'verified' THEN 2
  WHEN s.status='active' AND NOT s.lifetime AND s.expires_at<=now() THEN 3
  WHEN s.status='active' AND NOT s.lifetime AND s.expires_at<=now()+interval '3 days' THEN 4
  WHEN s.status IN ('pending','awaiting_payment') THEN 5
  ELSE 6 END,s.expires_at ASC NULLS LAST,s.created_at DESC
 LIMIT ${Math.min(Math.max(1,limit),200)}
 `);
 const rows=result.rows as Record<string,unknown>[];
 const items:PriorityItem[]=rows.map(r=>{
  const kind=String(r.kind) as PriorityItem['kind'];
  const priority=kind==='payment'?1:kind==='payment_overdue'?2:kind==='expired'?3:kind==='expiring'?4:5;
  const description=kind==='payment'?'Capture de paiement à vérifier':kind==='payment_overdue'?'Paiement non vérifié plus de 10 minutes après activation':kind==='expired'?'Abonnement expiré':kind==='expiring'?'Renouvellement à anticiper':'Activation ou règlement en attente';
  return{id:String(r.id),customerId:String(r.customer_id),customerName:String(r.customer_name||r.phone),phone:String(r.phone),serviceName:String(r.service_name),expiresAt:r.expires_at?String(r.expires_at):null,status:String(r.status),paymentStatus:String(r.payment_status),kind,priority,description};
 });
 return {items,counts:{total:items.length,payment:items.filter(x=>x.kind==='payment').length,overdue:items.filter(x=>x.kind==='payment_overdue').length,expired:items.filter(x=>x.kind==='expired').length,expiring:items.filter(x=>x.kind==='expiring').length,activation:items.filter(x=>x.kind==='activation').length},limited:items.length===Math.min(Math.max(1,limit),200)};
}

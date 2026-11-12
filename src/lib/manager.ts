
import {neon} from '@neondatabase/serverless';

function client(){
  if(!process.env.DATABASE_URL)throw new Error('Base de données non configurée');
  return neon(process.env.DATABASE_URL);
}
const UUID_ZERO='00000000-0000-0000-0000-000000000000';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function validDate(raw:string,mandatory:boolean){
  if(!raw){if(mandatory)throw new Error('Date d’expiration requise');return null;}
  if(!/^\d{4}-\d{2}-\d{2}$/.test(raw))throw new Error('Date incorrecte');
  const date=new Date(raw+'T12:00:00+01:00');
  if(!Number.isFinite(date.valueOf())||date.toISOString().slice(0,10)!==raw)throw new Error('Date incorrecte');
  return date;
}
function normalizePhone(raw:string){
  const digits=raw.replace(/\D/g,'');
  if(/^6\d{8}$/.test(digits))return '+237'+digits;
  if(/^2376\d{8}$/.test(digits))return '+'+digits;
  if(/^\+\d{8,15}$/.test(raw.trim().replace(/[\s.()-]/g,'')))return raw.trim().replace(/[\s.()-]/g,'');
  throw new Error('Téléphone invalide. Exemple : 6XXXXXXXX ou +2376XXXXXXXX');
}
function amount(raw:string){
  const value=Number(raw);
  if(!Number.isInteger(value)||value<=0||value>20000000)throw new Error('Saisis un prix valide en FCFA');
  return value;
}

export type Registration={
  customerId?:string;firstName?:string;lastName?:string;phone?:string;email?:string;
  servicePlanId?:string;customService?:string;customPlan?:string;price:string;
  startedAt:string;expiresAt:string;lifetime:boolean;
  activationStatus:'active'|'pending';paymentStatus:'unpaid'|'submitted'|'verified';
};

/** Une seule instruction SQL assure une création atomique du client, de l’offre, de la commande et de l’abonnement. */
export async function registerSubscription(input:Registration){
  const existing=Boolean(input.customerId);
  if(existing&&!uuid.test(input.customerId!))throw new Error('Client invalide');
  const firstName=(input.firstName||'').trim().slice(0,100);
  const lastName=(input.lastName||'').trim().slice(0,100);
  if(!existing&&!firstName&&!lastName)throw new Error('Indique le nom du client');
  const phone=existing?'':normalizePhone(input.phone||'');
  const email=(input.email||'').trim().slice(0,255);
  if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Adresse e-mail invalide');
  const isCustom=!input.servicePlanId;
  const planId=input.servicePlanId||UUID_ZERO;
  if(!isCustom&&!uuid.test(planId))throw new Error('Formule invalide');
  const customService=(input.customService||'').trim().slice(0,160);
  const customPlan=(input.customPlan||'Personnalisé').trim().slice(0,120);
  if(isCustom&&!customService)throw new Error('Indique le nom du nouvel abonnement');
  const price=amount(input.price);
  if(!['active','pending'].includes(input.activationStatus))throw new Error('Statut d’activation invalide');
  if(!['unpaid','submitted','verified'].includes(input.paymentStatus))throw new Error('Statut de paiement invalide');
  const started=input.activationStatus==='active'?validDate(input.startedAt,true):null;
  const expires=input.lifetime?null:validDate(input.expiresAt,input.activationStatus==='active');
  if(started&&expires&&expires<=started)throw new Error('L’expiration doit être après l’activation');

  const sql=client();
  if(!isCustom){
    const found=await sql`SELECT sp.id FROM service_plans sp JOIN services s ON s.id=sp.service_id
      WHERE sp.id=${planId}::uuid AND sp.active=true AND s.active=true
        AND s.business_id=(SELECT id FROM businesses ORDER BY created_at LIMIT 1) LIMIT 1`;
    if(!found.length)throw new Error('Cette formule n’est plus disponible');
  }
  const activation=input.activationStatus==='active'?'active':input.paymentStatus==='verified'?'pending':'awaiting_payment';
  const orderStatus=input.activationStatus==='active'?'active':input.paymentStatus==='verified'?'paid':input.paymentStatus==='submitted'?'payment_submitted':'new';
  const paymentStatus=input.paymentStatus;
  const rows=await sql`
    WITH business AS (SELECT id FROM businesses ORDER BY created_at LIMIT 1),
    inserted_customer AS (
      INSERT INTO customers(business_id,first_name,last_name,phone,email,status)
      SELECT business.id,${firstName||null},${lastName||null},${phone},${email||null},'active' FROM business
      WHERE ${!existing}::boolean
      ON CONFLICT (business_id,phone) DO NOTHING
      RETURNING id,business_id
    ),
    existing_customer AS (
      SELECT c.id,c.business_id FROM customers c JOIN business b ON c.business_id=b.id
      WHERE ${existing}::boolean AND c.id=${existing?input.customerId:UUID_ZERO}::uuid
    ),
    chosen_customer AS (
      SELECT * FROM inserted_customer UNION ALL SELECT * FROM existing_customer
    ),
    existing_service AS (
      SELECT s.id FROM services s JOIN chosen_customer c ON c.business_id=s.business_id
      WHERE ${isCustom}::boolean AND lower(s.name)=lower(${customService}) LIMIT 1
    ),
    inserted_service AS (
      INSERT INTO services(business_id,name,active)
      SELECT c.business_id,${customService},true FROM chosen_customer c
      WHERE ${isCustom}::boolean AND NOT EXISTS (SELECT 1 FROM existing_service)
      RETURNING id
    ),
    custom_service AS (
      SELECT id FROM existing_service UNION ALL SELECT id FROM inserted_service
    ),
    existing_custom_plan AS (
      SELECT sp.id FROM service_plans sp JOIN custom_service s ON s.id=sp.service_id
      WHERE ${isCustom}::boolean AND lower(sp.name)=lower(${customPlan}) LIMIT 1
    ),
    inserted_custom_plan AS (
      INSERT INTO service_plans(service_id,name,price,currency,duration_days,lifetime,active)
      SELECT s.id,${customPlan},${price},'XAF',NULL,${input.lifetime}::boolean,true
      FROM custom_service s JOIN chosen_customer c ON true
      WHERE ${isCustom}::boolean AND NOT EXISTS(SELECT 1 FROM existing_custom_plan)
      RETURNING id
    ),
    offer AS (
      SELECT sp.id FROM service_plans sp JOIN services s ON sp.service_id=s.id
      JOIN chosen_customer c ON c.business_id=s.business_id
      WHERE NOT ${isCustom}::boolean AND sp.id=${planId}::uuid AND sp.active AND s.active
      UNION ALL SELECT id FROM existing_custom_plan
      UNION ALL SELECT id FROM inserted_custom_plan
    ),
    created_order AS (
      INSERT INTO orders(business_id,customer_id,status,total,currency)
      SELECT c.business_id,c.id,${orderStatus},${price},'XAF'
      FROM chosen_customer c JOIN offer ON true
      RETURNING id,customer_id,business_id
    ),
    created_subscription AS (
      INSERT INTO subscriptions(customer_id,service_plan_id,order_id,status,started_at,expires_at,lifetime)
      SELECT o.customer_id,offer.id,o.id,${activation},${started},${expires},${input.lifetime}::boolean
      FROM created_order o JOIN offer ON true
      RETURNING id,customer_id,order_id
    ),
    created_payment AS (
      INSERT INTO payments(customer_id,order_id,amount,currency,method,status,paid_at,verified_at)
      SELECT o.customer_id,o.id,${price},'XAF','manuel',${paymentStatus},
      CASE WHEN ${paymentStatus}='verified' THEN now() ELSE NULL END,
      CASE WHEN ${paymentStatus}='verified' THEN now() ELSE NULL END
      FROM created_order o WHERE ${paymentStatus} IN ('submitted','verified')
      RETURNING id
    ),
    audit_entry AS (
      INSERT INTO audit_logs(business_id,actor_type,action,entity_type,entity_id,metadata)
      SELECT o.business_id,'admin','manual.subscription.created','subscription',s.id,
      jsonb_build_object('source','manual_form','orderId',o.id,'payment',${paymentStatus})
      FROM created_subscription s JOIN created_order o ON o.id=s.order_id
      RETURNING id
    )
    SELECT s.id AS subscription_id,s.customer_id FROM created_subscription s
  `;
  if(!rows.length)throw new Error(existing?'Impossible d’ajouter cet abonnement au client.':'Ce numéro existe déjà ou la formule est indisponible. Ouvre sa fiche client pour lui ajouter un abonnement.');
  return{customerId:String(rows[0].customer_id),subscriptionId:String(rows[0].subscription_id)};
}

export async function listClientDirectory(){
 const sql=client();
 const rows=await sql`
 SELECT c.id,c.first_name,c.last_name,c.phone,c.email,c.created_at,
 (SELECT count(*)::int FROM subscriptions s WHERE s.customer_id=c.id AND s.status='active' AND (s.lifetime OR s.expires_at>now())) AS active_count,
 (SELECT count(*)::int FROM subscriptions s WHERE s.customer_id=c.id) AS total_subscriptions,
 (SELECT min(s.expires_at) FROM subscriptions s WHERE s.customer_id=c.id AND s.status='active' AND s.lifetime=false AND s.expires_at>=now()) AS next_expiry,
 (SELECT sv.name FROM subscriptions s JOIN service_plans sp ON sp.id=s.service_plan_id
  JOIN services sv ON sv.id=sp.service_id WHERE s.customer_id=c.id ORDER BY s.created_at DESC LIMIT 1) AS last_service
 FROM customers c WHERE c.business_id=(SELECT id FROM businesses ORDER BY created_at LIMIT 1)
 ORDER BY c.created_at DESC LIMIT 300`;
 return rows.map(r=>({
  id:String(r.id),name:[r.first_name,r.last_name].filter(Boolean).join(' ')||String(r.phone),
  phone:String(r.phone),email:String(r.email||''),activeCount:Number(r.active_count||0),
  totalSubscriptions:Number(r.total_subscriptions||0),nextExpiry:r.next_expiry?new Date(String(r.next_expiry)).toISOString():null,
  lastService:String(r.last_service||'Aucun abonnement'),createdAt:String(r.created_at)
 }));
}

export async function listSubscriptionDirectory(){
 const sql=client();
 const rows=await sql`
 SELECT s.id,s.customer_id,s.status,s.started_at,s.expires_at,s.lifetime,
 c.first_name,c.last_name,c.phone,sv.name AS service_name,sp.name AS plan_name,
 o.total,o.currency,coalesce(p.status,'unpaid') AS payment_status
 FROM subscriptions s JOIN customers c ON c.id=s.customer_id
 JOIN service_plans sp ON sp.id=s.service_plan_id JOIN services sv ON sv.id=sp.service_id
 LEFT JOIN orders o ON o.id=s.order_id
 LEFT JOIN LATERAL (SELECT status FROM payments WHERE order_id=o.id ORDER BY created_at DESC LIMIT 1) p ON true
 WHERE c.business_id=(SELECT id FROM businesses ORDER BY created_at LIMIT 1)
 ORDER BY s.created_at DESC LIMIT 300`;
 return rows.map(r=>({
  id:String(r.id),customerId:String(r.customer_id),
  customerName:[r.first_name,r.last_name].filter(Boolean).join(' ')||String(r.phone),
  phone:String(r.phone),status:String(r.status),startedAt:r.started_at?String(r.started_at):null,
  expiresAt:r.expires_at?String(r.expires_at):null,lifetime:Boolean(r.lifetime),
  serviceName:String(r.service_name),planName:String(r.plan_name),
  total:Number(r.total||0),currency:String(r.currency||'XAF'),paymentStatus:String(r.payment_status)
 }));
}

export async function getClientDetails(id:string){
 if(!uuid.test(id))return null;
 const sql=client();
 const [customer]=await sql`SELECT id,first_name,last_name,phone,email FROM customers
 WHERE id=${id}::uuid AND business_id=(SELECT id FROM businesses ORDER BY created_at LIMIT 1) LIMIT 1`;
 if(!customer)return null;
 const subscriptions=await sql`
 SELECT s.id,s.status,s.started_at,s.expires_at,s.lifetime,o.total,o.id AS order_id,
 sp.name AS plan_name,sv.name AS service_name,coalesce(p.status,'unpaid') AS payment_status
 FROM subscriptions s JOIN service_plans sp ON sp.id=s.service_plan_id
 JOIN services sv ON sv.id=sp.service_id LEFT JOIN orders o ON o.id=s.order_id
 LEFT JOIN LATERAL (SELECT status FROM payments WHERE order_id=o.id ORDER BY created_at DESC LIMIT 1) p ON true
 WHERE s.customer_id=${id}::uuid ORDER BY s.created_at DESC`;
 return{
  id:String(customer.id),name:[customer.first_name,customer.last_name].filter(Boolean).join(' ')||String(customer.phone),
  phone:String(customer.phone),email:String(customer.email||''),
  subscriptions:subscriptions.map(r=>({id:String(r.id),status:String(r.status),
  startedAt:r.started_at?String(r.started_at):null,expiresAt:r.expires_at?String(r.expires_at):null,
  lifetime:Boolean(r.lifetime),price:Number(r.total||0),orderId:String(r.order_id||''),serviceName:String(r.service_name),
  planName:String(r.plan_name),paymentStatus:String(r.payment_status)}))
 };
}

export async function updateManualSubscription(input:{subscriptionId:string;expiresAt:string;price:string}){
 if(!uuid.test(input.subscriptionId))throw new Error('Abonnement invalide');
 const sql=client();
 const [current]=await sql`
 SELECT s.id,s.started_at,s.lifetime,s.order_id,o.total,
 EXISTS(SELECT 1 FROM payments p WHERE p.order_id=o.id AND p.status IN ('verified','submitted')) AS already_paid
 FROM subscriptions s JOIN customers c ON c.id=s.customer_id
 LEFT JOIN orders o ON o.id=s.order_id
 WHERE s.id=${input.subscriptionId}::uuid AND c.business_id=(SELECT id FROM businesses ORDER BY created_at LIMIT 1)`;
 if(!current)throw new Error('Abonnement introuvable');
 const date=Boolean(current.lifetime)?null:validDate(input.expiresAt,true);
 const start=current.started_at?new Date(String(current.started_at)):null;
 if(start&&date&&date<=start)throw new Error('La date d’expiration doit être postérieure à l’activation');
 const price=amount(input.price);
 if(Boolean(current.already_paid)&&price!==Number(current.total))throw new Error('Impossible de modifier le prix tant qu’un paiement a déjà été déclaré ou vérifié. Corrige le paiement séparément.');
 const rows=await sql`
 WITH updated AS (
  UPDATE subscriptions SET expires_at=${date},updated_at=now()
  WHERE id=${input.subscriptionId}::uuid RETURNING id,order_id
 ),
 updated_order AS (
  UPDATE orders SET total=${price},updated_at=now()
  WHERE id IN(SELECT order_id FROM updated) RETURNING id
 ),
 audit AS (
  INSERT INTO audit_logs(business_id,actor_type,action,entity_type,entity_id,metadata)
  SELECT c.business_id,'admin','manual.subscription.updated','subscription',updated.id,
  jsonb_build_object('expiresAt',${input.expiresAt},'price',${price})
  FROM updated JOIN subscriptions s ON s.id=updated.id JOIN customers c ON c.id=s.customer_id
  RETURNING id
 )
 SELECT id FROM updated`;
 if(!rows.length)throw new Error('Modification impossible');
 return true;
}

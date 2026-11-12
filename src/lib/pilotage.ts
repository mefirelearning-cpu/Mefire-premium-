import {db} from '@/db';
import {services} from '@/db/schema';
import {sql} from 'drizzle-orm';

export type PilotageFilters = {
 serviceId:string|null;month:string|null;axis:'start'|'end';
 status:'all'|'active'|'due'|'expired'|'pending'|'unpaid'|'submitted'|'verified';
 q:string;page:number;
};
export type ServiceOverview={
 id:string;name:string;total:number;active:number;due:number;expired:number;
 pending:number;verified:number;unpaid:number;submitted:number;
 faceValue:number;verifiedValue:number;outstandingValue:number;
};
export type PortfolioRow={
 id:string;customerId:string;customerName:string;phone:string;
 serviceId:string;serviceName:string;planName:string;status:string;
 startedAt:string|null;expiresAt:string|null;lifetime:boolean;
 paymentStatus:string;price:number;createdAt:string;
};
export const PAGE_SIZE=75;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizePilotageFilters(raw:Record<string,string|undefined>):PilotageFilters {
 const statuses=['all','active','due','expired','pending','unpaid','submitted','verified'] as const;
 const status=statuses.find(s=>s===raw.status)||'all';
 const page=Number(raw.page||'1');
 return {
  serviceId:raw.serviceId&&UUID.test(raw.serviceId)?raw.serviceId:null,
  month:raw.month&&/^(20[2-9]\d|21\d{2})-(0[1-9]|1[0-2])$/.test(raw.month)?raw.month:null,
  axis:raw.axis==='end'?'end':'start',
  status,
  q:(raw.q||'').trim().slice(0,100),
  page:Number.isInteger(page)&&page>=1&&page<10000?page:1
 };
}
export function pilotageQueryString(f:PilotageFilters,extra:Record<string,string>={}){
 const p=new URLSearchParams();
 if(f.serviceId)p.set('serviceId',f.serviceId);
 if(f.month)p.set('month',f.month);
 if(f.axis==='end')p.set('axis','end');
 if(f.status!=='all')p.set('status',f.status);
 if(f.q)p.set('q',f.q);
 if(f.page>1)p.set('page',String(f.page));
 for(const [key,value] of Object.entries(extra)){if(value)p.set(key,value);else p.delete(key);}
 return p.toString();
}
const numeric=(v:unknown)=>Number(v||0);
function baseFilter(f:PilotageFilters){
 const serviceId=f.serviceId;
 const month=f.month;
 const axis=f.axis;
 return sql`
  FROM subscriptions s
  JOIN customers c ON c.id=s.customer_id
  JOIN service_plans sp ON sp.id=s.service_plan_id
  JOIN services sv ON sv.id=sp.service_id
  LEFT JOIN orders o ON o.id=s.order_id
  LEFT JOIN LATERAL (
    SELECT p.status, p.amount
    FROM payments p WHERE p.order_id=o.id
    ORDER BY p.created_at DESC LIMIT 1
  ) p ON TRUE
  WHERE c.business_id=(SELECT id FROM businesses ORDER BY created_at ASC LIMIT 1)
    AND (${serviceId}::uuid IS NULL OR sv.id=${serviceId}::uuid)
    AND (${month}::text IS NULL OR
      to_char((CASE WHEN ${axis}='end' THEN s.expires_at
        ELSE COALESCE(s.started_at,s.created_at) END AT TIME ZONE 'Africa/Douala'),'YYYY-MM')=${month})
 `;
}
function filterDetails(f:PilotageFilters){
 const status=f.status;
 const q=f.q;
 return sql`
 AND (
  ${status}='all'
  OR (${status}='active' AND s.status='active' AND (s.lifetime OR s.expires_at>now()))
  OR (${status}='due' AND s.status='active' AND NOT s.lifetime
    AND s.expires_at>now() AND s.expires_at<=now()+interval '7 days')
  OR (${status}='expired' AND (s.status='expired' OR (NOT s.lifetime AND s.expires_at<=now())))
  OR (${status}='pending' AND s.status IN ('pending','awaiting_payment'))
  OR (${status}='verified' AND p.status='verified')
  OR (${status}='submitted' AND p.status='submitted')
  OR (${status}='unpaid' AND p.status IS DISTINCT FROM 'verified'
    AND p.status IS DISTINCT FROM 'submitted')
 )
 AND (${q}='' OR concat_ws(' ',c.first_name,c.last_name,c.phone,sv.name,sp.name) ILIKE ${'%'+q+'%'})
 `;
}

/** Agrégation par plateforme sur toute la base; pas de plafond de 100 abonnements. */
export async function getPortfolioOverview(f:PilotageFilters) {
 const result=await db.execute(sql`
  SELECT sv.id AS service_id, sv.name AS service_name,
   count(*) AS total,
   count(*) FILTER(WHERE s.status='active' AND (s.lifetime OR s.expires_at>now())) AS active,
   count(*) FILTER(WHERE s.status='active' AND NOT s.lifetime AND s.expires_at>now()
      AND s.expires_at<=now()+interval '7 days') AS due,
   count(*) FILTER(WHERE s.status='expired' OR (NOT s.lifetime AND s.expires_at<=now())) AS expired,
   count(*) FILTER(WHERE s.status IN ('pending','awaiting_payment')) AS pending,
   count(*) FILTER(WHERE p.status='verified') AS verified,
   count(*) FILTER(WHERE p.status='submitted') AS submitted,
   count(*) FILTER(WHERE p.status IS DISTINCT FROM 'verified' AND p.status IS DISTINCT FROM 'submitted') AS unpaid,
   coalesce(sum(o.total),0) AS face_value,
   coalesce(sum(CASE WHEN p.status='verified' THEN p.amount ELSE 0 END),0) AS verified_value,
   coalesce(sum(CASE WHEN p.status IS DISTINCT FROM 'verified' THEN o.total ELSE 0 END),0) AS outstanding_value
   ${baseFilter(f)}
   GROUP BY sv.id,sv.name ORDER BY sv.name ASC
 `);
 const rows=(result.rows||[]).map((r):ServiceOverview=>({
  id:String(r.service_id),name:String(r.service_name),
  total:numeric(r.total),active:numeric(r.active),due:numeric(r.due),
  expired:numeric(r.expired),pending:numeric(r.pending),
  verified:numeric(r.verified),submitted:numeric(r.submitted),unpaid:numeric(r.unpaid),
  faceValue:numeric(r.face_value),verifiedValue:numeric(r.verified_value),
  outstandingValue:numeric(r.outstanding_value)
 }));
 const totals=rows.reduce((sum,r)=>({
  total:sum.total+r.total,active:sum.active+r.active,due:sum.due+r.due,
  expired:sum.expired+r.expired,pending:sum.pending+r.pending,
  verified:sum.verified+r.verified,submitted:sum.submitted+r.submitted,unpaid:sum.unpaid+r.unpaid,
  faceValue:sum.faceValue+r.faceValue,verifiedValue:sum.verifiedValue+r.verifiedValue,
  outstandingValue:sum.outstandingValue+r.outstandingValue
 }),{total:0,active:0,due:0,expired:0,pending:0,verified:0,submitted:0,unpaid:0,faceValue:0,verifiedValue:0,outstandingValue:0});
 return {rows,totals};
}

export async function getPilotageServices(){
 return db.select({id:services.id,name:services.name}).from(services).orderBy(services.name);
}

export async function getPortfolioDetails(f:PilotageFilters,limit=PAGE_SIZE,offset=(f.page-1)*PAGE_SIZE){
 const result=await db.execute(sql`
 SELECT s.id,s.customer_id, c.first_name,c.last_name,c.phone,sv.id AS service_id,
  sv.name AS service_name,sp.name AS plan_name,s.status,s.started_at,s.expires_at,
  s.lifetime,s.created_at,coalesce(p.status,'unpaid') AS payment_status,coalesce(o.total,0) AS price,
  count(*) OVER() AS matching_count
 ${baseFilter(f)}
 ${filterDetails(f)}
 ORDER BY
 CASE WHEN s.status='active' AND NOT s.lifetime AND s.expires_at>now()
  THEN s.expires_at END ASC NULLS LAST,
 s.created_at DESC,s.id DESC
 LIMIT ${limit} OFFSET ${offset}
 `);
 const rows=(result.rows||[]).map((r):PortfolioRow=>({
  id:String(r.id),customerId:String(r.customer_id),
  customerName:[r.first_name,r.last_name].filter(Boolean).join(' ')||String(r.phone),
  phone:String(r.phone),serviceId:String(r.service_id),serviceName:String(r.service_name),
  planName:String(r.plan_name),status:String(r.status),
  startedAt:r.started_at?new Date(String(r.started_at)).toISOString():null,
  expiresAt:r.expires_at?new Date(String(r.expires_at)).toISOString():null,
  lifetime:Boolean(r.lifetime),paymentStatus:String(r.payment_status),
  price:numeric(r.price),createdAt:new Date(String(r.created_at)).toISOString()
 }));
 let matching=rows.length?numeric(result.rows?.[0]?.matching_count):0;
 if(f.page>1&&rows.length===0){
  const count=await db.execute(sql`SELECT count(*) AS n ${baseFilter(f)} ${filterDetails(f)}`);
  matching=numeric(count.rows?.[0]?.n);
 }
 return {rows,matching,hasNext:f.page*PAGE_SIZE<matching};
}

/** Une période de vente et une période d'encaissement sont comptées séparément. */
export async function getMonthlyTimeline(months=12){
 const count=Math.max(1,Math.min(24,months));
 const result=await db.execute(sql`
 WITH calendar AS(
  SELECT (date_trunc('month',now() AT TIME ZONE 'Africa/Douala')-
    (gs.idx||' months')::interval)::date AS m
  FROM generate_series(0,${count-1}) gs(idx)
 ),
 orders_month AS(
  SELECT date_trunc('month',o.created_at AT TIME ZONE 'Africa/Douala')::date AS m,
   count(*) AS orders
  FROM orders o WHERE o.business_id=(SELECT id FROM businesses ORDER BY created_at LIMIT 1)
  GROUP BY 1
 ),
 activations_month AS (
  SELECT date_trunc('month',s.started_at AT TIME ZONE 'Africa/Douala')::date AS m,
   count(*) AS activations
  FROM subscriptions s JOIN customers c ON c.id=s.customer_id
  WHERE c.business_id=(SELECT id FROM businesses ORDER BY created_at LIMIT 1)
   AND s.started_at IS NOT NULL
  GROUP BY 1
 ),
 verified_month AS(
  SELECT date_trunc('month',p.verified_at AT TIME ZONE 'Africa/Douala')::date AS m,
   count(*) AS payments,coalesce(sum(p.amount),0) AS amount
  FROM payments p JOIN customers c ON c.id=p.customer_id
  WHERE c.business_id=(SELECT id FROM businesses ORDER BY created_at LIMIT 1)
   AND p.status='verified' AND p.verified_at IS NOT NULL
  GROUP BY 1
 )
 SELECT to_char(c.m,'YYYY-MM') AS month,
  coalesce(o.orders,0) AS orders,coalesce(a.activations,0) AS activations,
  coalesce(v.payments,0) AS verified_payments,coalesce(v.amount,0) AS confirmed_amount
 FROM calendar c LEFT JOIN orders_month o USING(m)
 LEFT JOIN activations_month a USING(m) LEFT JOIN verified_month v USING(m)
 ORDER BY c.m DESC
 `);
 return (result.rows||[]).map(r=>({
  month:String(r.month),orders:numeric(r.orders),activations:numeric(r.activations),
  payments:numeric(r.verified_payments),amount:numeric(r.confirmed_amount)
 }));
}

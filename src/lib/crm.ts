import {db} from '@/db';
import {auditLogs,businesses,customers,orders,payments,scheduledJobs,servicePlans,services,subscriptions} from '@/db/schema';
import {and,eq,or} from 'drizzle-orm';
import {computeActivation} from './subscriptions';

async function businessId(){const [b]=await db.select({id:businesses.id}).from(businesses).limit(1);if(!b)throw new Error('Entreprise non initialisée');return b.id;}

function normalizePhone(input:string){
 const raw=input.trim();
 if(/^\+\d{8,15}$/.test(raw.replace(/[\s().-]/g,'')))return raw.replace(/[\s().-]/g,'');
 const digits=raw.replace(/\D/g,'');
 if(/^\d{9}$/.test(digits))return `+237${digits}`;
 if(/^237\d{9}$/.test(digits))return `+${digits}`;
 throw new Error('Numéro WhatsApp invalide. Utilise +2376XXXXXXXX ou 6XXXXXXXX.');
}

export async function createCustomer(input:{firstName?:string;lastName?:string;phone:string;email?:string}){
 const bid=await businessId();
 const phone=normalizePhone(input.phone);
 const [row]=await db.insert(customers).values({businessId:bid,firstName:input.firstName,lastName:input.lastName,phone,email:input.email,status:'lead'}).returning();
 await db.insert(auditLogs).values({businessId:bid,actorType:'admin',action:'customer.created',entityType:'customer',entityId:row.id});
 return row;
}

export async function createServiceWithPlan(input:{serviceName:string;description?:string;planName:string;price:string;durationDays?:number;lifetime:boolean}){
 const bid=await businessId();
 const price=Number(input.price);
 if(!Number.isFinite(price)||price<=0)throw new Error('Prix invalide');
 if(!input.lifetime&&(!input.durationDays||input.durationDays<1))throw new Error('Durée invalide');
 const [service]=await db.insert(services).values({businessId:bid,name:input.serviceName,description:input.description,active:true}).returning();
 const [plan]=await db.insert(servicePlans).values({serviceId:service.id,name:input.planName,price:String(Math.round(price)),currency:'XAF',durationDays:input.lifetime?null:input.durationDays,lifetime:input.lifetime,active:true}).returning();
 await db.insert(auditLogs).values({businessId:bid,actorType:'admin',action:'catalog.created',entityType:'service',entityId:service.id,metadata:{planId:plan.id}});
 return{service,plan};
}

export async function createOrder(input:{customerId:string;servicePlanId:string}){
 const [customer]=await db.select({id:customers.id,businessId:customers.businessId}).from(customers).where(eq(customers.id,input.customerId)).limit(1);
 if(!customer)throw new Error('Client introuvable');
 const [offer]=await db.select({planId:servicePlans.id,price:servicePlans.price,currency:servicePlans.currency,serviceId:services.id,businessId:services.businessId}).from(servicePlans).innerJoin(services,eq(servicePlans.serviceId,services.id)).where(and(eq(servicePlans.id,input.servicePlanId),eq(servicePlans.active,true),eq(services.active,true))).limit(1);
 if(!offer)throw new Error('Formule indisponible');
 if(customer.businessId!==offer.businessId)throw new Error('Client et formule incompatibles');
 const [order]=await db.insert(orders).values({businessId:offer.businessId,customerId:customer.id,total:offer.price,currency:offer.currency,status:'new'}).returning();
 const [subscription]=await db.insert(subscriptions).values({customerId:customer.id,servicePlanId:offer.planId,orderId:order.id,status:'awaiting_payment'}).returning();
 await db.insert(auditLogs).values({businessId:offer.businessId,actorType:'admin',action:'order.created',entityType:'order',entityId:order.id,metadata:{subscriptionId:subscription.id,servicePlanId:offer.planId}});
 return{order,subscription};
}

export async function recordPayment(input:{orderId:string;method?:string;reference?:string}){
 const [order]=await db.select().from(orders).where(eq(orders.id,input.orderId)).limit(1);
 if(!order)throw new Error('Commande introuvable');
 if(order.status==='paid'||order.status==='active')throw new Error('Cette commande est déjà payée');
 const existing=await db.select({status:payments.status}).from(payments).where(eq(payments.orderId,order.id)).limit(10);
 if(existing.some(x=>x.status==='submitted'||x.status==='verified'))throw new Error('Un paiement est déjà en attente ou vérifié pour cette commande');
 const now=new Date();
 const [row]=await db.insert(payments).values({customerId:order.customerId,orderId:order.id,amount:order.total,currency:order.currency,method:input.method,reference:input.reference,status:'submitted',paidAt:now}).returning();
 await db.update(orders).set({status:'payment_submitted',updatedAt:now}).where(eq(orders.id,order.id));
 await db.insert(auditLogs).values({businessId:order.businessId,actorType:'admin',action:'payment.submitted',entityType:'payment',entityId:row.id,metadata:{orderId:order.id}});
 return row;
}

export async function verifyPayment(input:{paymentId:string}){
 const [p]=await db.select().from(payments).where(eq(payments.id,input.paymentId)).limit(1);
 if(!p)throw new Error('Paiement introuvable');
 if(!p.orderId)throw new Error('Paiement sans commande associée');
 const [order]=await db.select().from(orders).where(eq(orders.id,p.orderId)).limit(1);
 if(!order)throw new Error('Commande introuvable');
 const [sub]=await db.select().from(subscriptions).where(eq(subscriptions.orderId,order.id)).limit(1);
 if(!sub)throw new Error('Abonnement associé introuvable');
 const now=new Date();
 const [verified]=await db.update(payments).set({status:'verified',verifiedAt:now,updatedAt:now}).where(and(eq(payments.id,p.id),or(eq(payments.status,'submitted'),eq(payments.status,'pending')))).returning();
 if(!verified)throw new Error('Paiement déjà traité');
 await db.update(orders).set({status:'paid',updatedAt:now}).where(eq(orders.id,order.id));
 await db.update(subscriptions).set({status:'pending',updatedAt:now}).where(and(eq(subscriptions.id,sub.id),eq(subscriptions.status,'awaiting_payment')));
 await db.insert(auditLogs).values({businessId:order.businessId,actorType:'admin',action:'payment.verified',entityType:'payment',entityId:p.id,metadata:{subscriptionId:sub.id,orderId:order.id}});
 return{payment:verified,subscriptionId:sub.id};
}

async function scheduleLifecycle(subscriptionId:string,startedAt:Date,expiresAt:Date|null){
 const bid=await businessId();
 const jobs:{businessId:string;subscriptionId:string;jobType:string;runAt:Date;idempotencyKey:string;payload:Record<string,unknown>}[]=[];
 const add=(type:string,runAt:Date)=>jobs.push({businessId:bid,subscriptionId,jobType:type,runAt,idempotencyKey:`${subscriptionId}:${type}:${runAt.toISOString()}`,payload:{subscriptionId}});
 const satisfaction=new Date(startedAt);satisfaction.setUTCDate(satisfaction.getUTCDate()+2);add('satisfaction_j2',satisfaction);
 if(expiresAt)for(const days of [7,3,1]){const runAt=new Date(expiresAt);runAt.setUTCDate(runAt.getUTCDate()-days);if(runAt>startedAt)add(`expiration_j${days}`,runAt);}
 if(jobs.length)await db.insert(scheduledJobs).values(jobs).onConflictDoNothing({target:scheduledJobs.idempotencyKey});
}

export async function activateSubscription(input:{subscriptionId:string}){
 const [s]=await db.select({id:subscriptions.id,planId:subscriptions.servicePlanId,status:subscriptions.status,orderId:subscriptions.orderId}).from(subscriptions).where(eq(subscriptions.id,input.subscriptionId)).limit(1);
 if(!s)throw new Error('Abonnement introuvable');
 if(s.status!=='pending')throw new Error('Abonnement non activable');
 if(!s.orderId)throw new Error('Commande associée absente');
 const [order]=await db.select().from(orders).where(eq(orders.id,s.orderId)).limit(1);
 if(!order||order.status!=='paid')throw new Error('Le paiement doit être vérifié avant activation');
 const [plan]=await db.select({durationDays:servicePlans.durationDays,lifetime:servicePlans.lifetime}).from(servicePlans).where(eq(servicePlans.id,s.planId)).limit(1);
 if(!plan)throw new Error('Formule introuvable');
 const activation=computeActivation(plan);
 const [updated]=await db.update(subscriptions).set({...activation,updatedAt:new Date()}).where(and(eq(subscriptions.id,s.id),eq(subscriptions.status,'pending'))).returning();
 if(!updated)throw new Error('Abonnement déjà traité ou non activable');
 await db.update(orders).set({status:'active',updatedAt:new Date()}).where(eq(orders.id,order.id));
 await scheduleLifecycle(updated.id,updated.startedAt!,updated.expiresAt);
 await db.insert(auditLogs).values({businessId:order.businessId,actorType:'admin',action:'subscription.activated',entityType:'subscription',entityId:s.id,metadata:{expiresAt:activation.expiresAt?.toISOString()??null,orderId:order.id}});
 return updated;
}

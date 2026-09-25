import {and,desc,eq} from 'drizzle-orm';
import {db} from '@/db';
import {auditLogs,conversations,customers,orders,payments,servicePlans,services,subscriptions} from '@/db/schema';

export async function listCustomers(){
 return db.select({id:customers.id,firstName:customers.firstName,lastName:customers.lastName,phone:customers.phone,email:customers.email,status:customers.status,totalSpent:customers.totalSpent,lastContactAt:customers.lastContactAt,createdAt:customers.createdAt}).from(customers).orderBy(desc(customers.createdAt)).limit(100);
}

export async function listCatalog(){
 return db.select({serviceId:services.id,serviceName:services.name,description:services.description,serviceActive:services.active,planId:servicePlans.id,planName:servicePlans.name,price:servicePlans.price,currency:servicePlans.currency,durationDays:servicePlans.durationDays,lifetime:servicePlans.lifetime,planActive:servicePlans.active}).from(services).leftJoin(servicePlans,eq(servicePlans.serviceId,services.id)).orderBy(desc(services.createdAt));
}

export async function listOrders(){
 return db.select({id:orders.id,status:orders.status,total:orders.total,currency:orders.currency,createdAt:orders.createdAt,customerId:customers.id,firstName:customers.firstName,lastName:customers.lastName,phone:customers.phone,subscriptionId:subscriptions.id,subscriptionStatus:subscriptions.status,planName:servicePlans.name}).from(orders).innerJoin(customers,eq(orders.customerId,customers.id)).leftJoin(subscriptions,eq(subscriptions.orderId,orders.id)).leftJoin(servicePlans,eq(subscriptions.servicePlanId,servicePlans.id)).orderBy(desc(orders.createdAt)).limit(100);
}

export async function listPayments(){
 return db.select({id:payments.id,status:payments.status,amount:payments.amount,currency:payments.currency,method:payments.method,reference:payments.reference,paidAt:payments.paidAt,createdAt:payments.createdAt,orderId:payments.orderId,firstName:customers.firstName,lastName:customers.lastName,phone:customers.phone}).from(payments).innerJoin(customers,eq(payments.customerId,customers.id)).orderBy(desc(payments.createdAt)).limit(100);
}

export async function listPendingActivations(){
 return db.select({subscriptionId:subscriptions.id,orderId:subscriptions.orderId,firstName:customers.firstName,lastName:customers.lastName,phone:customers.phone,planName:servicePlans.name,serviceName:services.name,durationDays:servicePlans.durationDays,lifetime:servicePlans.lifetime}).from(subscriptions).innerJoin(customers,eq(subscriptions.customerId,customers.id)).innerJoin(servicePlans,eq(subscriptions.servicePlanId,servicePlans.id)).innerJoin(services,eq(servicePlans.serviceId,services.id)).where(eq(subscriptions.status,'pending')).orderBy(desc(subscriptions.createdAt)).limit(100);
}

export async function listSubscriptions(){
 return db.select({id:subscriptions.id,status:subscriptions.status,startedAt:subscriptions.startedAt,expiresAt:subscriptions.expiresAt,lifetime:subscriptions.lifetime,renewalCount:subscriptions.renewalCount,firstName:customers.firstName,lastName:customers.lastName,phone:customers.phone,planName:servicePlans.name,serviceName:services.name}).from(subscriptions).innerJoin(customers,eq(subscriptions.customerId,customers.id)).innerJoin(servicePlans,eq(subscriptions.servicePlanId,servicePlans.id)).innerJoin(services,eq(servicePlans.serviceId,services.id)).orderBy(desc(subscriptions.createdAt)).limit(100);
}

export type DashboardActionItem={
 id:string;
 kind:'human'|'payment'|'payment-proof'|'activation';
 label:string;
 title:string;
 detail:string;
 href:string;
 at:Date;
 priority:number;
};

export async function listDashboardActionItems(limit=8):Promise<DashboardActionItem[]>{
 const [proofRows,humanRows,paymentRows,activationRows]=await Promise.all([
  db.select({id:auditLogs.id,conversationId:conversations.id,at:auditLogs.createdAt,firstName:customers.firstName,lastName:customers.lastName,phone:customers.phone}).from(auditLogs).innerJoin(conversations,eq(auditLogs.entityId,conversations.id)).innerJoin(customers,eq(conversations.customerId,customers.id)).where(and(eq(auditLogs.action,'payment.proof_received'),eq(conversations.humanTakeover,true),eq(conversations.status,'open'))).orderBy(desc(auditLogs.createdAt)).limit(20),
  db.select({id:conversations.id,at:conversations.lastMessageAt,firstName:customers.firstName,lastName:customers.lastName,phone:customers.phone}).from(conversations).innerJoin(customers,eq(conversations.customerId,customers.id)).where(and(eq(conversations.humanTakeover,true),eq(conversations.status,'open'))).orderBy(desc(conversations.lastMessageAt)).limit(20),
  db.select({id:payments.id,at:payments.createdAt,amount:payments.amount,currency:payments.currency,firstName:customers.firstName,lastName:customers.lastName,phone:customers.phone}).from(payments).innerJoin(customers,eq(payments.customerId,customers.id)).where(eq(payments.status,'submitted')).orderBy(desc(payments.createdAt)).limit(20),
  db.select({id:subscriptions.id,at:subscriptions.updatedAt,serviceName:services.name,planName:servicePlans.name,firstName:customers.firstName,lastName:customers.lastName,phone:customers.phone}).from(subscriptions).innerJoin(customers,eq(subscriptions.customerId,customers.id)).innerJoin(servicePlans,eq(subscriptions.servicePlanId,servicePlans.id)).innerJoin(services,eq(servicePlans.serviceId,services.id)).where(eq(subscriptions.status,'pending')).orderBy(desc(subscriptions.updatedAt)).limit(20)
 ]);
 const proofConversationIds=new Set(proofRows.map(x=>x.conversationId));
 const name=(firstName:string|null,lastName:string|null,phone:string)=>[firstName,lastName].filter(Boolean).join(' ')||phone;
 const items:DashboardActionItem[]=[
  ...proofRows.map(x=>({id:`proof:${x.id}`,kind:'payment-proof' as const,label:'Preuve paiement',title:name(x.firstName,x.lastName,x.phone),detail:'Capture reçue — vérifier puis lancer l’activation',href:`/inbox?id=${x.conversationId}`,at:x.at,priority:0})),
  ...humanRows.filter(x=>!proofConversationIds.has(x.id)).map(x=>({id:`human:${x.id}`,kind:'human' as const,label:'Intervention',title:name(x.firstName,x.lastName,x.phone),detail:'Conversation à reprendre manuellement',href:`/inbox?id=${x.id}`,at:x.at??new Date(0),priority:1})),
  ...paymentRows.map(x=>({id:`payment:${x.id}`,kind:'payment' as const,label:'Paiement',title:name(x.firstName,x.lastName,x.phone),detail:`${Number(x.amount).toLocaleString('fr-FR')} ${x.currency} à vérifier`,href:'/paiements',at:x.at,priority:2})),
  ...activationRows.map(x=>({id:`activation:${x.id}`,kind:'activation' as const,label:'Activation',title:name(x.firstName,x.lastName,x.phone),detail:`${x.serviceName} · ${x.planName}`,href:'/activations',at:x.at,priority:3}))
 ];
 return items.sort((a,b)=>a.priority-b.priority||b.at.getTime()-a.at.getTime()).slice(0,limit);
}

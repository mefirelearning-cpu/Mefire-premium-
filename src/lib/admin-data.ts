import {desc,eq} from 'drizzle-orm';
import {db} from '@/db';
import {customers,orders,payments,servicePlans,services,subscriptions} from '@/db/schema';

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

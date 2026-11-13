'use server';
import {revalidatePath} from 'next/cache';
import {createCustomer,createOrder,createServiceWithPlan,recordPayment,verifyPayment} from '@/lib/crm';
import {confirmSubscriptionActivation} from '@/lib/activation-first';
const required=(v:FormDataEntryValue|null,n:string)=>{const s=String(v??'').trim();if(!s)throw new Error(`${n} requis`);return s};
const refresh=(...paths:string[])=>paths.forEach(path=>revalidatePath(path));

export async function createCustomerAction(form:FormData){
 await createCustomer({firstName:String(form.get('firstName')??'').trim()||undefined,lastName:String(form.get('lastName')??'').trim()||undefined,phone:required(form.get('phone'),'Téléphone'),email:String(form.get('email')??'').trim()||undefined});
 refresh('/clients','/commandes','/');
}

export async function createServiceAction(form:FormData){
 const lifetime=form.get('lifetime')==='on';
 const durationRaw=String(form.get('durationDays')??'').trim();
 await createServiceWithPlan({serviceName:required(form.get('serviceName'),'Service'),description:String(form.get('description')??'').trim()||undefined,planName:required(form.get('planName'),'Formule'),price:required(form.get('price'),'Prix'),durationDays:lifetime?undefined:Number(durationRaw),lifetime});
 refresh('/services','/commandes');
}

export async function createOrderAction(form:FormData){
 await createOrder({customerId:required(form.get('customerId'),'Client'),servicePlanId:required(form.get('servicePlanId'),'Formule')});
 refresh('/commandes','/paiements','/');
}

export async function recordPaymentAction(form:FormData){
 await recordPayment({orderId:required(form.get('orderId'),'Commande'),method:String(form.get('method')??'').trim()||undefined,reference:String(form.get('reference')??'').trim()||undefined});
 refresh('/paiements','/commandes','/');
}

export async function verifyPaymentAction(form:FormData){
 await verifyPayment({paymentId:required(form.get('paymentId'),'Paiement')});
 refresh('/paiements','/activations','/commandes','/');
}

export async function activateSubscriptionAction(form:FormData){
 await confirmSubscriptionActivation({subscriptionId:required(form.get('subscriptionId'),'Abonnement'),expiresAt:String(form.get('expiresAt')||'')});
 refresh('/activations','/abonnements','/commandes','/clients','/priorites','/pilotage','/automatisations','/');
}

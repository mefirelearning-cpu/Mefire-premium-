'use server';
import {revalidatePath} from 'next/cache';
import {createCustomer,createOrder,recordPayment,verifyPayment,activateSubscription} from '@/lib/crm';
const required=(v:FormDataEntryValue|null,n:string)=>{const s=String(v??'').trim();if(!s)throw new Error(`${n} requis`);return s};
export async function createCustomerAction(form:FormData){await createCustomer({firstName:String(form.get('firstName')??'').trim()||undefined,lastName:String(form.get('lastName')??'').trim()||undefined,phone:required(form.get('phone'),'Téléphone'),email:String(form.get('email')??'').trim()||undefined});revalidatePath('/clients');}
export async function createOrderAction(form:FormData){await createOrder({customerId:required(form.get('customerId'),'Client'),total:required(form.get('total'),'Montant')});revalidatePath('/commandes');}
export async function recordPaymentAction(form:FormData){await recordPayment({customerId:required(form.get('customerId'),'Client'),orderId:String(form.get('orderId')??'').trim()||undefined,amount:required(form.get('amount'),'Montant'),method:String(form.get('method')??'').trim()||undefined,reference:String(form.get('reference')??'').trim()||undefined});revalidatePath('/paiements');}
export async function activateSubscriptionAction(form:FormData){await activateSubscription({subscriptionId:required(form.get('subscriptionId'),'Abonnement')});revalidatePath('/activations');revalidatePath('/abonnements');revalidatePath('/');}

export async function verifyPaymentAction(form:FormData){await verifyPayment({paymentId:required(form.get('paymentId'),'Paiement'),servicePlanId:required(form.get('servicePlanId'),'Formule')});revalidatePath('/paiements');revalidatePath('/activations');revalidatePath('/commandes');}

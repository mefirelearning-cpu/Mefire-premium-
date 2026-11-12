'use server';
import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {registerSubscription,updateManualSubscription} from '@/lib/manager';
import {recordPayment,verifyPayment} from '@/lib/crm';
import {db} from '@/db';
import {payments} from '@/db/schema';
import {eq,desc} from 'drizzle-orm';

export type EntryState={error:string};
export async function addSubscriptionAction(_previous:EntryState,form:FormData):Promise<EntryState>{
 const field=(name:string)=>String(form.get(name)||'').trim();
 let url='';
 try{
  const result=await registerSubscription({
   customerId:field('customerId')||undefined,
   firstName:field('firstName'),lastName:field('lastName'),
   phone:field('phone'),email:field('email'),
   servicePlanId:field('servicePlanId')||undefined,
   customService:field('customService'),customPlan:field('customPlan'),
   price:field('price'),
   startedAt:field('startedAt'),expiresAt:field('expiresAt'),
   lifetime:field('lifetime')==='on',
   activationStatus:field('activationStatus')==='pending'?'pending':'active',
   paymentStatus:field('paymentStatus')==='verified'?'verified':field('paymentStatus')==='submitted'?'submitted':'unpaid'
  });
  url='/clients/'+result.customerId+'?success=1';
 }catch(e){
  return{error:e instanceof Error?e.message:'Une erreur empêche l’enregistrement'};
 }
 ['/','/clients','/abonnements','/commandes','/paiements','/activations','/jarvis'].forEach(revalidatePath);
 redirect(url);
}
export async function editSubscriptionAction(_previous:EntryState,form:FormData):Promise<EntryState>{
 const field=(name:string)=>String(form.get(name)||'').trim();
 try{
  await updateManualSubscription({subscriptionId:field('subscriptionId'),expiresAt:field('expiresAt'),price:field('price')});
 }catch(e){return{error:e instanceof Error?e.message:'Modification impossible'};}
 ['/','/clients','/abonnements','/commandes','/paiements','/jarvis'].forEach(revalidatePath);
 redirect('/clients/'+field('customerId')+'?updated=1');
}

export async function confirmManualPaymentAction(form:FormData){
 const orderId=String(form.get('orderId')||'');
 const customerId=String(form.get('customerId')||'');
 if(!/^[a-f0-9-]{36}$/i.test(orderId)||!/^[a-f0-9-]{36}$/i.test(customerId))throw new Error('Commande invalide');
 const [last]=await db.select({id:payments.id,status:payments.status}).from(payments).where(eq(payments.orderId,orderId)).orderBy(desc(payments.createdAt)).limit(1);
 if(last?.status==='verified')throw new Error('Paiement déjà confirmé');
 const id=last?.status==='submitted'?last.id:(await recordPayment({orderId,method:'manuel'})).id;
 await verifyPayment({paymentId:id});
 ['/','/clients','/abonnements','/paiements','/commandes'].forEach(revalidatePath);
 redirect('/clients/'+customerId+'?payment=1');
}

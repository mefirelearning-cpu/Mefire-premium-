'use client';
import {useActionState,useState} from 'react';
import {addSubscriptionAction} from '@/app/actions/manual-entry';
type Offer={id:string;service:string;plan:string;price:number;durationDays:number|null;lifetime:boolean};
type Props={offers:Offer[];today:string;existingClient?:{id:string;name:string}};
const datePlus=(date:string,days:number)=>{
 const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);
};
export default function ClientSubscriptionForm({offers,today,existingClient}:Props){
 const [state,action,pending]=useActionState(addSubscriptionAction,{error:''});
 const [offerId,setOfferId]=useState('');
 const [price,setPrice]=useState('');
 const [startedAt,setStartedAt]=useState(today);
 const [expiresAt,setExpiresAt]=useState('');
 const [lifetime,setLifetime]=useState(false);
 const [activationStatus,setActivationStatus]=useState('active');
 const selected=offers.find(o=>o.id===offerId);
 const custom=offerId==='custom';
 const setOffer=(value:string)=>{
   setOfferId(value);
   const o=offers.find(x=>x.id===value);
   if(o){
     setPrice(String(o.price));setLifetime(o.lifetime);
     setExpiresAt(o.lifetime?'':o.durationDays?datePlus(startedAt,o.durationDays):'');
   }else {setLifetime(false);setExpiresAt('');setPrice('');}
 };
 const changeDate=(date:string)=>{
  setStartedAt(date);
  if(selected?.durationDays&&!lifetime&&date)setExpiresAt(datePlus(date,selected.durationDays));
 };
 return <form action={action} className="entry-form">
  {existingClient?<input type="hidden" name="customerId" value={existingClient.id}/>:<section className="form-section">
   <div className="form-step"><span>01</span><div><h2>Le client</h2><p>Ses informations de contact</p></div></div>
   <div className="form-grid">
    <label>Prénom ou nom *<input name="firstName" autoComplete="given-name" required placeholder="Ex. Kevin"/></label>
    <label>Nom complémentaire<input name="lastName" autoComplete="family-name" placeholder="Facultatif"/></label>
    <label>Numéro WhatsApp *<input name="phone" type="tel" inputMode="tel" autoComplete="tel" required placeholder="6XXXXXXXX"/></label>
    <label>Adresse e-mail<input name="email" type="email" autoComplete="email" placeholder="Facultatif"/></label>
   </div>
  </section>}
  <section className="form-section">
   <div className="form-step"><span>{existingClient?'01':'02'}</span><div><h2>L’abonnement</h2><p>Le service et les dates réelles</p></div></div>
   {existingClient&&<div className="soft-notice">Client : <strong>{existingClient.name}</strong></div>}
   <div className="form-grid">
    <label className="span-all">Service et formule *
     <select value={offerId} onChange={e=>setOffer(e.target.value)} required>
      <option value="">Choisir un abonnement</option>
      {offers.map(o=><option key={o.id} value={o.id}>{o.service} — {o.plan} ({o.price.toLocaleString('fr-FR')} FCFA)</option>)}
      <option value="custom">Autre abonnement / nouvelle formule…</option>
     </select>
     <input type="hidden" name="servicePlanId" value={custom?'':offerId}/>
    </label>
    {custom&&<>
     <label>Nom de la plateforme *<input name="customService" required placeholder="Ex. Duolingo"/></label>
     <label>Nom de la formule *<input name="customPlan" required placeholder="Ex. 1 mois"/></label>
    </>}
    <label>Prix convenu (FCFA) *<input name="price" type="number" min="1" max="20000000" step="1" inputMode="numeric" value={price} onChange={e=>setPrice(e.target.value)} required placeholder="Ex. 2500"/></label>
    <label>État de l’abonnement
     <select name="activationStatus" value={activationStatus} onChange={e=>setActivationStatus(e.target.value)}>
      <option value="active">Déjà activé</option><option value="pending">À activer</option>
     </select>
    </label>
    <label>Date d’activation
     <input name="startedAt" type="date" value={startedAt} onChange={e=>changeDate(e.target.value)} required={activationStatus==='active'}/>
    </label>
    <label>Date d’expiration
     <input name="expiresAt" type="date" value={expiresAt} onChange={e=>setExpiresAt(e.target.value)} disabled={lifetime} required={activationStatus==='active'&&!lifetime}/>
    </label>
    <label className="checkline span-all">
     <input type="checkbox" name="lifetime" checked={lifetime} onChange={e=>{setLifetime(e.target.checked);if(e.target.checked)setExpiresAt('');}}/>
     Abonnement sans date d’expiration (à vie)
    </label>
   </div>
  </section>
  <section className="form-section">
   <div className="form-step"><span>{existingClient?'02':'03'}</span><div><h2>Le paiement</h2><p>Ton fonctionnement : activation possible avant le règlement</p></div></div>
   <label>Situation actuelle du paiement
    <select name="paymentStatus" defaultValue="unpaid">
     <option value="unpaid">En attente de paiement</option>
     <option value="submitted">Capture reçue — à vérifier</option>
     <option value="verified">Paiement vérifié par moi</option>
    </select>
   </label>
   <div className="soft-notice">Une capture reste « à vérifier » tant que tu n’as pas confirmé l’encaissement. Aucune notification WhatsApp ne sera envoyée à l’ajout manuel.</div>
  </section>
  {state.error&&<div role="alert" className="entry-error">{state.error}</div>}
  <button type="submit" className="primary-action" disabled={pending||!offerId}>{pending?'Enregistrement…':existingClient?'Ajouter cet abonnement':'Enregistrer le client et l’abonnement'}</button>
 </form>;
}

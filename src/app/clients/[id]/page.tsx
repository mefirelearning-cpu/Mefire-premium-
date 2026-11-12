import Link from 'next/link';
import {getClientDetails} from '@/lib/manager';
import {confirmManualPaymentAction} from '@/app/actions/manual-entry';
import ExpiryEditor from '../expiry-editor';
export const dynamic='force-dynamic';
const date=(v:string)=>new Intl.DateTimeFormat('fr-FR',{dateStyle:'medium',timeZone:'Africa/Douala'}).format(new Date(v));
const money=(v:number)=>new Intl.NumberFormat('fr-FR').format(v)+' FCFA';
const status=(v:string,expiry:string|null,lifetime:boolean)=>{
 if(!lifetime&&expiry&&new Date(expiry)<=new Date())return'Expiré';
 return v==='active'?'Actif':v==='pending'?'À activer':'En attente';
};
export default async function ClientDetails({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{success?:string;updated?:string;payment?:string}>}){
 const {id}=await params;const q=await searchParams;const person=await getClientDetails(id);
 if(!person)return <div className="page-container"><h1>Client introuvable</h1><Link href="/clients">Retour aux clients</Link></div>;
 return <div className="page-container">
  <Link className="text-back" href="/clients">← Tous les clients</Link>
  <div className="page-header"><div><div className="eyebrow">FICHE CLIENT</div><h1>{person.name}</h1><p>{person.phone}{person.email?' · '+person.email:''}</p></div>
   <Link className="primary-link" href={'/abonnements/nouveau?client='+person.id}>＋ Ajouter un abonnement</Link>
  </div>
  {(q.success||q.updated||q.payment)&&<div className="success-notice">✓ {q.payment?'Paiement enregistré et confirmé.':q.updated?'Modifications enregistrées.':'Client et abonnement enregistrés.'}</div>}
  <div className="profile-actions"><a className="outline-link" href={'https://wa.me/'+person.phone.replace(/\D/g,'')} target="_blank" rel="noopener noreferrer">Ouvrir WhatsApp ↗</a><span>{person.subscriptions.length} abonnement{person.subscriptions.length>1?'s':''}</span></div>
  <div className="profile-subscriptions">
   {person.subscriptions.map(s=><section key={s.id} className="surface subscription-detail">
    <div className="detail-head"><div><h2>{s.serviceName}</h2><p>{s.planName}</p></div><span className={'pill '+(status(s.status,s.expiresAt,s.lifetime)==='Actif'?'pill-green':'pill-amber')}>{status(s.status,s.expiresAt,s.lifetime)}</span></div>
    <div className="detail-facts">
     <div><small>Prix convenu</small><strong>{money(s.price)}</strong></div>
     <div><small>Activation</small><strong>{s.startedAt?date(s.startedAt):'Non activé'}</strong></div>
     <div><small>Expiration</small><strong>{s.lifetime?'À vie':s.expiresAt?date(s.expiresAt):'À renseigner'}</strong></div>
     <div><small>Paiement</small><strong>{s.paymentStatus==='verified'?'Vérifié':s.paymentStatus==='submitted'?'Capture à vérifier':'Non payé'}</strong></div>
    </div>
    <div className="profile-actions">
     <ExpiryEditor id={s.id} customerId={person.id} expiresAt={s.expiresAt} lifetime={s.lifetime} price={s.price} locked={s.paymentStatus==='verified'||s.paymentStatus==='submitted'}/>
     {s.orderId&&s.paymentStatus!=='verified'&&<form action={confirmManualPaymentAction}>
       <input type="hidden" name="orderId" value={s.orderId}/><input type="hidden" name="customerId" value={person.id}/>
       <button type="submit" className="secondary-button">✓ Confirmer paiement reçu</button>
      </form>}
    </div>
   </section>)}
   {person.subscriptions.length===0&&<section className="surface"><p>Aucun abonnement enregistré pour ce client.</p><Link href={'/abonnements/nouveau?client='+person.id}>Ajouter un abonnement</Link></section>}
  </div>
 </div>;
}

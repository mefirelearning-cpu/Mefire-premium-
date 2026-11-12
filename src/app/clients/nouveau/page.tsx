import Link from 'next/link';
import ClientSubscriptionForm from '../client-form';
import {listCatalog} from '@/lib/admin-data';
export const dynamic='force-dynamic';
export default async function NewClient(){
 const offers=(await listCatalog()).filter(x=>x.planId&&x.serviceActive&&x.planActive).map(x=>({
  id:x.planId!,service:x.serviceName,plan:x.planName||'Formule',price:Number(x.price||0),
  durationDays:x.durationDays,lifetime:x.lifetime||false
 })).sort((a,b)=>a.service.localeCompare(b.service));
 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Africa/Douala',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 return <div className="form-page">
  <Link className="text-back" href="/clients">← Retour aux clients</Link>
  <div className="page-heading"><div className="eyebrow">NOUVEAU DOSSIER</div><h1>Ajouter un client</h1><p>Crée le client et enregistre son abonnement en une seule fois.</p></div>
  <ClientSubscriptionForm offers={offers} today={today}/>
 </div>;
}

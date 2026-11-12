import Link from 'next/link';
import ClientSubscriptionForm from '@/app/clients/client-form';
import {listCatalog} from '@/lib/admin-data';
import {getClientDetails} from '@/lib/manager';
export const dynamic='force-dynamic';
export default async function NewSubscription({searchParams}:{searchParams:Promise<{client?:string}>}){
 const {client}=await searchParams;
 const customer=client?await getClientDetails(client):null;
 const offers=(await listCatalog()).filter(x=>x.planId&&x.serviceActive&&x.planActive).map(x=>({
  id:x.planId!,service:x.serviceName,plan:x.planName||'Formule',price:Number(x.price||0),
  durationDays:x.durationDays,lifetime:x.lifetime||false
 })).sort((a,b)=>a.service.localeCompare(b.service));
 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Africa/Douala',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 if(!customer)return <div className="page-container"><h1>Nouveau dossier</h1><p>Choisis d’abord un client existant, ou crée un nouveau client avec son abonnement.</p><Link className="primary-link" href="/clients">Voir les clients</Link><span> </span><Link href="/clients/nouveau">Créer un client</Link></div>;
 return <div className="form-page"><Link className="text-back" href={'/clients/'+customer.id}>← Fiche client</Link>
  <div className="page-heading"><div className="eyebrow">ABONNEMENT</div><h1>Ajouter un abonnement</h1><p>Les coordonnées du client sont conservées.</p></div>
  <ClientSubscriptionForm existingClient={{id:customer.id,name:customer.name}} offers={offers} today={today}/>
 </div>;
}

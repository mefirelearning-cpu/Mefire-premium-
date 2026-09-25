import Link from 'next/link';
import {getDashboardMetrics} from '@/lib/dashboard';

export const dynamic='force-dynamic';

const n=(v:string|number)=>Number(v||0);
const money=(v:string|number)=>`${n(v).toLocaleString('fr-FR')} FCFA`;

export default async function Dashboard(){
 const m=await getDashboardMetrics();
 const stats=[
  ['CA du mois',money(m.monthly_revenue)],
  ['Clients actifs',n(m.active_customers).toString()],
  ['À activer',n(m.activations).toString()],
  ['Expirent sous 7 jours',n(m.expiring_7d).toString()]
 ];
 const quick=[
  ['Nouveau client','/clients#nouveau-client','Créer une fiche client'],
  ['Nouvelle commande','/commandes#nouvelle-commande','Associer un client à une formule'],
  ['Paiements','/paiements#nouveau-paiement','Enregistrer ou vérifier un paiement'],
  ['Activations','/activations#file-activations','Traiter les services à activer'],
  ['Catalogue','/services#nouveau-service','Ajouter un service ou une formule']
 ] as const;
 const actions=[
  ['Activations à effectuer',m.activations,'/activations'],
  ['Paiements à vérifier',m.payments_to_verify,'/paiements'],
  ['Interventions humaines',m.human_takeovers,'/inbox'],
  ['Nouvelles commandes',m.new_orders,'/commandes']
 ] as const;
 const automation=[
  ['Réponses IA enregistrées',m.ai_messages],
  ['Suivis J+2 envoyés',m.satisfaction_done],
  ['Rappels d’expiration envoyés',m.expiration_reminders_done],
  ['Renouvellements enregistrés',m.renewals]
 ] as const;
 return <>
  <div className="top"><div><h1>Centre de commande</h1><div className="muted">Données réelles du CRM, mises à jour depuis PostgreSQL.</div></div><strong>CRM en ligne</strong></div>
  <section className="quick-actions" aria-label="Actions rapides">{quick.map(([label,href,desc])=><Link className="quick-action" href={href} key={href}><strong>{label}</strong><span>{desc}</span></Link>)}</section>
  <section className="grid">{stats.map(([l,v])=><div className="card" key={l}><div className="muted">{l}</div><div className="value">{v}</div></div>)}</section>
  <section className="cols">
   <div className="card"><h2>Actions requises</h2>{actions.map(([label,value,href])=><Link className="row" href={href} key={label}><span>{label}</span><strong>{n(value)}</strong></Link>)}</div>
   <div className="card"><h2>Automatisation</h2>{automation.map(([label,value])=><div className="row" key={label}><span>{label}</span><strong>{n(value)}</strong></div>)}</div>
  </section>
 </>;
}

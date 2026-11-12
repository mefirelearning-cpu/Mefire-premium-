import Link from 'next/link';
import {ArrowRight,UserRoundPlus,MessageCircle,CalendarDays} from 'lucide-react';
import {getDashboardMetrics} from '@/lib/dashboard';
import {listDashboardActionItems} from '@/lib/admin-data';
export const dynamic='force-dynamic';
const n=(v:string|number)=>Number(v||0);
const amount=(v:string|number)=>n(v).toLocaleString('fr-FR')+' FCFA';
export default async function Dashboard(){
 const [m,items]=await Promise.all([getDashboardMetrics(),listDashboardActionItems(6)]);
 const cards=[
  {label:'Abonnements actifs',value:n(m.active_customers).toLocaleString('fr-FR')},
  {label:'Encaissements du mois',value:amount(m.monthly_revenue)},
  {label:'Expirations (7 jours)',value:n(m.expiring_7d).toLocaleString('fr-FR')},
  {label:'Paiements à vérifier',value:n(m.payments_to_verify).toLocaleString('fr-FR')}
 ];
 const hours=new Intl.DateTimeFormat('fr-FR',{hour:'numeric',timeZone:'Africa/Douala',hour12:false}).format(new Date());
 const hello=Number(hours)<12?'Bonjour':'Bonsoir';
 return <div className="page-container">
  <div className="page-header"><div><div className="eyebrow">MEFIRE PREMIUM</div><h1>{hello} 👋</h1><p>Voici l’essentiel de votre activité aujourd’hui.</p></div>
   <Link className="primary-link" href="/clients/nouveau">＋ Nouveau client</Link>
  </div>
  <section className="summary-grid home-stats">{cards.map(s=><div className="stat-small" key={s.label}><span>{s.label}</span><strong>{s.value}</strong></div>)}</section>
  <div className="dashboard-columns"><section className="surface">
   <div className="section-title"><div><h2>À traiter</h2><p>Vos dossiers en attente d’intervention</p></div><span className="count-badge">{items.length}</span></div>
   {items.length?items.map(item=><Link href={item.href} className="todo-row" key={item.id}><span className="todo-dot"/><span><strong>{item.title}</strong><small>{item.detail}</small></span><ArrowRight size={18}/></Link>):<div className="empty-state">Tout est à jour pour le moment.</div>}
  </section><div className="dashboard-side">
   <section className="surface"><div className="section-title"><h2>Accès rapides</h2></div>
    <Link href="/pilotage" className="quick-row"><CalendarDays size={19}/> Vue d’ensemble · par plateforme et mois <ArrowRight size={16}/></Link>
    <Link href="/clients/nouveau" className="quick-row"><UserRoundPlus size={19}/> Ajouter un client <ArrowRight size={16}/></Link>
    <Link href="/abonnements" className="quick-row"><CalendarDays size={19}/> Voir les échéances <ArrowRight size={16}/></Link>
    <Link href="/inbox" className="quick-row"><MessageCircle size={19}/> Ouvrir les messages <ArrowRight size={16}/></Link>
   </section>
   <Link href="/jarvis" className="jarvis-teaser"><div className="jarvis-mini-icon">J</div><div><strong>Besoin d’un point rapide ?</strong><span>Demandez à Jarvis un bilan ou une analyse.</span></div><ArrowRight size={20}/></Link>
  </div></div>
 </div>;
}

import Link from 'next/link';
import SubscriptionList from './subscription-list';
import {listSubscriptionDirectory} from '@/lib/manager';
export const dynamic='force-dynamic';
export default async function Abonnements(){
 const rows=await listSubscriptionDirectory();
 const now=Date.now(),week=now+7*86400000;
 const active=rows.filter(r=>r.status==='active'&&(r.lifetime||Boolean(r.expiresAt&&Date.parse(r.expiresAt)>now))).length;
 const expiring=rows.filter(r=>r.status==='active'&&!r.lifetime&&r.expiresAt&&Date.parse(r.expiresAt)>now&&Date.parse(r.expiresAt)<week).length;
 const pending=rows.filter(r=>r.status!=='active').length;
 return <div className="page-container">
  <div className="page-header"><div><div className="eyebrow">SUIVI</div><h1>Abonnements</h1><p>Garde la main sur les accès, les dates et les paiements.</p></div>
   <div style={{display:"flex",gap:10,flexWrap:"wrap"}}><Link className="outline-link" href="/pilotage">Vue d’ensemble →</Link><Link className="primary-link" href="/clients/nouveau">＋ Nouveau client</Link></div></div>
  <div className="summary-grid"><div className="stat-small"><span>Actifs</span><strong>{active}</strong></div><div className="stat-small"><span>À renouveler (7 j)</span><strong>{expiring}</strong></div><div className="stat-small"><span>En attente</span><strong>{pending}</strong></div></div>
  <section className="surface"><SubscriptionList rows={rows}/></section>
 </div>;
}

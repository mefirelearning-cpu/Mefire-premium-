import {listSubscriptions} from '@/lib/admin-data';
export const dynamic='force-dynamic';

export default async function Abonnements(){
 const rows=await listSubscriptions();
 const now=new Date();
 const in7=new Date(now);in7.setDate(in7.getDate()+7);
 const active=rows.filter(x=>x.status==='active'&&(x.lifetime||!x.expiresAt||new Date(x.expiresAt)>now)).length;
 const expiring=rows.filter(x=>x.status==='active'&&!x.lifetime&&x.expiresAt&&new Date(x.expiresAt)>now&&new Date(x.expiresAt)<=in7).length;
 const expired=rows.filter(x=>!x.lifetime&&x.expiresAt&&new Date(x.expiresAt)<=now).length;
 const lifetime=rows.filter(x=>x.status==='active'&&x.lifetime).length;
 const stats=[['Actifs',active],['J-7',expiring],['Expirés',expired],['À vie',lifetime]] as const;
 return <><div className="top"><div><h1>Abonnements</h1><div className="muted">Dates de début, échéances, renouvellements et état des services.</div></div></div><section className="grid">{stats.map(([l,v])=><div className="card" key={l}><div className="muted">{l}</div><div className="value">{v}</div></div>)}</section><div className="card"><h2>Échéances</h2>{rows.length===0?<p className="muted">Aucun abonnement.</p>:rows.map(s=><div className="row" key={s.id}><span><strong>{[s.firstName,s.lastName].filter(Boolean).join(' ')||s.phone}</strong><br/><span className="muted">{s.serviceName} · {s.planName} · {s.status}</span></span><span style={{textAlign:'right'}}><strong>{s.lifetime?'À vie':s.expiresAt?new Date(s.expiresAt).toLocaleDateString('fr-FR'):'Non activé'}</strong><br/><span className="muted">Renouvellements : {s.renewalCount}</span></span></div>)}</div></>;
}

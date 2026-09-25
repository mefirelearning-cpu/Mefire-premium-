import Link from 'next/link';
import {listSupportQueue} from '@/lib/operations';
import {resolveSupportAction} from '@/app/actions/operations';
export const dynamic='force-dynamic';

export default async function Sav(){
 const rows=await listSupportQueue();
 const now=Date.now();
 const today=new Date();today.setHours(0,0,0,0);
 const waiting=rows.filter(x=>x.lastMessageAt&&now-x.lastMessageAt.getTime()>30*60*1000).length;
 const todayCount=rows.filter(x=>x.lastMessageAt&&x.lastMessageAt>=today).length;
 const stats=[['À traiter',rows.length],['En attente > 30 min',waiting],['Reçus aujourd’hui',todayCount],['IA suspendue',rows.filter(x=>!x.aiEnabled).length]];
 return <><div className="top"><div><h1>SAV & interventions</h1><div className="muted">Conversations qui nécessitent réellement une intervention humaine.</div></div><strong>{rows.length} à traiter</strong></div>
 <section className="grid">{stats.map(([l,v])=><div className="card" key={l}><div className="muted">{l}</div><div className="value">{v}</div></div>)}</section>
 <div className="card"><h2>File SAV</h2>{rows.length===0?<p className="muted">Aucune intervention en attente.</p>:rows.map(r=><div className="row" key={r.id}><span><strong>{[r.firstName,r.lastName].filter(Boolean).join(' ')||r.phone}</strong><br/><span className="muted">{r.phone}{r.lastMessageAt?` · ${new Date(r.lastMessageAt).toLocaleString('fr-FR',{timeZone:'Africa/Douala'})}`:''}</span></span><span className="support-actions"><Link className="button-link" href={`/inbox?id=${r.id}`}>Ouvrir</Link><form action={resolveSupportAction}><input type="hidden" name="conversationId" value={r.id}/><button type="submit" className="secondary-button">Résolu</button></form></span></div>)}</div></>;
}

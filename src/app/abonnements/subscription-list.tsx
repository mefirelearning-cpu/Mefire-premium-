'use client';
import {useMemo,useState} from 'react';
import Link from 'next/link';
type Row={id:string;customerId:string;customerName:string;phone:string;status:string;startedAt:string|null;expiresAt:string|null;lifetime:boolean;serviceName:string;planName:string;total:number;currency:string;paymentStatus:string};
const money=(n:number)=>new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0}).format(n)+' FCFA';
const date=(v:string)=>new Intl.DateTimeFormat('fr-FR',{timeZone:'Africa/Douala',day:'2-digit',month:'short',year:'numeric'}).format(new Date(v));
export default function SubscriptionList({rows}:{rows:Row[]}){
 const [filter,setFilter]=useState('all');
 const [search,setSearch]=useState('');
 const now=Date.now(),week=now+7*86400000;
 const filtered=useMemo(()=>rows.filter(r=>{
  const t=r.expiresAt?Date.parse(r.expiresAt):null;
  const match=filter==='all'||filter==='active'&&(r.status==='active'&&(r.lifetime||t!==null&&t>now))||filter==='soon'&&(r.status==='active'&&t!==null&&t>now&&t<week)||filter==='pending'&&(r.status!=='active')||filter==='expired'&&(t!==null&&t<=now);
  return match&&(r.customerName+' '+r.phone+' '+r.serviceName).toLowerCase().includes(search.toLowerCase());
 }),[rows,filter,search,now,week]);
 return <>
  <div className="filter-toolbar"><label htmlFor="search-subs" className="visually-hidden">Rechercher</label><input id="search-subs" className="search-input" placeholder="Client ou plateforme…" value={search} onChange={e=>setSearch(e.target.value)}/>
   <select className="filter-select" value={filter} onChange={e=>setFilter(e.target.value)} aria-label="Filtrer les abonnements">
    <option value="all">Tous</option><option value="active">Actifs</option><option value="soon">Bientôt expirés</option><option value="pending">En attente</option><option value="expired">Expirés</option>
   </select>
  </div>
  <div className="directory-list">{filtered.map(r=>{
   const expired=!r.lifetime&&r.expiresAt&&Date.parse(r.expiresAt)<=now;
   const label=expired?'Expiré':r.status==='active'?'Actif':r.status==='pending'?'À activer':'En attente';
   return <Link className="directory-item" key={r.id} href={'/clients/'+r.customerId}>
    <span className="avatar sub-avatar">{r.serviceName.slice(0,1).toUpperCase()}</span>
    <span className="directory-main"><strong>{r.serviceName} <span className="light-label">· {r.planName}</span></strong>
     <small>{r.customerName} · {r.phone}</small><span className="directory-meta">Expire : {r.lifetime?'Jamais':r.expiresAt?date(r.expiresAt):'Non précisé'} · {money(r.total)}</span></span>
    <span className={'pill '+(expired?'pill-red':r.status==='active'?'pill-green':'pill-amber')}>{label}</span><span className="chevron">›</span>
   </Link>;
  })}
  {!filtered.length&&<div className="empty-state">Aucun abonnement pour ce filtre.</div>}</div>
 </>;
}

'use client';
import {useMemo,useState} from 'react';
import Link from 'next/link';
type Customer={id:string;name:string;phone:string;email:string;activeCount:number;totalSubscriptions:number;nextExpiry:string|null;lastService:string;createdAt:string};
const fmt=(value:string)=>new Intl.DateTimeFormat('fr-FR',{timeZone:'Africa/Douala',day:'2-digit',month:'short',year:'numeric'}).format(new Date(value));
export default function ClientList({rows}:{rows:Customer[]}){
 const [search,setSearch]=useState('');
 const filtered=useMemo(()=>rows.filter(c=>(c.name+' '+c.phone+' '+c.lastService+' '+c.email).toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())),[rows,search]);
 return <div>
  <label htmlFor="search-clients" className="visually-hidden">Rechercher un client</label>
  <input id="search-clients" className="search-input" placeholder="Rechercher un nom, WhatsApp ou service…" value={search} onChange={e=>setSearch(e.target.value)}/>
  <div className="subtle-caption">{filtered.length} client{filtered.length>1?'s':''} affiché{filtered.length>1?'s':''}</div>
  <div className="directory-list">{filtered.map(c=><Link key={c.id} href={'/clients/'+c.id} className="directory-item">
   <span className="avatar">{c.name.slice(0,1).toUpperCase()}</span>
   <span className="directory-main"><strong>{c.name}</strong><small>{c.phone}</small>
    <span className="directory-meta">{c.lastService}{c.nextExpiry?' · Fin : '+fmt(c.nextExpiry):''}</span></span>
   <span className={c.activeCount?'pill pill-green':'pill'}>{c.activeCount?c.activeCount+' actif'+(c.activeCount>1?'s':''):'À suivre'}</span>
   <span className="chevron">›</span>
  </Link>)}
  {filtered.length===0&&<div className="empty-state">Aucun client trouvé. <Link href="/clients/nouveau">Ajouter un client</Link></div>}</div>
 </div>;
}

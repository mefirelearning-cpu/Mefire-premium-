'use client';
import {useState} from 'react';
import {usePathname} from 'next/navigation';

const groups=[
 {label:'Principal',items:[['Tableau de bord','/'],['Inbox','/inbox'],['Clients','/clients']]},
 {label:'Ventes',items:[['Commandes','/commandes'],['Activations','/activations'],['Abonnements','/abonnements'],['Paiements','/paiements']]},
 {label:'Gestion',items:[['SAV','/sav'],['Campagnes','/campagnes'],['Automatisations','/automatisations'],['Services','/services'],['Mémoire IA','/memoire'],['Statistiques','/statistiques'],['Paramètres','/parametres']]}
];

export default function AppShell({children}:{children:React.ReactNode}){
 const pathname=usePathname();
 const [open,setOpen]=useState(false);
 if(pathname==='/login')return <>{children}</>;
 return <div className="shell">
  <aside className={`side ${open?'mobile-open':''}`}>
   <div className="side-head"><a href="/" className="brand">MEFIRE CRM</a><button className="menu-toggle" type="button" onClick={()=>setOpen(v=>!v)} aria-expanded={open}>{open?'Fermer':'Menu'}</button></div>
   <nav className="nav" aria-label="Navigation principale">
    {groups.map(group=><div className="nav-group" key={group.label}><div className="nav-label">{group.label}</div>{group.items.map(([name,href])=><a className={pathname===href?'active':''} key={name} href={href} onClick={()=>setOpen(false)}>{name}</a>)}</div>)}
   </nav>
  </aside>
  <main className="main">{children}</main>
 </div>;
}

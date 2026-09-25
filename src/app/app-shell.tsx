'use client';
import {usePathname} from 'next/navigation';

const nav=[['Tableau de bord','/'],['Inbox','/inbox'],['Clients','/clients'],['Commandes','/commandes'],['Activations','/activations'],['Abonnements','/abonnements'],['Paiements','/paiements'],['SAV','/sav'],['Campagnes','/campagnes'],['Automatisations','/automatisations'],['Services','/services'],['Statistiques','/statistiques'],['Paramètres','/parametres']];

export default function AppShell({children}:{children:React.ReactNode}){
 const pathname=usePathname();
 if(pathname==='/login')return <>{children}</>;
 return <div className="shell"><aside className="side"><div className="brand">MEFIRE CRM</div><nav className="nav">{nav.map(([n,href])=><a key={n} href={href}>{n}</a>)}</nav><form method="post" action="/api/auth/logout" style={{marginTop:24}}><button type="submit" style={{width:'100%',background:'#1f2937'}}>Se déconnecter</button></form></aside><main className="main">{children}</main></div>;
}

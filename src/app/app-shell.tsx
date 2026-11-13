'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {Home,UsersRound,CalendarDays,MessageCircleMore,MessageSquareText,Settings2,LogOut} from 'lucide-react';

const navigation=[
 {label:'Accueil',href:'/',Icon:Home},
 {label:'Clients',href:'/clients',Icon:UsersRound},
 {label:'Abonnements',href:'/abonnements',Icon:CalendarDays},
 {label:'Messages',href:'/inbox',Icon:MessageCircleMore},
 {label:'Jarvis',href:'/jarvis',Icon:MessageSquareText},
 {label:'Gestion',href:'/gestion',Icon:Settings2}
];
function selected(pathname:string,href:string){
 if(href==='/')return pathname==='/';
 if(href==='/gestion')return pathname==='/gestion'||['/priorites','/services','/paiements','/commandes','/activations','/depenses','/sav','/campagnes','/automatisations','/memoire','/mefire-ai','/statistiques','/parametres'].some(p=>pathname.startsWith(p));
 return pathname.startsWith(href);
}
export default function AppShell({children}:{children:React.ReactNode}){
 const pathname=usePathname();
 if(pathname==='/login')return <>{children}</>;
 return <div className="app-layout">
  <aside className="app-sidebar">
   <Link href="/" className="app-identity"><span className="logo-mark">M</span><span><strong>Mefire Premium</strong><small>Espace de gestion</small></span></Link>
   <div className="sidebar-caption">ESPACE DE TRAVAIL</div>
   <nav className="app-navigation" aria-label="Menu principal">
    {navigation.map(({href,label,Icon})=><Link key={href} href={href} className={'app-nav-link '+(selected(pathname,href)?'selected':'')} aria-current={selected(pathname,href)?'page':undefined}><Icon size={19} strokeWidth={1.9}/><span>{label}</span></Link>)}
   </nav>
   <div className="sidebar-bottom"><span className="online-dot"/> JARVIS · Assistant disponible</div>
   <form method="post" action="/api/auth/logout"><button type="submit" className="logout-button"><LogOut size={17}/> Déconnexion</button></form>
  </aside>
  <header className="mobile-header">
   <Link href="/" className="mobile-brand"><span className="logo-mark">M</span><span>Mefire <strong>Premium</strong></span></Link>
   <Link href="/gestion" className="header-gestion"><Settings2 size={17}/> Gestion</Link>
  </header>
  <main className="app-main">{children}</main>
  <nav className="mobile-bottom-nav" aria-label="Navigation mobile">
   {navigation.filter(n=>n.href!=='/gestion').map(({href,label,Icon})=><Link key={href} href={href} className={selected(pathname,href)?'active':''} aria-current={selected(pathname,href)?'page':undefined}><Icon size={21} strokeWidth={1.9}/><span>{label}</span></Link>)}
  </nav>
 </div>;
}

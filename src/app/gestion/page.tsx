import Link from 'next/link';
import {ShoppingBasket,Wallet,Headset,SlidersHorizontal,ArrowUpRight} from 'lucide-react';
export const dynamic='force-dynamic';
const categories=[
 {title:'Ventes & commandes',desc:'Suivre les demandes, activations et paiements.',Icon:ShoppingBasket,links:[['Vue d’ensemble','/pilotage'],['Actions prioritaires','/priorites'],['Commandes','/commandes'],['Activations en attente','/activations'],['Paiements','/paiements']]},
 {title:'Finances',desc:'Encaissements, dépenses et indicateurs.',Icon:Wallet,links:[['Coûts techniques','/depenses'],['Statistiques','/statistiques']]},
 {title:'Clients & suivi',desc:'Assistance, campagnes et rappels.',Icon:Headset,links:[['Service après-vente','/sav'],['Relances & automatisations','/automatisations'],['Campagnes','/campagnes']]},
 {title:'Configuration',desc:'Offres, mémoire et réglages de Jarvis.',Icon:SlidersHorizontal,links:[['Catalogue des offres','/services'],['Procédures enregistrées','/memoire'],['Actions avancées de Jarvis','/mefire-ai'],['Paramètres','/parametres']]}
] as const;
export default function Gestion(){
 return <div className="page-container">
  <div className="page-heading"><div className="eyebrow">OUTILS COMPLÉMENTAIRES</div><h1>Gestion</h1><p>Tout ce qui ne sert pas chaque jour est regroupé ici.</p></div>
  <div className="management-grid">{categories.map(({title,desc,Icon,links})=><section key={title} className="surface management-card">
   <div className="management-title"><span className="management-icon"><Icon size={21}/></span><div><h2>{title}</h2><p>{desc}</p></div></div>
   {links.map(([label,href])=><Link className="management-row" href={href} key={href}>{label}<ArrowUpRight size={17}/></Link>)}
  </section>)}</div>
 </div>;
}

import Link from 'next/link';
import ClientList from './client-list';
import {listClientDirectory} from '@/lib/manager';
export const dynamic='force-dynamic';
export default async function Clients(){
 const rows=await listClientDirectory();
 return <div className="page-container">
  <div className="page-header"><div><div className="eyebrow">CARNET CLIENTS</div><h1>Mes clients</h1><p>Retrouve leurs abonnements et leurs échéances au même endroit.</p></div>
   <Link className="primary-link" href="/clients/nouveau">＋ Ajouter un client</Link>
  </div>
  <section className="surface"><ClientList rows={rows}/></section>
 </div>;
}

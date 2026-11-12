import {NextRequest,NextResponse} from 'next/server';
import {getPortfolioDetails,normalizePilotageFilters,type PortfolioRow} from '@/lib/pilotage';

export const dynamic='force-dynamic';
const DATE_FORMAT=new Intl.DateTimeFormat('fr-FR',{timeZone:'Africa/Douala',day:'2-digit',month:'2-digit',year:'numeric'});
const date=(iso:string|null)=>iso?DATE_FORMAT.format(new Date(iso)):'';
const escapeCell=(value:string|number)=>{
 // Protection contre les formules interprétées par Excel et contre les sauts de ligne.
 let s=String(value).replace(/\r?\n/g,' ');
 if(/^\s*[=+\-@\t]/.test(s))s="'"+s;
 return '"'+s.replace(/"/g,'""')+'"';
};
export async function GET(req:NextRequest){
 const entries=Object.fromEntries(req.nextUrl.searchParams) as Record<string,string>;
 const f=normalizePilotageFilters(entries);
 f.page=1;
 const max=20000,block=5000;
 const all:PortfolioRow[]=[];
 for(let offset=0;offset<=max;offset+=block){
  const {rows,matching}=await getPortfolioDetails(f,block,offset);
  if(matching>max){
   return NextResponse.json({error:'Plus de 20 000 lignes : ajoute un filtre de mois ou de plateforme avant export.'},{status:413});
  }
  all.push(...rows);
  if(all.length>=matching||rows.length===0)break;
 }
 const header=['Client','WhatsApp','Plateforme','Formule','Activation','Expiration','À vie','Statut','Paiement','Prix FCFA'];
 const csv=[header,...all.map(r=>[
  r.customerName,r.phone,r.serviceName,r.planName,date(r.startedAt),
  r.lifetime?'':date(r.expiresAt),r.lifetime?'Oui':'Non',r.status,r.paymentStatus,r.price
 ])].map(columns=>columns.map(escapeCell).join(';')).join('\r\n');
 const name='mefire-abonnements-'+new Date().toISOString().slice(0,10)+'.csv';
 return new NextResponse('\uFEFF'+csv,{headers:{
  'Content-Type':'text/csv; charset=utf-8',
  'Content-Disposition': 'attachment; filename="'+name+'"',
  'Cache-Control':'private, no-store',
  'X-Content-Type-Options':'nosniff'
 }});
}

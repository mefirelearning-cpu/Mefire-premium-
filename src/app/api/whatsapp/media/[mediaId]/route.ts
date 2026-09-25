import {NextResponse} from 'next/server';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const apiVersion=process.env.WHATSAPP_API_VERSION||'v23.0';

export async function GET(_request:Request,{params}:{params:Promise<{mediaId:string}>}){
 const {mediaId}=await params;
 if(!/^[A-Za-z0-9._:-]{4,255}$/.test(mediaId))return NextResponse.json({error:'invalid_media_id'},{status:400});
 const token=process.env.WHATSAPP_ACCESS_TOKEN;
 if(!token)return NextResponse.json({error:'whatsapp_not_configured'},{status:503});
 const meta=await fetch(`https://graph.facebook.com/${apiVersion}/${encodeURIComponent(mediaId)}`,{headers:{Authorization:`Bearer ${token}`},cache:'no-store'});
 if(!meta.ok)return NextResponse.json({error:'media_metadata_unavailable'},{status:meta.status});
 const data=await meta.json();
 if(typeof data?.url!=='string')return NextResponse.json({error:'media_url_missing'},{status:502});
 const media=await fetch(data.url,{headers:{Authorization:`Bearer ${token}`},cache:'no-store'});
 if(!media.ok)return NextResponse.json({error:'media_unavailable'},{status:media.status});
 const body=await media.arrayBuffer();
 return new NextResponse(body,{status:200,headers:{'Content-Type':String(data.mime_type||media.headers.get('content-type')||'application/octet-stream'),'Cache-Control':'private, no-store, max-age=0','X-Content-Type-Options':'nosniff'}});
}

import {NextRequest,NextResponse} from 'next/server';
import {ADMIN_SESSION_COOKIE,verifyAdminSessionToken} from '@/lib/auth';

const publicPaths=['/login','/api/auth/login','/api/auth/logout','/api/whatsapp/webhook','/api/jobs/run'];

export async function proxy(request:NextRequest){
 const {pathname}=request.nextUrl;
 if(publicPaths.some(path=>pathname===path||pathname.startsWith(`${path}/`)))return NextResponse.next();
 const valid=await verifyAdminSessionToken(request.cookies.get(ADMIN_SESSION_COOKIE)?.value,process.env.AUTH_SECRET);
 if(valid)return NextResponse.next();
 const url=request.nextUrl.clone();
 url.pathname='/login';
 url.search='';
 return NextResponse.redirect(url);
}

export const config={matcher:['/((?!_next/static|_next/image|favicon.ico).*)']};

import {NextRequest,NextResponse} from 'next/server';
import {ADMIN_SESSION_COOKIE,adminSessionMaxAge,createAdminSessionToken,safeSecretEqual} from '@/lib/auth';

export const runtime='nodejs';

export async function POST(request:NextRequest){
 const usernameExpected=process.env.ADMIN_USERNAME;
 const passwordExpected=process.env.ADMIN_PASSWORD;
 const authSecret=process.env.AUTH_SECRET;
 if(!usernameExpected||!passwordExpected||!authSecret){
  return NextResponse.redirect(new URL('/login?error=config',request.url),303);
 }
 const form=await request.formData();
 const username=String(form.get('username')??'');
 const password=String(form.get('password')??'');
 const [userOk,passwordOk]=await Promise.all([
  safeSecretEqual(username,usernameExpected),
  safeSecretEqual(password,passwordExpected)
 ]);
 if(!userOk||!passwordOk){
  await new Promise(resolve=>setTimeout(resolve,350));
  return NextResponse.redirect(new URL('/login?error=invalid',request.url),303);
 }
 const token=await createAdminSessionToken(authSecret);
 const response=NextResponse.redirect(new URL('/',request.url),303);
 response.cookies.set(ADMIN_SESSION_COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:adminSessionMaxAge});
 return response;
}

export const ADMIN_SESSION_COOKIE='mefire_admin';
const SESSION_TTL_SECONDS=60*60*24*7;
const encoder=new TextEncoder();

function toBase64Url(bytes:Uint8Array){
 let binary='';
 for(const byte of bytes)binary+=String.fromCharCode(byte);
 return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

async function hmac(payload:string,secret:string){
 const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const signature=await crypto.subtle.sign('HMAC',key,encoder.encode(payload));
 return toBase64Url(new Uint8Array(signature));
}

export async function createAdminSessionToken(secret:string){
 const expiresAt=Math.floor(Date.now()/1000)+SESSION_TTL_SECONDS;
 const payload=`admin:${expiresAt}`;
 return `${expiresAt}.${await hmac(payload,secret)}`;
}

export async function verifyAdminSessionToken(token:string|undefined,secret:string|undefined){
 if(!token||!secret)return false;
 const [expiryRaw,signature,...rest]=token.split('.');
 if(rest.length||!expiryRaw||!signature)return false;
 const expiresAt=Number(expiryRaw);
 if(!Number.isFinite(expiresAt)||expiresAt<=Math.floor(Date.now()/1000))return false;
 const expected=await hmac(`admin:${expiresAt}`,secret);
 return expected===signature;
}

export async function safeSecretEqual(a:string,b:string){
 const [left,right]=await Promise.all([
  crypto.subtle.digest('SHA-256',encoder.encode(a)),
  crypto.subtle.digest('SHA-256',encoder.encode(b))
 ]);
 const x=new Uint8Array(left),y=new Uint8Array(right);
 let diff=0;
 for(let i=0;i<x.length;i++)diff|=x[i]^y[i];
 return diff===0;
}

export const adminSessionMaxAge=SESSION_TTL_SECONDS;

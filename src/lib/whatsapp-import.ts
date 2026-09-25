import {createHash} from 'crypto';
import {and,eq} from 'drizzle-orm';
import {db} from '@/db';
import {auditLogs,businesses,commercialMemory,conversations,customers,messages} from '@/db/schema';

type ParsedMessage={at:Date;sender:string;text:string};

const normalizeName=(v:string)=>v.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ');

function normalizePhone(input:string){
 const compact=input.trim().replace(/[\s().-]/g,'');
 if(/^\+\d{8,15}$/.test(compact))return compact;
 const digits=compact.replace(/\D/g,'');
 if(/^\d{9}$/.test(digits))return `+237${digits}`;
 if(/^237\d{9}$/.test(digits))return `+${digits}`;
 throw new Error('Numéro client invalide. Utilise +2376XXXXXXXX ou 6XXXXXXXX.');
}

function parseDate(datePart:string,timePart:string){
 const [d,m,yRaw]=datePart.replace(/[.-]/g,'/').split('/').map(Number);
 if(!d||!m||!yRaw)return null;
 const year=yRaw<100?2000+yRaw:yRaw;
 let raw=timePart.trim();
 const pm=/pm$/i.test(raw),am=/am$/i.test(raw);
 raw=raw.replace(/\s*(am|pm)$/i,'');
 const pieces=raw.split(':').map(Number);
 let hour=pieces[0]||0;
 const minute=pieces[1]||0,second=pieces[2]||0;
 if(pm&&hour<12)hour+=12;
 if(am&&hour===12)hour=0;
 const date=new Date(Date.UTC(year,m-1,d,hour-1,minute,second));
 return Number.isNaN(date.getTime())?null:date;
}

export function parseWhatsAppExport(raw:string){
 const lines=raw.replace(/^\uFEFF/,'').replace(/\r\n/g,'\n').split('\n');
 const out:ParsedMessage[]=[];
 const re=/^\[?(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)\]?\s*(?:-|–)?\s*([^:]+):\s?(.*)$/;
 for(const line of lines){
  const m=line.match(re);
  if(m){
   const at=parseDate(m[1],m[2]);
   if(at)out.push({at,sender:m[3].trim(),text:m[4].trim()});
   continue;
  }
  if(out.length&&line.trim())out[out.length-1].text+=`\n${line.trim()}`;
 }
 return out.filter(x=>x.text&&x.text.length<10000);
}

function cleanForStyle(text:string){
 const t=text.trim();
 if(t.length<5||t.length>900)return null;
 if(/^(image|video|audio|sticker|document|gif) (omitted|non inclus)/i.test(t))return null;
 if(/^(message supprimé|this message was deleted)$/i.test(t))return null;
 return t;
}

async function getBusinessId(){
 const [b]=await db.select({id:businesses.id}).from(businesses).limit(1);
 if(!b)throw new Error('Entreprise non initialisée');
 return b.id;
}

export async function importWhatsAppChat(input:{raw:string;ownNames:string;clientPhone:string;clientName?:string;language?:string}){
 if(input.raw.length>2_500_000)throw new Error('Le fichier est trop volumineux pour cet import. Découpe-le en plusieurs exports.');
 const parsed=parseWhatsAppExport(input.raw);
 if(parsed.length<2)throw new Error('Aucun historique WhatsApp exploitable détecté. Vérifie que le fichier est un export .txt WhatsApp.');
 const myNames=new Set(input.ownNames.split(',').map(normalizeName).filter(Boolean));
 if(!myNames.size)throw new Error('Indique le nom qui apparaît pour toi dans l’export WhatsApp.');
 const participants=Array.from(new Set(parsed.map(x=>x.sender)));
 if(!parsed.some(x=>myNames.has(normalizeName(x.sender))))throw new Error(`Ton nom n’a pas été retrouvé. Participants détectés : ${participants.join(', ')}`);
 const otherParticipants=participants.filter(x=>!myNames.has(normalizeName(x)));
 if(otherParticipants.length!==1)throw new Error('Pour le moment, importe seulement une discussion privée avec un seul client. Les groupes WhatsApp seront traités séparément plus tard.');
 const phone=normalizePhone(input.clientPhone);
 const businessId=await getBusinessId();
 const hash=createHash('sha256').update(`${phone}\n${parsed.map(x=>`${x.at.toISOString()}|${x.sender}|${x.text}`).join('\n')}`).digest('hex').slice(0,40);
 const sourceRef=`wa-import:${hash}`;
 const [already]=await db.select({id:commercialMemory.id}).from(commercialMemory).where(and(eq(commercialMemory.businessId,businessId),eq(commercialMemory.sourceRef,sourceRef))).limit(1);
 if(already)throw new Error('Cet historique WhatsApp a déjà été importé.');

 let [customer]=await db.select().from(customers).where(and(eq(customers.businessId,businessId),eq(customers.phone,phone))).limit(1);
 if(!customer){
  const fallback=otherParticipants[0]||input.clientName||'Client';
  const full=(input.clientName||fallback).trim();
  const parts=full.split(/\s+/);
  [customer]=await db.insert(customers).values({businessId,phone,firstName:parts[0]||'Client',lastName:parts.slice(1).join(' ')||null,status:'lead',lastContactAt:parsed[parsed.length-1].at}).returning();
 }

 const [conversation]=await db.insert(conversations).values({customerId:customer.id,channel:'whatsapp_import',status:'closed',aiEnabled:false,humanTakeover:false,lastMessageAt:parsed[parsed.length-1].at}).returning();
 const rows=parsed.map(x=>({conversationId:conversation.id,direction:myNames.has(normalizeName(x.sender))?'out':'in',senderType:myNames.has(normalizeName(x.sender))?'admin':'customer',content:x.text,deliveryStatus:'imported',aiGenerated:false,createdAt:x.at}));
 for(let i=0;i<rows.length;i+=400)await db.insert(messages).values(rows.slice(i,i+400));

 const styleExamples:{content:string;sourceIndex:number}[]=[];
 const seen=new Set<string>();
 for(let i=0;i<parsed.length;i++){
  const current=parsed[i];
  if(!myNames.has(normalizeName(current.sender)))continue;
  const answer=cleanForStyle(current.text);
  if(!answer)continue;
  let previous:string|undefined;
  for(let j=i-1;j>=0&&j>=i-4;j--){if(!myNames.has(normalizeName(parsed[j].sender))){previous=cleanForStyle(parsed[j].text)||undefined;break;}}
  const content=previous?`Client : ${previous}\nRéponse : ${answer}`:`Réponse : ${answer}`;
  const key=normalizeName(content).slice(0,500);
  if(seen.has(key))continue;
  seen.add(key);
  styleExamples.push({content,sourceIndex:i});
 }
 const selected=styleExamples.slice(-60);
 if(selected.length){
  await db.insert(commercialMemory).values(selected.map((x,index)=>({businessId,customerId:null,kind:'style',title:`Exemple WhatsApp importé ${index+1}`,content:x.content,language:input.language||'fr',sourceType:'whatsapp_import',sourceRef,active:true,weight:90})));
 }
 await db.insert(auditLogs).values({businessId,actorType:'admin',action:'whatsapp.history_imported',entityType:'conversation',entityId:conversation.id,metadata:{customerId:customer.id,phone,messageCount:parsed.length,styleExamples:selected.length,sourceRef}});
 return {customerId:customer.id,conversationId:conversation.id,messageCount:parsed.length,styleExamples:selected.length,participants};
}

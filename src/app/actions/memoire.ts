'use server';
import {revalidatePath} from 'next/cache';
import {createMemoryEntry,toggleMemoryEntry} from '@/lib/commercial-memory';
import {importWhatsAppChat} from '@/lib/whatsapp-import';

const value=(form:FormData,key:string)=>String(form.get(key)??'').trim();

export async function createMemoryAction(form:FormData){
 const kind=value(form,'kind');
 const content=value(form,'content');
 if(!kind)throw new Error('Type requis');
 if(!content)throw new Error('Contenu requis');
 await createMemoryEntry({kind,title:value(form,'title')||undefined,content,customerId:value(form,'customerId')||undefined,language:value(form,'language')||'fr'});
 revalidatePath('/memoire');
}

export async function toggleMemoryAction(form:FormData){
 const id=value(form,'id');
 if(!id)throw new Error('Mémoire requise');
 await toggleMemoryEntry(id,value(form,'active')==='true');
 revalidatePath('/memoire');
}

export async function importWhatsAppHistoryAction(form:FormData){
 const file=form.get('chatFile');
 let raw=value(form,'chatText');
 if(file instanceof File&&file.size>0){
  if(file.size>2_500_000)throw new Error('Le fichier dépasse 2,5 Mo. Découpe l’export en plusieurs parties.');
  raw=await file.text();
 }
 if(!raw)throw new Error('Ajoute un fichier .txt WhatsApp ou colle le contenu de l’export.');
 await importWhatsAppChat({
  raw,
  ownNames:value(form,'ownNames'),
  clientPhone:value(form,'clientPhone'),
  clientName:value(form,'clientName')||undefined,
  language:value(form,'importLanguage')||'fr'
 });
 revalidatePath('/memoire');
 revalidatePath('/clients');
 revalidatePath('/inbox');
}

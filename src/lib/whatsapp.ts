import {recordCostEvent} from '@/lib/costs';

type TextMessage={to:string;text:string};
const apiVersion=process.env.WHATSAPP_API_VERSION||'v23.0';

function whatsappEstimatedCostUsd(){
 const value=Number(process.env.WHATSAPP_ESTIMATED_USD_PER_MESSAGE||0);
 return Number.isFinite(value)&&value>0?value:0;
}

export async function sendWhatsAppText(input:TextMessage){
 const token=process.env.WHATSAPP_ACCESS_TOKEN;
 const phoneId=process.env.WHATSAPP_PHONE_NUMBER_ID;
 if(!token||!phoneId)throw new Error('Configuration WhatsApp incomplète');
 const res=await fetch(`https://graph.facebook.com/${apiVersion}/${phoneId}/messages`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({messaging_product:'whatsapp',recipient_type:'individual',to:input.to,type:'text',text:{preview_url:false,body:input.text}})});
 if(!res.ok)throw new Error(`WhatsApp API ${res.status}: ${await res.text()}`);
 const data=await res.json();
 await recordCostEvent({
  category:'whatsapp',
  provider:'Meta',
  service:'WhatsApp Cloud API',
  operation:'text_message',
  totalUnits:1,
  unitType:'message',
  costUsd:whatsappEstimatedCostUsd(),
  requestId:data?.messages?.[0]?.id,
  metadata:{estimated:true,pricing:'Configure WHATSAPP_ESTIMATED_USD_PER_MESSAGE for forecasting; actual Meta billing can vary by template/category/country.'}
 });
 return data;
}

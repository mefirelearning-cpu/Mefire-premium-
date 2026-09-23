type TextMessage={to:string;text:string};
const apiVersion=process.env.WHATSAPP_API_VERSION||'v23.0';
export async function sendWhatsAppText(input:TextMessage){
 const token=process.env.WHATSAPP_ACCESS_TOKEN;
 const phoneId=process.env.WHATSAPP_PHONE_NUMBER_ID;
 if(!token||!phoneId)throw new Error('Configuration WhatsApp incomplète');
 const res=await fetch(`https://graph.facebook.com/${apiVersion}/${phoneId}/messages`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({messaging_product:'whatsapp',recipient_type:'individual',to:input.to,type:'text',text:{preview_url:false,body:input.text}})});
 if(!res.ok)throw new Error(`WhatsApp API ${res.status}: ${await res.text()}`);
 return res.json();
}

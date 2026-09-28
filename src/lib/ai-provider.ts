type ChatMessage={role:'system'|'user'|'assistant';content:string};
type ProviderConfig={url:string;key:string;model:string;headers:Record<string,string>};

function providerConfig():ProviderConfig|null{
 const openRouterKey=process.env.OPENROUTER_API_KEY?.trim();
 if(openRouterKey){
  return{
   url:'https://openrouter.ai/api/v1/chat/completions',
   key:openRouterKey,
   model:process.env.OPENROUTER_MODEL||'openai/gpt-5-mini',
   headers:{'HTTP-Referer':process.env.APP_URL||'https://mefire-premium.vercel.app','X-Title':'Mefire Premium CRM'}
  };
 }
 const key=process.env.OPENAI_API_KEY?.trim();
 if(!key)return null;
 return{url:'https://api.openai.com/v1/chat/completions',key,model:process.env.OPENAI_MODEL||'gpt-5-mini',headers:{}};
}

export async function aiChat(messages:ChatMessage[],options?:{temperature?:number;json?:boolean}){
 const config=providerConfig();
 if(!config)throw new Error('Aucun fournisseur IA configuré');
 const headers:Record<string,string>={Authorization:`Bearer ${config.key}`,'Content-Type':'application/json',...config.headers};
 const response=await fetch(config.url,{
  method:'POST',
  headers,
  body:JSON.stringify({
   model:config.model,
   messages,
   temperature:options?.temperature??0.2,
   ...(options?.json?{response_format:{type:'json_object'}}:{})
  })
 });
 if(!response.ok)throw new Error(`AI API ${response.status}: ${await response.text()}`);
 const data=await response.json();
 return String(data?.choices?.[0]?.message?.content??'').trim();
}

export function aiProviderStatus(){
 if(process.env.OPENROUTER_API_KEY?.trim())return{provider:'OpenRouter',configured:true,model:process.env.OPENROUTER_MODEL||'openai/gpt-5-mini'};
 if(process.env.OPENAI_API_KEY?.trim())return{provider:'OpenAI',configured:true,model:process.env.OPENAI_MODEL||'gpt-5-mini'};
 return{provider:'Aucun',configured:false,model:'—'};
}

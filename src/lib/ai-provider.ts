import {aiBudgetReached,recordCostEvent} from '@/lib/costs';

type ChatMessage={role:'system'|'user'|'assistant';content:string};
type ProviderConfig={provider:string;url:string;key:string;model:string;headers:Record<string,string>;includeUsage?:boolean};

function providerConfig():ProviderConfig|null{
 const openRouterKey=process.env.OPENROUTER_API_KEY?.trim();
 if(openRouterKey){
  return{
   provider:'OpenRouter',
   url:'https://openrouter.ai/api/v1/chat/completions',
   key:openRouterKey,
   model:process.env.OPENROUTER_MODEL||'qwen/qwen3-30b-a3b-instruct-2507',
   headers:{'HTTP-Referer':process.env.APP_URL||'https://mefire-premium.vercel.app','X-Title':'Mefire Premium CRM'},
   includeUsage:true
  };
 }
 const key=process.env.OPENAI_API_KEY?.trim();
 if(!key)return null;
 return{provider:'OpenAI',url:'https://api.openai.com/v1/chat/completions',key,model:process.env.OPENAI_MODEL||'gpt-5-mini',headers:{}};
}

function fallbackCost(promptTokens:number,completionTokens:number){
 const inputRate=Number(process.env.AI_INPUT_USD_PER_MILLION||0);
 const outputRate=Number(process.env.AI_OUTPUT_USD_PER_MILLION||0);
 if(!Number.isFinite(inputRate)||!Number.isFinite(outputRate))return 0;
 return (promptTokens/1_000_000)*inputRate+(completionTokens/1_000_000)*outputRate;
}

export async function aiChat(messages:ChatMessage[],options?:{temperature?:number;json?:boolean;operation?:string}){
 const config=providerConfig();
 if(!config)throw new Error('Aucun fournisseur IA configuré');
 if(await aiBudgetReached())throw new Error('Budget IA mensuel atteint. Modifie la limite dans Dépenses & crédits pour reprendre les appels.');
 const headers:Record<string,string>={Authorization:`Bearer ${config.key}`,'Content-Type':'application/json',...config.headers};
 const response=await fetch(config.url,{
  method:'POST',
  headers,
  body:JSON.stringify({
   model:config.model,
   messages,
   temperature:options?.temperature??0.2,
   ...(options?.json?{response_format:{type:'json_object'}}:{}),
   ...(config.includeUsage?{usage:{include:true}}:{})
  })
 });
 if(!response.ok)throw new Error(`AI API ${response.status}: ${await response.text()}`);
 const data=await response.json();
 const usage=data?.usage||{};
 const promptTokens=Number(usage.prompt_tokens??usage.input_tokens??0);
 const completionTokens=Number(usage.completion_tokens??usage.output_tokens??0);
 const totalTokens=Number(usage.total_tokens??(promptTokens+completionTokens));
 const providerCost=Number(usage.cost??data?.cost);
 const costUsd=Number.isFinite(providerCost)&&providerCost>=0?providerCost:fallbackCost(promptTokens,completionTokens);
 await recordCostEvent({
  category:'ai',provider:config.provider,service:config.model,operation:options?.operation||'chat',
  inputUnits:promptTokens,outputUnits:completionTokens,totalUnits:totalTokens,unitType:'tokens',costUsd,
  requestId:response.headers.get('x-request-id')||undefined,
  metadata:{estimated:!(Number.isFinite(providerCost)&&providerCost>=0)}
 });
 return String(data?.choices?.[0]?.message?.content??'').trim();
}

export function aiProviderStatus(){
 if(process.env.OPENROUTER_API_KEY?.trim())return{provider:'OpenRouter',configured:true,model:process.env.OPENROUTER_MODEL||'qwen/qwen3-30b-a3b-instruct-2507'};
 if(process.env.OPENAI_API_KEY?.trim())return{provider:'OpenAI',configured:true,model:process.env.OPENAI_MODEL||'gpt-5-mini'};
 return{provider:'Aucun',configured:false,model:'—'};
}

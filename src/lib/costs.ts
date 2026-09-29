import {neon} from '@neondatabase/serverless';

type CostEventInput={
 category:'ai'|'whatsapp'|'infrastructure'|string;
 provider:string;
 service?:string;
 operation?:string;
 inputUnits?:number;
 outputUnits?:number;
 totalUnits?:number;
 unitType?:string;
 costUsd?:number;
 requestId?:string;
 metadata?:Record<string,unknown>;
};

function client(){
 const url=process.env.DATABASE_URL;
 if(!url)throw new Error('DATABASE_URL manquant');
 return neon(url);
}

export async function recordCostEvent(input:CostEventInput){
 try{
  const sql=client();
  const businesses=await sql`SELECT id FROM businesses ORDER BY created_at ASC LIMIT 1`;
  const businessId=businesses[0]?.id;
  if(!businessId)return;
  await sql`
   INSERT INTO cost_events (
    business_id,category,provider,service,operation,input_units,output_units,total_units,unit_type,cost_usd,request_id,metadata
   ) VALUES (
    ${businessId},${input.category},${input.provider},${input.service??null},${input.operation??null},
    ${Math.max(0,Math.trunc(input.inputUnits??0))},${Math.max(0,Math.trunc(input.outputUnits??0))},${Math.max(0,Math.trunc(input.totalUnits??0))},
    ${input.unitType??'tokens'},${Math.max(0,input.costUsd??0)},${input.requestId??null},${JSON.stringify(input.metadata??{})}::jsonb
   )`;
 }catch(error){
  console.error('cost-tracking',error);
 }
}

export async function getCostDashboard(){
 const empty={available:false,monthUsd:0,todayUsd:0,aiMonthUsd:0,whatsappMonthUsd:0,requests:0,inputUnits:0,outputUnits:0,budgetUsd:5,warningPercent:80,hardLimit:false,byProvider:[] as Array<{provider:string;service:string|null;costUsd:number;requests:number}>,recent:[] as Array<{id:string;category:string;provider:string;service:string|null;costUsd:number;totalUnits:number;createdAt:string}>};
 try{
  const sql=client();
  const businesses=await sql`SELECT id FROM businesses ORDER BY created_at ASC LIMIT 1`;
  const businessId=businesses[0]?.id;
  if(!businessId)return empty;

  const [summaryRows,budgetRows,providerRows,recentRows]=await Promise.all([
   sql`
    SELECT
     COALESCE(SUM(cost_usd) FILTER (WHERE created_at>=date_trunc('month',now())),0)::text AS month_usd,
     COALESCE(SUM(cost_usd) FILTER (WHERE created_at>=date_trunc('day',now())),0)::text AS today_usd,
     COALESCE(SUM(cost_usd) FILTER (WHERE category='ai' AND created_at>=date_trunc('month',now())),0)::text AS ai_month_usd,
     COALESCE(SUM(cost_usd) FILTER (WHERE category='whatsapp' AND created_at>=date_trunc('month',now())),0)::text AS whatsapp_month_usd,
     COUNT(*) FILTER (WHERE created_at>=date_trunc('month',now()))::int AS requests,
     COALESCE(SUM(input_units) FILTER (WHERE category='ai' AND created_at>=date_trunc('month',now())),0)::bigint AS input_units,
     COALESCE(SUM(output_units) FILTER (WHERE category='ai' AND created_at>=date_trunc('month',now())),0)::bigint AS output_units
    FROM cost_events WHERE business_id=${businessId}`,
   sql`SELECT monthly_budget_usd::text,warning_percent,hard_limit FROM cost_budgets WHERE business_id=${businessId} AND category='ai' LIMIT 1`,
   sql`
    SELECT provider,service,COALESCE(SUM(cost_usd),0)::text AS cost_usd,COUNT(*)::int AS requests
    FROM cost_events
    WHERE business_id=${businessId} AND created_at>=date_trunc('month',now())
    GROUP BY provider,service ORDER BY SUM(cost_usd) DESC LIMIT 10`,
   sql`
    SELECT id,category,provider,service,cost_usd::text,total_units,created_at
    FROM cost_events WHERE business_id=${businessId}
    ORDER BY created_at DESC LIMIT 20`
  ]);

  const s=summaryRows[0]??{};
  const b=budgetRows[0]??{};
  return{
   available:true,
   monthUsd:Number(s.month_usd??0),todayUsd:Number(s.today_usd??0),aiMonthUsd:Number(s.ai_month_usd??0),whatsappMonthUsd:Number(s.whatsapp_month_usd??0),
   requests:Number(s.requests??0),inputUnits:Number(s.input_units??0),outputUnits:Number(s.output_units??0),
   budgetUsd:Number(b.monthly_budget_usd??process.env.AI_MONTHLY_BUDGET_USD??5),warningPercent:Number(b.warning_percent??80),hardLimit:Boolean(b.hard_limit??false),
   byProvider:providerRows.map((r:any)=>({provider:String(r.provider),service:r.service?String(r.service):null,costUsd:Number(r.cost_usd??0),requests:Number(r.requests??0)})),
   recent:recentRows.map((r:any)=>({id:String(r.id),category:String(r.category),provider:String(r.provider),service:r.service?String(r.service):null,costUsd:Number(r.cost_usd??0),totalUnits:Number(r.total_units??0),createdAt:new Date(r.created_at).toISOString()}))
  };
 }catch(error){
  console.error('cost-dashboard',error);
  return empty;
 }
}

export async function aiBudgetReached(){
 try{
  const data=await getCostDashboard();
  return data.available&&data.hardLimit&&data.budgetUsd>0&&data.aiMonthUsd>=data.budgetUsd;
 }catch{return false;}
}

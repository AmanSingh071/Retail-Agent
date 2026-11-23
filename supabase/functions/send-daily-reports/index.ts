import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
async function makePdf(title:string,lines:string[]){const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);let page=pdf.addPage([595,842]),y=800;page.drawText(title,{x:42,y,size:18,font:bold,color:rgb(.12,.27,.18)});y-=30;page.drawText("Generated "+new Date().toISOString(),{x:42,y,size:9,font,color:rgb(.4,.45,.4)});y-=25;for(const line of lines){if(y<55){page=pdf.addPage([595,842]);y=800;}page.drawText(line.slice(0,115),{x:42,y,size:9,font,color:rgb(.18,.22,.18)});y-=16;}return await pdf.save();}
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 try{
  const url=Deno.env.get("SUPABASE_URL")!,anon=Deno.env.get("SUPABASE_ANON_KEY")!,service=Deno.env.get("PROJECT_SERVICE_KEY")!,resend=Deno.env.get("RESEND_API_KEY")!,from=Deno.env.get("REPORT_FROM_EMAIL")!;
  const auth=req.headers.get("Authorization");if(!auth)throw new Error("Authentication required");
  const callerClient=createClient(url,anon,{global:{headers:{Authorization:auth}}}),{data:{user},error:ue}=await callerClient.auth.getUser();if(ue||!user)throw new Error("Invalid session");
  const admin=createClient(url,service),{data:profile,error:pe}=await admin.from("user_profiles").select("role").eq("id",user.id).single();if(pe||profile?.role!=="admin")return new Response(JSON.stringify({error:"Admin access required"}),{status:403,headers:{...cors,"Content-Type":"application/json"}});
  const body=await req.json(),recipient=String(body.recipient||Deno.env.get("REPORT_RECIPIENT")||"").trim();if(!recipient.includes("@"))throw new Error("Configure a valid report recipient"); 
  const [{data:sales,error:se},{data:batches,error:be},{data:stores},{data:products},{data:attendance,error:ae},{data:employees,error:ee}]=await Promise.all([
   admin.from("sales_daily").select("sale_date,store_id,product_id,units_sold,revenue").order("sale_date",{ascending:false}).limit(5000),
   admin.from("inventory_batches").select("store_id,product_id,batch_code,quantity,expiry_date").order("expiry_date").limit(2000),
   admin.from("stores").select("id,store_name"),admin.from("products").select("id,sku,product_name"),
   admin.from("attendance_events").select("received_at,employee_id,store_id,status,review_reason,latitude,longitude,accuracy_m").order("received_at",{ascending:false}).limit(1000),
   admin.from("user_profiles").select("id,full_name,employee_id").eq("role","employee")
  ]);
  if(se||be||ae||ee)throw se||be||ae||ee;
  const sm=new Map((stores||[]).map(x=>[x.id,x.store_name])),pm=new Map((products||[]).map(x=>[x.id,x.sku])),em=new Map((employees||[]).map(x=>[x.id,(x.full_name||'Employee')+' ('+(x.employee_id||'No ID')+')']));
  const inventoryLines=[`Sales rows loaded: ${sales?.length||0}`,`Inventory batches: ${batches?.length||0}`,...((batches||[]).map(b=>`${sm.get(b.store_id)||"Store"} | ${pm.get(b.product_id)||"SKU"} | Batch ${b.batch_code} | Qty ${b.quantity} | Expiry ${b.expiry_date}`))];
  const attendanceLines=[`Attendance events: ${attendance?.length||0}`,`Employee accounts: ${employees?.length||0}`,`No check-in record does not prove holiday or absence. Leave register is not configured.`,``,...((employees||[]).map(e=>{const mine=(attendance||[]).filter(a=>a.employee_id===e.id);return `${em.get(e.id)} | Recorded check-ins: ${mine.length} | Last: ${mine[0]?.received_at||'No check-in'}`;})),``,...((attendance||[]).map(a=>`${a.received_at} | ${em.get(a.employee_id)||'Employee'} | ${sm.get(a.store_id)||"Store"} | ${a.status} | GPS ${Number(a.latitude).toFixed(5)},${Number(a.longitude).toFixed(5)} ±${Math.round(a.accuracy_m||0)}m | ${a.review_reason||""}`))];
  const [inventoryPdf,attendancePdf]=await Promise.all([makePdf("Retail Agent - Sales & Inventory Report",inventoryLines),makePdf("Retail Agent - Attendance Report",attendanceLines)]);
  const b64=(bytes:Uint8Array)=>{let binary="";for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(binary);};
  const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+resend,"Content-Type":"application/json"},body:JSON.stringify({from,to:[recipient],subject:"Retail Agent operational reports - "+new Date().toISOString().slice(0,10),html:"<p>Attached are the current sales/inventory and attendance reports generated from Supabase records.</p><p>These reports reflect recorded data only; missing source records are not inferred.</p>",attachments:[{filename:"sales-inventory-report.pdf",content:b64(inventoryPdf)},{filename:"attendance-report.pdf",content:b64(attendancePdf)}]})});
  const result=await response.json();if(!response.ok)throw new Error(result.message||"Email provider rejected the report");
  await admin.from("agent_activity_logs").insert({agent_name:"Reporting",action:"Generate and email PDF reports",status:"completed",input_summary:{recipient},output_summary:{sales_rows:sales?.length||0,inventory_batches:batches?.length||0,attendance_events:attendance?.length||0,provider_id:result.id},created_by:user.id});
  return new Response(JSON.stringify({message:"Two PDF reports emailed successfully.",recipient,records:{sales:sales?.length||0,batches:batches?.length||0,attendance:attendance?.length||0},provider_id:result.id}),{headers:{...cors,"Content-Type":"application/json"}});
 }catch(e){return new Response(JSON.stringify({error:e.message||"Report generation failed"}),{status:400,headers:{...cors,"Content-Type":"application/json"}});}
});

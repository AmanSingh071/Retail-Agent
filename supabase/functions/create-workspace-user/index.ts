import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return new Response(JSON.stringify({error:"Method not allowed"}),{status:405,headers:{...cors,"Content-Type":"application/json"}});
 try{
  const url=Deno.env.get("SUPABASE_URL")!,anon=Deno.env.get("SUPABASE_ANON_KEY")!,service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const auth=req.headers.get("Authorization");if(!auth)throw new Error("Authentication required");
  const callerClient=createClient(url,anon,{global:{headers:{Authorization:auth}}});
  const {data:{user},error:ue}=await callerClient.auth.getUser();if(ue||!user)throw new Error("Invalid session");
  const admin=createClient(url,service);
  const {data:caller,error:pe}=await admin.from("user_profiles").select("role").eq("id",user.id).single();
  if(pe||caller?.role!=="admin")return new Response(JSON.stringify({error:"Administrator access required"}),{status:403,headers:{...cors,"Content-Type":"application/json"}});
  const body=await req.json(),email=String(body.email||"").trim().toLowerCase(),password=String(body.password||""),full_name=String(body.full_name||"").trim(),employee_id=String(body.employee_id||"").trim(),role=body.role;
  if(!email||!full_name||!employee_id||password.length<12||!["admin","employee"].includes(role))throw new Error("Provide name, employee ID, valid email, role and a password of at least 12 characters.");
  const {data:created,error:ce}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name}});
  if(ce)throw ce;
  const {error:profileError}=await admin.from("user_profiles").insert({id:created.user.id,full_name,employee_id,role});
  if(profileError){await admin.auth.admin.deleteUser(created.user.id);throw profileError;}
  return new Response(JSON.stringify({id:created.user.id,email,full_name,employee_id,role}),{status:201,headers:{...cors,"Content-Type":"application/json"}});
 }catch(e){return new Response(JSON.stringify({error:e.message||"Unable to provision account"}),{status:400,headers:{...cors,"Content-Type":"application/json"}});}
});

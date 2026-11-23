import React,{useEffect,useState} from 'react';
import {supabase} from './lib/supabase';
const empty={full_name:'',employee_id:'',email:'',role:'employee',password:''};
export default function EmployeeDirectory(){
 const [rows,setRows]=useState([]),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[form,setForm]=useState(empty);
 async function load(){setLoading(true);setError('');const {data,error}=await supabase.from('user_profiles').select('id,full_name,role,employee_id').order('full_name');if(error)setError(error.message);else setRows(data||[]);setLoading(false);}
 useEffect(()=>{load();},[]);
 async function create(e){e.preventDefault();setSaving(true);setError('');setNotice('');try{const {data,error}=await supabase.functions.invoke('create-workspace-user',{body:form});if(error)throw error;if(data?.error)throw new Error(data.error);setNotice('Account created and profile provisioned for '+data.email);setForm(empty);await load();}catch(e){setError(e.message||'Provisioning failed. Deploy the create-workspace-user Edge Function and configure its server secrets.');}finally{setSaving(false);}}
 return <div style={{display:'grid',gap:14}}>
  <div className="metrics"><div className="metric"><small>PROVISIONED ACCOUNTS</small><strong>{rows.length}</strong><span>Supabase user_profiles</span></div><div className="metric"><small>EMPLOYEE ACCOUNTS</small><strong>{rows.filter(x=>x.role==='employee').length}</strong><span>Role = employee</span></div><div className="metric"><small>ADMIN ACCOUNTS</small><strong>{rows.filter(x=>x.role==='admin').length}</strong><span>Role = admin</span></div></div>
  <section className="card"><header><h3>Provision workspace account</h3></header><p className="subtle">Creates the Auth account and role profile through a server-side admin function. Never expose the service-role key in the browser.</p>
   <form onSubmit={create} style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:10}}>
    <label>FULL NAME<input required value={form.full_name} onChange={e=>setForm(v=>({...v,full_name:e.target.value}))}/></label>
    <label>EMPLOYEE ID<input required value={form.employee_id} onChange={e=>setForm(v=>({...v,employee_id:e.target.value}))}/></label>
    <label>EMAIL<input required type="email" value={form.email} onChange={e=>setForm(v=>({...v,email:e.target.value}))}/></label>
    <label>ROLE<select value={form.role} onChange={e=>setForm(v=>({...v,role:e.target.value}))}><option value="employee">Employee</option><option value="admin">Admin</option></select></label>
    <label style={{gridColumn:'1/-1'}}>TEMPORARY PASSWORD (6+ CHARACTERS)<input required minLength={6} type="password" value={form.password} onChange={e=>setForm(v=>({...v,password:e.target.value}))}/></label>
    <button className="primary" disabled={saving}>{saving?'Creating account…':'Create account'}</button>
   </form>{error&&<div className="authError" style={{marginTop:10}}>{error}</div>}{notice&&<div className="notice">{notice}</div>}
  </section>
  <section className="card"><header><h3>Authenticated workspace users</h3><button className="secondary" onClick={load}>Refresh</button></header>
   {loading?<p>Loading user profiles…</p>:error&&!rows.length?<div className="authError">{error}</div>:rows.length===0?<div className="emptyState"><b>No user profiles found.</b></div>:<div className="tableScroll"><table><thead><tr><th>NAME</th><th>EMPLOYEE ID</th><th>ROLE</th><th>AUTH USER ID</th></tr></thead><tbody>{rows.map(x=><tr key={x.id}><td>{x.full_name||'—'}</td><td>{x.employee_id||'—'}</td><td><span className="chip">{x.role}</span></td><td style={{fontSize:10}}>{x.id}</td></tr>)}</tbody></table></div>}
  </section>
 </div>;
}

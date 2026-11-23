import React,{useEffect,useState} from 'react';
import {supabase} from './lib/supabase';

export default function EmployeeDirectory(){
 const [rows,setRows]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 async function load(){setLoading(true);setError('');const {data,error}=await supabase.from('user_profiles').select('id,full_name,role,employee_id').order('full_name');if(error)setError(error.message);else setRows(data||[]);setLoading(false);}
 useEffect(()=>{load();},[]);
 return <div style={{display:'grid',gap:14}}>
  <div className="metrics">
   <div className="metric"><small>PROVISIONED ACCOUNTS</small><strong>{rows.length}</strong><span>Supabase user_profiles</span></div>
   <div className="metric"><small>EMPLOYEE ACCOUNTS</small><strong>{rows.filter(x=>x.role==='employee').length}</strong><span>Role = employee</span></div>
   <div className="metric"><small>ADMIN ACCOUNTS</small><strong>{rows.filter(x=>x.role==='admin').length}</strong><span>Role = admin</span></div>
  </div>
  <section className="card"><header><h3>Authenticated workspace users</h3><button className="secondary" onClick={load}>Refresh</button></header>
   <p className="subtle">This directory shows provisioned profile records. It does not create Auth accounts or change access roles from the browser.</p>
   {loading?<p>Loading user profiles…</p>:error?<div className="authError">{error}</div>:rows.length===0?<div className="emptyState"><b>No user profiles found.</b><p>Create an Auth user in Supabase, then provision its matching user_profiles row.</p></div>:<div className="tableScroll"><table><thead><tr><th>NAME</th><th>EMPLOYEE ID</th><th>ROLE</th><th>AUTH USER ID</th></tr></thead><tbody>{rows.map(x=><tr key={x.id}><td>{x.full_name||'—'}</td><td>{x.employee_id||'—'}</td><td><span className="chip">{x.role}</span></td><td style={{fontSize:10}}>{x.id}</td></tr>)}</tbody></table></div>}
  </section>
 </div>;
}

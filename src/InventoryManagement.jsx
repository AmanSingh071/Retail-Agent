import React,{useEffect,useMemo,useState} from 'react';
import {supabase} from './lib/supabase';

const input={padding:'10px 11px',border:'1px solid #dfe7dd',borderRadius:7,fontSize:12,width:'100%',background:'#fff',color:'#34483a'};
const button={padding:'10px 14px',border:0,borderRadius:7,background:'#285b3d',color:'#fff',fontSize:11,cursor:'pointer'};
const isoToday=()=>new Date().toISOString().slice(0,10);
const blank={store_id:'',product_id:'',batch_code:'',quantity:'',received_date:isoToday(),expiry_date:''};

export default function InventoryManagement({onSaved,onNotice}){
 const [stores,setStores]=useState([]),[products,setProducts]=useState([]),[batches,setBatches]=useState([]);
 const [form,setForm]=useState(blank),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState('');
 const [filterStore,setFilterStore]=useState('All stores'),[filterStatus,setFilterStatus]=useState('all');
 async function load(){
  setLoading(true);setError('');
  const [{data:ss,error:se},{data:pp,error:pe},{data:bb,error:be}]=await Promise.all([
   supabase.from('stores').select('id,store_code,store_name,is_active').order('store_name'),
   supabase.from('products').select('id,sku,product_name,unit,is_active').order('product_name'),
   supabase.from('inventory_batches').select('id,store_id,product_id,batch_code,quantity,received_date,expiry_date').order('expiry_date',{ascending:true})
  ]);
  if(se||pe||be)setError(se?.message||pe?.message||be?.message||'Unable to load inventory records.');
  else{setStores(ss||[]);setProducts(pp||[]);setBatches(bb||[]);if(!form.store_id&&ss?.length)setForm(v=>({...v,store_id:ss.find(x=>x.is_active)?.id||ss[0].id}));if(!form.product_id&&pp?.length)setForm(v=>({...v,product_id:pp.find(x=>x.is_active)?.id||pp[0].id}));}
  setLoading(false);
 }
 useEffect(()=>{load();},[]);
 const activeStores=stores.filter(x=>x.is_active),activeProducts=products.filter(x=>x.is_active);
 const now=isoToday(),soon=new Date(Date.now()+7*86400000).toISOString().slice(0,10);
 const enriched=useMemo(()=>batches.map(b=>({...b,store:stores.find(s=>s.id===b.store_id),product:products.find(p=>p.id===b.product_id),status:b.expiry_date<now?'Expired':b.expiry_date<=soon?'Due within 7 days':'OK'})),[batches,stores,products]);
 const visible=enriched.filter(b=>(filterStore==='All stores'||b.store_id===filterStore)&&(filterStatus==='all'||(filterStatus==='expired'&&b.status==='Expired')||(filterStatus==='soon'&&b.status==='Due within 7 days')||(filterStatus==='ok'&&b.status==='OK')));
 const total=batches.reduce((n,b)=>n+Number(b.quantity||0),0);
 async function save(e){
  e.preventDefault();setError('');
  if(!form.store_id||!form.product_id){setError('Create an active store and product before adding stock.');return;}
  if(!form.batch_code.trim()){setError('Enter a batch code.');return;}
  if(!(Number(form.quantity)>0)){setError('Quantity must be greater than zero.');return;}
  if(!form.received_date||!form.expiry_date){setError('Received date and expiry date are required.');return;}
  if(form.expiry_date<form.received_date){setError('Expiry date cannot be earlier than received date.');return;}
  setSaving(true);
  const payload={store_id:form.store_id,product_id:form.product_id,batch_code:form.batch_code.trim(),quantity:Number(form.quantity),received_date:form.received_date,expiry_date:form.expiry_date};
  const {error:e2}=await supabase.from('inventory_batches').insert(payload);
  if(e2)setError(e2.message);
  else{setForm(v=>({...blank,store_id:v.store_id,product_id:v.product_id,received_date:isoToday()}));onNotice?.('Inventory batch saved to Supabase.');await load();onSaved?.();}
  setSaving(false);
 }
 return <div style={{display:'grid',gap:14}}>
  <div className="metrics">
   <div className="metric"><small>ACTIVE STORES</small><strong>{activeStores.length}</strong><span>Supabase store directory</span></div>
   <div className="metric"><small>ACTIVE PRODUCTS</small><strong>{activeProducts.length}</strong><span>Supabase product catalogue</span></div>
   <div className="metric"><small>BATCH RECORDS</small><strong>{batches.length}</strong><span>Recorded inventory batches</span></div>
   <div className="metric"><small>TOTAL ON HAND</small><strong>{total.toLocaleString('en-IN')}</strong><span>Quantity across all batches</span></div>
  </div>
  <div style={{display:'grid',gridTemplateColumns:'minmax(270px,.8fr) minmax(420px,1.4fr)',gap:14,alignItems:'start'}}>
   <section className="card"><header><h3>Add inventory batch</h3></header>
    {(!activeStores.length||!activeProducts.length)&&<p className="subtle">Add at least one active store and product before recording stock.</p>}
    <form onSubmit={save} style={{display:'grid',gap:10}}>
     <label style={{display:'grid',gap:5,fontSize:10,color:'#718075'}}>STORE<select required value={form.store_id} onChange={e=>setForm(v=>({...v,store_id:e.target.value}))} style={input}><option value="">Select store</option>{activeStores.map(s=><option key={s.id} value={s.id}>{s.store_name} · {s.store_code}</option>)}</select></label>
     <label style={{display:'grid',gap:5,fontSize:10,color:'#718075'}}>PRODUCT / SKU<select required value={form.product_id} onChange={e=>setForm(v=>({...v,product_id:e.target.value}))} style={input}><option value="">Select product</option>{activeProducts.map(p=><option key={p.id} value={p.id}>{p.product_name} · {p.sku}</option>)}</select></label>
     <label style={{display:'grid',gap:5,fontSize:10,color:'#718075'}}>BATCH CODE<input required value={form.batch_code} onChange={e=>setForm(v=>({...v,batch_code:e.target.value}))} placeholder="e.g. DEMO-MILK-B001" style={input}/></label>
     <label style={{display:'grid',gap:5,fontSize:10,color:'#718075'}}>QUANTITY ({activeProducts.find(p=>p.id===form.product_id)?.unit||'units'})<input required type="number" min="0.001" step="any" value={form.quantity} onChange={e=>setForm(v=>({...v,quantity:e.target.value}))} placeholder="Enter verified stock quantity" style={input}/></label>
     <label style={{display:'grid',gap:5,fontSize:10,color:'#718075'}}>RECEIVED DATE<input required type="date" value={form.received_date} onChange={e=>setForm(v=>({...v,received_date:e.target.value}))} style={input}/></label>
     <label style={{display:'grid',gap:5,fontSize:10,color:'#718075'}}>EXPIRY DATE<input required type="date" value={form.expiry_date} onChange={e=>setForm(v=>({...v,expiry_date:e.target.value}))} style={input}/></label>
     {error&&<p style={{color:'#a33',fontSize:11,margin:0}}>{error}</p>}
     <button disabled={saving||!activeStores.length||!activeProducts.length} style={{...button,opacity:saving?0.6:1}}>{saving?'Saving batch…':'Save inventory batch'}</button>
    </form>
    <p className="subtle">Enter only physically verified stock and batch dates. These values are written to Supabase and affect on-hand and replenishment calculations.</p>
   </section>
   <section className="card"><header><h3>Live batch register · FEFO order</h3><button style={{...button,background:'#e9eee8',color:'#405546'}} onClick={()=>{load();onSaved?.();}}>Refresh</button></header>
    <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}}>
     <select value={filterStore} onChange={e=>setFilterStore(e.target.value)} style={{...input,width:'auto',minWidth:140}}><option value="All stores">All stores</option>{stores.map(s=><option key={s.id} value={s.id}>{s.store_name}</option>)}</select>
     <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={{...input,width:'auto',minWidth:140}}><option value="all">All expiry statuses</option><option value="expired">Expired</option><option value="soon">Due within 7 days</option><option value="ok">Not due soon</option></select>
    </div>
    {loading?<p className="subtle">Loading inventory batches…</p>:error&&!batches.length?<p style={{color:'#a33',fontSize:11}}>{error}</p>:visible.length===0?<div className="emptyState"><b>No matching inventory batches.</b><p>Add a verified batch using the form. No synthetic stock is inserted automatically.</p></div>:
     <div className="tableScroll"><table><thead><tr><th>EXPIRY · FEFO</th><th>STORE</th><th>SKU / PRODUCT</th><th>BATCH</th><th>QTY</th><th>RECEIVED</th><th>STATUS</th></tr></thead><tbody>{visible.map(b=><tr key={b.id}><td>{b.expiry_date}</td><td>{b.store?.store_name||'—'}</td><td>{b.product?.sku||'—'}<br/>{b.product?.product_name||''}</td><td>{b.batch_code}</td><td>{Number(b.quantity).toLocaleString('en-IN')}</td><td>{b.received_date}</td><td><span className={'chip '+(b.status==='Expired'?'red':'')}>{b.status}</span></td></tr>)}</tbody></table></div>}
    <p className="subtle">FEFO means earliest expiry first. This register sorts by expiry date; it does not automatically move stock or alter quantities.</p>
   </section>
  </div>
 </div>;
}

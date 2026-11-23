import React,{useEffect,useState} from 'react';
import {supabase} from './lib/supabase';

const fieldStyle={padding:'10px 11px',border:'1px solid #dfe7dd',borderRadius:7,fontSize:11,width:'100%',background:'#fff',color:'#34483a'};
const buttonStyle={padding:'9px 13px',border:0,borderRadius:7,background:'#285b3d',color:'#fff',fontSize:10,cursor:'pointer'};
const blankProduct={sku:'',product_name:'',category:'',unit:'units',is_active:true};
const blankStore={store_code:'',store_name:'',address:'',latitude:'',longitude:'',geofence_radius_m:'100',is_active:true};

export default function ReferenceManagement({type,onNotice}){
 const isProduct=type==='Products', table=isProduct?'products':'stores';
 const [rows,setRows]=useState([]),[form,setForm]=useState(isProduct?blankProduct:blankStore),[editing,setEditing]=useState(null),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState('');
 const columns=isProduct?['sku','product_name','category','unit','is_active']:['store_code','store_name','address','latitude','longitude','geofence_radius_m','is_active'];
 async function load(){setLoading(true);setError('');const {data,error}=await supabase.from(table).select('*').order(isProduct?'product_name':'store_name');if(error)setError(error.message);else setRows(data||[]);setLoading(false);}
 useEffect(()=>{load();},[type]);
 function reset(){setForm(isProduct?blankProduct:blankStore);setEditing(null);}
 function edit(row){setEditing(row.id);setForm(Object.fromEntries(columns.map(k=>[k,row[k]??(k==='is_active'?true:'')])));}
 async function save(e){e.preventDefault();setSaving(true);setError('');const payload={...form};for(const k of ['latitude','longitude','geofence_radius_m'])if(!isProduct)payload[k]=payload[k]===''?null:Number(payload[k]);const result=editing?await supabase.from(table).update(payload).eq('id',editing):await supabase.from(table).insert(payload);if(result.error)setError(result.error.message);else{onNotice?.(isProduct?'Product saved to Supabase.':'Store saved to Supabase.');reset();await load();}setSaving(false);}
 async function toggle(row){const {error}=await supabase.from(table).update({is_active:!row.is_active}).eq('id',row.id);if(error)setError(error.message);else await load();}
 return <div style={{display:'grid',gridTemplateColumns:'minmax(280px,0.8fr) minmax(420px,1.5fr)',gap:14,alignItems:'start'}}>
  <section className="card"><header><h3>{editing?'Edit':'Add'} {isProduct?'product':'store'}</h3></header>
   <form onSubmit={save} style={{display:'grid',gap:10}}>
    {columns.filter(k=>k!=='is_active').map(k=><label key={k} style={{display:'grid',gap:5,fontSize:9,color:'#718075',textTransform:'capitalize'}}>{k.replaceAll('_',' ')}<input required={['sku','product_name','store_code','store_name'].includes(k)} type={['latitude','longitude','geofence_radius_m'].includes(k)?'number':'text'} step={['latitude','longitude'].includes(k)?'any':'1'} value={form[k]??''} onChange={e=>setForm(v=>({...v,[k]:e.target.value}))} style={fieldStyle}/></label>)}
    <label style={{display:'flex',alignItems:'center',gap:8,fontSize:10,color:'#536157'}}><input type="checkbox" checked={!!form.is_active} onChange={e=>setForm(v=>({...v,is_active:e.target.checked}))}/> Active</label>
    {error&&<p style={{color:'#a33',fontSize:10,margin:0}}>{error}</p>}
    <div style={{display:'flex',gap:8}}><button style={buttonStyle} disabled={saving}>{saving?'Saving…':editing?'Update record':'Save record'}</button>{editing&&<button type="button" style={{...buttonStyle,background:'#e9eee8',color:'#405546'}} onClick={reset}>Cancel</button>}</div>
   </form>
   <p style={{fontSize:9,color:'#929d92',lineHeight:1.5}}>Only enter verified records. Coordinates and geofence radius are optional planning fields; confirm them before using attendance controls.</p>
  </section>
  <section className="card"><header><h3>Supabase {isProduct?'product catalogue':'store directory'}</h3><button style={{...buttonStyle,background:'#e9eee8',color:'#405546'}} onClick={load}>Refresh</button></header>
   {loading?<p style={{fontSize:11}}>Loading records…</p>:error?<p style={{color:'#a33',fontSize:10}}>{error}</p>:rows.length===0?<div className="emptyState"><b>No {isProduct?'products':'stores'} yet.</b><p>Add verified records using the form. This screen does not insert demo data.</p></div>:
   <div className="tableScroll"><table><thead><tr>{(isProduct?['sku','product_name','category','unit','is_active']:['store_code','store_name','address','is_active']).map(k=><th key={k}>{k.replaceAll('_',' ')}</th>)}<th>ACTIONS</th></tr></thead><tbody>{rows.map(row=><tr key={row.id}>{(isProduct?['sku','product_name','category','unit','is_active']:['store_code','store_name','address','is_active']).map(k=><td key={k}>{k==='is_active'?(row[k]?'Active':'Inactive'):row[k]||'—'}</td>)}<td><button onClick={()=>edit(row)} style={{border:0,background:'none',color:'#326947',cursor:'pointer',marginRight:8}}>Edit</button><button onClick={()=>toggle(row)} style={{border:0,background:'none',color:'#8b6542',cursor:'pointer'}}>{row.is_active?'Deactivate':'Activate'}</button></td></tr>)}</tbody></table></div>}
  </section>
 </div>;
}
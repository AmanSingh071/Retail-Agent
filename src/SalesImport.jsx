import React,{useState} from 'react';
import {supabase} from './lib/supabase';

function parseCSV(text){
 const rows=[];let row=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){const ch=text[i],next=text[i+1];if(ch==='"'){if(quoted&&next==='"'){cell+='"';i++;}else quoted=!quoted;}else if(ch===','&&!quoted){row.push(cell);cell='';}else if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&next==='\n')i++;row.push(cell);if(row.some(v=>v.trim()!==''))rows.push(row);row=[];cell='';}else cell+=ch;}
 row.push(cell);if(row.some(v=>v.trim()!==''))rows.push(row);
 if(rows.length<2)return {headers:[],records:[]};
 const headers=rows[0].map(v=>v.trim().replace(/^\uFEFF/,'').toLowerCase());
 return {headers,records:rows.slice(1).map(values=>Object.fromEntries(headers.map((h,i)=>[h,(values[i]??'').trim()])))};
}
const required=['sale_date','store_code','sku','units_sold','sales_value_inr'];
const DRAFT_KEY='retail-agent-sales-import-draft';
function readDraft(){try{return JSON.parse(sessionStorage.getItem(DRAFT_KEY)||'null');}catch{return null;}}
function writeDraft(value){try{sessionStorage.setItem(DRAFT_KEY,JSON.stringify(value));}catch{}}
export default function SalesImport({onNotice}){
 const [file,setFile]=useState(()=>readDraft()?.fileName||null),[preview,setPreview]=useState(()=>readDraft()?.preview||null),[checking,setChecking]=useState(false),[saving,setSaving]=useState(false),[result,setResult]=useState(()=>readDraft()?.result||null),[error,setError]=useState('');
 async function inspect(f){setFile(f?.name||null);setPreview(null);setResult(null);setError('');if(!f){sessionStorage.removeItem(DRAFT_KEY);return;}if(!f.name.toLowerCase().endsWith('.csv')){setError('Please upload a CSV file. For Excel, use Save As → CSV UTF-8 first.');return;}const parsed=parseCSV(await f.text());const missing=required.filter(k=>!parsed.headers.includes(k));if(missing.length){setError('Missing required columns: '+missing.join(', '));return;}setPreview(parsed);writeDraft({fileName:f.name,preview:parsed,result:null});}
 async function importRows(){if(!preview)return;setChecking(true);setError('');setResult(null);try{
  const [{data:stores,error:se},{data:products,error:pe}]=await Promise.all([supabase.from('stores').select('id,store_code,is_active'),supabase.from('products').select('id,sku,is_active')]);
  if(se||pe)throw new Error(se?.message||pe?.message);
  const storeMap=new Map((stores||[]).map(x=>[String(x.store_code).toLowerCase(),x]));
  const productMap=new Map((products||[]).map(x=>[String(x.sku).toLowerCase(),x]));
  const valid=[],issues=[];
  preview.records.forEach((r,i)=>{const line=i+2,st=storeMap.get((r.store_code||'').toLowerCase()),pr=productMap.get((r.sku||'').toLowerCase()),date=/^\d{4}-\d{2}-\d{2}$/.test(r.sale_date)&&!Number.isNaN(Date.parse(r.sale_date)),units=Number(r.units_sold),revenue=Number(r.sales_value_inr),why=[];
   if(!date)why.push('sale_date must be YYYY-MM-DD');if(!st)why.push('unknown store_code');else if(!st.is_active)why.push('store is inactive');if(!pr)why.push('unknown SKU');else if(!pr.is_active)why.push('product is inactive');if(!r.units_sold||!Number.isFinite(units)||units<=0)why.push('units_sold must be positive');if(r.sales_value_inr===''||!Number.isFinite(revenue)||revenue<0)why.push('sales_value_inr must be zero or greater');
   if(why.length)issues.push({line,reason:why.join('; ')});else valid.push({store_id:st.id,product_id:pr.id,sale_date:r.sale_date,units_sold:units,revenue,source_type:'csv_import'});
  });
  setResult({valid,issues});writeDraft({fileName:file,preview,result:{valid,issues}});if(valid.length===0){setChecking(false);return;}
 }catch(e){setError(e.message);}finally{setChecking(false);}}
 async function save(){if(!result?.valid?.length)return;setSaving(true);setError('');try{const {error}=await supabase.from('sales_daily').insert(result.valid);if(error)throw error;setResult(v=>{const next={...v,inserted:v.valid.length};writeDraft({fileName:file,preview,result:next});return next;});onNotice?.(result.valid.length+' sales rows saved to Supabase.');}catch(e){setError(e.message);}finally{setSaving(false);}}
 return <div style={{display:'grid',gap:14}}>
  <section className="card"><header><h3>Import store-wise sales CSV</h3></header>
   <p className="subtle">Required columns: sale_date, store_code, sku, units_sold, sales_value_inr. Dates must use YYYY-MM-DD. Store codes and SKUs must already exist and be active.</p>
   <label className="drop"><b>Select CSV file</b><small>CSV UTF-8 · Excel files: Save As CSV first</small><input type="file" accept=".csv,text/csv" onChange={e=>inspect(e.target.files?.[0])}/></label>
   {file&&<p className="subtle">Selected: {file}</p>}
   {error&&<div className="authError">{error}</div>}
   {preview&&<><p className="subtle">Parsed {preview.records.length} rows. Columns detected: {preview.headers.join(', ')}</p><div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button className="primary" disabled={checking||saving} onClick={importRows}>{checking?'Validating…':'Validate rows'}</button><button className="secondary" onClick={()=>{setFile(null);setPreview(null);setResult(null);sessionStorage.removeItem(DRAFT_KEY);}}>Clear</button></div></>}
  </section>
  {result&&<section className="card"><header><h3>Import validation</h3></header><div className="metrics" style={{gridTemplateColumns:'repeat(3,minmax(0,1fr))'}}><div className="metric"><small>VALID ROWS</small><strong>{result.valid.length}</strong></div><div className="metric"><small>INVALID ROWS</small><strong>{result.issues.length}</strong></div><div className="metric"><small>SAVED</small><strong>{result.inserted??0}</strong></div></div>
   {result.issues.length>0&&<div className="tableScroll"><table><thead><tr><th>CSV LINE</th><th>VALIDATION ISSUE</th></tr></thead><tbody>{result.issues.slice(0,100).map(x=><tr key={x.line}><td>{x.line}</td><td>{x.reason}</td></tr>)}</tbody></table></div>}
   <p className="subtle">Only valid rows are inserted. Each import creates new rows; check that the file has not already been imported to avoid duplicate sales.</p>
   {result.valid.length>0&&!result.inserted&&<button className="primary" disabled={saving} onClick={save}>{saving?'Saving…':'Save '+result.valid.length+' valid rows to Supabase'}</button>}
  </section>}
 </div>;
}
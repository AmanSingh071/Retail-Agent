import React,{useState} from 'react';
import * as XLSX from 'xlsx';
import {supabase} from './lib/supabase';

function parseCSV(text){
 const rows=[];let row=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){const ch=text[i],next=text[i+1];if(ch==='"'){if(quoted&&next==='"'){cell+='"';i++;}else quoted=!quoted;}else if(ch===','&&!quoted){row.push(cell);cell='';}else if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&next==='\n')i++;row.push(cell);if(row.some(v=>String(v).trim()!==''))rows.push(row);row=[];cell='';}else cell+=ch;}
 row.push(cell);if(row.some(v=>String(v).trim()!==''))rows.push(row);
 if(rows.length<2)return {headers:[],records:[]};
 const headers=rows[0].map(v=>String(v).trim().replace(/^\uFEFF/,'').toLowerCase());
 return {headers,records:rows.slice(1).map(values=>Object.fromEntries(headers.map((h,i)=>[h,String(values[i]??'').trim()])))};
}
const required=['sale_date','store_code','sku','units_sold','sales_value_inr'];
const DRAFT_KEY='retail-agent-sales-import-draft';
function readDraft(){try{return JSON.parse(sessionStorage.getItem(DRAFT_KEY)||'null');}catch{return null;}}
function writeDraft(value){try{sessionStorage.setItem(DRAFT_KEY,JSON.stringify(value));}catch{}}
function normalizeDate(value){
 if(value instanceof Date&&!Number.isNaN(value.getTime()))return value.toISOString().slice(0,10);
 const s=String(value??'').trim();
 if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;
 const m=s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
 if(m)return new Date(Date.UTC(Number(m[3]),Number(m[1])-1,Number(m[2]))).toISOString().slice(0,10);
 if(/^\d+(\.\d+)?$/.test(s)){const n=Number(s);if(n>20000&&n<80000){const d=XLSX.SSF.parse_date_code(n);if(d)return [d.y,String(d.m).padStart(2,'0'),String(d.d).padStart(2,'0')].join('-');}}
 return s;
}
function parseWorkbook(buffer){
 const wb=XLSX.read(buffer,{type:'array',cellDates:true});
 const requiredSet=new Set(required);
 let chosen=null,chosenName='';
 for(const name of wb.SheetNames){
  const rows=XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,defval:'',raw:true});
  const headers=(rows[0]||[]).map(v=>String(v).trim().replace(/^\uFEFF/,'').toLowerCase());
  if(required.every(k=>headers.includes(k))){chosen=rows;chosenName=name;break;}
 }
 if(!chosen)throw new Error('Could not find a worksheet with the required sales columns: '+required.join(', ')+'. Use the Sales_Daily sheet from the demo workbook.');
 const headers=chosen[0].map(v=>String(v).trim().replace(/^\uFEFF/,'').toLowerCase());
 const records=chosen.slice(1).filter(row=>row.some(v=>v!==''&&v!=null)).map(values=>Object.fromEntries(headers.map((h,i)=>[h,h==='sale_date'?normalizeDate(values[i]):String(values[i]??'').trim()])));
 return {headers,records,sheetName:chosenName};
}
export default function SalesImport({onNotice,onSaved}){
 const [file,setFile]=useState(()=>readDraft()?.fileName||null),[preview,setPreview]=useState(()=>readDraft()?.preview||null),[checking,setChecking]=useState(false),[saving,setSaving]=useState(false),[result,setResult]=useState(()=>readDraft()?.result||null),[error,setError]=useState('');
 async function inspect(f){
  setFile(f?.name||null);setPreview(null);setResult(null);setError('');
  if(!f){sessionStorage.removeItem(DRAFT_KEY);return;}
  try{
   const ext=f.name.toLowerCase().split('.').pop();
   let parsed;
   if(ext==='csv')parsed=parseCSV(await f.text());
   else if(['xlsx','xls'].includes(ext))parsed=parseWorkbook(await f.arrayBuffer());
   else throw new Error('Upload a CSV, XLSX or XLS workbook.');
   const missing=required.filter(k=>!parsed.headers.includes(k));
   if(missing.length)throw new Error('Missing required columns: '+missing.join(', '));
   if(!parsed.records.length)throw new Error('The selected worksheet contains no sales rows.');
   setPreview(parsed);writeDraft({fileName:f.name,preview:parsed,result:null});
  }catch(e){setError(e.message||'Unable to read this file.');}
 }
 async function importRows(){
  if(!preview)return;setChecking(true);setError('');setResult(null);
  try{
   const [{data:stores,error:se},{data:products,error:pe}]=await Promise.all([supabase.from('stores').select('id,store_code,is_active'),supabase.from('products').select('id,sku,is_active')]);
   if(se||pe)throw new Error(se?.message||pe?.message);
   const storeMap=new Map((stores||[]).map(x=>[String(x.store_code).toLowerCase(),x]));
   const productMap=new Map((products||[]).map(x=>[String(x.sku).toLowerCase(),x]));
   const valid=[],issues=[];
   preview.records.forEach((r,i)=>{const line=i+2,st=storeMap.get((r.store_code||'').toLowerCase()),pr=productMap.get((r.sku||'').toLowerCase()),date=/^\d{4}-\d{2}-\d{2}$/.test(r.sale_date)&&!Number.isNaN(Date.parse(r.sale_date)),units=Number(r.units_sold),revenue=Number(r.sales_value_inr),why=[];
    if(!date)why.push('sale_date must be YYYY-MM-DD');if(!st)why.push('unknown store_code');else if(!st.is_active)why.push('store is inactive');if(!pr)why.push('unknown SKU');else if(!pr.is_active)why.push('product is inactive');if(!r.units_sold||!Number.isFinite(units)||units<=0)why.push('units_sold must be positive');if(r.sales_value_inr===''||!Number.isFinite(revenue)||revenue<0)why.push('sales_value_inr must be zero or greater');
    if(why.length)issues.push({line,reason:why.join('; ')});else valid.push({store_id:st.id,product_id:pr.id,sale_date:r.sale_date,units_sold:units,revenue,source_type:'csv_import'});
   });
   setResult({valid,issues});writeDraft({fileName:file,preview,result:{valid,issues}});
  }catch(e){setError(e.message);}finally{setChecking(false);}
 }
 async function save(){
  if(!result?.valid?.length)return;setSaving(true);setError('');
  try{
   const {data:insertedRows,error}=await supabase.from('sales_daily').upsert(result.valid,{onConflict:'sale_date,store_id,product_id',ignoreDuplicates:true}).select('id');if(error)throw error;
   const {data:{user}}=await supabase.auth.getUser();
   await supabase.from('agent_activity_logs').insert({agent_name:'Sales Intake',action:'Sales file import',status:'completed',input_summary:{file_name:file,rows_validated:result.valid.length,rows_rejected:result.issues.length},output_summary:{rows_inserted:result.valid.length},created_by:user?.id});
   setResult(v=>{const next={...v,inserted:insertedRows?.length||0};writeDraft({fileName:file,preview,result:next});return next;});
   onNotice?.((insertedRows?.length||0)+' new sales rows saved; existing store/SKU/date records were skipped.');onSaved?.();
  }catch(e){setError(e.message);}finally{setSaving(false);}
 }
 return <div style={{display:'grid',gap:14}}>
  <section className="card"><header><h3>Import store-wise sales file</h3></header>
   <p className="subtle">Upload CSV, XLSX or XLS. The importer automatically finds a worksheet containing: sale_date, store_code, sku, units_sold, sales_value_inr. Dates must be YYYY-MM-DD. Store codes and SKUs must already exist and be active.</p>
   <label className="drop"><b>Select sales file</b><small>CSV UTF-8 · Excel workbook (.xlsx / .xls)</small><input type="file" accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" onChange={e=>inspect(e.target.files?.[0])}/></label>
   {file&&<p className="subtle">Selected: {file}{preview?.sheetName?' · Worksheet: '+preview.sheetName:''}</p>}
   {error&&<div className="authError">{error}</div>}
   {preview&&<><p className="subtle">Parsed {preview.records.length.toLocaleString('en-IN')} rows. Columns detected: {preview.headers.join(', ')}</p><div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button className="primary" disabled={checking||saving} onClick={importRows}>{checking?'Validating…':'Validate rows'}</button><button className="secondary" onClick={()=>{setFile(null);setPreview(null);setResult(null);setError('');sessionStorage.removeItem(DRAFT_KEY);}}>Clear</button></div></>}
  </section>
  {result&&<section className="card"><header><h3>Import validation</h3></header><div className="metrics" style={{gridTemplateColumns:'repeat(3,minmax(0,1fr))'}}><div className="metric"><small>VALID ROWS</small><strong>{result.valid.length.toLocaleString('en-IN')}</strong></div><div className="metric"><small>INVALID ROWS</small><strong>{result.issues.length.toLocaleString('en-IN')}</strong></div><div className="metric"><small>SAVED</small><strong>{result.inserted??0}</strong></div></div>
   {result.issues.length>0&&<div className="tableScroll"><table><thead><tr><th>ROW</th><th>VALIDATION ISSUE</th></tr></thead><tbody>{result.issues.slice(0,100).map(x=><tr key={x.line}><td>{x.line}</td><td>{x.reason}</td></tr>)}</tbody></table></div>}
   <p className="subtle">Only valid rows are inserted. Each import creates new rows; the app does not deduplicate sales. Do not import the same workbook twice.</p>
   {result.valid.length>0&&!result.inserted&&<button className="primary" disabled={saving} onClick={save}>{saving?'Saving…':'Save '+result.valid.length.toLocaleString('en-IN')+' valid rows to Supabase'}</button>}
  </section>}
 </div>;
}

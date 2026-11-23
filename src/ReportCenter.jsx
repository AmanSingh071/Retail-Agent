import React from 'react';

function download(name,headers,rows){
 const quote=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
 const csv=[headers,...rows].map(r=>r.map(quote).join(',')).join('\r\n');
 const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);
}
export default function ReportCenter({sales,stores,products,batches,loading,error}){
 const salesRows=sales.map(x=>[x.sale_date,stores.find(s=>s.id===x.store_id)?.store_name||x.store_id,products.find(p=>p.id===x.product_id)?.sku||x.product_id,x.units_sold,x.revenue,x.source_type]);
 const inventoryRows=batches.map(x=>[stores.find(s=>s.id===x.store_id)?.store_name||x.store_id,products.find(p=>p.id===x.product_id)?.sku||x.product_id,x.batch_code,x.quantity,x.received_date,x.expiry_date]);
 return <div style={{display:'grid',gap:14}}>
  <div className="welcome"><div><small>LIVE SUPABASE DATA</small><h2>Operational data exports</h2><p>Download the current sales and inventory records for review.</p></div></div>
  {error&&<div className="authError">{error}</div>}
  <div className="grid">
   <section className="card"><header><h3>Sales transactions export</h3></header><p className="subtle">Exports all sales rows currently loaded from Supabase, with store and SKU labels.</p><strong>{loading?'Loading…':sales.length.toLocaleString('en-IN')+' rows'}</strong><button className="primary wide" disabled={loading||!sales.length} onClick={()=>download('retail-agent-sales.csv',['sale_date','store_name','sku','units_sold','revenue_inr','source_type'],salesRows)}>Download sales CSV</button></section>
   <section className="card"><header><h3>Inventory batch export</h3></header><p className="subtle">Exports recorded inventory batches, quantities, received dates and expiry dates.</p><strong>{loading?'Loading…':batches.length.toLocaleString('en-IN')+' batches'}</strong><button className="primary wide" disabled={loading||!batches.length} onClick={()=>download('retail-agent-inventory.csv',['store_name','sku','batch_code','quantity','received_date','expiry_date'],inventoryRows)}>Download inventory CSV</button></section>
  </div>
  <section className="card"><h3>Email/PDF delivery status</h3><p className="subtle">Automated PDF email delivery is not enabled in this deployment. It requires a deployed Supabase Edge Function, a server-side email provider secret, and a verified sender domain. No email is sent by these export buttons.</p></section>
 </div>;
}

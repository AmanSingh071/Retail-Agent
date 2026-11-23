"""Generate reproducible four-store synthetic data; clearly not company actuals."""
from pathlib import Path
import pandas as pd, numpy as np
from datetime import timedelta
ROOT=Path(__file__).parent; DATA=ROOT/'data'; DATA.mkdir(exist_ok=True)
rng=np.random.default_rng(42)
products=pd.DataFrame([
 ('SKU001','Cow Milk 500ml','FRESH',2,140),('SKU002','A2 Milk 500ml','FRESH',2,90),('SKU003','Buffalo Milk 500ml','FRESH',2,70),('SKU004','Curd 500g','FRESH',5,65),('SKU005','Paneer 200g','FRESH',5,40),('SKU006','Ghee 500ml','FOOD',180,22),('SKU007','Butter 200g','FRESH',14,28),('SKU008','Cheese 200g','FOOD',21,20),('SKU009','Buttermilk 250ml','FRESH',3,38),('SKU010','Ice Cream 500ml','FOOD',30,24),('SKU011','Toned Milk 500ml','FRESH',2,110),('SKU012','Probiotic Curd 400g','FRESH',7,30),('SKU013','A2 Paneer 200g','FRESH',5,22),('SKU014','Organic Jaggery 500g','FOOD',180,35),('SKU015','Cold Pressed Oil 1L','FOOD',180,20)],columns=['sku','product_name','division','shelf_life_days','capacity'])
products['is_synthetic']=True;products.to_csv(DATA/'products.csv',index=False)
stores=[('WF01','Whitefield Central',1.0),('WF02','ITPL Main Road',.91),('WF03','Hope Farm',.83),('WF04','Kadugodi',.76)]
festivals={'2025-12-25':'Christmas','2026-01-14':'Makar Sankranti','2026-01-26':'Republic Day','2026-03-04':'Holi','2026-03-19':'Ugadi','2026-04-03':'Good Friday','2026-04-14':'Tamil New Year','2026-05-01':'May Day','2026-08-15':'Independence Day','2026-08-28':'Onam','2026-09-14':'Ganesh Chaturthi','2026-10-02':'Gandhi Jayanti','2026-10-20':'Dussehra','2026-11-08':'Diwali','2026-11-24':'Kartik Purnima'}
end=pd.Timestamp('2026-11-23');start=end-pd.Timedelta(days=364); dates=pd.date_range(start,end,freq='D')
sales=[];stocks=[];batches=[];attendance=[]
for si,(store,name,mult) in enumerate(stores):
 for day in dates:
  weekend=1.32 if day.dayofweek>=5 else 1.0;festival=1.45 if day.strftime('%Y-%m-%d') in festivals else 1.0;season=1+.10*np.sin(day.month*np.pi/6)+.035*np.cos((day-start).days/27)
  total=max(1,int((76-si*6)*mult*weekend*festival*season*rng.uniform(.90,1.10)))
  shares=np.array([.14,.09,.07,.09,.07,.03,.04,.025,.05,.025,.09,.03,.025,.015,.01]);units=rng.multinomial(total,shares/shares.sum())
  for p,u in zip(products.itertuples(),units):
   price=75 if p.division=='FRESH' else 230;sales.append((store,p.sku,day.date(),int(u),round(u*price,2),weekend>1,festivals.get(day.strftime('%Y-%m-%d'),''),True))
   stocks.append((store,p.sku,day.date(),max(0,int(p.capacity*.65-u)),int(u),True))
 for p in products.itertuples():
  for k in range(8):
   rec=end-pd.Timedelta(days=k*9+2);exp=rec+pd.Timedelta(days=int(p.shelf_life_days));qty=max(0,int(p.capacity*rng.uniform(.2,.8)))
   batches.append((store,p.sku,f'{store}-{p.sku}-{k+1}',rec.date(),exp.date(),qty,True))
 for d in pd.date_range(end-pd.Timedelta(days=30),end,freq='D'):
  attendance.append((store,f'EMP-{si+1:02d}',d.date(),bool(rng.random()>.04),True))
cols=['store_code','sku','sale_date','units_sold','sales_value_inr','weekend_flag','festival_name','is_synthetic'];pd.DataFrame(sales,columns=cols).to_csv(DATA/'synthetic_sales_1year.csv',index=False)
pd.DataFrame(stocks,columns=['store_code','sku','date','estimated_opening_stock','units_sold','is_synthetic']).to_csv(DATA/'synthetic_inventory_daily_1year.csv',index=False)
pd.DataFrame(batches,columns=['store_code','sku','batch_code','received_date','expiry_date','quantity_remaining','is_synthetic']).to_csv(DATA/'current_expiry_lots.csv',index=False)
pd.DataFrame(attendance,columns=['store_code','employee_code','attendance_date','present','is_synthetic']).to_csv(DATA/'synthetic_attendance_31days.csv',index=False)
prov={'source_file':'ak(1).xlsx','source_scope':'One store division aggregates only; generated SKU/store/batch splits are assumptions','synthetic_period_start':str(start.date()),'synthetic_period_end':str(end.date()),'synthetic_stores':4,'synthetic_skus':len(products),'weekend_uplift_assumption':1.32,'festival_uplift_assumption':1.45,'is_synthetic':True};import json;(DATA/'data_provenance.json').write_text(json.dumps(prov,indent=2))
print('Wrote synthetic year:',len(sales),'sales rows;',len(stocks),'inventory rows;',len(batches),'batch rows;',len(attendance),'attendance rows')

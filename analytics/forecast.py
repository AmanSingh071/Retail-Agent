import argparse, warnings
import numpy as np, pandas as pd
from statsmodels.tsa.holtwinters import ExponentialSmoothing
from statsmodels.tsa.arima.model import ARIMA
from sklearn.metrics import mean_absolute_error
warnings.filterwarnings('ignore')

def wape(y,p):
 d=np.abs(y).sum(); return float(np.abs(y-p).sum()/d*100) if d else float('nan')

def forecast_one(y,h):
 y=pd.Series(y,dtype=float).asfreq('D').interpolate().fillna(0)
 if len(y)<35: raise ValueError('At least 35 daily observations are required for a meaningful demo benchmark.')
 split=max(21,int(len(y)*.8)); train,test=y.iloc[:split],y.iloc[split:]
 if len(test)<7: test=y.iloc[-7:];train=y.iloc[:-7]
 preds={}
 preds['Seasonal naive (7d)']=np.resize(train.iloc[-7:].values,len(test))
 preds['Moving average (7d)']=np.repeat(train.iloc[-7:].mean(),len(test))
 for label,func in [
  ('Holt-Winters',lambda:ExponentialSmoothing(train,trend='add',seasonal='add',seasonal_periods=7).fit().forecast(len(test))),
  ('ARMA(2,1)',lambda:ARIMA(train,order=(2,0,1)).fit().forecast(len(test))),
  ('ARIMA(2,1,2)',lambda:ARIMA(train,order=(2,1,2)).fit().forecast(len(test))),
  ('SARIMA(1,1,1)x(1,1,1,7)',lambda:ARIMA(train,order=(1,1,1),seasonal_order=(1,1,1,7)).fit().forecast(len(test)))]:
  try: preds[label]=np.maximum(0,np.asarray(func()))
  except Exception: pass
 scores=[]
 for label,p in preds.items():
  scores.append({'model':label,'MAE':mean_absolute_error(test,p),'WAPE_pct':wape(test.values,np.asarray(p))})
 scores=sorted(scores,key=lambda x:x['WAPE_pct'])
 best=scores[0]
 base=min(scores,key=lambda x:x['WAPE_pct'] if x['model'] in ('Seasonal naive (7d)','Moving average (7d)') else float('inf'))
 selected=best if best['WAPE_pct']<base['WAPE_pct'] else base
 fit=ARIMA(y,order=(1,1,1)).fit() if selected['model'].startswith('ARIMA') else None
 if selected['model']=='Seasonal naive (7d)': future=np.resize(y.iloc[-7:].values,h)
 elif selected['model']=='Moving average (7d)': future=np.repeat(y.iloc[-7:].mean(),h)
 elif selected['model']=='Holt-Winters': future=np.maximum(0,ExponentialSmoothing(y,trend='add',seasonal='add',seasonal_periods=7).fit().forecast(h).values)
 elif selected['model']=='ARMA(2,1)': future=np.maximum(0,ARIMA(y,order=(2,0,1)).fit().forecast(h).values)
 elif selected['model']=='ARIMA(2,1,2)': future=np.maximum(0,ARIMA(y,order=(2,1,2)).fit().forecast(h).values)
 else: future=np.maximum(0,ARIMA(y,order=(1,1,1),seasonal_order=(1,1,1,7)).fit().forecast(h).values)
 return pd.DataFrame(scores),selected,pd.Series(future)

if __name__=='__main__':
 ap=argparse.ArgumentParser();ap.add_argument('--store',default='WF01');ap.add_argument('--sku',default='SKU001');ap.add_argument('--horizon',type=int,default=14);args=ap.parse_args()
 p='data/synthetic_sales_1year.csv';df=pd.read_csv(p,parse_dates=['sale_date']); d=df[(df.store_code==args.store)&(df.sku==args.sku)].sort_values('sale_date')
 if d.empty: raise SystemExit('No matching store/SKU series. Check data/synthetic_sales_1year.csv.')
 y=d.set_index('sale_date').units_sold.asfreq('D').fillna(0); scores,selected,future=forecast_one(y,args.horizon)
 print(scores.to_string(index=False));print('\nSelected:',selected);print('\nForecast:\n',future.round(1).to_string(index=False));
 lead=2;lt=y.tail(28).std()*np.sqrt(lead); safety=1.65*lt;demand=future.head(lead).sum();print(f'\nSafety buffer (z=1.65, assumed lead time {lead}d): {safety:.1f}');print(f'Reorder trigger (lead-time demand + buffer): {demand+safety:.1f} units')

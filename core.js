const Core={
today(){const d=new Date();return new Date(d.getFullYear(),d.getMonth(),d.getDate())},
parse(s){const[y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)},
iso(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')},
days(exp,now){return Math.round((Core.parse(exp)-(now||Core.today()))/864e5)},
status(n){return n>30?'hijau':n>=8?'kuning':n>=1?'oranye':n===0?'merah':'tua'},
reduce(b,q){q=Number(q);if(!(q>0))throw new Error('Jumlah harus lebih dari 0');if(q>b.qty)throw new Error('Jumlah melebihi sisa stok ('+b.qty+')');return{...b,qty:b.qty-q}},
isLoss(r){return r==='kedaluwarsa'||r==='rusak'},
loss(logs){return logs.filter(l=>Core.isLoss(l.reason)).reduce((s,l)=>s+l.qty*l.cost,0)},
validBackup(o){const D=/^\d{4}-\d{2}-\d{2}$/;if(!o||typeof o!=='object'||o.app!=='warung-expired')return'Bukan file backup Warung Expired';
for(const k of['products','batches','logs'])if(!Array.isArray(o[k]))return'Data "'+k+'" tidak ada';
const ids=new Set();for(const p of o.products){if(!p||!p.id||!p.name||!(Number(p.cost)>=0))return'Data produk tidak valid';ids.add(p.id)}
for(const b of o.batches)if(!b||!b.id||!ids.has(b.pid)||!D.test(b.exp)||!(Number(b.qty)>=0)||!(Number(b.cost)>=0))return'Data batch tidak valid';
for(const l of o.logs)if(!l||!l.id||!(Number(l.qty)>0)||!l.reason||!D.test(l.date))return'Riwayat stok tidak valid';return null}};
if(typeof module!=='undefined')module.exports=Core;

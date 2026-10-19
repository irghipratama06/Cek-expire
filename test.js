// Jalankan: node test.js  (menguji logika murni di core.js)
const C=require('./core.js'),a=require('assert');
const t=new Date(2026,9,20);const d=n=>C.iso(new Date(2026,9,20+n));
a.equal(C.days(d(0),t),0);a.equal(C.days(d(-3),t),-3);a.equal(C.days(d(45),t),45);
[[31,'hijau'],[30,'kuning'],[8,'kuning'],[7,'oranye'],[1,'oranye'],[0,'merah'],[-1,'tua']].forEach(([n,s])=>a.equal(C.status(n),s,n));
const A={id:'A',qty:20},B={id:'B',qty:30};const A2=C.reduce(A,5);
a.equal(A2.qty,15);a.equal(B.qty,30);a.equal(A.qty,20);
a.throws(()=>C.reduce(A,21));a.throws(()=>C.reduce(A,0));a.throws(()=>C.reduce(A,-1));
a.equal(C.reduce(A,20).qty,0);
const logs=[{reason:'terjual',qty:10,cost:3000},{reason:'kedaluwarsa',qty:2,cost:3000},{reason:'rusak',qty:1,cost:5000},{reason:'penyesuaian',qty:4,cost:3000}];
a.equal(C.loss(logs),11000);
const ok={app:'warung-expired',products:[{id:'p',name:'x',cost:1}],batches:[{id:'b',pid:'p',exp:'2026-11-10',qty:1,cost:1}],logs:[{id:'l',qty:1,reason:'rusak',date:'2026-10-01'}]};
a.equal(C.validBackup(ok),null);a.equal(C.validBackup(JSON.parse(JSON.stringify(ok))),null);
a.ok(C.validBackup({}));a.ok(C.validBackup({...ok,batches:[{id:'b',pid:'zzz',exp:'2026-11-10',qty:1,cost:1}]}));
a.ok(C.validBackup({...ok,batches:[{id:'b',pid:'p',exp:'10/11/2026',qty:1,cost:1}]}));
console.log('Semua uji logika lulus');

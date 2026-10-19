const $=s=>document.querySelector(s);
const h=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rp=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n||0);
const tgl=s=>Core.parse(s).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const PAGES=[['dash','Dashboard','📊','Dashboard'],['produk','Produk','📦','Produk'],['batch','Stok & Batch','🗂️','Stok'],['scan','Scan Barcode','📷','Scan'],['ingat','Pengingat','⏰','Pengingat'],['laporan','Laporan Kerugian','📉','Kerugian'],['set','Backup & Pengaturan','⚙️','Backup']];
let S={p:[],b:[],l:[]},page='dash',q='',flt='',da='',dz='',stream=null,scanning=false;
const load=async()=>{[S.p,S.b,S.l]=await Promise.all([DB.all('products'),DB.all('batches'),DB.all('logs')])};
const refresh=async()=>{await load();render()};
const prod=id=>S.p.find(x=>x.id===id);
const stock=id=>S.b.filter(b=>b.pid===id).reduce((s,b)=>s+b.qty,0);
const byExp=(a,b)=>a.exp.localeCompare(b.exp);
function toast(m,ok=true){const t=$('#toast');t.textContent=m;t.className='show '+(ok?'ok':'err');clearTimeout(toast.t);toast.t=setTimeout(()=>t.className='',3000)}
const badge=b=>{const n=Core.days(b.exp);return`<span class="badge ${Core.status(n)}">${n<0?'Lewat '+(-n)+' hari':n===0?'Hari ini':n+' hari lagi'}</span>`};
const row=b=>{const p=prod(b.pid)||{};return`<div class="it"><div><b>${h(p.name)}</b><small>${b.code?'Batch '+h(b.code)+' · ':''}${b.qty} ${h(p.unit)} · ${tgl(b.exp)}</small></div>${badge(b)}</div>`};
function go(p){stopScan();page=p;q='';flt='';render();scrollTo(0,0)}
function render(){document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('on',b.dataset.p===page));const P=PAGES.find(x=>x[0]===page);$('#main').innerHTML=`<h2>${P[1]}</h2>`+V[page]()}
function form(title,fields,ok){const d=$('#dlg');
d.innerHTML=`<form id="f"><h3>${h(title)}</h3>${fields.map(f=>`<label>${h(f.l)}${f.t==='select'?`<select name="${f.k}">${f.o.map(o=>`<option value="${h(o[0])}" ${o[0]==f.v?'selected':''}>${h(o[1])}</option>`).join('')}</select>`:`<input name="${f.k}" type="${f.t||'text'}" value="${h(f.v??'')}" ${f.r?'required':''} ${f.t==='number'?'min="0" step="any" inputmode="decimal"':''}>`}</label>`).join('')}<div class="row"><button type="button" class="btn ghost" onclick="$('#dlg').close()">Batal</button><button class="btn">Simpan</button></div></form>`;
d.showModal();$('#f').onsubmit=async e=>{e.preventDefault();const v=Object.fromEntries(new FormData(e.target));try{await ok(v);d.close();await refresh()}catch(x){toast(x.message||'Gagal menyimpan',false)}}}
/* ---------- Produk & batch ---------- */
function fProduk(p={},bc=''){const e=!!p.id;
form(e?'Edit Produk':'Tambah Produk',[{k:'name',l:'Nama produk',v:p.name,r:1},{k:'cat',l:'Kategori',v:p.cat},{k:'barcode',l:'Barcode',v:p.barcode||bc},{k:'unit',l:'Satuan (bungkus, botol, kaleng…)',v:p.unit||'bungkus'},{k:'cost',l:'Harga modal per unit (Rp)',t:'number',v:p.cost,r:1},...(e?[]:[{k:'qty',l:'Stok awal (opsional)',t:'number'},{k:'exp',l:'Kedaluwarsa stok awal',t:'date'}])],
async v=>{const o={id:p.id||uid(),name:v.name.trim(),cat:v.cat.trim()||'Lainnya',barcode:v.barcode.trim(),unit:v.unit.trim()||'unit',cost:+v.cost};
if(o.barcode&&S.p.some(x=>x.barcode===o.barcode&&x.id!==o.id))throw new Error('Barcode sudah dipakai produk lain');
const w={products:[o]};if(!e&&+v.qty>0){if(!v.exp)throw new Error('Isi tanggal kedaluwarsa stok awal');w.batches=[{id:uid(),pid:o.id,inDate:Core.iso(Core.today()),exp:v.exp,initQty:+v.qty,qty:+v.qty,cost:o.cost,code:''}]}
await DB.save(w);toast('Produk disimpan')})}
const editP=id=>fProduk(prod(id));
function fBatch(pid,id){const b=id?S.b.find(x=>x.id===id):{},p=prod(pid);
form((id?'Edit':'Tambah')+' batch: '+p.name,[{k:'qty',l:id?'Sisa stok':'Jumlah masuk',t:'number',v:b.qty,r:1},{k:'exp',l:'Tanggal kedaluwarsa',t:'date',v:b.exp,r:1},{k:'inDate',l:'Tanggal masuk',t:'date',v:b.inDate||Core.iso(Core.today()),r:1},{k:'cost',l:'Harga modal/unit (Rp)',t:'number',v:b.cost??p.cost,r:1},{k:'code',l:'Kode batch / catatan (opsional)',v:b.code}],
async v=>{const n=+v.qty;if(!(n>=0)||(!id&&n<=0))throw new Error('Jumlah tidak valid');
const o=id?{...b,qty:n,initQty:Math.max(b.initQty,n),exp:v.exp,inDate:v.inDate,cost:+v.cost,code:v.code.trim()}:{id:uid(),pid,inDate:v.inDate,exp:v.exp,initQty:n,qty:n,cost:+v.cost,code:v.code.trim()};
await DB.save({batches:[o]});toast('Batch disimpan')})}
const editB=id=>fBatch(S.b.find(x=>x.id===id).pid,id);
function pilihProduk(){if(!S.p.length)return toast('Tambah produk dulu',false);form('Tambah stok untuk produk',[{k:'pid',l:'Produk',t:'select',v:S.p[0].id,o:S.p.map(p=>[p.id,p.name])}],async v=>{setTimeout(()=>fBatch(v.pid),60)})}
function keluar(id,reason='terjual'){const b=S.b.find(x=>x.id===id),p=prod(b.pid);
form('Kurangi stok: '+p.name,[{k:'qty',l:`Jumlah keluar (sisa ${b.qty} ${p.unit})`,t:'number',r:1},{k:'reason',l:'Alasan',t:'select',v:reason,o:[['terjual','Terjual'],['rusak','Rusak'],['kedaluwarsa','Dibuang karena kedaluwarsa'],['penyesuaian','Penyesuaian stok']]}],
async v=>{const nb=Core.reduce(b,v.qty);await DB.save({batches:[nb],logs:[{id:uid(),bid:b.id,pid:b.pid,pname:p.name,unit:p.unit,qty:+v.qty,reason:v.reason,date:Core.iso(Core.today()),exp:b.exp,cost:b.cost,code:b.code}]});toast('Stok dikurangi')})}
async function hapusP(id){const p=prod(id);if(!confirm(`Hapus "${p.name}" beserta semua batchnya? Riwayat tetap tersimpan.`))return;await DB.del('batches',S.b.filter(b=>b.pid===id).map(b=>b.id));await DB.del('products',[id]);toast('Produk dihapus');refresh()}
async function hapusB(id){if(!confirm('Hapus batch ini?'))return;await DB.del('batches',[id]);toast('Batch dihapus');refresh()}
/* ---------- Halaman ---------- */
function vDash(){const act=S.b.filter(b=>b.qty>0).sort(byExp),D=b=>Core.days(b.exp);
const n30=act.filter(b=>D(b)>=0&&D(b)<=30).length,ex=act.filter(b=>D(b)<0).length,hari=act.filter(b=>D(b)===0),chk=act.filter(b=>D(b)<=7);
const cats={};S.b.forEach(b=>{const c=prod(b.pid)?.cat||'-';cats[c]=(cats[c]||0)+b.qty});
const L=(a,m)=>a.length?a.map(row).join(''):`<p class="muted">${m}</p>`;
return`<div class="grid"><div class="card stat">Jenis produk<b>${S.p.length}</b></div><div class="card stat">Total stok<b>${S.b.reduce((s,b)=>s+b.qty,0)}</b></div><div class="card stat">Kedaluwarsa ≤30 hari<b>${n30}</b></div><div class="card stat">Sudah kedaluwarsa<b>${ex}</b></div><div class="card stat">Kerugian terkonfirmasi<b>${rp(Core.loss(S.l))}</b></div></div>
<div class="row"><button class="btn" onclick="pilihProduk()">+ Tambah Stok</button><button class="btn ghost" onclick="go('laporan')">Laporan Kerugian</button></div>
<div class="card"><b>⚠️ Perlu segera diperiksa (≤7 hari / lewat)</b>${L(chk,'Tidak ada.')}</div>
<div class="card"><b>🔔 Kedaluwarsa hari ini</b>${L(hari,'Tidak ada.')}</div>
<div class="card"><b>📅 Terdekat kedaluwarsa</b>${L(act.slice(0,5),'Belum ada stok.')}</div>
<div class="card"><b>Stok per kategori</b>${Object.entries(cats).map(([c,n])=>`<div class="it"><span>${h(c)}</span><b>${n}</b></div>`).join('')||'<p class="muted">Belum ada data. Coba "Isi Data Demo" di Backup & Pengaturan.</p>'}</div>`}
const sc=v=>{q=v;$('#list').innerHTML=(page==='produk'?lProduk:lBatch)()};
function vProduk(){return`<div class="tools"><input placeholder="Cari nama / kategori / barcode" oninput="sc(this.value)"><button class="btn" onclick="fProduk()">+ Produk</button></div><div id="list">${lProduk()}</div>`}
function lProduk(){const L=S.p.filter(p=>(p.name+p.cat+p.barcode).toLowerCase().includes(q.toLowerCase()));
return L.map(p=>`<div class="card"><b>${h(p.name)}</b><small class="muted"> · ${h(p.cat)}</small><div class="muted">Barcode: ${h(p.barcode)||'-'} · Modal ${rp(p.cost)}/${h(p.unit)}</div><div>Stok: <b>${stock(p.id)}</b> ${h(p.unit)} · ${S.b.filter(b=>b.pid===p.id).length} batch</div><div class="row"><button class="btn sm" onclick="fBatch('${p.id}')">+ Batch</button><button class="btn sm ghost" onclick="editP('${p.id}')">Edit</button><button class="btn sm danger" onclick="hapusP('${p.id}')">Hapus</button></div></div>`).join('')||'<p class="muted">Belum ada produk.</p>'}
function vBatch(){return`<div class="tools"><input placeholder="Cari produk / kode batch" oninput="sc(this.value)"><select onchange="flt=this.value;sc(q)"><option value="">Semua</option><option value="hijau">Aman</option><option value="kuning">8–30 hari</option><option value="oranye">1–7 hari</option><option value="merah">Hari ini</option><option value="tua">Kedaluwarsa</option><option value="habis">Stok habis</option></select></div><div id="list">${lBatch()}</div>`}
function lBatch(){const L=S.b.filter(b=>{const p=prod(b.pid)||{};if(!(p.name+b.code).toLowerCase().includes(q.toLowerCase()))return false;if(flt==='habis')return b.qty===0;if(!flt)return true;return b.qty>0&&Core.status(Core.days(b.exp))===flt}).sort((a,b)=>(b.qty>0)-(a.qty>0)||byExp(a,b));
return L.map(b=>{const p=prod(b.pid)||{};return`<div class="card ${b.qty?'':'off'}"><div class="it" style="border:0"><div><b>${h(p.name)}</b><small>${b.code?'Batch '+h(b.code)+' · ':''}Masuk ${tgl(b.inDate)} · Kedaluwarsa ${tgl(b.exp)}</small></div>${b.qty?badge(b):'<span class="badge hijau">Habis</span>'}</div><div>Sisa <b>${b.qty}</b> / ${b.initQty} ${h(p.unit)} · Modal ${rp(b.cost)}</div><div class="row">${b.qty?`<button class="btn sm" onclick="keluar('${b.id}')">Kurangi</button>`:''}<button class="btn sm ghost" onclick="editB('${b.id}')">Edit</button><button class="btn sm danger" onclick="hapusB('${b.id}')">Hapus</button></div></div>`}).join('')||'<p class="muted">Tidak ada batch.</p>'}
function vScan(){return`<div class="card"><video id="vid" playsinline muted hidden></video><div class="row"><button class="btn" onclick="startScan()">📷 Scan Barcode</button><button class="btn ghost" onclick="stopScan()">Stop</button></div><p id="scmsg" class="muted">Membaca EAN-13, EAN-8, UPC, Code 128 (jika browser mendukung). Barcode tidak otomatis memberi nama/harga: isi sendiri untuk produk baru.</p><label>Atau ketik barcode manual<input id="man" inputmode="numeric"></label><button class="btn" onclick="hasil($('#man').value.trim())">Cari / Tambah</button></div>`}
async function startScan(){const m=$('#scmsg');if(!('BarcodeDetector' in window)){m.textContent='Browser ini belum mendukung pemindai barcode. Pakai Chrome Android terbaru atau ketik barcode manual.';return}
try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}})}catch{m.textContent='Izin kamera ditolak atau kamera tidak tersedia. Gunakan input manual.';return}
const v=$('#vid');v.srcObject=stream;v.hidden=false;await v.play();m.textContent='Arahkan kamera ke barcode…';
const det=new BarcodeDetector({formats:['ean_13','ean_8','upc_a','upc_e','code_128']});scanning=true;
const tick=async()=>{if(!scanning)return;try{const r=await det.detect(v);if(r.length){stopScan();hasil(r[0].rawValue);return}}catch{}requestAnimationFrame(tick)};tick()}
function stopScan(){scanning=false;stream?.getTracks().forEach(t=>t.stop());stream=null;const v=$('#vid');if(v)v.hidden=true}
function hasil(c){if(!c)return toast('Barcode kosong',false);$('#man')&&($('#man').value=c);const p=S.p.find(x=>x.barcode===c);if(p){if(confirm(`"${p.name}" sudah terdaftar. Tambah batch baru?`))fBatch(p.id)}else fProduk({},c)}
function vIngat(){const act=S.b.filter(b=>b.qty>0).sort(byExp),D=b=>Core.days(b.exp);
const G=[['🟥 Sudah kedaluwarsa',d=>d<0],['🟥 Kedaluwarsa hari ini',d=>d===0],['🟧 H-1 sampai H-7',d=>d>=1&&d<=7],['🟨 H-8 sampai H-14',d=>d>=8&&d<=14],['🟨 H-15 sampai H-30',d=>d>=15&&d<=30]];
return G.map(([t,f])=>{const a=act.filter(b=>f(D(b)));return`<div class="card"><b>${t} (${a.length})</b>${a.map(row).join('')||'<p class="muted">Kosong.</p>'}</div>`}).join('')+`<div class="card"><b>Prioritas jual (FEFO: kedaluwarsa terdekat dulu)</b>${act.slice(0,10).map((b,i)=>`<div class="it"><div><b>${i+1}. ${h(prod(b.pid)?.name)}</b><small>${b.qty} ${h(prod(b.pid)?.unit)} · ${tgl(b.exp)}</small></div>${badge(b)}</div>`).join('')||'<p class="muted">Belum ada stok.</p>'}</div>`}
const lapL=()=>S.l.filter(l=>Core.isLoss(l.reason)&&(!da||l.date>=da)&&(!dz||l.date<=dz)).sort((a,b)=>b.date.localeCompare(a.date));
function vLap(){return`<div class="card"><div class="row"><label style="flex:1">Dari<input type="date" value="${da}" onchange="da=this.value;lapR()"></label><label style="flex:1">Sampai<input type="date" value="${dz}" onchange="dz=this.value;lapR()"></label></div></div><div id="list">${lLap()}</div>`}
const lapR=()=>{$('#list').innerHTML=lLap()};
function lLap(){const L=lapL(),sum=r=>L.filter(l=>l.reason===r).reduce((s,l)=>s+l.qty*l.cost,0),per={};L.forEach(l=>per[l.pname]=(per[l.pname]||0)+l.qty*l.cost);
const pend=S.b.filter(b=>b.qty>0&&Core.days(b.exp)<0);
return`<div class="grid"><div class="card stat">Dibuang (kedaluwarsa)<b>${rp(sum('kedaluwarsa'))}</b></div><div class="card stat">Rusak<b>${rp(sum('rusak'))}</b></div></div><div class="row"><button class="btn" onclick="csv()">⬇ Ekspor CSV</button></div>
${pend.length?`<div class="card"><b>Menunggu konfirmasi (belum dihitung rugi)</b>${pend.map(b=>`<div class="it"><div><b>${h(prod(b.pid)?.name)}</b><small>${b.qty} unit · ${tgl(b.exp)} · potensi ${rp(b.qty*b.cost)}</small></div><button class="btn sm danger" onclick="keluar('${b.id}','kedaluwarsa')">Buang</button></div>`).join('')}</div>`:''}
<div class="card"><b>Total kerugian per produk</b>${Object.entries(per).map(([n,v])=>`<div class="it"><span>${h(n)}</span><b>${rp(v)}</b></div>`).join('')||'<p class="muted">Belum ada data.</p>'}</div>
${L.map(l=>`<div class="card"><b>${h(l.pname)}</b>${l.code?' · Batch '+h(l.code):''} <span class="badge ${l.reason==='rusak'?'oranye':'tua'}">${l.reason}</span><div class="muted">${l.qty} ${h(l.unit)} × ${rp(l.cost)} · Kedaluwarsa ${tgl(l.exp)} · Dibuang ${tgl(l.date)}</div><b>${rp(l.qty*l.cost)}</b></div>`).join('')}`}
function dl(name,text,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;document.body.appendChild(a);a.click();a.remove()}
function csv(){const E=v=>'"'+String(v??'').replace(/"/g,'""')+'"',R=[['Produk','Batch','Alasan','Jumlah','Satuan','Tgl Kedaluwarsa','Tgl Dibuang','Harga Modal','Total']];
lapL().forEach(l=>R.push([l.pname,l.code,l.reason,l.qty,l.unit,l.exp,l.date,l.cost,l.qty*l.cost]));dl('laporan-kerugian.csv','\ufeff'+R.map(r=>r.map(E).join(',')).join('\r\n'),'text/csv')}
function vSet(){return`<div class="card"><b>Status</b><p class="muted">${navigator.onLine?'Online':'Offline'} · semua data tersimpan di perangkat ini (IndexedDB).</p></div>
<div class="card"><b>Data</b><div class="row"><button class="btn" onclick="demo()">Isi Data Demo</button><button class="btn" onclick="backup()">⬇ Backup JSON</button><label class="btn ghost">⬆ Pulihkan<input type="file" accept=".json,application/json" hidden onchange="restore(this)"></label><button class="btn danger" onclick="wipe()">Hapus Semua Data</button></div></div>
<div class="card"><b>Notifikasi</b><p class="muted">Pengingat dicek dan dikirim saat aplikasi dibuka. Saat aplikasi tertutup, notifikasi otomatis TIDAK dikirim: itu butuh layanan Push + server yang belum ada di versi ini.</p><button class="btn" onclick="askNotif()">Aktifkan Notifikasi</button></div>`}
const backup=()=>dl('backup-warung-expired-'+Core.iso(Core.today())+'.json',JSON.stringify({app:'warung-expired',version:1,date:new Date().toISOString(),products:S.p,batches:S.b,logs:S.l},null,1),'application/json');
async function restore(i){const f=i.files[0];i.value='';if(!f)return;let o;try{o=JSON.parse(await f.text())}catch{return toast('File bukan JSON yang valid',false)}
const e=Core.validBackup(o);if(e)return toast(e,false);if(!confirm(`Pulihkan ${o.products.length} produk, ${o.batches.length} batch? Data saat ini akan DIGANTI.`))return;await DB.replace(o);toast('Data berhasil dipulihkan');refresh()}
async function wipe(){if(!confirm('Hapus SEMUA data? Tidak bisa dibatalkan. Disarankan backup dulu.'))return;if(!confirm('Yakin? Semua produk, batch, dan riwayat akan hilang.'))return;await DB.replace({});toast('Semua data dihapus');refresh()}
async function demo(){if(S.p.some(p=>p.barcode==='8999999000011'))return toast('Data demo sudah ada',false);const t=Core.today(),dt=n=>Core.iso(new Date(t.getFullYear(),t.getMonth(),t.getDate()+n));
const P=[['Mi Instan Goreng','Makanan','8999999000011','bungkus',3000],['Susu Kental Manis','Minuman','8999999000028','kaleng',12000],['Teh Botol','Minuman','8999999000035','botol',4500],['Biskuit Kelapa','Makanan','8999999000042','bungkus',6000],['Kecap Manis','Bumbu','8999999000059','botol',9000],['Roti Tawar','Makanan','8999999000066','bungkus',11000]].map(a=>({id:uid(),name:a[0],cat:a[1],barcode:a[2],unit:a[3],cost:a[4]}));
const B=(i,n,d,c)=>({id:uid(),pid:P[i].id,inDate:dt(-30),exp:dt(d),initQty:n,qty:n,cost:P[i].cost,code:c});
await DB.save({products:P,batches:[B(0,20,40,'A'),B(0,30,95,'B'),B(1,24,60,''),B(2,18,20,''),B(3,12,5,''),B(4,10,0,''),B(5,6,-3,'')]});toast('Data demo ditambahkan');refresh()}
async function askNotif(){if(!('Notification' in window))return toast('Browser tidak mendukung notifikasi',false);const r=await Notification.requestPermission();toast(r==='granted'?'Notifikasi aktif':'Izin notifikasi ditolak',r==='granted');if(r==='granted'){localStorage.removeItem('nd');notifyDue()}}
async function notifyDue(){if(!('Notification' in window)||Notification.permission!=='granted')return;const k=Core.iso(Core.today());if(localStorage.getItem('nd')===k)return;
const due=S.b.filter(b=>b.qty>0&&(d=>d<0||[0,1,7,14,30].includes(d))(Core.days(b.exp)));if(!due.length)return;localStorage.setItem('nd',k);
const o={body:`${due.length} batch perlu diperiksa (kedaluwarsa / H-30, H-14, H-7, H-1)`,icon:'icon-192.png'},r=await navigator.serviceWorker?.getRegistration();r?r.showNotification('Warung Expired',o):new Notification('Warung Expired',o)}
const V={dash:vDash,produk:vProduk,batch:vBatch,scan:vScan,ingat:vIngat,laporan:vLap,set:vSet};
const net=()=>{const n=$('#net');n.textContent=navigator.onLine?'Online':'Offline';n.className='net'+(navigator.onLine?'':' off')};
(async()=>{$('#nav').innerHTML=PAGES.map(p=>`<button data-p="${p[0]}" title="${p[1]}" onclick="go('${p[0]}')"><span>${p[2]}</span>${p[3]}</button>`).join('');
addEventListener('online',net);addEventListener('offline',net);net();
try{await DB.open();await load();navigator.storage?.persist?.()}catch{toast('Penyimpanan lokal tidak tersedia di browser ini',false)}
render();notifyDue();if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{})})();

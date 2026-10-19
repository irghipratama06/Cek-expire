const DB={db:null,
open(){return new Promise((res,rej)=>{const r=indexedDB.open('warung-expired',1);r.onupgradeneeded=()=>{['products','batches','logs'].forEach(n=>r.result.createObjectStore(n,{keyPath:'id'}))};r.onsuccess=()=>{DB.db=r.result;res()};r.onerror=()=>rej(r.error)})},
all(n){return new Promise((res,rej)=>{const q=DB.db.transaction(n).objectStore(n).getAll();q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})},
save(o){const n=Object.keys(o);return new Promise((res,rej)=>{const t=DB.db.transaction(n,'readwrite');n.forEach(k=>o[k].forEach(x=>t.objectStore(k).put(x)));t.oncomplete=res;t.onerror=t.onabort=()=>rej(t.error)})},
del(n,ids){return new Promise((res,rej)=>{const t=DB.db.transaction(n,'readwrite');ids.forEach(i=>t.objectStore(n).delete(i));t.oncomplete=res;t.onerror=t.onabort=()=>rej(t.error)})},
replace(d){const n=['products','batches','logs'];return new Promise((res,rej)=>{const t=DB.db.transaction(n,'readwrite');n.forEach(k=>{const s=t.objectStore(k);s.clear();(d[k]||[]).forEach(x=>s.put(x))});t.oncomplete=res;t.onerror=t.onabort=()=>rej(t.error)})}};

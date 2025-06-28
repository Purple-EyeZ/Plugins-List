var p=(t,e,n)=>new Promise((s,a)=>{var o=l=>{try{u(n.next(l))}catch(c){a(c)}},r=l=>{try{u(n.throw(l))}catch(c){a(c)}},u=l=>l.done?s(l.value):Promise.resolve(l.value).then(o,r);u((n=n.apply(t,e)).next())});import{showToast as d,showPopup as U}from"./shared.js";const L="../plugins-data.json";let i=[],f="all";const y=document.getElementById("plugins-list"),I=document.getElementById("add-plugin-form"),w=document.getElementById("new-plugin-url"),P=document.getElementById("save-changes"),S=document.getElementById("check-plugins"),v=document.getElementById("filter-all"),$=document.getElementById("filter-broken"),E=document.getElementById("filter-warning"),C=document.getElementById("total-count"),j=document.getElementById("working-count"),x=document.getElementById("warning-count"),A=document.getElementById("broken-count");function T(){return p(this,null,function*(){try{i=yield(yield fetch(L)).json(),m(),h()}catch(t){d(`Error loading plugins: ${t.message}`)}})}function k(t){if(t=t.replace(/\/$/,""),t.includes("/proxy/")){const e=t.split("/proxy/")[1];if(e){const n=e.match(/([^.]+)\.github\.io\/([^/]+)/);if(n){const[,a,o]=n;return`https://github.com/${a}/${o}`}const s=e.match(/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)/);if(s){const[,a,o]=s;return`https://github.com/${a}/${o}`}}}if(t.includes("github.io")){const e=t.match(/https?:\/\/([^.]+)\.github\.io\/([^/]+)/);if(e){const[,n,s]=e;return`https://github.com/${n}/${s}`}}if(t.includes("raw.githubusercontent.com")){const e=t.match(/https?:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)/);if(e){const[,n,s]=e;return`https://github.com/${n}/${s}`}}return t}function M(){return p(this,null,function*(){var a;console.group("Updating plugin manifests...");let t=0,e=0;const n=i.length;let s=0;for(const o of i)try{const r=o.installUrl,u=r.endsWith("/")?`${r}manifest.json`:`${r}/manifest.json`;console.log(`Fetching manifest for ${o.name}... (${++s}/${n})`);const l=yield fetch(u);if(!l.ok)throw new Error(`HTTP error! status: ${l.status}`);const c=yield l.json(),g=[];c.name!==o.name&&(g.push(`name: ${o.name} -> ${c.name}`),o.name=c.name),c.description!==o.description&&(g.push("description updated"),o.description=c.description);const b=((a=c.authors)==null?void 0:a.map(B=>B.name))||["Unknown"];JSON.stringify(b)!==JSON.stringify(o.authors)&&(g.push(`authors: [${o.authors}] -> [${b}]`),o.authors=b),g.length>0?(console.log(`\u2705 ${o.name}: Updated! Changes:`,g),t++):console.log(`\u2139\uFE0F ${o.name}: No changes needed`)}catch(r){console.error(`\u274C Error updating ${o.name}:`,r.message),e++}console.log(`
Update summary:`),console.log(`\u2139\uFE0F Processed: ${s}/${n} plugins`),console.log(`\u2705 Successfully updated: ${t} plugins`),console.log(`\u274C Failed to update: ${e} plugins`),console.groupEnd(),m(),d(`Updated ${t} plugins (${e} failed)`)})}function h(){const t=i.filter(s=>s.status==="working").length,e=i.filter(s=>s.status==="warning").length,n=i.filter(s=>s.status==="broken").length;C.textContent=i.length,j.textContent=t,x.textContent=e,A.textContent=n}function q(t){const e=document.createElement("div");return e.className="card admin-plugin-item",e.innerHTML=`
        <div class="plugin-info">
            <span class="plugin-info-label">Name:</span>
            <span>${t.name||"Unnamed Plugin"}</span>
            
            <span class="plugin-info-label">Status:</span>
            <select class="status-select">
                <option value="working" ${t.status==="working"?"selected":""}>Working</option>
                <option value="warning" ${t.status==="warning"?"selected":""}>Warning</option>
                <option value="broken" ${t.status==="broken"?"selected":""}>Broken</option>
            </select>
            
            <span class="plugin-info-label">Message:</span>
            <textarea class="form-control warning-message">${t.warningMessage||""}</textarea>
        </div>
        <div class="plugin-action-buttons">
            <button class="btn btn--danger admin-button delete-plugin">Delete</button>
            <button class="btn btn--secondary admin-button edit-plugin">
                <span class="material-symbols-rounded">edit</span> Edit Details
            </button>
        </div>
    `,e.querySelector(".status-select").addEventListener("change",n=>{t.status=n.target.value,h()}),e.querySelector(".warning-message").addEventListener("input",n=>{t.warningMessage=n.target.value}),e.querySelector(".delete-plugin").addEventListener("click",()=>{confirm(`Delete plugin "${t.name}"?`)&&(i=i.filter(n=>n!==t),m(),h())}),e.querySelector(".edit-plugin").addEventListener("click",()=>{F(t)}),e}function D(t,e,n){return p(this,null,function*(){var s;try{const a=t.installUrl.endsWith("/")?`${t.installUrl}manifest.json`:`${t.installUrl}/manifest.json`,r=yield(yield fetch(a)).json();switch(e){case"name":t.name=r.name;break;case"description":t.description=r.description;break;case"authors":t.authors=((s=r.authors)==null?void 0:s.map(u=>u.name))||["Unknown"];break;case"sourceUrl":t.sourceUrl=k(t.installUrl);break;default:return!1}return!0}catch(a){return console.error(`Error updating ${e}:`,a),!1}})}function F(t){var n;const e=`
        <div class="plugin-details-form">
            <div class="form-group">
                <label>Name:</label>
                <div class="input-with-button">
                    <input type="text" id="plugin-name" class="form-control" value="${t.name||""}" />
                    <button class="btn btn--secondary admin-button refetch-field" data-field="name">
                        <span class="material-symbols-rounded">refresh</span>
                    </button>
                </div>
            </div>
            <div class="form-group">
                <label>Description:</label>
                <div class="input-with-button">
                    <textarea id="plugin-description" class="form-control">${t.description||""}</textarea>
                    <button class="btn btn--secondary admin-button refetch-field" data-field="description">
                        <span class="material-symbols-rounded">refresh</span>
                    </button>
                </div>
            </div>
            <div class="form-group">
                <label>Authors:</label>
                <div class="input-with-button">
                    <input type="text" id="plugin-authors" class="form-control" value="${((n=t.authors)==null?void 0:n.join(", "))||""}" />
                    <button class="btn btn--secondary admin-button refetch-field" data-field="authors">
                        <span class="material-symbols-rounded">refresh</span>
                    </button>
                </div>
            </div>
            <div class="form-group">
                <label>Install URL:</label>
                <input type="text" id="plugin-install-url" class="form-control" value="${t.installUrl||""}" />
            </div>
            <div class="form-group">
                <label>Source URL:</label>
                <div class="input-with-button">
                    <input type="text" id="plugin-source-url" class="form-control" value="${t.sourceUrl||""}" />
                    <button class="btn btn--secondary admin-button refetch-field" data-field="sourceUrl">
                        <span class="material-symbols-rounded">refresh</span>
                    </button>
                </div>
            </div>
        </div>
    `;U({title:`Edit Plugin: ${t.name}`,message:e,primaryButton:{text:"Save",action:()=>{t.name=document.getElementById("plugin-name").value,t.description=document.getElementById("plugin-description").value,t.authors=document.getElementById("plugin-authors").value.split(",").map(s=>s.trim()),t.installUrl=document.getElementById("plugin-install-url").value,t.sourceUrl=document.getElementById("plugin-source-url").value,m(),hidePopup(),d("Plugin details updated!")}},closeOnOutsideClick:!0});for(const s of document.querySelectorAll(".refetch-field"))s.addEventListener("click",()=>p(this,null,function*(){const a=s.dataset.field;(yield D(t,a))?(a==="authors"?document.getElementById("plugin-authors").value=t.authors.join(", "):a==="sourceUrl"?document.getElementById("plugin-source-url").value=t.sourceUrl:document.getElementById(`plugin-${a}`).value=t[a],d(`${a} updated successfully!`)):d(`Failed to update ${a}`)}))}function m(){y.innerHTML="";let t=i;f!=="all"&&(t=i.filter(e=>e.status===f));for(const e of t)y.appendChild(q(e))}function N(){return p(this,null,function*(){try{const t=JSON.stringify(i,null,4),e=yield fetch("http://localhost:3000/save-plugins",{method:"POST",headers:{"Content-Type":"application/json"},body:t});if(!e.ok)throw new Error(`Save failed: ${e.statusText}`);const n=yield e.json();d(n.message||"File saved successfully!")}catch(t){d(`Error saving file: ${t.message}`)}})}I.addEventListener("submit",t=>p(void 0,null,function*(){var n;t.preventDefault();const e=w.value.trim();try{const s=e.endsWith("/")?`${e}manifest.json`:`${e}/manifest.json`,o=yield(yield fetch(s)).json(),r={name:o.name,description:o.description,authors:((n=o.authors)==null?void 0:n.map(u=>u.name))||["Unknown"],status:"working",sourceUrl:k(e),installUrl:e,warningMessage:""};i.push(r),m(),h(),w.value="",d("Plugin added successfully!")}catch(s){d(`Error adding plugin: ${s.message}`)}})),P.addEventListener("click",N),S.addEventListener("click",M),v.classList.add("active"),v.addEventListener("click",()=>{f="all",m();for(const t of document.querySelectorAll(".admin-button"))t.classList.remove("active");v.classList.add("active")}),$.addEventListener("click",()=>{f="broken",m();for(const t of document.querySelectorAll(".admin-button"))t.classList.remove("active");$.classList.add("active")}),E.addEventListener("click",()=>{f="warning",m();for(const t of document.querySelectorAll(".admin-button"))t.classList.remove("active");E.classList.add("active")}),T();

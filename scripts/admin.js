var p=(e,t,n)=>new Promise((s,o)=>{var a=l=>{try{u(n.next(l))}catch(c){o(c)}},i=l=>{try{u(n.throw(l))}catch(c){o(c)}},u=l=>l.done?s(l.value):Promise.resolve(l.value).then(a,i);u((n=n.apply(e,t)).next())});import{showToast as d,showPopup as U}from"./shared.js";const I="../plugins-data.json";let r=[],f="all";const b=document.getElementById("plugins-list"),L=document.getElementById("add-plugin-form"),y=document.getElementById("new-plugin-url"),P=document.getElementById("save-changes"),S=document.getElementById("check-plugins"),w=document.getElementById("filter-all"),$=document.getElementById("filter-broken"),E=document.getElementById("filter-warning"),C=document.getElementById("total-count"),j=document.getElementById("working-count"),x=document.getElementById("warning-count"),A=document.getElementById("broken-count");function T(){return p(this,null,function*(){try{r=yield(yield fetch(I)).json(),m(),h()}catch(e){d(`Error loading plugins: ${e.message}`)}})}function k(e){if(e=e.replace(/\/$/,""),e.includes("/proxy/")){const t=e.split("/proxy/")[1];if(t){const n=t.match(/([^.]+)\.github\.io\/([^/]+)/);if(n){const[,o,a]=n;return`https://github.com/${o}/${a}`}const s=t.match(/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)/);if(s){const[,o,a]=s;return`https://github.com/${o}/${a}`}}}if(e.includes("github.io")){const t=e.match(/https?:\/\/([^.]+)\.github\.io\/([^/]+)/);if(t){const[,n,s]=t;return`https://github.com/${n}/${s}`}}if(e.includes("raw.githubusercontent.com")){const t=e.match(/https?:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)/);if(t){const[,n,s]=t;return`https://github.com/${n}/${s}`}}return e}function M(){return p(this,null,function*(){var o;console.group("Updating plugin manifests...");let e=0,t=0;const n=r.length;let s=0;for(const a of r)try{const i=a.installUrl,u=i.endsWith("/")?`${i}manifest.json`:`${i}/manifest.json`;console.log(`Fetching manifest for ${a.name}... (${++s}/${n})`);const l=yield fetch(u);if(!l.ok)throw new Error(`HTTP error! status: ${l.status}`);const c=yield l.json(),g=[];c.name!==a.name&&(g.push(`name: ${a.name} -> ${c.name}`),a.name=c.name),c.description!==a.description&&(g.push("description updated"),a.description=c.description);const v=((o=c.authors)==null?void 0:o.map(B=>B.name))||["Unknown"];JSON.stringify(v)!==JSON.stringify(a.authors)&&(g.push(`authors: [${a.authors}] -> [${v}]`),a.authors=v),g.length>0?(console.log(`\u2705 ${a.name}: Updated! Changes:`,g),e++):console.log(`\u2139\uFE0F ${a.name}: No changes needed`)}catch(i){console.error(`\u274C Error updating ${a.name}:`,i.message),t++}console.log(`
Update summary:`),console.log(`\u2139\uFE0F Processed: ${s}/${n} plugins`),console.log(`\u2705 Successfully updated: ${e} plugins`),console.log(`\u274C Failed to update: ${t} plugins`),console.groupEnd(),m(),d(`Updated ${e} plugins (${t} failed)`)})}function h(){const e=r.filter(s=>s.status==="working").length,t=r.filter(s=>s.status==="warning").length,n=r.filter(s=>s.status==="broken").length;C.textContent=r.length,j.textContent=e,x.textContent=t,A.textContent=n}function q(e){const t=document.createElement("div");return t.className="admin-plugin-item",t.innerHTML=`
        <div class="plugin-info">
            <span class="plugin-info-label">Name:</span>
            <span>${e.name||"Unnamed Plugin"}</span>
            
            <span class="plugin-info-label">Status:</span>
            <select class="status-select">
                <option value="working" ${e.status==="working"?"selected":""}>Working</option>
                <option value="warning" ${e.status==="warning"?"selected":""}>Warning</option>
                <option value="broken" ${e.status==="broken"?"selected":""}>Broken</option>
            </select>
            
            <span class="plugin-info-label">Message:</span>
            <textarea class="warning-message">${e.warningMessage||""}</textarea>
        </div>
        <div class="plugin-action-buttons">
            <button class="admin-button danger delete-plugin">Delete</button>
            <button class="admin-button edit-plugin">
                <span class="material-symbols-rounded">edit</span> Edit Details
            </button>
        </div>
    `,t.querySelector(".status-select").addEventListener("change",n=>{e.status=n.target.value,h()}),t.querySelector(".warning-message").addEventListener("input",n=>{e.warningMessage=n.target.value}),t.querySelector(".delete-plugin").addEventListener("click",()=>{confirm(`Delete plugin "${e.name}"?`)&&(r=r.filter(n=>n!==e),m(),h())}),t.querySelector(".edit-plugin").addEventListener("click",()=>{F(e)}),t}function D(e,t,n){return p(this,null,function*(){var s;try{const o=e.installUrl.endsWith("/")?`${e.installUrl}manifest.json`:`${e.installUrl}/manifest.json`,i=yield(yield fetch(o)).json();switch(t){case"name":e.name=i.name;break;case"description":e.description=i.description;break;case"authors":e.authors=((s=i.authors)==null?void 0:s.map(u=>u.name))||["Unknown"];break;case"sourceUrl":e.sourceUrl=k(e.installUrl);break;default:return!1}return!0}catch(o){return console.error(`Error updating ${t}:`,o),!1}})}function F(e){var n;const t=`
        <div class="plugin-details-form">
            <div class="form-group">
                <label>Name:</label>
                <div class="input-with-button">
                    <input type="text" id="plugin-name" value="${e.name||""}" />
                    <button class="admin-button refetch-field" data-field="name">
                        <span class="material-symbols-rounded">refresh</span>
                    </button>
                </div>
            </div>
            <div class="form-group">
                <label>Description:</label>
                <div class="input-with-button">
                    <textarea id="plugin-description">${e.description||""}</textarea>
                    <button class="admin-button refetch-field" data-field="description">
                        <span class="material-symbols-rounded">refresh</span>
                    </button>
                </div>
            </div>
            <div class="form-group">
                <label>Authors:</label>
                <div class="input-with-button">
                    <input type="text" id="plugin-authors" value="${((n=e.authors)==null?void 0:n.join(", "))||""}" />
                    <button class="admin-button refetch-field" data-field="authors">
                        <span class="material-symbols-rounded">refresh</span>
                    </button>
                </div>
            </div>
            <div class="form-group">
                <label>Install URL:</label>
                <input type="text" id="plugin-install-url" value="${e.installUrl||""}" />
            </div>
            <div class="form-group">
                <label>Source URL:</label>
                <div class="input-with-button">
                    <input type="text" id="plugin-source-url" value="${e.sourceUrl||""}" />
                    <button class="admin-button refetch-field" data-field="sourceUrl">
                        <span class="material-symbols-rounded">refresh</span>
                    </button>
                </div>
            </div>
        </div>
    `;U({title:`Edit Plugin: ${e.name}`,message:t,primaryButton:{text:"Save",action:()=>{e.name=document.getElementById("plugin-name").value,e.description=document.getElementById("plugin-description").value,e.authors=document.getElementById("plugin-authors").value.split(",").map(s=>s.trim()),e.installUrl=document.getElementById("plugin-install-url").value,e.sourceUrl=document.getElementById("plugin-source-url").value,m(),hidePopup(),d("Plugin details updated!")}},closeOnOutsideClick:!0});for(const s of document.querySelectorAll(".refetch-field"))s.addEventListener("click",()=>p(this,null,function*(){const o=s.dataset.field;(yield D(e,o))?(o==="authors"?document.getElementById("plugin-authors").value=e.authors.join(", "):o==="sourceUrl"?document.getElementById("plugin-source-url").value=e.sourceUrl:document.getElementById(`plugin-${o}`).value=e[o],d(`${o} updated successfully!`)):d(`Failed to update ${o}`)}))}function m(){b.innerHTML="";let e=r;f!=="all"&&(e=r.filter(t=>t.status===f));for(const t of e)b.appendChild(q(t))}function N(){return p(this,null,function*(){try{const e=JSON.stringify(r,null,4),t=yield fetch("http://localhost:3000/save-plugins",{method:"POST",headers:{"Content-Type":"application/json"},body:e});if(!t.ok)throw new Error(`Save failed: ${t.statusText}`);const n=yield t.json();d(n.message||"File saved successfully!")}catch(e){d(`Error saving file: ${e.message}`)}})}L.addEventListener("submit",e=>p(void 0,null,function*(){var n;e.preventDefault();const t=y.value.trim();try{const s=t.endsWith("/")?`${t}manifest.json`:`${t}/manifest.json`,a=yield(yield fetch(s)).json(),i={name:a.name,description:a.description,authors:((n=a.authors)==null?void 0:n.map(u=>u.name))||["Unknown"],status:"working",sourceUrl:k(t),installUrl:t,warningMessage:""};r.push(i),m(),h(),y.value="",d("Plugin added successfully!")}catch(s){d(`Error adding plugin: ${s.message}`)}})),P.addEventListener("click",N),S.addEventListener("click",M),w.addEventListener("click",()=>{f="all",m();for(const e of document.querySelectorAll(".admin-button"))e.classList.remove("active");w.classList.add("active")}),$.addEventListener("click",()=>{f="broken",m();for(const e of document.querySelectorAll(".admin-button"))e.classList.remove("active");$.classList.add("active")}),E.addEventListener("click",()=>{f="warning",m();for(const e of document.querySelectorAll(".admin-button"))e.classList.remove("active");E.classList.add("active")}),T();

var p=(e,t,s)=>new Promise((n,a)=>{var i=r=>{try{o(s.next(r))}catch(m){a(m)}},c=r=>{try{o(s.throw(r))}catch(m){a(m)}},o=r=>r.done?n(r.value):Promise.resolve(r.value).then(i,c);o((s=s.apply(e,t)).next())});import{showToast as u,showPopup as k}from"./shared.js";const B="../plugins-data.json";let l=[],g="all";const h=document.getElementById("plugins-list"),U=document.getElementById("add-plugin-form"),v=document.getElementById("new-plugin-url"),I=document.getElementById("save-changes"),L=document.getElementById("check-plugins"),b=document.getElementById("filter-all"),y=document.getElementById("filter-broken"),w=document.getElementById("filter-warning"),P=document.getElementById("total-count"),S=document.getElementById("working-count"),C=document.getElementById("warning-count"),j=document.getElementById("broken-count");function x(){return p(this,null,function*(){try{l=yield(yield fetch(B)).json(),d(),f()}catch(e){u("Error loading plugins: "+e.message)}})}function E(e){if(e=e.replace(/\/$/,""),e.includes("/proxy/")){const t=e.split("/proxy/")[1];if(t){const s=t.match(/([^.]+)\.github\.io\/([^/]+)/);if(s){const[,a,i]=s;return`https://github.com/${a}/${i}`}const n=t.match(/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)/);if(n){const[,a,i]=n;return`https://github.com/${a}/${i}`}}}if(e.includes("github.io")){const t=e.match(/https?:\/\/([^.]+)\.github\.io\/([^/]+)/);if(t){const[,s,n]=t;return`https://github.com/${s}/${n}`}}if(e.includes("raw.githubusercontent.com")){const t=e.match(/https?:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)/);if(t){const[,s,n]=t;return`https://github.com/${s}/${n}`}}return e}function A(){return p(this,null,function*(){var s;console.group("Updating plugin manifests...");let e=0,t=0;for(const n of l)try{const a=n.installUrl,i=a.endsWith("/")?a+"manifest.json":a+"/manifest.json";console.log(`Fetching manifest for ${n.name}...`);const c=yield fetch(i);if(!c.ok)throw new Error(`HTTP error! status: ${c.status}`);const o=yield c.json(),r=[];o.name!==n.name&&(r.push(`name: ${n.name} -> ${o.name}`),n.name=o.name),o.description!==n.description&&(r.push("description updated"),n.description=o.description);const m=((s=o.authors)==null?void 0:s.map($=>$.name))||["Unknown"];JSON.stringify(m)!==JSON.stringify(n.authors)&&(r.push(`authors: [${n.authors}] -> [${m}]`),n.authors=m),r.length>0?(console.log(`\u2705 ${n.name}: Updated! Changes:`,r),e++):console.log(`\u2139\uFE0F ${n.name}: No changes needed`)}catch(a){console.error(`\u274C Error updating ${n.name}:`,a.message),t++}console.log(`
Update summary:`),console.log(`\u2705 Successfully updated: ${e} plugins`),console.log(`\u274C Failed to update: ${t} plugins`),console.groupEnd(),d(),u(`Updated ${e} plugins (${t} failed)`)})}function f(){const e=l.filter(n=>n.status==="working").length,t=l.filter(n=>n.status==="warning").length,s=l.filter(n=>n.status==="broken").length;P.textContent=l.length,S.textContent=e,C.textContent=t,j.textContent=s}function T(e){const t=document.createElement("div");return t.className="admin-plugin-item",t.innerHTML=`
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
    `,t.querySelector(".status-select").addEventListener("change",s=>{e.status=s.target.value,f()}),t.querySelector(".warning-message").addEventListener("input",s=>{e.warningMessage=s.target.value}),t.querySelector(".delete-plugin").addEventListener("click",()=>{confirm(`Delete plugin "${e.name}"?`)&&(l=l.filter(s=>s!==e),d(),f())}),t.querySelector(".edit-plugin").addEventListener("click",()=>{q(e)}),t}function M(e,t,s){return p(this,null,function*(){var n;try{const a=e.installUrl.endsWith("/")?e.installUrl+"manifest.json":e.installUrl+"/manifest.json",c=yield(yield fetch(a)).json();switch(t){case"name":e.name=c.name;break;case"description":e.description=c.description;break;case"authors":e.authors=((n=c.authors)==null?void 0:n.map(o=>o.name))||["Unknown"];break;case"sourceUrl":e.sourceUrl=E(e.installUrl);break;default:return!1}return!0}catch(a){return console.error(`Error updating ${t}:`,a),!1}})}function q(e){var s;const t=`
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
                    <input type="text" id="plugin-authors" value="${((s=e.authors)==null?void 0:s.join(", "))||""}" />
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
    `;k({title:`Edit Plugin: ${e.name}`,message:t,primaryButton:{text:"Save",action:()=>{e.name=document.getElementById("plugin-name").value,e.description=document.getElementById("plugin-description").value,e.authors=document.getElementById("plugin-authors").value.split(",").map(n=>n.trim()),e.installUrl=document.getElementById("plugin-install-url").value,e.sourceUrl=document.getElementById("plugin-source-url").value,d(),hidePopup(),u("Plugin details updated!")}},closeOnOutsideClick:!0}),document.querySelectorAll(".refetch-field").forEach(n=>{n.addEventListener("click",()=>p(this,null,function*(){const a=n.dataset.field;(yield M(e,a))?(a==="authors"?document.getElementById("plugin-authors").value=e.authors.join(", "):a==="sourceUrl"?document.getElementById("plugin-source-url").value=e.sourceUrl:document.getElementById(`plugin-${a}`).value=e[a],u(`${a} updated successfully!`)):u(`Failed to update ${a}`)}))})}function d(){h.innerHTML="";let e=l;g!=="all"&&(e=l.filter(t=>t.status===g)),e.forEach(t=>{h.appendChild(T(t))})}function D(){return p(this,null,function*(){try{const e=JSON.stringify(l,null,4),t=yield fetch("http://localhost:3000/save-plugins",{method:"POST",headers:{"Content-Type":"application/json"},body:e});if(!t.ok)throw new Error(`Save failed: ${t.statusText}`);const s=yield t.json();u(s.message||"File saved successfully!")}catch(e){u("Error saving file: "+e.message)}})}U.addEventListener("submit",e=>p(void 0,null,function*(){var s;e.preventDefault();const t=v.value.trim();try{const n=t.endsWith("/")?t+"manifest.json":t+"/manifest.json",i=yield(yield fetch(n)).json(),c={name:i.name,description:i.description,authors:((s=i.authors)==null?void 0:s.map(o=>o.name))||["Unknown"],status:"working",sourceUrl:E(t),installUrl:t,warningMessage:""};l.push(c),d(),f(),v.value="",u("Plugin added successfully!")}catch(n){u("Error adding plugin: "+n.message)}})),I.addEventListener("click",D),L.addEventListener("click",A),b.addEventListener("click",()=>{g="all",d(),document.querySelectorAll(".admin-button").forEach(e=>e.classList.remove("active")),b.classList.add("active")}),y.addEventListener("click",()=>{g="broken",d(),document.querySelectorAll(".admin-button").forEach(e=>e.classList.remove("active")),y.classList.add("active")}),w.addEventListener("click",()=>{g="warning",d(),document.querySelectorAll(".admin-button").forEach(e=>e.classList.remove("active")),w.classList.add("active")}),x();

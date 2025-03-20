var p=(e,n,s)=>new Promise((t,a)=>{var i=r=>{try{o(s.next(r))}catch(m){a(m)}},c=r=>{try{o(s.throw(r))}catch(m){a(m)}},o=r=>r.done?t(r.value):Promise.resolve(r.value).then(i,c);o((s=s.apply(e,n)).next())});import{showToast as u,showPopup as $}from"./shared.js";const B="../plugins-data.json";let l=[],g="all";const h=document.getElementById("plugins-list"),U=document.getElementById("add-plugin-form"),b=document.getElementById("new-plugin-url"),L=document.getElementById("save-changes"),I=document.getElementById("check-plugins"),v=document.getElementById("filter-all"),y=document.getElementById("filter-broken"),w=document.getElementById("filter-warning"),C=document.getElementById("total-count"),P=document.getElementById("working-count"),S=document.getElementById("warning-count"),j=document.getElementById("broken-count");function x(){return p(this,null,function*(){try{l=yield(yield fetch(B)).json(),d(),f()}catch(e){u("Error loading plugins: "+e.message)}})}function E(e){if(e=e.replace(/\/$/,""),e.includes("/proxy/")){const n=e.split("/proxy/")[1];if(n){const s=n.match(/([^.]+)\.github\.io\/([^/]+)/);if(s){const[,a,i]=s;return`https://github.com/${a}/${i}`}const t=n.match(/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)/);if(t){const[,a,i]=t;return`https://github.com/${a}/${i}`}}}if(e.includes("github.io")){const n=e.match(/https?:\/\/([^.]+)\.github\.io\/([^/]+)/);if(n){const[,s,t]=n;return`https://github.com/${s}/${t}`}}if(e.includes("raw.githubusercontent.com")){const n=e.match(/https?:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)/);if(n){const[,s,t]=n;return`https://github.com/${s}/${t}`}}return e}function A(){return p(this,null,function*(){var s;console.group("Updating plugin manifests...");let e=0,n=0;for(const t of l)try{const a=t.installUrl,i=a.endsWith("/")?a+"manifest.json":a+"/manifest.json";console.log(`Fetching manifest for ${t.name}...`);const c=yield fetch(i);if(!c.ok)throw new Error(`HTTP error! status: ${c.status}`);const o=yield c.json(),r=[];o.name!==t.name&&(r.push(`name: ${t.name} -> ${o.name}`),t.name=o.name),o.description!==t.description&&(r.push("description updated"),t.description=o.description);const m=((s=o.authors)==null?void 0:s.map(k=>k.name))||["Unknown"];JSON.stringify(m)!==JSON.stringify(t.authors)&&(r.push(`authors: [${t.authors}] -> [${m}]`),t.authors=m),r.length>0?(console.log(`\u2705 ${t.name}: Updated! Changes:`,r),e++):console.log(`\u2139\uFE0F ${t.name}: No changes needed`)}catch(a){console.error(`\u274C Error updating ${t.name}:`,a.message),n++}console.log(`
Update summary:`),console.log(`\u2705 Successfully updated: ${e} plugins`),console.log(`\u274C Failed to update: ${n} plugins`),console.groupEnd(),d(),u(`Updated ${e} plugins (${n} failed)`)})}function f(){const e=l.filter(t=>t.status==="working").length,n=l.filter(t=>t.status==="warning").length,s=l.filter(t=>t.status==="broken").length;C.textContent=l.length,P.textContent=e,S.textContent=n,j.textContent=s}function M(e){const n=document.createElement("div");return n.className="admin-plugin-item",n.innerHTML=`
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
    `,n.querySelector(".status-select").addEventListener("change",s=>{e.status=s.target.value,f()}),n.querySelector(".warning-message").addEventListener("input",s=>{e.warningMessage=s.target.value}),n.querySelector(".delete-plugin").addEventListener("click",()=>{confirm(`Delete plugin "${e.name}"?`)&&(l=l.filter(s=>s!==e),d(),f())}),n.querySelector(".edit-plugin").addEventListener("click",()=>{N(e)}),n}function q(e,n,s){return p(this,null,function*(){var t;try{const a=e.installUrl.endsWith("/")?e.installUrl+"manifest.json":e.installUrl+"/manifest.json",c=yield(yield fetch(a)).json();switch(n){case"name":e.name=c.name;break;case"description":e.description=c.description;break;case"authors":e.authors=((t=c.authors)==null?void 0:t.map(o=>o.name))||["Unknown"];break;case"sourceUrl":e.sourceUrl=E(e.installUrl);break;default:return!1}return!0}catch(a){return console.error(`Error updating ${n}:`,a),!1}})}function N(e){var s;const n=`
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
    `;$({title:`Edit Plugin: ${e.name}`,message:n,primaryButton:{text:"Save",action:()=>{e.name=document.getElementById("plugin-name").value,e.description=document.getElementById("plugin-description").value,e.authors=document.getElementById("plugin-authors").value.split(",").map(t=>t.trim()),e.installUrl=document.getElementById("plugin-install-url").value,e.sourceUrl=document.getElementById("plugin-source-url").value,d(),hidePopup(),u("Plugin details updated!")}},closeOnOutsideClick:!0}),document.querySelectorAll(".refetch-field").forEach(t=>{t.addEventListener("click",()=>p(this,null,function*(){const a=t.dataset.field;(yield q(e,a))?(a==="authors"?document.getElementById("plugin-authors").value=e.authors.join(", "):a==="sourceUrl"?document.getElementById("plugin-source-url").value=e.sourceUrl:document.getElementById(`plugin-${a}`).value=e[a],u(`${a} updated successfully!`)):u(`Failed to update ${a}`)}))})}function d(){h.innerHTML="";let e=l;g!=="all"&&(e=l.filter(n=>n.status===g)),e.forEach(n=>{h.appendChild(M(n))})}function O(){return p(this,null,function*(){try{const e=JSON.stringify(l,null,4),n=new Blob([e],{type:"application/json"}),s=URL.createObjectURL(n),t=document.createElement("a");t.href=s,t.download="plugins-data.json",document.body.appendChild(t),t.click(),document.body.removeChild(t),URL.revokeObjectURL(s),u("JSON file ready to download!")}catch(e){u("Error preparing file: "+e.message)}})}U.addEventListener("submit",e=>p(void 0,null,function*(){var s;e.preventDefault();const n=b.value.trim();try{const t=n.endsWith("/")?n+"manifest.json":n+"/manifest.json",i=yield(yield fetch(t)).json(),c={name:i.name,description:i.description,authors:((s=i.authors)==null?void 0:s.map(o=>o.name))||["Unknown"],status:"working",sourceUrl:E(n),installUrl:n,warningMessage:""};l.push(c),d(),f(),b.value="",u("Plugin added successfully!")}catch(t){u("Error adding plugin: "+t.message)}})),L.addEventListener("click",O),I.addEventListener("click",A),v.addEventListener("click",()=>{g="all",d(),document.querySelectorAll(".admin-button").forEach(e=>e.classList.remove("active")),v.classList.add("active")}),y.addEventListener("click",()=>{g="broken",d(),document.querySelectorAll(".admin-button").forEach(e=>e.classList.remove("active")),y.classList.add("active")}),w.addEventListener("click",()=>{g="warning",d(),document.querySelectorAll(".admin-button").forEach(e=>e.classList.remove("active")),w.classList.add("active")}),x();

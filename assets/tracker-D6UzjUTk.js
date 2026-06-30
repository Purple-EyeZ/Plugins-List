import"./shared-BTJLxnvt.js";const o=document.getElementById("diffs-container"),r=document.getElementById("loader"),a=e=>{try{return prettier.format(e,{parser:"babel",plugins:prettierPlugins,printWidth:80,semi:!0,tabWidth:2})}catch(t){return console.warn("Formatting failed, falling back to raw code:",t),e}};function f(e){const t=document.createElement("div");t.className="diff-card collapsed";const n=new Date(e.date).toLocaleString([],{year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});t.innerHTML=`
        <div class="diff-header">
            <div>
                <span class="diff-plugin-name">${e.pluginName}</span>
                <span class="diff-date">${n}</span>
            </div>
            <span class="material-symbols-rounded expand-icon">expand_more</span>
        </div>
        <div class="diff-content"></div>
    `,o.appendChild(t);const i=t.querySelector(".diff-header"),s=t.querySelector(".diff-content");i.addEventListener("click",()=>{t.classList.toggle("collapsed")}),setTimeout(()=>{const c=a(e.oldCode),d=a(e.newCode),l=Diff.createTwoFilesPatch("Old Version","New Version",c,d);new Diff2HtmlUI(s,l,{drawFileList:!1,matching:"lines",outputFormat:"line-by-line",colorScheme:"dark"}).draw()},10)}async function m(){try{const e=await fetch("/api/diff-history");if(!e.ok)throw new Error(`API Error: ${e.status}`);const t=await e.json();if(r.style.display="none",!t||t.length===0){o.innerHTML=`
                <div class="no-results-message" style="display:flex; flex-direction:column; align-items:center;">
                    <span class="material-symbols-rounded" style="font-size: 3rem; margin-bottom: 10px;">check_circle</span>
                    <p>No changes detected recently.</p>
                </div>
            `;return}for(const n of t)f(n)}catch(e){console.error(e),r.innerHTML='<span style="color: var(--color-danger);">Error loading tracker history.</span>'}}document.addEventListener("DOMContentLoaded",m);

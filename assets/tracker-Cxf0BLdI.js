import"./snow-CeWGaY71.js";const i=document.getElementById("diffs-container"),r=document.getElementById("loader"),o=e=>{try{return prettier.format(e,{parser:"babel",plugins:prettierPlugins,printWidth:80,semi:!0,tabWidth:2})}catch(t){return console.warn("Formatting failed, falling back to raw code:",t),e}};function l(e){const t=document.createElement("div");t.className="diff-card";const n=new Date(e.date).toLocaleString([],{year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});t.innerHTML=`
        <div class="diff-header">
            <span class="diff-plugin-name">${e.pluginName}</span>
            <span class="diff-date">${n}</span>
        </div>
        <div class="diff-content" id="diff-content-${Date.parse(e.date)}"></div>
    `,i.appendChild(t),setTimeout(()=>{const a=o(e.oldCode),s=o(e.newCode),c=Diff.createTwoFilesPatch("Old Version","New Version",a,s),d=t.querySelector(".diff-content");new Diff2HtmlUI(d,c,{drawFileList:!1,matching:"lines",outputFormat:"line-by-line",colorScheme:"dark"}).draw()},10)}async function f(){try{const e=await fetch("/api/diff-history");if(!e.ok)throw new Error(`API Error: ${e.status}`);const t=await e.json();if(r.style.display="none",!t||t.length===0){i.innerHTML=`
                <div class="no-results-message" style="display:flex; flex-direction:column; align-items:center;">
                    <span class="material-symbols-rounded" style="font-size: 3rem; margin-bottom: 10px;">check_circle</span>
                    <p>No changes detected recently.</p>
                </div>
            `;return}for(const n of t)l(n)}catch(e){console.error(e),r.innerHTML='<span style="color: var(--color-danger);">Error loading tracker history.</span>'}}document.addEventListener("DOMContentLoaded",f);

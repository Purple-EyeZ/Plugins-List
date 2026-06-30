import"./shared-BTJLxnvt.js";const c=document.getElementById("diffs-container"),o=document.getElementById("loader"),r=e=>{try{return prettier.format(e,{parser:"babel",plugins:prettierPlugins,printWidth:80,semi:!0,tabWidth:2})}catch(n){return console.warn("Formatting failed, falling back to raw code:",n),e}};function u(e){if(!Diff.diffChars(e.oldCode,e.newCode).some(i=>(i.added||i.removed)&&i.value.replace(/\s+/g,"").length>=3))return!1;const t=document.createElement("div");t.className="diff-card collapsed";const s=new Date(e.date).toLocaleString([],{year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});return t.innerHTML=`
        <div class="diff-header">
            <div>
                <span class="diff-plugin-name">${e.pluginName}</span>
                <span class="diff-date">${s}</span>
            </div>
            <span class="material-symbols-rounded expand-icon">expand_more</span>
        </div>
        <div class="diff-content" id="diff-content-${Date.parse(e.date)}"></div>
    `,c.appendChild(t),t.querySelector(".diff-header").addEventListener("click",()=>{t.classList.toggle("collapsed")}),setTimeout(()=>{const i=r(e.oldCode),l=r(e.newCode),f=Diff.createTwoFilesPatch("Old Version","New Version",i,l),m=t.querySelector(".diff-content");new Diff2HtmlUI(m,f,{drawFileList:!1,matching:"lines",outputFormat:"line-by-line",colorScheme:"dark"}).draw()},10),!0}async function p(){try{const e=await fetch("/api/diff-history");if(!e.ok)throw new Error(`API Error: ${e.status}`);const n=await e.json();if(o.style.display="none",!n||n.length===0){d();return}let a=0;for(const t of n)u(t)&&a++;a===0&&d()}catch(e){console.error(e),o.innerHTML='<span style="color: var(--color-danger);">Error loading tracker history.</span>'}}function d(){c.innerHTML=`
        <div class="no-results-message" style="display:flex; flex-direction:column; align-items:center;">
            <span class="material-symbols-rounded" style="font-size: 3rem; margin-bottom: 10px;">check_circle</span>
            <p>No significant changes detected recently.</p>
        </div>
    `}document.addEventListener("DOMContentLoaded",p);

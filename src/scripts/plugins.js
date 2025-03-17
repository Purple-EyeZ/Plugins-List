import { showPopup, showToast } from './shared.js';

let pluginsData = [];

fetch('plugins-data.json')
    .then(response => response.json())
    .then(data => {
        pluginsData = data;
        renderPlugins();
    })
    .catch(error => {
        console.error('Error loading plugins data:', error);
    });

const pluginsContainer = document.getElementById('plugins-container');
const sortSelect = document.getElementById('sort-select');
const showBrokenToggle = document.getElementById('show-broken');

function createPluginCard(plugin) {
    const card = document.createElement('div');
    card.className = 'plugin-card';
    
    let statusClass = '';
    switch(plugin.status) {
        case 'working':
            statusClass = 'status-working';
            break;
        case 'warning':
            statusClass = 'status-warning';
            break;
        case 'broken':
            statusClass = 'status-broken';
            break;
    }
    
    const authorsList = plugin.authors.join(', ');
    
    card.innerHTML = `
    <div class="plugin-header">
        <h3 class="plugin-name">${plugin.name}</h3>
        <span class="plugin-status ${statusClass}">${plugin.status}</span>
    </div>
    <div class="plugin-author">By: ${authorsList}</div>
    <div class="plugin-description">${plugin.description}</div>
    <div class="plugin-buttons">
        <button class="plugin-button source-button" data-url="${plugin.sourceUrl}">Source Code</button>
        <button class="plugin-button plugin-copy-button" data-status="${plugin.status}" data-url="${plugin.installUrl}" data-warning="${plugin.warningMessage || ''}">Copy Link</button>
    </div>
`;
    
    const sourceButton = card.querySelector('.source-button');
    const copyButton = card.querySelector('.plugin-copy-button');
    
    sourceButton.addEventListener('click', () => {
        window.open(plugin.sourceUrl, '_blank');
    });
    
    copyButton.addEventListener('click', () => {
        if (plugin.status === 'working') {
            copyToClipboard(plugin.installUrl);
            showToast(`Link for ${plugin.name} copied to clipboard!`);
        } else {
            const statusMessage = plugin.status === 'broken' 
                ? "Installing broken plugins may crash your client or cause unexpected behavior."
                : "This plugin may not work as expected.";
    
            const titleMessage = plugin.status === 'broken'
                ? "This plugin is broken"
                : "This plugin is partially broken";
    
            showPopup({
                title: 'Warning!',
                message: statusMessage,
                infoBox: plugin.warningMessage || '',
                primaryButton: {
                    text: 'Copy Anyway',
                    action: () => {
                        copyToClipboard(plugin.installUrl);
                        showToast(`Link for ${plugin.name} copied to clipboard!`);
                        hidePopup();
                    }
                },
                secondaryButton: {
                    text: 'Cancel',
                    action: () => hidePopup()
                }
            });
        }
    });
    
    return card;
}

// Function to copy to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).catch(err => {
        console.error('Failed to copy: ', err);
    });
}

// Render plugins with current filters
window.renderPlugins = function renderPlugins() {
    pluginsContainer.innerHTML = '';
    
    let filteredPlugins = [...pluginsData];
    
    if (!showBrokenToggle.checked) {
        filteredPlugins = filteredPlugins.filter(plugin => plugin.status !== 'broken');
    }
    
    // Sort plugins
    switch(sortSelect.value) {
        case 'default':
            filteredPlugins.sort((a, b) => {
                if (a.status === 'broken' && b.status !== 'broken') return 1;
                if (a.status !== 'broken' && b.status === 'broken') return -1;
                return a.name.localeCompare(b.name);
            });
            break;
        case 'broken-first':
            filteredPlugins.sort((a, b) => {
                if (a.status === 'broken' && b.status !== 'broken') return -1;
                if (a.status !== 'broken' && b.status === 'broken') return 1;
                return a.name.localeCompare(b.name);
            });
            break;
        case 'alphabetical':
            filteredPlugins.sort((a, b) => a.name.localeCompare(b.name));
            break;
    }
    
    filteredPlugins.forEach(plugin => {
        const card = createPluginCard(plugin);
        pluginsContainer.appendChild(card);
    });
};

// Event listeners for filters
sortSelect.addEventListener('change', renderPlugins);
showBrokenToggle.addEventListener('change', renderPlugins);

// Initial render
document.addEventListener('DOMContentLoaded', renderPlugins);
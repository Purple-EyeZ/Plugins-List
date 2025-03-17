import { isFixedSearchFocused } from './search.js';

let previousScrollY = window.scrollY;
const fixedBanner = document.querySelector('.fixed-banner');
const backToTopButton = document.getElementById('backToTopButton');
const menuButton = document.getElementById("menuButton");
const dropdownMenu = document.getElementById("dropdownMenu");

// Control display of banner
function handleScroll() {
    const scrollThreshold = 15; // px scrolled before showing the banner
    const scrollY = window.scrollY;
    const scrollingDown = scrollY > previousScrollY;
    previousScrollY = scrollY;

    const shouldShowBanner = scrollY > scrollThreshold && !fixedBanner.classList.contains('show');
    const shouldHideBanner = scrollY <= scrollThreshold && 
                           fixedBanner.classList.contains('show') && 
                           !isFixedSearchFocused() && 
                           !scrollingDown;

    if (shouldShowBanner) {
        fixedBanner.classList.add('show');
        fixedBanner.classList.remove('hide');
    } else if (shouldHideBanner) {
        fixedBanner.classList.add('hide');
        fixedBanner.classList.remove('show');
    }
}

// Back to Top button
window.onscroll = () => {
    const scrolled = document.documentElement.scrollTop > 400;
    backToTopButton.style.display = scrolled ? "block" : "none";
};

backToTopButton.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

// Dropdown Menu
document.addEventListener("DOMContentLoaded", () => {
    menuButton.addEventListener("click", () => {
        dropdownMenu.classList.toggle('visible');
    });

    // Hide menu if user clicks outside it
    window.addEventListener("click", (event) => {
        if (event.target !== menuButton && !menuButton.contains(event.target) && !dropdownMenu.contains(event.target)) {
            dropdownMenu.classList.remove('visible');
        }
    });
});

// Toast message
export function showToast(message) {
    const toast = document.getElementById('toast');
    toast.innerHTML = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000); // 2 seconds
}

// Popup
export function showPopup({ 
    title, 
    message, 
    infoBox = null, 
    primaryButton = { text: 'OK', action: () => hidePopup() },
    secondaryButton = { text: 'Cancel', action: () => hidePopup() },
    closeOnOutsideClick = true
}) {
    let popup = document.getElementById('custom-popup');
    if (!popup) {
        popup = document.createElement('div');
        popup.id = 'custom-popup';
        popup.classList.add('popup-container');
        document.body.appendChild(popup);
    }
    
    popup.innerHTML = `
        <div class="popup-content">
            <div class="popup-title">${title}</div>
            <div class="popup-message">${message}</div>
            ${infoBox ? `<div class="popup-info-box">${infoBox}</div>` : ''}
            <div class="popup-buttons">
                <button class="popup-button popup-secondary-button" id="popup-secondary-btn">${secondaryButton.text}</button>
                <button class="popup-button popup-primary-button" id="popup-primary-btn">${primaryButton.text}</button>
            </div>
        </div>
    `;
    
    document.getElementById('popup-primary-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        primaryButton.action();
    });
    
    document.getElementById('popup-secondary-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        secondaryButton.action();
    });
    
    if (closeOnOutsideClick) {
        popup.querySelector('.popup-content').addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        popup.addEventListener('click', () => {
            hidePopup();
        });
    }
    
    popup.style.display = 'flex';
    
    window.hidePopup = function() {
        popup.style.display = 'none';
    };
}

// Function to close the popup
export function hidePopup() {
    const popup = document.getElementById('custom-popup');
    if (popup) {
        popup.style.display = 'none';
    }
}

// Init 
function initScrollHandling() {
    handleScroll();
    window.addEventListener('scroll', handleScroll);
}

window.onload = () => {
    initScrollHandling();
};
const langBtn = document.getElementById('langBtn');
const langDropdown = document.getElementById('langDropdown');

langBtn.addEventListener('click', (e) => {
    e.preventDefault();
    langDropdown.classList.toggle('show');
    // Toggle 'active' class to rotate the arrow
    langBtn.classList.toggle('active'); 
});

window.addEventListener('click', (e) => {
    if (!langBtn.contains(e.target)) {
        langDropdown.classList.remove('show');
        langBtn.classList.remove('active'); // Reset arrow if clicking outside
    }
});
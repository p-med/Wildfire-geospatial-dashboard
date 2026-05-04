//--------------------------------------------------------------------
// UI & LANGUAGE LOGIC
//--------------------------------------------------------------------
const langBtn = document.getElementById("langBtn");
const langDropdown = document.getElementById("langDropdown");

langBtn.addEventListener("click", (e) => {
  e.preventDefault();
  langBtn.classList.toggle("active");
  langDropdown.classList.toggle("show");
});

window.addEventListener("click", (e) => {
  if (!langBtn.contains(e.target)) {
    langDropdown.classList.remove("show");
    langBtn.classList.remove("active");
  }
});

langDropdown.addEventListener("click", (e) => {
  langBtn.innerHTML = e.target.textContent;
});
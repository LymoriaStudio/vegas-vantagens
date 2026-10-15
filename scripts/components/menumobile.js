const menuMobile = document.querySelector(".menu-hamb")
const mainMenus = document.querySelector(".main-menus")
const closeMenu = document.querySelector(".close-menu")
  const menuOverlay = document.querySelector(".menu-overlay");

closeMenu.addEventListener('click', () => {
   mainMenus.classList.remove("active")
   menuMobile.style.display = 'block'
   closeMenu.style.display = 'none'
     menuOverlay.classList.remove("active");

})

menuMobile.addEventListener("click", () => {
   mainMenus.classList.add("active")
   menuOverlay.classList.add("active");
   menuMobile.style.display = 'none'
   closeMenu.style.display = 'block'
})

  menuOverlay.addEventListener("click", () => {
   mainMenus.classList.remove("active")
   menuMobile.style.display = 'block'
   closeMenu.style.display = 'none'
   menuOverlay.classList.remove("active");

})

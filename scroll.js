// Nascondi header quando si scrolla verso il basso, mostra quando si scrolla verso l'alto
let lastScrollY = window.scrollY;
let ticking = false;
window.addEventListener('scroll', function () {
  if (!ticking) {
    window.requestAnimationFrame(function () {
      const header = document.querySelector('header');
      if (!header) return;
      const topV = window.scrollY > 320 ? -320 : -window.scrollY
      header.style.top = `${topV}px`;
      lastScrollY = window.scrollY;
      ticking = false;
    });
    ticking = true;
  }
});

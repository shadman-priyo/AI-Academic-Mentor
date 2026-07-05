// Landing page interactions
const nav = document.getElementById('mainNav');
const burger = document.getElementById('navBurger');
const mobileMenu = document.getElementById('navMobile');

window.addEventListener('scroll', () => {
  if (window.scrollY > 20) nav.classList.add('scrolled');
  else nav.classList.remove('scrolled');
});

burger?.addEventListener('click', () => {
  mobileMenu?.classList.toggle('open');
});

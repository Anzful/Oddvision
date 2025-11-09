/* Small site interactions for Oddvision landing page */
(function () {
  const STORE_PLACEHOLDER = "EXTENSION_ID";
  const DEFAULT_STORE_URL = window.ODDVISION_STORE_URL || "";

  // Mobile nav
  const navToggle = document.getElementById("navToggle");
  const header = document.querySelector(".ov-header");
  let open = false;
  if (navToggle) {
    navToggle.addEventListener("click", () => {
      const existing = header.querySelector(".ov-nav");
      if (!existing) return;
      open = !open;
      existing.classList.toggle("ov-nav--open", open);
    });
  }

  // Scroll reveal
  const revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("revealed");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("revealed"));
  }

  // Install buttons
  function openStore() {
    if (!DEFAULT_STORE_URL || DEFAULT_STORE_URL.includes(STORE_PLACEHOLDER)) {
      alert("Set your Chrome Web Store URL in website/index.html (ODDVISION_STORE_URL) once published.");
      return;
    }
    window.open(DEFAULT_STORE_URL, "_blank", "noopener");
  }

  const storeLink = document.getElementById("storeLink");
  const installPrimary = document.getElementById("installPrimary");
  if (storeLink) storeLink.addEventListener("click", (e) => { e.preventDefault(); openStore(); });
  if (installPrimary) installPrimary.addEventListener("click", (e) => { e.preventDefault(); openStore(); });
})(); 



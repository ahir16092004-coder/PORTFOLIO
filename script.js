(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(pointer: fine)").matches;

  /* ---------- Theme ---------- */
  var toggle = document.getElementById("theme-toggle");
  function effectiveTheme() {
    var explicit = root.getAttribute("data-theme");
    if (explicit) return explicit;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  try { var saved = localStorage.getItem("theme"); if (saved) root.setAttribute("data-theme", saved); } catch (e) {}
  toggle.addEventListener("click", function () {
    var next = effectiveTheme() === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch (e) {}
  });

  /* ---------- Mobile menu ---------- */
  var menuBtn = document.getElementById("menu-btn");
  var navLinks = document.getElementById("nav-links");
  function closeMenu() {
    navLinks.classList.remove("show");
    menuBtn.classList.remove("open");
    menuBtn.setAttribute("aria-expanded", "false");
  }
  menuBtn.addEventListener("click", function () {
    var open = navLinks.classList.toggle("show");
    menuBtn.classList.toggle("open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
  });
  navLinks.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", closeMenu); });

  /* ---------- Active nav link ---------- */
  var navAnchors = document.querySelectorAll(".nav-links a");
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      navAnchors.forEach(function (a) {
        a.classList.toggle("active", a.getAttribute("href") === "#" + entry.target.id);
      });
    });
  }, { rootMargin: "-40% 0px -55% 0px" });
  document.querySelectorAll("section[id]").forEach(function (s) { io.observe(s); });

  /* ---------- 3D tilt on hover (cards and list items) ---------- */
  if (!reduce && finePointer) {
    document.querySelectorAll(".tilt").forEach(function (el) {
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty("--ry", (px * 12).toFixed(2) + "deg");
        el.style.setProperty("--rx", (-py * 10).toFixed(2) + "deg");
      });
      el.addEventListener("mouseleave", function () {
        el.style.setProperty("--rx", "0deg");
        el.style.setProperty("--ry", "0deg");
      });
    });
  }

  /* ---------- Scroll parallax on the hero name ---------- */
  var heroName = document.getElementById("heroName");
  if (!reduce) {
    var ticking = false;
    window.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var y = Math.min(window.scrollY, 600);
        heroName.style.transform = "translate3d(0," + (y * 0.12).toFixed(1) + "px,0)";
        ticking = false;
      });
    }, { passive: true });
  }

  /* ---------- Living particle field with depth layers ---------- */
  var canvas = document.getElementById("field");
  var ctx = canvas.getContext("2d");
  var dot = "#ff5f1f", line = "#15130f";
  var w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
  var mouse = { x: -9999, y: -9999 };
  var particles = [];

  function readColors() {
    var cs = getComputedStyle(root);
    dot = cs.getPropertyValue("--accent").trim() || dot;
    line = cs.getPropertyValue("--ink").trim() || line;
  }

  function resize() {
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.width = w + "px"; canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var count = Math.min(110, Math.floor((w * h) / 14000));
    particles = [];
    for (var i = 0; i < count; i++) {
      var z = Math.random();              // depth: 0 far, 1 near
      particles.push({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * (0.2 + z * 0.5),
        vy: (Math.random() - 0.5) * (0.2 + z * 0.5),
        z: z, r: 0.6 + z * 2.2
      });
    }
  }

  function frame() {
    ctx.clearRect(0, 0, w, h);
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.x += p.vx; p.y += p.vy;
      var dx = p.x - mouse.x, dy = p.y - mouse.y;
      var d2 = dx * dx + dy * dy;
      if (d2 < 22000) { p.x += dx * 0.012 * (0.4 + p.z); p.y += dy * 0.012 * (0.4 + p.z); }
      if (p.x < -10) p.x = w + 10; if (p.x > w + 10) p.x = -10;
      if (p.y < -10) p.y = h + 10; if (p.y > h + 10) p.y = -10;

      ctx.globalAlpha = 0.25 + p.z * 0.5;
      ctx.fillStyle = dot;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();

      for (var j = i + 1; j < particles.length; j++) {
        var q = particles[j];
        var lx = p.x - q.x, ly = p.y - q.y;
        var dist = lx * lx + ly * ly;
        if (dist < 9000) {
          ctx.globalAlpha = (1 - dist / 9000) * 0.16 * (0.5 + p.z);
          ctx.strokeStyle = line;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
  }

  window.addEventListener("mousemove", function (e) { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
  window.addEventListener("mouseleave", function () { mouse.x = -9999; mouse.y = -9999; });
  window.addEventListener("resize", resize);

  readColors();
  resize();
  if (!reduce) requestAnimationFrame(frame);
})();

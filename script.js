const cursorCore = document.querySelector(".cursor-core");
const cursorRing = document.querySelector(".cursor-ring");
const cursorTrail = document.querySelector(".cursor-trail");
const spotlight = document.querySelector(".spotlight");
const progressFill = document.querySelector(".progress-fill");
const revealItems = document.querySelectorAll(".reveal");
const interactiveItems = document.querySelectorAll(".magnetic, .tilt");
const magneticItems = document.querySelectorAll(".magnetic");
const tiltItems = document.querySelectorAll(".tilt");
const canvas = document.querySelector(".fx-canvas");

const finePointer = window.matchMedia("(pointer: fine)").matches;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const pointer = {
  x: window.innerWidth / 2,
  y: window.innerHeight / 2,
  ringX: window.innerWidth / 2,
  ringY: window.innerHeight / 2,
};

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
      }
    });
  },
  {
    threshold: 0.16,
  }
);

revealItems.forEach((item) => observer.observe(item));

const updateProgress = () => {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
  progressFill.style.width = `${progress}%`;
};

window.addEventListener("scroll", updateProgress, { passive: true });
updateProgress();

document.addEventListener("contextmenu", (event) => {
  event.preventDefault();
});

document.addEventListener("selectstart", (event) => {
  event.preventDefault();
});

document.addEventListener("dblclick", (event) => {
  event.preventDefault();
});

document.addEventListener("selectionchange", () => {
  const selection = window.getSelection();
  if (selection && !selection.isCollapsed) {
    selection.removeAllRanges();
  }
});

document.addEventListener("mousedown", (event) => {
  if (event.button === 2 || event.button === 1) {
    event.preventDefault();
  }
});

document.addEventListener("auxclick", (event) => {
  event.preventDefault();
});

document.addEventListener("dragstart", (event) => {
  event.preventDefault();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
    event.preventDefault();
  }
});

if (finePointer) {
  let lastTrailTime = 0;

  const spawnTrailDot = (x, y) => {
    const dot = document.createElement("span");
    dot.className = "trail-dot";
    dot.style.left = `${x}px`;
    dot.style.top = `${y}px`;
    cursorTrail.appendChild(dot);

    window.setTimeout(() => {
      dot.remove();
    }, 700);
  };

  const spawnClickBurst = (x, y) => {
    const burst = document.createElement("span");
    burst.className = "click-burst";
    burst.style.left = `${x}px`;
    burst.style.top = `${y}px`;

    const ring = document.createElement("span");
    ring.className = "click-ring";
    burst.appendChild(ring);

    for (let index = 0; index < 10; index += 1) {
      const spark = document.createElement("span");
      spark.className = "click-spark";
      spark.style.setProperty("--angle", String(index * 36));
      spark.style.setProperty("--distance", String(16 + (index % 3) * 5));
      burst.appendChild(spark);
    }

    document.body.appendChild(burst);

    window.setTimeout(() => {
      burst.remove();
    }, 540);
  };

  window.addEventListener("mousemove", (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;

    document.documentElement.style.setProperty("--spot-x", `${pointer.x}px`);
    document.documentElement.style.setProperty("--spot-y", `${pointer.y}px`);

    const now = performance.now();
    if (now - lastTrailTime > 20) {
      spawnTrailDot(pointer.x, pointer.y);
      lastTrailTime = now;
    }
  });

  const animateCursor = () => {
    pointer.ringX += (pointer.x - pointer.ringX) * 0.16;
    pointer.ringY += (pointer.y - pointer.ringY) * 0.16;

    cursorCore.style.left = `${pointer.x}px`;
    cursorCore.style.top = `${pointer.y}px`;
    cursorRing.style.left = `${pointer.ringX}px`;
    cursorRing.style.top = `${pointer.ringY}px`;

    requestAnimationFrame(animateCursor);
  };

  animateCursor();

  interactiveItems.forEach((item) => {
    item.addEventListener("mouseenter", () => {
      cursorRing.classList.add("active");
    });

    item.addEventListener("mouseleave", () => {
      cursorRing.classList.remove("active");
    });
  });

  magneticItems.forEach((item) => {
    item.addEventListener("mouseleave", () => {
      item.style.transform = "";
    });

    item.addEventListener("mousemove", (event) => {
      const bounds = item.getBoundingClientRect();
      const moveX = (event.clientX - bounds.left - bounds.width / 2) * 0.045;
      const moveY = (event.clientY - bounds.top - bounds.height / 2) * 0.045;
      item.style.transform = `translate3d(${moveX}px, ${moveY}px, 0)`;
    });
  });

  tiltItems.forEach((item) => {
    item.addEventListener("mousemove", (event) => {
      const bounds = item.getBoundingClientRect();
      const rotateY = ((event.clientX - bounds.left) / bounds.width - 0.5) * 10;
      const rotateX = ((event.clientY - bounds.top) / bounds.height - 0.5) * -10;
      item.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });

    item.addEventListener("mouseleave", () => {
      item.style.transform = "";
    });
  });

  document.addEventListener("mouseleave", () => {
    cursorCore.style.opacity = "0";
    cursorRing.style.opacity = "0";
    if (spotlight) {
      spotlight.style.opacity = "0";
    }
  });

  document.addEventListener("mouseenter", () => {
    cursorCore.style.opacity = "1";
    cursorRing.style.opacity = "1";
    if (spotlight) {
      spotlight.style.opacity = "1";
    }
  });

  document.addEventListener("mousedown", (event) => {
    if (event.button !== 0) {
      return;
    }

    spawnClickBurst(event.clientX, event.clientY);
    cursorRing.classList.add("active");
    cursorCore.style.transform = "translate(-50%, -50%) scale(0.82)";
  });

  document.addEventListener("mouseup", (event) => {
    if (event.button !== 0) {
      return;
    }

    cursorCore.style.transform = "translate(-50%, -50%) scale(1)";
    window.setTimeout(() => {
      cursorRing.classList.remove("active");
    }, 90);
  });
}

if (!reducedMotion && canvas) {
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const particles = [];
    const particleCount = window.innerWidth < 720 ? 24 : 42;

    const resizeCanvas = () => {
      const ratio = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * ratio;
      canvas.height = window.innerHeight * ratio;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const createParticle = () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      size: Math.random() * 2.2 + 1.2,
    });

    resizeCanvas();

    for (let index = 0; index < particleCount; index += 1) {
      particles.push(createParticle());
    }

    const animateScene = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      particles.forEach((particle, index) => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < -40) particle.x = window.innerWidth + 40;
        if (particle.x > window.innerWidth + 40) particle.x = -40;
        if (particle.y < -40) particle.y = window.innerHeight + 40;
        if (particle.y > window.innerHeight + 40) particle.y = -40;

        const glow = ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, particle.size * 10);
        glow.addColorStop(0, "rgba(255, 121, 121, 0.85)");
        glow.addColorStop(1, "rgba(255, 121, 121, 0)");

        ctx.beginPath();
        ctx.fillStyle = glow;
        ctx.arc(particle.x, particle.y, particle.size * 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = "rgba(255, 228, 220, 0.8)";
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();

        for (let nextIndex = index + 1; nextIndex < particles.length; nextIndex += 1) {
          const next = particles[nextIndex];
          const dx = particle.x - next.x;
          const dy = particle.y - next.y;
          const distance = Math.hypot(dx, dy);

          if (distance < 150) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(255, 120, 137, ${0.13 - distance / 1400})`;
            ctx.lineWidth = 1;
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(next.x, next.y);
            ctx.stroke();
          }
        }
      });

      requestAnimationFrame(animateScene);
    };

    animateScene();
    window.addEventListener("resize", resizeCanvas);
  }
}

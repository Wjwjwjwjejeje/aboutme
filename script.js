const cursorCore = document.querySelector(".cursor-core");
const cursorRing = document.querySelector(".cursor-ring");
const cursorTrail = document.querySelector(".cursor-trail");
const spotlight = document.querySelector(".spotlight");
const progressFill = document.querySelector(".progress-fill");
const revealItems = document.querySelectorAll(".reveal");
const interactiveItems = document.querySelectorAll(".magnetic, .tilt");
const magneticItems = document.querySelectorAll(".magnetic");
const tiltItems = document.querySelectorAll(".tilt");
const surfaceItems = document.querySelectorAll(".panel, .hero-visual, .signal-card");
const canvas = document.querySelector(".fx-canvas");
const audio = document.querySelector(".site-audio");
const musicToggle = document.querySelector(".music-toggle");
const musicVisual = document.querySelector(".music-visual");
const audioState = document.querySelector("[data-audio-state]");
const rotatingTextItems = document.querySelectorAll("[data-rotate-text]");
const dockLinks = document.querySelectorAll(".dock-link");
const clockDisplay = document.querySelector("[data-clock]");
const railTracks = document.querySelectorAll(".status-track");

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

revealItems.forEach((item, index) => {
  item.style.transitionDelay = `${Math.min(index * 60, 360)}ms`;
  observer.observe(item);
});

rotatingTextItems.forEach((item) => {
  const values = item.dataset.rotateText?.split("|").map((value) => value.trim()).filter(Boolean) || [];
  if (values.length < 2) {
    return;
  }

  let index = 0;
  window.setInterval(() => {
    index = (index + 1) % values.length;
    item.textContent = values[index];
  }, 2200);
});

railTracks.forEach((track) => {
  if (track.dataset.loopReady === "true") {
    return;
  }

  track.innerHTML += track.innerHTML;
  track.dataset.loopReady = "true";
});

if (clockDisplay) {
  const clockFormatter = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Europe/Berlin",
  });

  const updateClockDisplay = () => {
    clockDisplay.textContent = clockFormatter.format(new Date());
  };

  updateClockDisplay();
  window.setInterval(updateClockDisplay, 1000);
}

if (dockLinks.length > 0) {
  const dockTargets = Array.from(dockLinks)
    .map((link) => ({
      link,
      target: document.querySelector(link.getAttribute("href")),
    }))
    .filter((entry) => entry.target);

  const setActiveDockLink = (activeId) => {
    dockTargets.forEach(({ link, target }) => {
      link.classList.toggle("is-active", target.id === activeId);
    });
  };

  const dockObserver = new IntersectionObserver(
    (entries) => {
      const visibleEntries = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

      if (visibleEntries.length > 0) {
        setActiveDockLink(visibleEntries[0].target.id);
      }
    },
    {
      threshold: [0.25, 0.45, 0.65],
      rootMargin: "-18% 0px -50% 0px",
    }
  );

  dockTargets.forEach(({ target }) => {
    dockObserver.observe(target);
  });
}

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

if (audio && musicToggle && musicVisual) {
  audio.volume = 0.82;
  audio.loop = true;

  let audioContext;
  let analyser;
  let frequencyData;
  let sourceNode;
  let audioAnalysisReady = false;
  let usingAudioFallback = false;

  const setAudioState = (label, buttonLabel) => {
    if (audioState) {
      audioState.textContent = label;
    }

    if (buttonLabel) {
      musicToggle.textContent = buttonLabel;
    }
  };

  const updateBeatVisual = (bass, energy, bars) => {
    const bassHit = Math.max(0, (bass - 0.14) * 2.55);
    const beatScale = 1 + bass * 0.24 + bassHit * 0.34;
    const beatGlow = 0.5 + energy * 1.18 + bassHit * 1.08;
    const ringScale = 1 + energy * 0.08 + bassHit * 0.22;
    const barBoost = 0.45 + energy * 0.8 + bassHit * 1.42;
    const flash = Math.min(1, bassHit * 2.2 + energy * 0.15);
    const burst = Math.min(1, bassHit * 1.95 + energy * 0.35);

    musicVisual.style.setProperty("--beat-scale", beatScale.toFixed(3));
    musicVisual.style.setProperty("--beat-glow", beatGlow.toFixed(3));
    musicVisual.style.setProperty("--ring-scale", ringScale.toFixed(3));
    musicVisual.style.setProperty("--beat-flash", flash.toFixed(3));
    musicVisual.style.setProperty("--beat-burst", burst.toFixed(3));

    bars.forEach((value, index) => {
      musicVisual.style.setProperty(`--bar-${index + 1}`, (0.34 + value * barBoost).toFixed(3));
    });
  };

  const startFallbackPulse = () => {
    if (usingAudioFallback) {
      return;
    }

    usingAudioFallback = true;

    const fallbackLoop = () => {
      const active = !audio.paused;
      const time = audio.currentTime || performance.now() / 1000;
      const bass = active ? (Math.sin(time * 3.8) * 0.5 + 0.5) * 0.75 : 0;
      const energy = active ? (Math.sin(time * 2.2 + 0.6) * 0.5 + 0.5) * 0.55 : 0;
      const bars = Array.from({ length: 12 }, (_, index) => {
        if (!active) {
          return 0.06 + (index % 3) * 0.03;
        }

        return (Math.sin(time * 4 + index * 0.55) * 0.5 + 0.5) * 0.8;
      });

      updateBeatVisual(bass, energy, bars);
      requestAnimationFrame(fallbackLoop);
    };

    fallbackLoop();
  };

  const ensureAudioAnalysis = async () => {
    if (audioAnalysisReady) {
      if (audioContext?.state === "suspended") {
        await audioContext.resume();
      }
      return true;
    }

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error("AudioContext unavailable");
      }

      audioContext = new AudioContextClass();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.78;
      frequencyData = new Uint8Array(analyser.frequencyBinCount);
      sourceNode = audioContext.createMediaElementSource(audio);
      sourceNode.connect(analyser);
      analyser.connect(audioContext.destination);
      audioAnalysisReady = true;
      return true;
    } catch (error) {
      startFallbackPulse();
      return false;
    }
  };

  const animateAudio = () => {
    if (audioAnalysisReady && analyser && frequencyData) {
      analyser.getByteFrequencyData(frequencyData);

      const bassBins = frequencyData.slice(0, 8);
      const energyBins = frequencyData.slice(0, 20);
      const bass = bassBins.reduce((sum, value) => sum + value, 0) / (bassBins.length * 255);
      const energy = energyBins.reduce((sum, value) => sum + value, 0) / (energyBins.length * 255);
      const bars = Array.from({ length: 12 }, (_, index) => {
        const value = frequencyData[Math.min(index * 2 + 2, frequencyData.length - 1)] || 0;
        return value / 255;
      });

      updateBeatVisual(bass, energy, bars);
    }

    requestAnimationFrame(animateAudio);
  };

  animateAudio();

  musicToggle.addEventListener("click", async () => {
    await ensureAudioAnalysis();

    if (audio.paused) {
      try {
        await audio.play();
      } catch (error) {
        setAudioState("Tap again", "Play track");
      }
    } else {
      audio.pause();
    }
  });

  audio.addEventListener("play", () => {
    musicVisual.classList.add("is-playing");
    setAudioState("Playing", "Pause track");
  });

  audio.addEventListener("pause", () => {
    musicVisual.classList.remove("is-playing");
    setAudioState("Paused", "Play track");
  });

  audio.addEventListener("ended", () => {
    musicVisual.classList.remove("is-playing");
    setAudioState("Finished", "Play again");
  });

  audio.addEventListener("error", () => {
    musicVisual.classList.remove("is-playing");
    setAudioState("Audio blocked", "Retry track");
    startFallbackPulse();
  });
}

if (finePointer) {
  let lastTrailTime = 0;

  const setMotionValue = (item, property, value, unit) => {
    item.style.setProperty(property, `${value}${unit}`);
  };

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
    document.documentElement.style.setProperty("--drift-x", `${((pointer.x / window.innerWidth) - 0.5) * 48}px`);
    document.documentElement.style.setProperty("--drift-y", `${((pointer.y / window.innerHeight) - 0.5) * 42}px`);

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

  surfaceItems.forEach((item) => {
    item.addEventListener("mousemove", (event) => {
      const bounds = item.getBoundingClientRect();
      const posX = ((event.clientX - bounds.left) / bounds.width) * 100;
      const posY = ((event.clientY - bounds.top) / bounds.height) * 100;
      item.style.setProperty("--px", `${posX}%`);
      item.style.setProperty("--py", `${posY}%`);
    });

    item.addEventListener("mouseleave", () => {
      item.style.removeProperty("--px");
      item.style.removeProperty("--py");
    });
  });

  magneticItems.forEach((item) => {
    item.addEventListener("mouseleave", () => {
      setMotionValue(item, "--tx", 0, "px");
      setMotionValue(item, "--ty", 0, "px");
    });

    item.addEventListener("mousemove", (event) => {
      const bounds = item.getBoundingClientRect();
      const moveX = (event.clientX - bounds.left - bounds.width / 2) * 0.045;
      const moveY = (event.clientY - bounds.top - bounds.height / 2) * 0.045;
      setMotionValue(item, "--tx", moveX, "px");
      setMotionValue(item, "--ty", moveY, "px");
    });
  });

  tiltItems.forEach((item) => {
    item.addEventListener("mousemove", (event) => {
      const bounds = item.getBoundingClientRect();
      const rotateY = ((event.clientX - bounds.left) / bounds.width - 0.5) * 10;
      const rotateX = ((event.clientY - bounds.top) / bounds.height - 0.5) * -10;
      setMotionValue(item, "--rx", rotateX, "deg");
      setMotionValue(item, "--ry", rotateY, "deg");
    });

    item.addEventListener("mouseleave", () => {
      setMotionValue(item, "--rx", 0, "deg");
      setMotionValue(item, "--ry", 0, "deg");
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
      drift: Math.random() * Math.PI * 2,
    });

    resizeCanvas();

    for (let index = 0; index < particleCount; index += 1) {
      particles.push(createParticle());
    }

    const animateScene = () => {
      const time = performance.now() * 0.001;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      particles.forEach((particle, index) => {
        particle.drift += 0.008;
        particle.vx += Math.cos(particle.drift) * 0.002;
        particle.vy += Math.sin(particle.drift) * 0.002;

        const pointerDx = pointer.x - particle.x;
        const pointerDy = pointer.y - particle.y;
        const pointerDistance = Math.hypot(pointerDx, pointerDy);

        if (pointerDistance < 180) {
          const force = (1 - pointerDistance / 180) * 0.018;
          particle.vx -= (pointerDx / Math.max(pointerDistance, 1)) * force;
          particle.vy -= (pointerDy / Math.max(pointerDistance, 1)) * force;
        }

        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vx *= 0.995;
        particle.vy *= 0.995;

        if (particle.x < -40) particle.x = window.innerWidth + 40;
        if (particle.x > window.innerWidth + 40) particle.x = -40;
        if (particle.y < -40) particle.y = window.innerHeight + 40;
        if (particle.y > window.innerHeight + 40) particle.y = -40;

        const pulse = 0.78 + Math.sin(time * 1.6 + index * 0.7) * 0.18;
        const glow = ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, particle.size * 12 * pulse);
        glow.addColorStop(0, "rgba(255, 121, 121, 0.78)");
        glow.addColorStop(1, "rgba(255, 121, 121, 0)");

        ctx.beginPath();
        ctx.fillStyle = glow;
        ctx.arc(particle.x, particle.y, particle.size * 12 * pulse, 0, Math.PI * 2);
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
            ctx.strokeStyle = `rgba(255, 120, 137, ${0.14 - distance / 1300})`;
            ctx.lineWidth = 1;
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(next.x, next.y);
            ctx.stroke();
          }
        }
      });

      if (finePointer) {
        const pointerGlow = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 180);
        pointerGlow.addColorStop(0, "rgba(255, 90, 122, 0.12)");
        pointerGlow.addColorStop(1, "rgba(255, 90, 122, 0)");
        ctx.beginPath();
        ctx.fillStyle = pointerGlow;
        ctx.arc(pointer.x, pointer.y, 180, 0, Math.PI * 2);
        ctx.fill();
      }

      requestAnimationFrame(animateScene);
    };

    animateScene();
    window.addEventListener("resize", resizeCanvas);
  }
}

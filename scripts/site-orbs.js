document.addEventListener("DOMContentLoaded", () => {
  const pageName = document.body.dataset.page || "home";
  const seed = [...pageName].reduce((total, character) => total + character.charCodeAt(0), 0);
  const random = (index) => ((seed * (index + 17) * 9301 + 49297) % 233280) / 233280;
  const anchors = [
    [-14, 8],
    [78, -16],
    [66, 73],
    [-10, 72],
  ];
  const orbs = document.createElement("div");
  orbs.className = "ambient-orbs";
  orbs.setAttribute("aria-hidden", "true");

  anchors.forEach(([left, top], index) => {
    const orb = document.createElement("span");
    const size = 180 + Math.round(random(index) * 120);
    orb.className = "ambient-orb";
    orb.style.setProperty("--orb-size", `${size}px`);
    orb.style.setProperty("--orb-left", `${left + Math.round(random(index + 4) * 14 - 7)}vw`);
    orb.style.setProperty("--orb-top", `${top + Math.round(random(index + 8) * 12 - 6)}vh`);
    orb.style.setProperty("--drift-x", `${Math.round(random(index + 12) * 34 - 17)}px`);
    orb.style.setProperty("--drift-y", `${Math.round(random(index + 16) * 34 - 17)}px`);
    orb.style.setProperty("--orb-duration", `${15 + index * 3}s`);
    orb.style.setProperty("--orb-delay", `${-index * 2}s`);
    orbs.append(orb);
  });

  document.body.prepend(orbs);
});

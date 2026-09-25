document.addEventListener("DOMContentLoaded", () => {
  const anonymousToggle = document.querySelector("[data-anonymous-toggle]");
  const discordInput = document.querySelector('input[name="discordUser"]');
  const ratingButtons = [...document.querySelectorAll(".rating-button")];

  function syncAnonymousState() {
    discordInput.hidden = anonymousToggle.checked;
    discordInput.setAttribute("aria-hidden", String(anonymousToggle.checked));
    if (anonymousToggle.checked) discordInput.value = "";
  }

  if (anonymousToggle && discordInput) {
    anonymousToggle.addEventListener("change", syncAnonymousState);
    syncAnonymousState();
  }

  ratingButtons.forEach((button, index) => {
    button.dataset.rating = String(index + 1);
    button.addEventListener("click", () => {
      const rating = index + 1;
      ratingButtons.forEach((item, itemIndex) => {
        item.classList.toggle("is-selected", itemIndex < rating);
        item.classList.remove("is-animating");
      });
      ratingButtons.slice(0, rating).forEach((item, itemIndex) => {
        window.setTimeout(() => item.classList.add("is-animating"), itemIndex * 45);
      });
    });
  });
});

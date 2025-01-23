function makeButtonClickable(button) {
  let lastClickTime = 0;
  const delay = 120;
  function handleMouseDown() {
    const currentTime = Date.now();
    if (currentTime - lastClickTime > delay) {
      button.classList.add("fast-click");
      const descendants = button.querySelectorAll("*");
      descendants.forEach((descendant) =>
        descendant.classList.add("fast-click")
      );
      lastClickTime = currentTime;
    }
  }

  function handleMouseUp() {
    setTimeout(() => {
      button.classList.remove("fast-click");
      const descendants = button.querySelectorAll("*");
      descendants.forEach((descendant) =>
        descendant.classList.remove("fast-click")
      );
    }, delay);
  }

  function handleMouseLeave() {
    button.classList.remove("fast-click");
    const descendants = button.querySelectorAll("*");
    descendants.forEach((descendant) =>
      descendant.classList.remove("fast-click")
    );
  }

  button.addEventListener("mousedown", handleMouseDown);
  button.addEventListener("mouseup", handleMouseUp);
  button.addEventListener("mouseleave", handleMouseLeave);
}

const sliderBtns = document.querySelectorAll(".slider-btn");

sliderBtns.forEach((btn) => makeButtonClickable(btn));

const addMouseEffect = (buttons) => {
  for (const button of buttons) {
    button.onmousemove = (e) => {
      const rect = button.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      button.style.setProperty("--mouse-x", `${x}px`);
      button.style.setProperty("--mouse-y", `${y}px`);
    };
  }
};

addMouseEffect(buyButtons);
addMouseEffect(sliderBtns);

const header = document.getElementById("sceneHeader");
const toggle = document.getElementById("toggleHeader");

// collapse/expand header scene
toggle.addEventListener("click", () => {
  const collapsed = header.classList.toggle("isCollapsed");
  toggle.setAttribute("aria-expanded", (!collapsed).toString());
});

// Optional: close the header when a tile is clicked (feels like “selecting a car”)
document.querySelectorAll(".tile").forEach(tile => {
  tile.addEventListener("click", () => {
    header.classList.add("isCollapsed");
    toggle.setAttribute("aria-expanded", "false");
  });
});

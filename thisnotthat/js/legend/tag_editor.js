function render({ model, el }) {
  let filterText = "";

  function updateTagState(tag_id, newState) {
    const tagSet = model.get("tag_set") || [];
    const updatedTags = tagSet.map(t => {
      if (t.tag_id === tag_id) {
        return {
          ...t,
          include_btn_active: newState === "right",
          exclude_btn_active: newState === "left"
        };
      }
      return t;
    });
    model.set("tag_set", updatedTags);
    model.save_changes();
  }

  function buildUI(tagSet) {
    const includedTags = tagSet.filter(t => t.include_btn_active);
    const excludedTags = tagSet.filter(t => t.exclude_btn_active);

    el.innerHTML = `
      <div class="tag-editor-container">
        <div class="active-tag-area">
          <div class="active-tags included">
            <strong>Included:</strong>
            ${includedTags.length
              ? includedTags.map(t => `<span class="quick-remove included-tag" data-id="${t.tag_id}">${t.tag}</span>`).join(", ")
              : "<em>None</em>"}
          </div>
          <div class="active-tags excluded">
            <strong>Excluded:</strong>
            ${excludedTags.length
              ? excludedTags.map(t => `<span class="quick-remove excluded-tag" data-id="${t.tag_id}">${t.tag}</span>`).join(", ")
              : "<em>None</em>"}
          </div>
        </div>

        <div class="search-container">
          <input type="text" id="tag-search" placeholder="Search tags..." />
        </div>

        <div class="button-grid"></div>
      </div>
    `;

    const searchBox = el.querySelector("#tag-search");
    searchBox.value = filterText;
    searchBox.addEventListener("input", (e) => {
      filterText = e.target.value;
      renderFilteredGrid(model.get("tag_set"));
    });

    const quickRemove = (tag_id, type) => {
      updateTagState(tag_id, "center");
      renderFilteredGrid(model.get("tag_set"));
      buildUI(model.get("tag_set"));
    };

    // Pass type so highlight colour is correct
    el.querySelectorAll(".quick-remove.included-tag").forEach(span => {
      span.onclick = () => quickRemove(parseInt(span.dataset.id, 10), "included");
    });
    el.querySelectorAll(".quick-remove.excluded-tag").forEach(span => {
      span.onclick = () => quickRemove(parseInt(span.dataset.id, 10), "excluded");
    });

    renderFilteredGrid(tagSet);
  }

  function renderFilteredGrid(tagSet) {
    const gridEl = el.querySelector(".button-grid");
    const filteredTags = tagSet.filter(tag =>
      tag.tag.toLowerCase().includes(filterText.toLowerCase())
    );

    gridEl.innerHTML = "";
    filteredTags.forEach(tag => {
      const itemEl = document.createElement("div");
      itemEl.className = "button-item";
      itemEl.dataset.tagId = tag.tag_id;

      const switchContainer = document.createElement("div");
      switchContainer.className = "triple-switch";
      switchContainer.innerHTML = `<span>✕</span><span>✓</span>`;

      const knob = document.createElement("div");
      knob.className = "knob";
      switchContainer.appendChild(knob);

      const states = ["left", "center", "right"];
      const positions = { "left": 3, "center": 20, "right": 37 };

      let currentState = tag.exclude_btn_active ? "left"
                        : tag.include_btn_active ? "right"
                        : "center";

      function updateUI(state) {
        switchContainer.classList.remove("left", "center", "right");
        switchContainer.classList.add(state);
        knob.style.left = positions[state] + "px";
      }
      updateUI(currentState);

      switchContainer.addEventListener("click", (evt) => {
        if (isDragging) return;
        const rect = switchContainer.getBoundingClientRect();
        const x = evt.clientX - rect.left;
        const third = rect.width / 3;
        if (x < third) currentState = "left";
        else if (x < 2 * third) currentState = "center";
        else currentState = "right";

        updateUI(currentState);
        updateTagState(tag.tag_id, currentState);
        buildUI(model.get("tag_set"));
      });

      // Dragging
      let isDragging = false;
      let startX = 0;
      let startLeft = 0;
      const startDrag = (x) => {
        isDragging = true;
        startX = x;
        startLeft = parseInt(knob.style.left);
        document.body.style.userSelect = "none";
      };
      const doDrag = (x) => {
        if (!isDragging) return;
        const dx = x - startX;
        const newLeft = Math.min(Math.max(startLeft + dx, positions.left), positions.right);
        knob.style.left = newLeft + "px";
      };
      const endDrag = () => {
        if (isDragging) {
          isDragging = false;
          document.body.style.userSelect = "";
          const leftVal = parseInt(knob.style.left);
          const nearest = states.reduce((a,b) =>
            Math.abs(positions[a] - leftVal) < Math.abs(positions[b] - leftVal) ? a : b
          );
          currentState = nearest;
          updateUI(currentState);
          updateTagState(tag.tag_id, currentState);
          buildUI(model.get("tag_set"));
        }
      };

      knob.addEventListener("mousedown", e => startDrag(e.clientX));
      window.addEventListener("mousemove", e => doDrag(e.clientX));
      window.addEventListener("mouseup", endDrag);
      knob.addEventListener("touchstart", e => startDrag(e.touches[0].clientX), {passive:true});
      window.addEventListener("touchmove", e => doDrag(e.touches[0].clientX), {passive:true});
      window.addEventListener("touchend", endDrag);

      const label = document.createElement("span");
      label.textContent = tag.tag;

      itemEl.appendChild(switchContainer);
      itemEl.appendChild(label);
      gridEl.appendChild(itemEl);
    });
  }


  buildUI(model.get("tag_set"));
  model.on("change:tag_set", () => buildUI(model.get("tag_set")));
}

export default { render };

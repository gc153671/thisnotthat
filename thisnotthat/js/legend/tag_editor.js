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

        <div class="add-tag-container">
          <input type="text" id="new-tag-input" placeholder="New tag..." />
          <button id="add-tag-btn">Add</button>
        </div>
      </div>
    `;

    const searchBox = el.querySelector("#tag-search");
    searchBox.value = filterText;
    searchBox.addEventListener("input", (e) => {
      filterText = e.target.value;
      renderFilteredGrid(model.get("tag_set"));
    });

    const quickRemove = (tag_id) => {
      updateTagState(tag_id, "center");
      renderFilteredGrid(model.get("tag_set"));
      buildUI(model.get("tag_set"));
    };
    el.querySelectorAll(".quick-remove.included-tag").forEach(span => {
      span.onclick = () => quickRemove(parseInt(span.dataset.id, 10));
    });
    el.querySelectorAll(".quick-remove.excluded-tag").forEach(span => {
      span.onclick = () => quickRemove(parseInt(span.dataset.id, 10));
    });

    renderFilteredGrid(tagSet);

    const newTagInput = el.querySelector("#new-tag-input");
    const addTagBtn = el.querySelector("#add-tag-btn");

    function addNewTag(newTag) {
      const tagSetCur = model.get("tag_set") || [];
      if (!newTag.trim()) return;

      if (tagSetCur.some(t => t.tag.toLowerCase() === newTag.toLowerCase())) {
        alert("Tag already exists.");
        return;
      }

      const selection = model.get("selection") || [];
      const nextId = tagSetCur.length > 0 ? Math.max(...tagSetCur.map(t => t.tag_id)) + 1 : 0;

      tagSetCur.push({
        tag_id: nextId,
        tag: newTag,
        include_btn_active: false,
        exclude_btn_active: false
      });

      model.set("tag_set", tagSetCur);
      model.save_changes();

      model.send({
        action: "assign_tag_to_selection",
        tag: newTag,
        assign: selection.length > 0
      });

      setTimeout(() => {
        buildUI(model.get("tag_set"));
      }, 0);

      newTagInput.value = "";
    }

    addTagBtn.addEventListener("click", () => addNewTag(newTagInput.value));
    newTagInput.addEventListener("keypress", e => {
      if (e.key === "Enter") addNewTag(newTagInput.value);
    });
  }

  function renderFilteredGrid(tagSet, scrollToId = null) {
    const gridEl = el.querySelector(".button-grid");

    // Sort tags alphabetically (case-insensitive)
    const sortedTags = [...tagSet].sort((a, b) =>
      a.tag.toLowerCase().localeCompare(b.tag.toLowerCase())
    );

    const filteredTags = sortedTags.filter(tag =>
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

      let isDragging = false, startX = 0, startLeft = 0;
      const startDrag = (x) => { isDragging = true; startX = x; startLeft = parseInt(knob.style.left); document.body.style.userSelect = "none"; };
      const doDrag = (x) => { if (!isDragging) return; const dx = x - startX; const newLeft = Math.min(Math.max(startLeft + dx, positions.left), positions.right); knob.style.left = newLeft + "px"; };
      const endDrag = () => {
        if (isDragging) {
          isDragging = false;
          document.body.style.userSelect = "";
          const leftVal = parseInt(knob.style.left);
          const nearest = states.reduce((a,b) => Math.abs(positions[a] - leftVal) < Math.abs(positions[b] - leftVal) ? a : b);
          currentState = nearest;
          updateUI(currentState);
          updateTagState(tag.tag_id, currentState);
          buildUI(model.get("tag_set"));
        }
      };

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


      const label = document.createElement("span");
      label.textContent = tag.tag;
      label.className = "tag-label";

      const editIcon = document.createElement("img");
      editIcon.src = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMCAyMCI+PHBhdGggZD0iTTE0LjY5IDIuODZsMi40NSAyLjQ1LTkuMTkgOS4xOUg1LjV2LTIuNDVsOS4xOS05LjE5ek0xOC4xIDEuNDVhMS41IDEuNSAwIDAgMC0yLjEyIDBsLTEuMDYgMS4wNiAyLjQ1IDIuNDUgMS4wNi0xLjA2YTEuNSAxLjUgMCAwIDAgMC0yLjEyTDE4LjEgMS40NXoiIGZpbGw9ImN1cnJlbnRDb2xvciIvPjwvc3ZnPg==";
      editIcon.className = "edit-icon";
      editIcon.title = "Edit tag";

      editIcon.addEventListener("click", () => {
        const input = document.createElement("input");
        input.type = "text";
        input.value = tag.tag;
        input.className = "edit-input";

        const finishEdit = () => {
          const newName = input.value.trim();
          if (!newName) {
            buildUI(model.get("tag_set"));
            return;
          }

          const tagSetCurrent = model.get("tag_set") || [];
          const updatedTags = tagSetCurrent.map(t =>
            t.tag_id === tag.tag_id ? { ...t, tag: newName } : t
          );

          model.set("tag_set", updatedTags);
          model.save_changes();

          setTimeout(() => {
            buildUI(model.get("tag_set"));
          }, 0);
        };


        input.addEventListener("blur", finishEdit);
        input.addEventListener("keypress", e => { if (e.key === "Enter") finishEdit(); });
        label.replaceWith(input);
        input.focus();
      });

      itemEl.appendChild(switchContainer);
      itemEl.appendChild(label);
      itemEl.appendChild(editIcon);
      gridEl.appendChild(itemEl);

      if (scrollToId !== null && tag.tag_id === scrollToId) {
        const needsScroll = gridEl.scrollHeight > gridEl.clientHeight;
        const isOutOfView = itemEl.offsetTop < gridEl.scrollTop ||
            (itemEl.offsetTop + itemEl.clientHeight) > (gridEl.scrollTop + gridEl.clientHeight);

        if (needsScroll && isOutOfView) {
          itemEl.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    });
  }

  buildUI(model.get("tag_set"));
  model.on("change:tag_set", () => buildUI(model.get("tag_set")));
}

export default { render };

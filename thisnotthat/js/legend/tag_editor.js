function render({ model, el }) {
  let filterText = "";

  function updateTagState(tag_id, fieldName, value) {
    const tagSet = model.get("tag_set") || [];
    const updatedTags = tagSet.map(t =>
      t.tag_id === tag_id
        ? { ...t, [fieldName]: value }
        : t
    );
    model.set("tag_set", updatedTags);
    model.save_changes();
  }

  function buildUI(tagSet) {
    const includedTags = tagSet.filter(t => t.include_btn_active);
    const excludedTags = tagSet.filter(t => t.exclude_btn_active);

    el.innerHTML = `
      <div class="tag-editor-container">
        
        <!-- Summary -->
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

        <!-- Search -->
        <div class="search-container">
          <input type="text" id="tag-search" placeholder="Search tags..." />
        </div>

        <!-- Scrollable grid -->
        <div class="button-grid"></div>
      </div>
    `;

    // Quick remove handlers
    el.querySelectorAll(".quick-remove.included-tag").forEach(span => {
      span.onclick = () => updateTagState(parseInt(span.dataset.id, 10), "include_btn_active", false);
    });
    el.querySelectorAll(".quick-remove.excluded-tag").forEach(span => {
      span.onclick = () => updateTagState(parseInt(span.dataset.id, 10), "exclude_btn_active", false);
    });

    // Search
    const searchBox = el.querySelector("#tag-search");
    searchBox.value = filterText;
    searchBox.addEventListener("input", (e) => {
      filterText = e.target.value;
      renderFilteredGrid(tagSet);
    });

    // Initial grid
    renderFilteredGrid(tagSet);
  }

  function renderFilteredGrid(tagSet) {
    const gridEl = el.querySelector(".button-grid");

    const filteredTags = tagSet.filter(tag =>
      tag.tag.toLowerCase().includes(filterText.toLowerCase())
    );

    gridEl.innerHTML = filteredTags.map(tag => `
      <div class="button-item">
        <button id="btn-include-${tag.tag_id}" class="${tag.include_btn_active ? 'active' : ''}">Y</button>
        <button id="btn-exclude-${tag.tag_id}" class="${tag.exclude_btn_active ? 'active' : ''}">N</button>
        <span>${tag.tag}</span>
      </div>
    `).join("");

    // Button toggle handlers
    filteredTags.forEach(tag => {
      const includeBtn = gridEl.querySelector(`#btn-include-${tag.tag_id}`);
      const excludeBtn = gridEl.querySelector(`#btn-exclude-${tag.tag_id}`);

      includeBtn.onclick = () => updateTagState(tag.tag_id, "include_btn_active", !tag.include_btn_active);
      excludeBtn.onclick = () => updateTagState(tag.tag_id, "exclude_btn_active", !tag.exclude_btn_active);
    });
  }

  // Initial build
  buildUI(model.get("tag_set"));

  // Listen for model changes
  model.on("change:tag_set", () => {
    buildUI(model.get("tag_set"));
  });
}

export default { render };

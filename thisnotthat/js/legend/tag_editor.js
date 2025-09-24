function draw(model, el) {
  const tagSet = model.get("tag_set") || [];

  // Find active tags
  const includedTags = tagSet.filter(t => t.include_btn_active);
  const excludedTags = tagSet.filter(t => t.exclude_btn_active);

  // HTML output with clickable spans for quick removal
  el.innerHTML = `
    <div class="active-tag-area">
      <div class="active-tags included">
        <strong>Included:</strong> 
        ${includedTags.length 
          ? includedTags.map(t => `<span class="quick-remove included-tag" data-id="${t.tag_id}">${t.tag}</span>`).join(", ") 
          : "<em>None</em>"
        }
      </div>
      <div class="active-tags excluded">
        <strong>Excluded:</strong> 
        ${excludedTags.length 
          ? excludedTags.map(t => `<span class="quick-remove excluded-tag" data-id="${t.tag_id}">${t.tag}</span>`).join(", ")
          : "<em>None</em>"
        }
      </div>
    </div>
    <div class="button-grid">
      ${tagSet.map(tag => `
        <div class="button-item">
          <button id="btn-include-${tag.tag_id}" class="${tag.include_btn_active ? 'active' : ''}">Y</button>
          <button id="btn-exclude-${tag.tag_id}" class="${tag.exclude_btn_active ? 'active' : ''}">N</button>
          <span>${tag.tag}</span>
        </div>
      `).join("")}
    </div>
  `;

  // Event handlers for buttons
  tagSet.forEach(tag => {
    const includeBtn = el.querySelector(`#btn-include-${tag.tag_id}`);
    const excludeBtn = el.querySelector(`#btn-exclude-${tag.tag_id}`);

    includeBtn.onclick = () => {
      const updatedTags = tagSet.map(t =>
        t.tag_id === tag.tag_id
          ? { ...t, include_btn_active: !t.include_btn_active }
          : t
      );
      model.set("tag_set", updatedTags);
      model.save_changes();
    };

    excludeBtn.onclick = () => {
      const updatedTags = tagSet.map(t =>
        t.tag_id === tag.tag_id
          ? { ...t, exclude_btn_active: !t.exclude_btn_active }
          : t
      );
      model.set("tag_set", updatedTags);
      model.save_changes();
    };
  });

  // Quick remove handlers
  el.querySelectorAll(".quick-remove.included-tag").forEach(span => {
    span.onclick = () => {
      const idToRemove = parseInt(span.dataset.id, 10);
      const updatedTags = tagSet.map(t =>
        t.tag_id === idToRemove
          ? { ...t, include_btn_active: false }
          : t
      );
      model.set("tag_set", updatedTags);
      model.save_changes();
    };
  });

  el.querySelectorAll(".quick-remove.excluded-tag").forEach(span => {
    span.onclick = () => {
      const idToRemove = parseInt(span.dataset.id, 10);
      const updatedTags = tagSet.map(t =>
        t.tag_id === idToRemove
          ? { ...t, exclude_btn_active: false }
          : t
      );
      model.set("tag_set", updatedTags);
      model.save_changes();
    };
  });
}

function render({ model, el }) {
  draw(model, el);
  model.on("change:tag_set", () => draw(model, el));
}

export default { render };
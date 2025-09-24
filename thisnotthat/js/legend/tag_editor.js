function draw(model, el) {
  const tagSet = model.get("tag_set") || [];
  
  el.innerHTML = `
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
}

function render({ model, el }) {
  draw(model, el);
  model.on("change:tag_set", () => draw(model, el));
}

export default { render };

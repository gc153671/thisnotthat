function draw(model, el) {
  const tagSet = model.get("tag_set") || [];
  const includeBtnStates = model.get("include_btn_states") || [];
  const excludeBtnStates = model.get("exclude_btn_states") || [];

  el.innerHTML = `
    <div class="button-grid">
      ${tagSet.map((tag, idx) => `
        <div class="button-item">
          <button id="btn-include-${idx}" class="${includeBtnStates[idx] ? 'active' : ''}">Y</button>
          <button id="btn-exclude-${idx}" class="${excludeBtnStates[idx] ? 'active' : ''}">N</button>
          <span>${tag}</span>
        </div>
      `).join("")}
    </div>
  `;

  tagSet.forEach((_, idx) => {
    const includeBtn = el.querySelector(`#btn-include-${idx}`);
    const excludeBtn = el.querySelector(`#btn-exclude-${idx}`);

    includeBtn.onclick = () => {
      const newStates = [...(model.get("include_btn_states") || [])];
      newStates[idx] = !newStates[idx];
      // console.log("Sending include_btn_states:", newStates);
      // model.set("include_btn_states", newStates);
      model.save_changes();
    };

    excludeBtn.onclick = () => {
      const newStates = [...(model.get("exclude_btn_states") || [])];
      newStates[idx] = !newStates[idx];
      // console.log("Sending exclude_btn_states:", newStates);
      // model.set("exclude_btn_states", newStates);
      model.save_changes();
    };
  });
}

function render({ model, el }) {
  // Initial draw
  draw(model, el);

  // Redraw when states change
  model.on("change:include_btn_states", () => draw(model, el));
  model.on("change:exclude_btn_states", () => draw(model, el));
}

export default { render };

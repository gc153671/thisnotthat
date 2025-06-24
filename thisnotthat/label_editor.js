function dismissNameEditor(model, label, editor) {
    let td = editor.parentNode;
    editor.remove();
    addLabelName(model, label, td);
}


function acceptNameChange(model, label, editor) {
    let names_current = model.get("_names");
    let names_new = {};
    names_new[label.toString()] = editor.value;
    for (const lab of model.get("_labels")) {
        if (lab != label) {
            names_new[lab.toString()] = names_current[lab.toString()];
        }
    }
    model.set("_names", names_new);
    model.save_changes();
    dismissNameEditor(model, label, editor);
}


function onClickLabelName(model, label, td) {
    td.innerHTML = "";
    let editor = document.createElement("input");
    editor.type = "text";
    editor.value = model.get("_names")[label.toString()];
    editor.classList.add("name_editor");
    editor.addEventListener("blur", () => { acceptNameChange(model, label, editor); });
    editor.addEventListener("keyup", (ev) => {
        if (ev.key == "Enter") {
            acceptNameChange(model, label, editor);
        }
        else if (ev.key.startsWith("Esc")) {
            dismissNameEditor(model, label, editor);
        }
    })
    td.appendChild(editor);
    editor.select();
}


function addLabelName(model, label, td) {
    let div_name = document.createElement("div");
    div_name.classList.add("label_name")
    function set_name() {
        div_name.innerHTML = model.get("_names")[label.toString()];
    }
    set_name();
    div_name.addEventListener("click", () => { onClickLabelName(model, label, td); });
    model.on("change:_names", set_name);
    td.appendChild(div_name);

    let mirror_selection = document.createElement("canvas");
    mirror_selection.classList.add("mirror_selection");
    function draw_selection() {
        let propn = model.get("_propn_selected")[label.toString()];
        const w = mirror_selection.width;
        const h = Math.max(
            2,
            Math.round(1 * mirror_selection.height / mirror_selection.clientHeight)
        );
        const y = mirror_selection.height - 3 * h;
        if (propn > 0.0) {
            let ctx = mirror_selection.getContext("2d");
            if (propn < 1.0) {
                ctx.fillStyle = "#eeeeee";
                ctx.fillRect(0, y, w, h);
                ctx.fillStyle = "#111111";
                ctx.fillRect(0, y, propn * w, h);
            }
            else
            {
                ctx.fillStyle = model.get("_colors")[label.toString()];
                ctx.fillRect(0, y, w, h);
            }
        }
    }
    window.setTimeout(draw_selection, 10);
    model.on("change:_propn_selected", draw_selection);
    td.appendChild(mirror_selection);
}


function addLabelColor(model, label, td) {
    let tile = document.createElement("button");
    tile.classList.add("tile");
    function set_color() {
        tile.style.background = model.get("_colors")[label.toString()] || "#000000";
    }
    set_color();
    model.on("change:_colors", set_color);
    td.appendChild(tile);
}


function render({model, el}) {
    let labels = model.get("_labels");
    let table_labels = document.createElement("table");
    table_labels.classList.add("label_editor");
    for (const label of labels) {
        let tr = document.createElement("tr");

        let td_color = document.createElement("td");
        td_color.classList.add("label_column", "column_color");
        addLabelColor(model, label, td_color);
        tr.appendChild(td_color);

        let td_name = document.createElement("td");
        td_name.classList.add("label_column", "column_name");
        addLabelName(model, label, td_name);
        tr.appendChild(td_name);

        table_labels.appendChild(tr);
    }
    el.appendChild(table_labels);
}


export default { render };

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
    div_name.innerHTML = model.get("_names")[label.toString()];
    div_name.addEventListener("click", () => { onClickLabelName(model, label, td); });
    td.appendChild(div_name);
}


function render({model, el}) {
    let labels = model.get("_labels");
    let names = model.get("_names");
    let colors = model.get("_colors");
    let propn_selected = model.get("_propn_selected");

    let table_labels = document.createElement("table");
    table_labels.classList.add("label_editor");
    for (const label of labels) {
        let tr = document.createElement("tr");

        let td_color = document.createElement("td");
        td_color.classList.add("label_column", "column_color");
        let tile = document.createElement("button");
        tile.classList.add("tile");
        tile.style.background = colors[label.toString()] || "#000000";
        td_color.appendChild(tile);
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

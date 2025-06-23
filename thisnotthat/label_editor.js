function dismissNameEditor(model, i, editor) {
    let td = editor.parentNode;
    editor.remove();
    addLabelName(model, i, td);
}


function acceptNameChange(model, i, editor) {
    let labels = [].concat(model.get("labels"));
    labels[i] = {"name": editor.value, "color": labels[i].color};
    model.set("labels", labels);
    model.save_changes();
    console.log("The changes: I've saved them!");
    dismissNameEditor(model, i, editor);
}


function onClickLabelName(model, i, td) {
    let labels = model.get("labels");
    td.innerHTML = "";
    let editor = document.createElement("input");
    editor.type = "text";
    editor.value = labels[i].name;
    editor.classList.add("name_editor");
    editor.addEventListener("blur", () => { acceptNameChange(model, i, editor); });
    editor.addEventListener("keyup", (ev) => {
        if (ev.key == "Enter") {
            acceptNameChange(model, i, editor);
        }
        else if (ev.key.startsWith("Esc")) {
            dismissNameEditor(model, i, editor);
        }
    })
    td.appendChild(editor);
    editor.select();
}


function addLabelName(model, i, td) {
    let div_name = document.createElement("div");
    div_name.classList.add("label_name")
    div_name.innerHTML = model.get("labels")[i].name;
    div_name.addEventListener("click", () => { onClickLabelName(model, i, td); });
    td.appendChild(div_name);
}


function render({model, el}) {
    let labels = model.get("labels");

    let table_labels = document.createElement("table");
    table_labels.classList.add("label_editor");
    for (let i = 0; i < labels.length; i++) {
        let label = labels[i];
        let tr = document.createElement("tr");

        let td_color = document.createElement("td");
        td_color.classList.add("label_column", "column_color");
        let tile = document.createElement("button");
        tile.classList.add("tile");
        tile.style.background = label.color;
        td_color.appendChild(tile);
        tr.appendChild(td_color);

        let td_name = document.createElement("td");
        td_name.classList.add("label_column", "column_name");
        addLabelName(model, i, td_name);
        tr.appendChild(td_name);

        table_labels.appendChild(tr);
    }
    el.appendChild(table_labels);
}


export default { render };

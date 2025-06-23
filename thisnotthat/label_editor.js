function is_label_noise(label) {
    const typ = typeof label;
    if (typ == "string") {
        return label.length == 0;
    }
    if (typ == "number")
    {
        return label == -1 || isNaN(label);
    }
    return false;
}


function dismissNameEditor(model, label, editor) {
    let td = editor.parentNode;
    editor.remove();
    addLabelName(model, label, td);
}


function acceptNameChange(model, label, editor) {
    let labels_current = model.get("labels");
    let labels_new = {};
    labels_new[label] = JSON.parse(JSON.stringify(labels_current[label]))
    labels_new[label].name = editor.value;
    for (const lab in labels_current) {
        if (lab != label) {
            labels_new[lab] = labels_current[lab];
        }
    }
    model.set("labels", labels_new);
    model.save_changes();
    dismissNameEditor(model, label, editor);
}


function onClickLabelName(model, label, td) {
    let labels = model.get("labels");
    td.innerHTML = "";
    let editor = document.createElement("input");
    editor.type = "text";
    editor.value = labels[label].name;
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
    div_name.innerHTML = model.get("labels")[label].name;
    div_name.addEventListener("click", () => { onClickLabelName(model, label, td); });
    td.appendChild(div_name);
}


function render({model, el}) {
    let labels = model.get("labels");
    let labels_ordered = [];
    for (const label_ in labels) {
        labels_ordered.push(label_)
    }
    labels_ordered.sort((left, right) => {
        const is_left_ordinary = !is_label_noise(left);
        const is_right_ordinary = !is_label_noise(right);
        const diff_noisiness = is_left_ordinary - is_right_ordinary;
        if (diff_noisiness != 0) {
            return diff_noisiness;
        }
        return left.localeCompare(right);
    });

    let table_labels = document.createElement("table");
    table_labels.classList.add("label_editor");
    for (const label of labels_ordered) {
        let meta = labels[label];
        let tr = document.createElement("tr");

        let td_color = document.createElement("td");
        td_color.classList.add("label_column", "column_color");
        let tile = document.createElement("button");
        tile.classList.add("tile");
        tile.style.background = meta.color;
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

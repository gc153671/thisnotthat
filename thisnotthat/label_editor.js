function render({model, el}) {
    let labels = document.createElement("table");
    labels.classList.add("label_editor")
    for (let label of model.get("labels")) {
        console.log(`Label: ${label.name} ${label.color}`);
        let tr = document.createElement("tr");
        let td_color = document.createElement("td");
        td_color.classList.add("label_column", "column_color");
        let tile = document.createElement("button");
        tile.classList.add("tile");
        tile.style.background = label.color;
        td_color.appendChild(tile);
        tr.appendChild(td_color);
        let td_name = document.createElement("td");
        td_name.classList.add("label_column");
        td_name.classList.add("label_name");
        td_name.innerText = label.name;
        tr.appendChild(td_name);
        labels.appendChild(tr);
    }
    el.appendChild(labels);
}


export default { render };

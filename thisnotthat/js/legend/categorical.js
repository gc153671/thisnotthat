function spawnCategoryMenu(model, redraw, indexItem, x, y) {
    const categories = model.get("categories")
    if (indexItem < categories.length) {
        const X = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAVElEQVQYV2NkgABvIN4KZaNTYDlGqKItQNoHi2KQIpAcI0ghzER0xTBFYANgCtEVg/goGpEVIisGsVGcQpZCZDfhtBrF4dg8SGzw+CAHD64AB1sAACq9G1ZuAIvMAAAAAElFTkSuQmCC"
        const discardMenu = (event) => {
            for (let menu of document.getElementsByClassName("categoryMenu")) {
                if (
                    typeof(event) == "undefined"
                    || event.target.id == "close-menu"
                    || event.key == "Escape" || event.key == "Enter"
                    || (
                        typeof event.button == "number" && (
                            event.clientX < x || event.clientX >= x + menu.clientWidth
                            || event.clientY < y || event.clientY >= y + menu.clientHeight
                        )
                    )
                ) {
                    menu.remove()
                    document.body.removeEventListener("keyup", discardMenu)
                    window.removeEventListener("click", discardMenu)
                    redraw(model)
                }
            }
        }

        const category = categories[indexItem]

        const menu = document.createElement("div")
        menu.classList.add("categoryMenu")
        menu.style.top = y.toString() + "px"
        menu.style.left = x.toString() + "px"

        const rowClose = document.createElement("div")
        rowClose.classList.add("menuRow", "rowClose")
        menu.appendChild(rowClose)
        const buttonClose = document.createElement("img")
        buttonClose.id = "close-menu"
        buttonClose.type = "image"
        buttonClose.src = X
        buttonClose.addEventListener("click", discardMenu)
        rowClose.appendChild(buttonClose)

        const rowColorName = document.createElement("div")
        rowColorName.classList.add("menuRow")
        menu.appendChild(rowColorName)

        const colorPicker = document.createElement("input")
        colorPicker.type = "color"
        colorPicker.value = model.get("palette")[indexItem]
        colorPicker.classList.add("menuColor")
        colorPicker.addEventListener("change", (event) => {
            const colorsCurrent = model.get("palette")
            const colorsNew = [...colorsCurrent]
            const hex = event.target.value
            colorsNew[indexItem] = []
            for (let i = 0; i < 6; i += 2) {
                colorsNew[indexItem].push(
                    Number.parseInt(hex.slice(i + 1, i + 3), 16) / 256
                )
            }
            colorsNew[indexItem].push(1.0)
            model.set("colors", colorsNew)
            model.save_changes()
            discardMenu()
        })
        rowColorName.appendChild(colorPicker)

        const categoryName = document.createElement("input")
        categoryName.type = "text"
        categoryName.value = category
        categoryName.classList.add("menuName")
        categoryName.addEventListener("change", (event) => {
            let namesCurrent = model.get("categories")
            let namesNew = [...namesCurrent]
            namesNew[indexItem] = event.target.value
            model.set("names", namesNew)
            model.save_changes()
            discardMenu()
        })
        rowColorName.appendChild(categoryName)

        let rowSelect = document.createElement("div")
        rowSelect.classList.add("menuRow")
        menu.appendChild(rowSelect)

        // const set_propn = (propn) => {
        //     const propnSelected = Object.assign({}, model.get("propn_selected"))
        //     propnSelected[label] = propn
        //     model.set("propn_selected", propnSelected)
        //     model.save_changes()
        //     discardMenu()
        // }
        const selection_ = new Set(model.get("selection"))
        const propnSelected = (() => {
            const labels = model.get("labels")
            let numSelected = 0
            let total = 0
            for (let i = 0; i < labels.length; i++) {
                if (labels[i] == indexItem) {
                    total++;
                    if (selection_.has(i)) {
                        numSelected++;
                    }
                }
            }
            if (total == 0) {
                return 0.0
            }
            return numSelected / total
        })()
        const editSelection = (edit) => {
            const labels = model.get("labels")
            for (let i = 0; i < labels.length; i++) {
                if (labels[i] == indexItem) {
                    edit(selection_, i)
                }
            }
            model.set("selection", [...selection_].sort())
            model.save_changes()
            discardMenu()
        }
        let buttonSelect = document.createElement("input")
        buttonSelect.classList.add("menuButton")
        buttonSelect.type = "button"
        buttonSelect.value = "Select all"
        buttonSelect.disabled = (propnSelected == 1.0)
        buttonSelect.addEventListener("click", (event) => {
            editSelection((selection_, i) => {selection_.add(i)})
        })
        rowSelect.append(buttonSelect)

        let buttonDeselect = document.createElement("input")
        buttonDeselect.classList.add("menuButton")
        buttonDeselect.type = "button"
        buttonDeselect.value = "Deselect all"
        buttonDeselect.disabled = (propnSelected == 0.0)
        buttonDeselect.addEventListener("click", (event) => {
            editSelection((selection_, i) => {selection_.delete(i)})
        })
        rowSelect.append(buttonDeselect)

        let rowAssign = document.createElement("div")
        rowAssign.classList.add("menuRow")
        menu.appendChild(rowAssign)

        let buttonAssign = document.createElement("input")
        buttonAssign.classList.add("menuButton")
        buttonAssign.type = "button"
        buttonAssign.value = "Assign label to selected"
        buttonAssign.disabled = (model.get("selection").length == 0)
        buttonAssign.addEventListener("click", (event) => {
            const labelsNew = [...model.get("labels")]
            for (const i of model.get("selection")) {
                labelsNew[i] = indexItem
            }
            model.set("labels", labelsNew)
            model.save_changes()
            discardMenu()
        })
        rowAssign.append(buttonAssign)

        document.body.addEventListener("keyup", discardMenu)
        window.setTimeout(
            () => { window.addEventListener("click", discardMenu) },
            10
        )
        document.body.appendChild(menu)
    }
}


function createNewLabel(model) {
    alert("GOTTA FINISH REFACTORING THIS")
    const palette = model.get("palette_labels")
    const labels = [...model.get("labels")]
    const names = Object.assign({}, model.get("names"))
    const colors = Object.assign({}, model.get("colors"))
    const propnSelected = Object.assign({}, model.get("propn_selected"))

    const labelNew = `label_${crypto.randomUUID().replaceAll("-", "")}`
    labels.push(labelNew)

    const namesUsed = new Set(Object.values(names))
    var name = "New label 1"
    while (namesUsed.has(name)) {
        var num = parseInt(name.slice(9)) || 0
        num += 1
        name = `New label ${num}`
    }
    names[labelNew] = name
    colors[labelNew] = palette[Object.keys(colors).length % palette.length]
    propnSelected[labelNew] = 0.0

    model.set("labels", labels)
    model.set("names", names)
    model.set("colors", colors)
    model.set("propn_selected", propnSelected)
    model.save_changes()

    return labelNew
}


export default {
    canvas: undefined,
    propnSelected: {},
    indexHovering: -1,
    cursorPalette: -1,

    adjustDims(model, scale) {
        let height = this.canvas.clientHeight
        const numItems = model.get("categories").length + 1
        const minHeightItem = model.get("min_height_item")
        let heightItem = height / numItems
        if (heightItem <= minHeightItem)
        {
            heightItem = minHeightItem
            height = heightItem * numItems
            this.canvas.style.height = `${height}px`
        }
        else
        {
            this.canvas.style.height = "100%"
        }

        this.canvas.height = Math.floor(height * scale)
        const width = this.canvas.clientWidth
        this.canvas.width = Math.floor(width * scale)

        return [width, height, heightItem]
    },

    draw(model) {
        const scale = window.devicePixelRatio
        const [width, height, heightItem] = this.adjustDims(model, scale)
        const styleHover = "#e0e0e0"
        const sizeFont = model.get("size_font")
        const widthColorBar = model.get("width_color_bar")
        const spaceColorBarInfo = model.get("space_color_bar_info")
        const categories = model.get("categories")
        const palette = model.get("palette")
        // const labels = model.get("labels")
        // const names = model.get("names")
        // const colors = model.get("colors")
        // const propnSelected = model.get("propn_selected")

        const ctx = this.canvas.getContext("2d")
        ctx.scale(scale, scale)

        const drawItem = (indexItem, color, text, propn) => {
            const left = 0
            const top = indexItem * heightItem
            ctx.clearRect(left, top, width, heightItem)
            if (color.length == 0)
            {
                if (propn > 0.0) {
                    ctx.fillStyle = "#000000"
                }
                else {
                    ctx.fillStyle = "#cccccc"
                }
                ctx.font = `italic ${sizeFont}px sans-serif`
            }
            else
            {
                ctx.fillStyle = color
                ctx.fillRect(left, top, widthColorBar, heightItem)
                ctx.font = `${sizeFont}px sans-serif`
                ctx.fillStyle = "#000000"
            }

            const tm = ctx.measureText(text)
            ctx.fillText(
                text,
                widthColorBar + spaceColorBarInfo,
                ((indexItem + 0.5) * heightItem
                    + (tm.actualBoundingBoxAscent + tm.actualBoundingBoxDescent) / 2)
            )

            if (color.length > 0 && propn > 0.0) {
                try {
                    ctx.save()
                    ctx.globalCompositeOperation = "xor"
                    ctx.fillStyle = color
                    ctx.fillRect(left + widthColorBar, top, propn * (width - widthColorBar), heightItem)
                }
                finally {
                    ctx.restore()
                }
            }

            if (indexItem == this.indexHovering)
            {
                console.log(indexItem)
                try {
                    ctx.save()
                    ctx.globalCompositeOperation = "multiply"
                    ctx.fillStyle = styleHover
                    ctx.fillRect(left + widthColorBar, top, width - widthColorBar, heightItem)
                }
                finally {
                    ctx.restore()
                }
            }
        }

        ctx.clearRect(0, 0, width, height)
        for (var i = 0; i < categories.length; i++)
        {
            const [r, g, b] = palette[i] || [0, 0, 0, 1]
            const color = `rgb(${Math.floor(r * 256)}, ${Math.floor(g * 256)}, ${Math.floor(b * 256)})`
            drawItem(
                i,
                color,
                categories[i] || "???",
                this.propnSelected[categories[i]] || 0
            )
        }
        drawItem(
            categories.length,
            "",
            "New label",
            Object.values(this.propnSelected).reduce((sum, x) => {return sum + x}, 0.0),
        )
    },

    initialize({model}) { },

    render({model, el}) {
        const container = document.createElement("div")
        container.classList.add("container")
        this.canvas = document.createElement("canvas")
        this.canvas.classList.add("legend")
        container.appendChild(this.canvas)
        el.appendChild(container)

        window.setTimeout(
            () => {
                this.draw(model)

                for (const trait of [
                    "labels",
                    "categories",
                    "palette",
                    "size_font",
                    "width_color_bar",
                    "space_color_bar_info",
                    "selection",
                ]) {
                    model.on(`change:${trait}`, () => {this.draw(model)})
                }

                const getHeightItem = () => {
                    const scale = window.devicePixelRatio
                    return (this.canvas.height / scale) / (model.get("categories").length + 1)
                }
                this.canvas.addEventListener("mouseenter", (event) => {
                    this.indexHovering = Math.floor(event.offsetY / getHeightItem())
                    this.draw(model)
                })
                this.canvas.addEventListener("mousemove", (event) => {
                    const indexPrevious = this.indexHovering
                    this.indexHovering = Math.floor(event.offsetY / getHeightItem())
                    if (this.indexHovering != indexPrevious)
                    {
                        this.draw(model)
                    }
                })
                this.canvas.addEventListener("mouseleave", (event) => {
                    this.indexHovering = -1
                    this.draw(model)
                })

                this.canvas.addEventListener("click", (event) => {
                    const indexItem = Math.floor(event.offsetY / getHeightItem())
                    if (indexItem < model.get("categories").length) {
                        spawnCategoryMenu(
                            model,
                            (model) => {this.draw(model)},
                            indexItem,
                            event.clientX,
                            event.clientY
                        )
                    }
                    else
                    {
                        alert("New label!")
                        // if (
                        //     Object.values(model.get("propn_selected")).reduce(
                        //         (sum, x) => {return sum + x},
                        //         0.0
                        //     ) > 0.0
                        // ) {
                        //     model.set("label_assigned", createNewLabel(model))
                        //     model.save_changes()
                        //     this.draw(model)
                        // }
                    }
                })
            },
            10
        )
    },
}

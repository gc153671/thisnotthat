// import {default as base} from "./js/legend/base.js";
// function is_label_noise(label) {
//     if (typeof label == "number") {
//         return label == -1 || isNaN(label)
//     }
//     if (typeof label == "string") {
//         return label.length == 0 || label == "-1"
//     }
//     return false
// }


// function getLabels(data) {
//     let totals = {}
//     for (const i in data) {
//         totals[data[i]] ??= 0
//         totals[data[i]] += 1
//     }

//     let labels = Object.keys(totals)
//     if (labels.filter(is_label_noise).length == 0)
//     {
//         labels.push("")
//     }
//     labels.sort((left, right) => {
//         const diff_noise = is_label_noise(right) - is_label_noise(left)
//         if (diff_noise != 0) {
//             return diff_noise
//         }
//         return left.toString().localeCompare(right.toString())
//     })

//     return [labels, totals]
// }


const Drawer = {
    styleHover: "#e0e0e0",

    make(model, heightItem) {
        return Object.assign({}, Drawer, {
            heightItem: heightItem,
            sizeFont: model.get("size_font"),
            widthColorBar: model.get("width_color_bar"),
            spaceColorBarInfo: model.get("space_color_bar_info"),
            labels: model.get("labels"),
            names: model.get("names"),
            colors: model.get("colors"),
            propnSelected: model.get("propn_selected"),
        })
    },

    draw(ctx, width, height, indexHovering) {
        ctx.clearRect(0, 0, width, height)
        for (var i = 0; i < this.labels.length; i++)
        {
            this.drawLabelBox(this.labels[i], ctx, i, width, indexHovering)
        }
        this.drawItem(ctx, this.labels.length, width, indexHovering, "", "New label", 0.0)
    },

    drawItem(ctx, indexItem, width, indexHovering, color, text, propnBar) {
        const left = 0
        const top = indexItem * this.heightItem
        ctx.clearRect(left, top, this.width, this.heightItem)
        if (color.length == 0)
        {
            ctx.font = `italic ${this.sizeFont}px sans-serif`
            ctx.fillStyle = "#cccccc"
        }
        else
        {
            ctx.fillStyle = color
            ctx.fillRect(left, top, this.widthColorBar, this.heightItem)
            ctx.font = `${this.sizeFont}px sans-serif`
            ctx.fillStyle = "#000000"
        }

        const tm = ctx.measureText(text)
        ctx.fillText(
            text,
            this.widthColorBar + this.spaceColorBarInfo,
            (indexItem + 0.5) * this.heightItem + (tm.actualBoundingBoxAscent + tm.actualBoundingBoxDescent) / 2
        )

        if (propnBar > 0.0) {
            const origGCO = ctx.globalCompositeOperation
            try {
                ctx.globalCompositeOperation = "xor"
                ctx.fillStyle = color
                ctx.fillRect(left + this.widthColorBar, top, propnBar * (width - this.widthColorBar), this.heightItem)
            }
            finally {
                ctx.globalCompositeOperation = origGCO
            }
        }

        if (indexItem == indexHovering)
        {
            const origGCO = ctx.globalCompositeOperation
            try {
                ctx.globalCompositeOperation = "multiply"
                ctx.fillStyle = this.styleHover
                ctx.fillRect(left + this.widthColorBar, top, width - this.widthColorBar, this.heightItem)
            }
            finally {
                ctx.globalCompositeOperation = origGCO
            }
        }
    },

    drawLabelBox(label, ctx, indexItem, width, indexHovering) {
        this.drawItem(
            ctx,
            indexItem,
            width,
            indexHovering,
            this.colors[label] || "#000000",
            this.names[label] || label,
            this.propnSelected[label] || 0.0
        )
    },
}


function adjustHeight(canvas, numItems, minItemHeight) {
    let height = canvas.clientHeight
    let heightItem = height / numItems
    if (heightItem < minItemHeight)
    {
        heightItem = minItemHeight
        height = heightItem * numItems
        canvas.style.height = height.toString() + "px"
    }
    return [height, heightItem]
}


function spawnLabelMenu(model, redraw, indexItem, x, y) {
    const labels = model.get("labels")
    if (indexItem < labels.length) {
        const X = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAVElEQVQYV2NkgABvIN4KZaNTYDlGqKItQNoHi2KQIpAcI0ghzER0xTBFYANgCtEVg/goGpEVIisGsVGcQpZCZDfhtBrF4dg8SGzw+CAHD64AB1sAACq9G1ZuAIvMAAAAAElFTkSuQmCC"
        const discardMenu = (event) => {
            for (let menu of document.getElementsByClassName("labelMenu")) {
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
                    redraw()
                }
            }
        }

        const label = labels[indexItem]
        const propnSelected = model.get("propn_selected")[label] || 0.0

        const menu = document.createElement("div")
        menu.classList.add("labelMenu")
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
        colorPicker.value = model.get("colors")[label]
        colorPicker.classList.add("menuColor")
        colorPicker.addEventListener("change", (event) => {
            let colorsCurrent = model.get("colors")
            let colorsNew = {}
            for (const lab in colorsCurrent) {
                colorsNew[lab] = colorsCurrent[lab]
            }
            colorsNew[label] = event.target.value
            model.set("colors", colorsNew)
            model.save_changes()
            discardMenu()
        })
        rowColorName.appendChild(colorPicker)

        const labelName = document.createElement("input")
        labelName.type = "text"
        labelName.value = model.get("names")[label]
        labelName.classList.add("menuName")
        labelName.addEventListener("change", (event) => {
            let namesCurrent = model.get("names")
            let namesNew = {}
            for (const lab in namesCurrent) {
                namesNew[lab] = namesCurrent[lab]
            }
            namesNew[label] = event.target.value
            model.set("names", namesNew)
            model.save_changes()
            discardMenu()
        })
        rowColorName.appendChild(labelName)

        let rowSelect = document.createElement("div")
        rowSelect.classList.add("menuRow")
        menu.appendChild(rowSelect)

        const set_propn = (propn) => {
            const propnSelected = Object.assign({}, model.get("propn_selected"))
            propnSelected[label] = propn
            model.set("propn_selected", propnSelected)
            model.save_changes()
            discardMenu()
        }
        let buttonSelect = document.createElement("input")
        buttonSelect.classList.add("menuButton")
        buttonSelect.type = "button"
        buttonSelect.value = "Select all"
        buttonSelect.disabled = (propnSelected == 1.0)
        buttonSelect.addEventListener("click", (event) => {set_propn(1.0)})
        rowSelect.append(buttonSelect)

        let buttonDeselect = document.createElement("input")
        buttonDeselect.classList.add("menuButton")
        buttonDeselect.type = "button"
        buttonDeselect.value = "Deselect all"
        buttonDeselect.disabled = (propnSelected == 0.0)
        buttonDeselect.addEventListener("click", (event) => {set_propn(0.0)})
        rowSelect.append(buttonDeselect)

        let rowAssign = document.createElement("div")
        rowAssign.classList.add("menuRow")
        menu.appendChild(rowAssign)

        let buttonAssign = document.createElement("input")
        buttonAssign.classList.add("menuButton")
        buttonAssign.type = "button"
        buttonAssign.value = "Assign label to selected"
        buttonAssign.disabled = (Object.values(model.get("propn_selected")).reduce((sum, x) => {return sum + x}, 0.0) == 0.0)
        buttonAssign.addEventListener("click", (event) => {
            model.set("label_assigned", label)
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

// assignLabel(label, model, ctx, width, height) {
//     const data = model.get("_data")
//     console.log(data.length)
//     const dataNew = {}
//     for (const item in data) {
//         dataNew[item] = data[item]
//     }
//     console.log(data.length)

//     const selection = model.get("_selection")
//     for (const item of selection) {
//         dataNew[item] = label
//     }
//     model.set("_data", dataNew)
//     model.save_changes()

//     this.totals = {}
//     for (const item in data) {
//         this.totals[data[item]] ??= 0
//         this.totals[data[item]] += 1
//     }
//     this.updateSelection(model, ctx, width, height)
// },


export default {
    indexHovering: -1,

    initialize({model}) {},

    render({model, el}) {
        const canvas = document.createElement("canvas")
        canvas.classList.add("legend")

        let scale = window.devicePixelRatio
        window.setTimeout(
            () => {
                const [height, heightItem] = adjustHeight(canvas, model.get("labels").length + 1, model.get("min_height_item"))
                canvas.height = Math.floor(height * scale)
                const width = canvas.clientWidth
                canvas.width = Math.floor(width * scale)

                let ctx = canvas.getContext("2d")
                ctx.scale(scale, scale)
                const drawer = Drawer.make(model, heightItem)
                const redraw = () => {Drawer.make(model, heightItem).draw(ctx, width, height, this.indexHovering)}
                redraw()

                for (const trait of ["size_font", "width_color_bar", "space_color_bar_info", "labels", "names", "colors", "propn_selected"])
                {
                    model.on(`change:${trait}`, redraw)
                }

                canvas.addEventListener("mouseenter", (event) => {
                    this.indexHovering = Math.floor(event.offsetY / heightItem)
                    redraw()
                })
                canvas.addEventListener("mousemove", (event) => {
                    const indexPrevious = this.indexHovering
                    this.indexHovering = Math.floor(event.offsetY / heightItem)
                    if (this.indexHovering != indexPrevious)
                    {
                        redraw()
                    }
                })
                canvas.addEventListener("mouseleave", (event) => {
                    this.indexHovering = -1
                    redraw()
                })

                canvas.addEventListener("click", (event) => {
                    const indexItem = Math.floor(event.offsetY / heightItem)
                    if (indexItem < model.get("labels").length) {
                        spawnLabelMenu(model, redraw, indexItem, event.clientX, event.clientY)
                    }
                    else
                    {
                        alert("CLICK ON NEW LABEL")
                    }
                })
            },
            10
        )

        el.appendChild(canvas)
    },
}

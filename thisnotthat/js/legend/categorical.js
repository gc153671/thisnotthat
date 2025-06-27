function is_label_noise(label) {
    if (typeof label == "number") {
        return label == -1 || isNaN(label)
    }
    if (typeof label == "string") {
        return label.length == 0 || label == "-1"
    }
    return false
}


function getLabels(data) {
    let labels_found = new Set()
    for (const i in data) {
        labels_found.add(data[i])
    }

    let labels = []
    for (const entry of labels_found.entries()) {
        labels.push(entry[0])
    }
    if (labels.filter(is_label_noise).length == 0)
    {
        labels.push("")
    }

    labels.sort((left, right) => {
        const diff_noise = is_label_noise(right) - is_label_noise(left)
        if (diff_noise != 0) {
            return diff_noise
        }
        return left.toString().localeCompare(right.toString())
    })
    return labels
}


export default {
    labels: {},
    pixelsPerItem: 28,
    widthColorBar: 28,
    SPACE_COLOR_BAR_LABEL: 5,

    initialize({model}) {
        this.labels = getLabels(model.get("_data"))
        let colors = model.get("_colors")
        let names = model.get("_names")
        let palette = model.get("_palette")
        let names_given = model.get("_names")
        for (let i = 0; i < this.labels.length; i++) {
            if (!colors[this.labels[i]]) {
                colors[this.labels[i]] = palette[i] || model.get("_colorUnlabelled") || "#cccccc"
            }
            if (is_label_noise(this.labels[i]))
            {
                names[this.labels[i]] = model.get("_nameUnlabelled") || "<Uncategorized>"
            }
            else if (names_given[this.labels[i]])
            {
                names[this.labels[i]] = names_given[this.labels[i]]
            }
            else
            {
                names[this.labels[i]] = this.labels[i].toString()
            }
        }
        model.set("_colors", colors)
        model.set("_names", names)
        model.save_changes()
    },


    render({model, el}) {
        let canvas = document.createElement("canvas")
        canvas.classList.add("legend")
        this.pixelsPerItem = model.get("_pixelsPerItem")
        this.widthColorBar = model.get("_widthColorBar")

        let scale = window.devicePixelRatio
        window.setTimeout(
            () => {
                const height = this.adjustHeight(canvas, model.get("_minPixelsPerItem"))
                canvas.height = Math.floor(height * scale)
                const width = canvas.clientWidth
                canvas.width = Math.floor(width * scale)

                let ctx = canvas.getContext("2d")
                ctx.scale(scale, scale)
                this.draw(model, ctx, width, height)

                const frameStyle = "#f8f8f8"
                canvas.addEventListener("mouseenter", (event) => {
                    const index_here = Math.floor(event.offsetY / this.pixelsPerItem)
                    if (index_here >= 0 && index_here <= this.labels.length)
                    {
                        this.getLabelBox(index_here, width).frame(ctx, frameStyle)
                    }
                })
                canvas.addEventListener("mousemove", (event) => {
                    const index_here = Math.floor(event.offsetY / this.pixelsPerItem)
                    const index_previous = Math.floor((event.offsetY - event.movementY) / this.pixelsPerItem)
                    if (index_previous >= 0 && index_previous < this.labels.length && index_previous != index_here)
                    {
                        this.draw(model, ctx, width, height)
                        this.getLabelBox(index_here, width).frame(ctx, frameStyle)
                    }
                })
                canvas.addEventListener("mouseleave", (event) => {
                    this.draw(model, ctx, width, height)
                })
                canvas.addEventListener("click", (event) => {
                    const indexItem = Math.floor(event.offsetY / this.pixelsPerItem)
                    if (indexItem < this.labels.length) {
                        this.spawnLabelMenu(
                            model,
                            ctx,
                            width,
                            height,
                            indexItem,
                            event.clientX,
                            event.clientY
                        )
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


    adjustHeight(canvas, minPixelsPerItem) {
        let height = canvas.clientHeight
        const numItems = this.labels.length + 1
        this.pixelsPerItem = height / numItems
        if (this.pixelsPerItem < minPixelsPerItem)
        {
            this.pixelsPerItem = minPixelsPerItem
            height = this.pixelsPerItem * numItems
            canvas.style.height = height.toString() + "px"
        }
        return height
    },


    getLabelBox(i, width) {
        return {
            x: 0,
            y: i * this.pixelsPerItem,
            width: width,
            height: this.pixelsPerItem,

            draw(ctx, widthColorBar, spaceColorBarLabel, color, name, textHeight) {
                ctx.clearRect(this.x, this.y, this.width, this.height)
                if (color.length == 0)
                {
                    ctx.strokeStyle = "1px #000000"
                    ctx.strokeRect(this.x + 1, this.y, widthColorBar - 2, this.height - 1)
                }
                else
                {
                    ctx.fillStyle = color
                    ctx.fillRect(this.x, this.y, widthColorBar, this.height)
                }

                ctx.font = `${textHeight}px sans-serif`
                ctx.fillStyle = "#000000"
                const tm = ctx.measureText(name)
                ctx.fillText(
                    name,
                    widthColorBar + spaceColorBarLabel,
                    (i + 0.5) * this.height + (tm.actualBoundingBoxAscent + tm.actualBoundingBoxDescent) / 2
                )
            },

            frame(ctx, style)
            {
                const origGCO = ctx.globalCompositeOperation
                try {
                    ctx.globalCompositeOperation = "destination-over"
                    ctx.fillStyle = style
                    ctx.fillRect(this.x, this.y, this.width, this.height)
                }
                finally {
                    ctx.globalCompositeOperation = origGCO
                }
            },
        }
    },


    draw(model, ctx, width, height) {
        const names = model.get("_names")
        const colors = model.get("_colors")
        const textHeight = model.get("_textHeight")

        ctx.clearRect(0, 0, width, height)
        for (var i = 0; i < this.labels.length; i++)
        {
            this.getLabelBox(i, width).draw(
                ctx,
                this.widthColorBar,
                this.SPACE_COLOR_BAR_LABEL,
                colors[this.labels[i]],
                names[this.labels[i]],
                textHeight
            )
        }
        this.getLabelBox(this.labels.length, width).draw(
            ctx,
            this.widthColorBar,
            this.SPACE_COLOR_BAR_LABEL,
            "",
            "New label",
            textHeight
        )
    },


    spawnLabelMenu(model, ctx, width, height, indexItem, x, y) {
        const discardMenu = (event) => {
            for (let menu of document.getElementsByClassName("labelMenu")) {
                if (event.key == "Escape" || event.key == "Enter" || (
                    typeof event.button == "number" && (
                        event.clientX < x || event.clientX >= x + menu.clientWidth
                        || event.clientY < y || event.clientY >= y + menu.clientHeight
                    )
                )) {
                    menu.remove()
                    document.body.removeEventListener("keyup", discardMenu)
                    window.removeEventListener("click", discardMenu)
                    this.draw(model, ctx, width, height)
                }
            }
        }

        const label = this.labels[indexItem]
        let menu = document.createElement("div")
        menu.classList.add("labelMenu")
        menu.style.top = y.toString() + "px"
        menu.style.left = x.toString() + "px"

        let rowColorName = document.createElement("div")
        rowColorName.classList.add("menuColorName")
        menu.appendChild(rowColorName)

        let colorPicker = document.createElement("input")
        colorPicker.type = "color"
        colorPicker.value = model.get("_colors")[label]
        colorPicker.classList.add("menuColor")
        colorPicker.addEventListener("change", (event) => {
            let colorsCurrent = model.get("_colors")
            let colorsNew = {}
            for (const lab in colorsCurrent) {
                colorsNew[lab] = colorsCurrent[lab]
            }
            colorsNew[label] = event.target.value
            model.set("_colors", colorsNew)
            model.save_changes()
        })
        rowColorName.appendChild(colorPicker)

        let labelName = document.createElement("input")
        labelName.type = "text"
        labelName.value = model.get("_names")[label]
        labelName.classList.add("menuName")
        labelName.addEventListener("change", (event) => {
            let namesCurrent = model.get("_names")
            let namesNew = {}
            for (const lab in namesCurrent) {
                namesNew[lab] = namesCurrent[lab]
            }
            namesNew[label] = event.target.value
            model.set("_names", namesNew)
            model.save_changes()
        })
        rowColorName.appendChild(labelName)

        document.body.addEventListener("keyup", discardMenu)
        window.setTimeout(
            () => { window.addEventListener("click", discardMenu) },
            10
        )
        document.body.appendChild(menu)
    },
}

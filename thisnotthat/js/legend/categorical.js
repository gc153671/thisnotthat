function render({model, el}) {
    let canvas = document.createElement("canvas")
    canvas.classList.add("legend")
    let ctx = canvas.getContext("2d")

    // ctx.fillRect(0, 10, 100, 200)
    ctx.fillText("Hello world", 0, 20)

    el.appendChild(canvas);
}


export default { render }

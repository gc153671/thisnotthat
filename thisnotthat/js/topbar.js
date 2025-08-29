export default {
    initialize({model}) { },
    
    render({model, el}) {
        el.classList.add("tnt-topbar")

        const reset = document.createElement("button")
        reset.title = "Reset plot display"
        reset.innerHTML = "Reset"
        el.appendChild(reset)

        const search = document.createElement("input")
        search.type = "text"
        search.placeholder = "Search"
        search.classList.add("topbar-search")
        el.appendChild(search)
    },
}

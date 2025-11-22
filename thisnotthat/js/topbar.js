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

        // Send search queries to Python
        search.addEventListener("input", (ev) => {
            model.send({
                action: "search",
                query: ev.target.value
            });
        });

        // Reset clears search
        reset.addEventListener("click", () => {
            search.value = "";
            model.send({
                action: "search",
                query: ""
            });
        });

        el.appendChild(search)
    },
}

import MElement from "@titsoft/m-element"
import parseContent from "./parse-content.js"
//
export const htmlListError = `<ul><li>List Error</li></ul>`
//
export default function () { 
    customElements.define(
        'list-m', class extends MElement {
            constructor() {
                super()
            }
            parsedCallback() {
                render(this)
            }
        }
    )
    function render(that) {
        const [isValid, html] = parseContent(that.textContent)
        that.innerHTML = isValid
            ? html
            : htmlListError
    }
}
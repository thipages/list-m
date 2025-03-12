/*! (c) Andrea Giammarchi - ISC */
const HTMLParsedElement = (() => {
  const DCL = 'DOMContentLoaded';
  const init = new WeakMap;
  const queue = [];
  const isParsed = el => {
    do {
      if (el.nextSibling)
        return true;
    } while (el = el.parentNode);
    return false;
  };
  const upgrade = () => {
    queue.splice(0).forEach(info => {
      if (init.get(info[0]) !== true) {
        init.set(info[0], true);
        info[0][info[1]]();
      }
    });
  };
  document.addEventListener(DCL, upgrade);
  class HTMLParsedElement extends HTMLElement {
    static withParsedCallback(Class, name = 'parsed') {
      const {prototype} = Class;
      const {connectedCallback} = prototype;
      const method = name + 'Callback';
      const cleanUp = (el, observer, ownerDocument, onDCL) => {
        observer.disconnect();
        ownerDocument.removeEventListener(DCL, onDCL);
        parsedCallback(el);
      };
      const parsedCallback = el => {
        if (!queue.length)
          requestAnimationFrame(upgrade);
        queue.push([el, method]);
      };
      Object.defineProperties(
        prototype,
        {
          connectedCallback: {
            configurable: true,
            writable: true,
            value() {
              if (connectedCallback)
                connectedCallback.apply(this, arguments);
              if (method in this && !init.has(this)) {
                const self = this;
                const {ownerDocument} = self;
                init.set(self, false);
                if (ownerDocument.readyState === 'complete' || isParsed(self))
                  parsedCallback(self);
                else {
                  const onDCL = () => cleanUp(self, observer, ownerDocument, onDCL);
                  ownerDocument.addEventListener(DCL, onDCL);
                  const observer = new MutationObserver(() => {
                    /* istanbul ignore else */
                    if (isParsed(self))
                      cleanUp(self, observer, ownerDocument, onDCL);
                  });
                  observer.observe(self.parentNode, {childList: true, subtree: true});
                }
              }
            }
          },
          [name]: {
            configurable: true,
            get() {
              return init.get(this) === true;
            }
          }
        }
      );
      return Class;
    }
  }
  return HTMLParsedElement.withParsedCallback(HTMLParsedElement);
})();

// Atribute
const LEVEL_UP = 'level-up';
// load/error status
const LOADED = 'loaded';
const ON_ERROR = 'onError';
// constructor config properties
const ON_LOAD_HTML = 'onLoadHtml';
const ON_ERROR_HTML = 'onErrorHtml';
// Error message for async init
const ERROR = 'm-element error';
//
const isAsyncFunction = fn => fn.constructor.name === 'AsyncFunction';
class MElement extends HTMLParsedElement {
    #config
    #fragment
    #slots
    constructor(config) {
        super();
        this.#config = config || {};
        this[ON_ERROR] = false;
        this[LOADED] = false;
    }
    #content(remove, textOnly) {
        const _ = this.#fragment;
        if (!_) return
        if (remove) this.#fragment = null;
        return textOnly ?  _.textContent : _
    }
    #finish (error) {
        this[LOADED] = true;
        this[ON_ERROR] = !!error;
        // Any errors will display onErrorHtml config property
        if (this[ON_ERROR]) {
            this.innerHTML = this.#config[ON_ERROR_HTML] || '';
        }
        if (this.hasAttribute(LEVEL_UP)) {
            this.replaceWith(...this.children);
        }
        // DEV: dispatchEvent runs after all changes
        this.dispatchEvent(new Event('load'));
    }
    originalFragment(remove = true) {
        return this.#content(remove, false)
    }
    originalText(remove = true) {
        return this.#content(remove, true)
    }
    parsedCallback() {
        const that = this;
        const end = (e) => that.#finish(e);
        // slots removal and storage
        this.#slots = this.querySelectorAll('slot');
        this.#slots.forEach(e => e.remove());
        // move childNodes to a fragment
        this.#fragment = document.createDocumentFragment();
        this.#fragment.append(...this.childNodes);
        // display onLoadHtml
        this.innerHTML = this.#config[ON_LOAD_HTML] || '';
        // manage async/sync init function
        if (this.init) {
            if (isAsyncFunction(this.init)) {
                this.init()
                    .then(() => end())
                    .catch((e)=> {
                        end(new Error(ERROR, {cause: e}));
                    });
            } else {
                this.init();
                end();
            } 
        } else {
            end();
        } 
    }
    getSlotByName(name) {
        return [...this.#slots].filter(e => name && e.name === name) [0]
    }
}

// tls = Text-level semantics, see https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-dfn-element
const tlsElementsSupported = [
    'a', 'em', 'strong', 'small', 's', 'cite', 'q',
    'dfn', 'abbr', 'code', 'var', 'samp', 'kbd',
    'sub', 'sup', 'i', 'b', 'u', 'mark', 'span'
];
// properties are made of [delimiter, ... attributes]
const tlsAttributes = {
    a: [' ', 'href', 'target'],
    abbr: [, 'title'],
    dfn: [, 'title']
};
const evilChars = /\x01(\d)/g;
// pattern : |element[.class][[attributes]]/text/
const testmRegExp = /\|([a-z][a-z0-9]*)(\.([^\[\/]*)){0,1}(\[(.*)\]){0,1}\/([^\/]+)\//gi;
const SLASH = '&#x2F;';
const PIPE = '&#124;';

const defaultOptions = { wrapOne: true};
var render = (input, options = {}) => {
    const {wrapOne} = Object.assign({}, defaultOptions, options);
    const _ = input
        .replace ('<', '&lt;')
        .replace(evilChars, '')     // clean placeholders
        .replace(/\\\//g, '\x010')  // reserve escaped slash
        .replace(/\\\|/g, '\x011')  // reserve escaped pipe
        .replace(testmRegExp, function(original, element, $2, cssClass, $4, attributes, text) {
            if (tlsElementsSupported.includes(element)) {
                const htmlAttributes = getHtmlAttributes(element, attributes);
                const hasClass = /class\s*="/.test(htmlAttributes);
                const attrs = hasClass
                    ? htmlAttributes
                    : [
                        cssClass ? `class="${cssClass}"` : '',
                        htmlAttributes
                      ].join(' ').trim();
                const sAttr = attrs ==='' ? '' : ' ' + attrs;
                return `<${element}${sAttr}>${text.trim()}</${element}>`
            } else {
                return original
            }
        })
        .replace(/\x010/g, SLASH)
        .replace(/\x011/g, PIPE);

    return addParagraphs(normalizeNewlines$1(_), wrapOne)
};
function getHtmlAttributes(element, attributes) {
    if (!attributes) return ''
    const isRegular = /[a-z-]+="/.test(attributes);
    if (isRegular) {
        return attributes
    } else {
        // shortcut attribute for a small set of elements
        const [delimiter, ...attrs] = tlsAttributes[element];
        // Check for a supported TLS element attribute
        if (attrs) {
            const values = attributes
                .trim()
                .replace(/\s{2,}/g, ' ')
                // DEV: string.split(undefined) gives [string]
                .split(delimiter);
                return attrs.map (
                    (attr, index) => values[index] ? `${attr}="${values[index]}"` : null
                )
                .filter(v => v)
                .join(" ")
        } else {
            return ''
        }
    }
}
function normalizeNewlines$1(input) {
    return input
        .replace(/^\s*\n/gm, '\n') // clean newlines
        .replace(/^\n+/, '') // remove top newlines
        .replace(/\n+$/, '') // remove end newlines
        .replace(/\n{3,}/g, '\n\n') // down to 2 newlines for paragraphs
}
function addParagraphs(input, wrapOneChild ) {
    const s = input.split('\n\n');
    return (s.length === 1 && !wrapOneChild)
        ? input.trim()
        : s.map(v => wrap(v, 'p')).join('\n')
}
function wrap(content, el, attributes) {
    return `<${el}>${content.trim()}</${el}>`
}

function parseContent (content) {
    let firstOcc = false,
        firstItem = true,
        isValid = true,
        baseSpace,
        previousLevel,
        currentLevel;
    const stack = [],
          html = [],
          currentLine = [];
    for (const line of normalizeNewlines(content).split('\n')) {
        const lineData = getLineData(line);
        // Remove everything above the first list marker
        if (!lineData.bullet && !firstOcc) continue
        firstOcc = true;
        if (lineData.bullet) {
            const len = lineData.spaces.length;
            if (firstItem) {
                baseSpace = len;
                currentLevel = 0;
                stack.push([lineData.ordered, currentLevel]);
            } else {
                previousLevel = currentLevel;
                const nextLevel = Math.floor((len - baseSpace)/2);
                if (nextLevel < 0) {
                    isValid = false;
                    break
                } else {
                    const diff = nextLevel - currentLevel;
                    if (diff >= 1) {
                        currentLevel++;
                        stack.push([lineData.ordered, currentLevel]);
                    } else if (diff < 0 ){
                        currentLevel = nextLevel;
                    }
                }
            }
            const diff = firstItem ? undefined : currentLevel - previousLevel;
            Object.assign(
                lineData,
                {
                    subText: [],
                    level:currentLevel,
                    diff
                }
            );
            if (currentLine.length !== 0) {
                html.push(...renderHtml(currentLine.pop(), stack));
            }
            currentLine.push(lineData);
            firstItem = false;
        } else {
            currentLine[0].subText.push(line);
        }
    }
    if (firstOcc) {
        html.push(...renderHtml(currentLine.pop(), stack));
        // Finally close all open tags
        for (const [ordered] of stack.reverse()) {
            html.push(getTag(ordered).c);
        }
    }
    return [isValid, html.join('')]
}
function liRender(text) {
    return `<li>${text}</li>`
}
function renderHtml(lineData, stack) {
    const {subText, text: t, ordered, diff, level} = lineData;
    //
    const subStringCleaned = subText.join('\n').replace(/\s+/g, '').trim();
    const hasSubString = subText.length >=1 && subStringCleaned !== '';
    const sText = hasSubString ? render(subText.join('\n'), {wrapOne:true}) : '';
    const text = render(t.trim(), {wrapOne:false}) + sText;
    //
    const html = [];
    if (diff === undefined) {
        html.push(getTag(ordered).o);
        html.push(liRender(text));
    } else {
        if (diff === 0) {
            html.push(liRender(text));
        } else if (diff >= 1) {
            html.push(getTag(ordered).o);
            html.push(liRender(text));
        } else {
            for (let i = 0; i < stack.length; i++) {
                const [stackOrdered, stackLevel] = stack.pop();
                if (stackLevel > level) {
                    html.push(getTag(stackOrdered).c);
                    if (stack.length === 1) html.push(liRender(text));
                } else {
                    stack.push([stackOrdered, stackLevel]);
                    html.push(liRender(text));
                    break
                }
            }
        }
    }
    return html
}
function getTag(orderedList) {
    const x = orderedList ? 'o' : 'u';
    return {o:`<${x}l>`, c:`</${x}l>`}
}
function normalizeNewlines(input) {
    return input
        .replace(/^\s*\n+/, '') // remove top newlines
        .replace(/\s*\n+$/, '') // remove end newlines
        .replace(/^\s*\n/gm, '\n') // clean newlines
        .replace(/\n{3,}/g, '\n\n') // down to 2 newlines
}
function getLineData(line) {
    const match =line.match(/(\s*)(\*|\-|\d+\.)(.+)/);
    if (match) {
        const [, spaces, bullet, text] = [...match];
        const ordered = bullet
            ? bullet.split('').pop() === '.'
            : undefined;
        return {spaces, bullet, text, ordered}
    } else {
        return {text: line}
    }
}

//
const htmlListError = `<ul><li>List Error</li></ul>`;
//
function listm () { 
    customElements.define(
        'list-m', class extends MElement {
            constructor() {
                super();
            }
            init() {
                render(this);
            }
        }
    );
    function render(that) {
        const [isValid, html] = parseContent(that.originalText());
        that.innerHTML = isValid
            ? html
            : htmlListError;
    }
}

listm();

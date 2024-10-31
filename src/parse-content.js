import render from '@titsoft/text-m/render'
export default function (content) {
    let firstOcc = false,
        firstItem = true,
        isValid = true,
        baseSpace,
        previousLevel,
        currentLevel
    const stack = [],
          html = [],
          currentLine = []
    for (const line of normalizeNewlines(content).split('\n')) {
        const lineData = getLineData(line)
        // Remove everything above the first list marker
        if (!lineData.bullet && !firstOcc) continue
        firstOcc = true
        if (lineData.bullet) {
            const len = lineData.spaces.length
            if (firstItem) {
                baseSpace = len
                currentLevel = 0
                stack.push([lineData.ordered, currentLevel])
            } else {
                previousLevel = currentLevel
                const nextLevel = Math.floor((len - baseSpace)/2)
                if (nextLevel < 0) {
                    isValid = false
                    break
                } else {
                    const diff = nextLevel - currentLevel
                    if (diff >= 1) {
                        currentLevel++
                        stack.push([lineData.ordered, currentLevel])
                    } else if (diff < 0 ){
                        currentLevel = nextLevel
                    }
                }
            }
            const diff = firstItem ? undefined : currentLevel - previousLevel
            Object.assign(
                lineData,
                {
                    subText: [],
                    level:currentLevel,
                    diff
                }
            )
            if (currentLine.length !== 0) {
                html.push(...renderHtml(currentLine.pop(), stack))
            }
            currentLine.push(lineData)
            firstItem = false
        } else {
            currentLine[0].subText.push(line)
        }
    }
    if (firstOcc) {
        html.push(...renderHtml(currentLine.pop(), stack))
        // Finally close all open tags
        for (const [ordered] of stack.reverse()) {
            html.push(getTag(ordered).c)
        }
    }
    return [isValid, html.join('')]
}
function liRender(text) {
    return `<li>${text}</li>`
}
function renderHtml(lineData, stack) {
    const {subText, text: t, ordered, diff, level} = lineData
    //
    const subStringCleaned = subText.join('\n').replace(/\s+/g, '').trim()
    const hasSubString = subText.length >=1 && subStringCleaned !== ''
    const sText = hasSubString ? render(subText.join('\n'), {wrapOne:true}) : ''
    const text = render(t.trim(), {wrapOne:false}) + sText
    //
    const html = []
    if (diff === undefined) {
        html.push(getTag(ordered).o)
        html.push(liRender(text))
    } else {
        if (diff === 0) {
            html.push(liRender(text))
        } else if (diff >= 1) {
            html.push(getTag(ordered).o)
            html.push(liRender(text))
        } else {
            for (let i = 0; i < stack.length; i++) {
                const [stackOrdered, stackLevel] = stack.pop()
                if (stackLevel > level) {
                    html.push(getTag(stackOrdered).c)
                    if (stack.length === 1) html.push(liRender(text))
                } else {
                    stack.push([stackOrdered, stackLevel])
                    html.push(liRender(text))
                    break
                }
            }
        }
    }
    return html
}
function getTag(orderedList) {
    const x = orderedList ? 'o' : 'u'
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
    const match =line.match(/(\s*)(\*|\-|\d+\.)(.+)/)
    if (match) {
        const [, spaces, bullet, text] = [...match]
        const ordered = bullet
            ? bullet.split('').pop() === '.'
            : undefined
        return {spaces, bullet, text, ordered}
    } else {
        return {text: line}
    }
}

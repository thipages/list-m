import {it} from 'node:test'
import assert from 'node:assert'
import parseContent from './../src/parse-content.js'
const S = _ => Array(_).fill(' ').join('')
const S1 = S(1)
const S2 = S(2)
const S3 = S(3)
const S4 = S(4)
// [Description, input, expected]
const INVALID_MODE = 'INVALID'
const tests = [
    [
        'one bullet minus',
        '-test',
        '<ul><li>test</li></ul>'
    ],
    [
        'one bullet start',
        '*test',
        '<ul><li>test</li></ul>'
    ],
    [
        'one bullet - spaces at start',
        `${S4}-test`,
        '<ul><li>test</li></ul>'
    ],
    [
        'one bullet - spaces around text',
        `-${S4}test${S4}`,
        '<ul><li>test</li></ul>'
    ],
    [
        'one bullet - starting and ending newlines + text before',
        `\nbefore\n-${S1}test\n`,
        '<ul><li>test</li></ul>'
    ],
    [
        'two bullets',
        '-t1\n-t2',
        '<ul><li>t1</li><li>t2</li></ul>'
    ],
    [
        'two bullets - one space more for bullet 2',
        `-t1\n-${S1}t2`,
        '<ul><li>t1</li><li>t2</li></ul>'
    ],
    [
        'two bullets - ONE space less for bullet 2 (no bullet can be before the first) - TO CHANGE',
        `${S1}-t1\n-t2`,
        '<ul><li>t1</li><li>t2</li></ul>',
        INVALID_MODE
    ],
    [
        'two bullets - TWO space less for bullet 2 (no bullet can be before the first)',
        `${S2}-t1\n-t2`,
        '<ul><li>t1</li><li>t2</li></ul>',
        INVALID_MODE
    ],
    [
        'two bullets - 2 spaces more for bullet 2',
        `-t1\n${S2}-t2`,
        '<ul><li>t1</li><ul><li>t2</li></ul></ul>'
    ],
    [
        'two bullets - 4 spaces more for bullet 2',
        `-t1\n${S4}-t2`,
        '<ul><li>t1</li><ul><li>t2</li></ul></ul>'
    ],
    [
        'one bullet digit',
        '1.test',
        '<ol><li>test</li></ol>'
    ],
    [
        'mix bullets digit no space',
        '1.t1\n-t2',
        '<ol><li>t1</li><li>t2</li></ol>'
    ],
    [
        'mix bullets digit 1 space',
        `1.t1\n${S1}-t2`,
        '<ol><li>t1</li><li>t2</li></ol>'
    ],
    [
        'mix bullets digit 2 spaces',
        `1.t1\n${S2}-t2`,
        '<ol><li>t1</li><ul><li>t2</li></ul></ol>'
    ],
    [
        'three bullets with last two ahead',
        `-t1\n${S2}-t2\n${S2}-t3`,
        '<ul><li>t1</li><ul><li>t2</li><li>t3</li></ul></ul>'
    ],
    [
        'three bullets with last back',
        `-t1\n${S2}-t2\n-t3`,
        '<ul><li>t1</li><ul><li>t2</li></ul><li>t3</li></ul>'
    ],
    [
        'three bullets with no last back',
        `-t1\n${S2}-t2\n${S4}-t3\n${S4}-t4`,
        '<ul><li>t1</li><ul><li>t2</li><ul><li>t3</li><li>t4</li></ul></ul></ul>'
    ],
    [
        'three bullets with last back 1',
        `-t1\n${S2}-t2\n${S4}-t3\n${S2}-t4`,
        '<ul><li>t1</li><ul><li>t2</li><ul><li>t3</li></ul><li>t4</li></ul></ul>'
    ],
    [
        'three bullets with last back 2',
        `-t1\n${S2}-t2\n${S4}-t3\n-t4`,
        '<ul><li>t1</li><ul><li>t2</li><ul><li>t3</li></ul></ul><li>t4</li></ul>'
    ],
    [
        'one bullets with subText',
        `-text\nsubtext`,
        '<ul><li>text<p>subtext</p></li></ul>'
    ],
    [
        'one bullets with subText',
        `-text\nsubtext1\n\nsubtext2`,
        '<ul><li>text<p>subtext1</p>\n<p>subtext2</p></li></ul>'
    ]
]
const MINIMAL_OUTPUT = true
const oneTest = tests.filter ( v => v[0].substring(0,1) === '!')[0]
if (oneTest) {
    dryTest(oneTest)
    console.log('**** ONE TEST ONLY ****')
} else {
    for (const test of tests) {
        dryTest(test)
    }
}
function dryTest(test) {
    const [description, input, expected, mode] = test
    it(description, () => {
        if (!MINIMAL_OUTPUT) {
            run()
        } else {
            try {
                run()
            } catch (e) {
                console.log(`${description}\ninput: \n${input}\n  actual:   ${e.actual}\n  expected: ${e.expected}`)
            }
        }
    })
    function run () {
        const [isValid, output] = parseContent(input)
        if (!mode) {
            if (isValid) {
                assert.strictEqual(output, expected)
            } else {
                assert.fail('invalid input')
            }
            
        } else if (mode === INVALID_MODE) {
            assert.strictEqual(false, isValid)
        }

    }
}
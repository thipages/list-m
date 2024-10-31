# list-m

(un)ordered list custom-element.

## Syntax & rules
- unordered list `ul` identified by `-` or `*`
- ordered list `ol` identified by a `digit + dot`
- `li` content can be changed through a renderer like `text-m` one

## Example

### Basic
```html
<list-m>
    - point 1
      - point 2
    * point 3
</list-m>
```

### Mix list

```html
<list-m>
    1. point A
      - point B
    2. point C
</list-m>
```

### With text-m renderer
```html
<list-m>
    1. point|strong/1/
      - point 2
    2. point 3
</list-m>
```

## level-up attribute

Boolean `level-up` attribute allows to replace `list-m` by its children.

## ... Javascript
```javascript
import {} from '@titsoft/list-m'

```
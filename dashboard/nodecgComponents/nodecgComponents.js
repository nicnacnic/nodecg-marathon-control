const { get, set } = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');

window.addEventListener('load', () => {
    setTimeout(() => {
        const buttons = document.querySelectorAll('button');
        for (let button of buttons) {
            if (!button.hasAttribute('noRipple'))
                button.addEventListener('click', createRipple)
        }

        const inputs = document.querySelectorAll('input[type]');
        for (let input of inputs) {
            if (input.type !== 'range') {
                input.addEventListener('blur', toggleInputLabel);
                Object.defineProperty(input, 'value', {
                    get() { return get.call(this); },
                    set(newVal) {
                        if (newVal !== undefined && newVal !== null && newVal !== '' && newVal.toString().length > 0)
                            input.nextElementSibling.classList.add('inputLabelFocus')
                        else
                            input.nextElementSibling.classList.remove('inputLabelFocus')
                        return set.call(this, newVal);
                    }
                });
                if (input.value !== undefined && input.value !== undefined && input.value.toString().length > 0)
                            input.nextElementSibling.classList.add('inputLabelFocus')
            }
        }

        const selects = document.querySelectorAll('select');
        for (let select of selects) {
            // Object.defineProperty(select, 'value', {
            //     get() {
            //         return get.call(this);
            //     },
            //     set(newVal) {
            //         if (newVal.length > 0)
            //         select.nextElementSibling.classList.add('selectLabelFocus')
            //         else
            //         select.nextElementSibling.classList.remove('selectLabelFocus')
            //         return set.call(this, newVal);
            //     }
            // });

            select.addEventListener('change', toggleSelectLabel);
            if (select.value.length > 0) {
                select.nextElementSibling.classList.add('selectLabelFocus')
            }
        }

        for (let e of document.querySelectorAll('input[type="range"].slider-progress')) {
            e.style.setProperty('--value', e.value);
            e.style.setProperty('--min', e.min == '' ? '0' : e.min);
            e.style.setProperty('--max', e.max == '' ? '100' : e.max);
            e.addEventListener('input', () => e.style.setProperty('--value', e.value));
        }
    }, 500);
});

function createRipple(event) {
    const button = event.currentTarget;
    const circle = document.createElement("span");
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${event.clientX - button.offsetLeft - radius}px`;
    circle.style.top = `${event.clientY - button.offsetTop - radius}px`;
    circle.style.pointerEvents = 'none';
    circle.classList.add("ripple");
    const ripple = button.getElementsByClassName("ripple")[0];
    if (ripple)
        ripple.remove();
    button.appendChild(circle);
}

function toggleInputLabel() {
    if (this.value.toString().length > 0)
        this.nextElementSibling.classList.add('inputLabelFocus')
    else
        this.nextElementSibling.classList.remove('inputLabelFocus')
}

function toggleSelectLabel() {
    if (this.value.length > 0)
        this.nextElementSibling.classList.add('selectLabelFocus')
    else
        this.nextElementSibling.classList.remove('selectLabelFocus')
}
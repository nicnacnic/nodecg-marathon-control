const fonts = nodecg.Replicant('assets:fonts');

// Load replicants.
NodeCG.waitForReplicants(fonts).then(() => {

    // Update fonts.
    fonts.on('change', (newVal) => {
        document.fonts.clear()
        newVal.forEach(async font => {
            const item = new FontFace(font.name, `url(${font.url})`);
            await item.load();
            document.fonts.add(item);
        });
    });
});

function fadeOut(element, time, callback) {
    let opacity = 1;
    const interval = setInterval(() => {
        opacity -= 0.01;
        document.getElementById(element).style.opacity = opacity;
        if (opacity <= 0) {
            clearInterval(interval);
            callback();
        }
    }, time / 100)
}

function fadeIn(element, time, callback) {
    let opacity = 0;
    const interval = setInterval(() => {
        opacity += 0.01;
        document.getElementById(element).style.opacity = opacity;
        if (opacity >= 1) {
            clearInterval(interval);
            callback()
        }
    }, time / 100);
}

function fitText(element, text, maxSize, callback) {
    let testDiv = document.getElementById('testDiv');
    let elementDiv = document.getElementById(element);
    let divWidth = parseInt(elementDiv.style.width, 10);
    let divHeight = parseInt(elementDiv.style.height, 10);
    testDiv.innerHTML = text;
    testDiv.style.fontSize = maxSize + 'pt';
    testDiv.style.fontFamily = elementDiv.style.fontFamily;
    while (testDiv.offsetWidth > divWidth || testDiv.offsetHeight > divHeight) {
        maxSize--;
        testDiv.style.fontSize = maxSize + 'pt';
    }
    elementDiv.style.fontSize = maxSize + 'pt';
    elementDiv.innerHTML = text;
    callback(maxSize + 'pt');
    return;
}
function fitTextName(element, text, maxSize, callback) {
    let width = 10000;
    let elementDiv = document.getElementById('name' + element);
    let medalsImgDiv = document.getElementById('medalsImg' + element);
    let medalsTextDiv = document.getElementById('medalsText' + element);
    let parentDiv = document.getElementById('name' + element).parentElement;
    let divWidth = parseInt(parentDiv.style.width, 10)
    elementDiv.innerHTML = text;
    medalsImgDiv.src = './img/medal_none.png';
    medalsTextDiv.innerHTML = '00:00:00';
    elementDiv.style.fontSize = maxSize + 'pt';
    medalsImgDiv.style.fontFamily = elementDiv.style.fontFamily;
    medalsImgDiv.style.fontSize = maxSize + 'pt';
    medalsTextDiv.style.fontFamily = elementDiv.style.fontFamily;
    medalsTextDiv.style.fontSize = maxSize + 'pt';
    while (width + 10 > divWidth) {
        maxSize--;
        elementDiv.style.fontSize = maxSize + 'pt';
        medalsImgDiv.style.fontSize = maxSize + 'pt';
        medalsTextDiv.style.fontSize = maxSize + 'pt';
        width = elementDiv.offsetWidth + medalsImgDiv.offsetWidth + medalsTextDiv.offsetWidth;
        height = elementDiv.offsetHeight;
    }
    medalsTextDiv.innerHTML = '';
    callback(maxSize + 'pt');
    return;
}

function fadeHtml(element, text, fontSize) {
    fadeOut(element, 250, () => {
        fitText(element, text, fontSize, () => {
            fadeIn(element, 500, () => { })
        })
    })
}

function fadeHtmlName(element, parent, text, fontSize) {
    let properties = layoutProperties.value[layoutProperties.value.findIndex(obj => obj.layout === currentLayout.value)][parent]
    fadeOut(parent, 250, () => {
        fitTextName(element.match(/\d+/)[0], text, properties.fontSize, () => {
            fadeIn(parent, 500, () => { })
        })
    })
}
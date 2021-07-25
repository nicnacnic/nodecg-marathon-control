const sceneList = nodecg.Replicant('sceneList');
const layoutList = nodecg.Replicant('assets:game-layouts');
const fonts = nodecg.Replicant('assets:fonts');
const currentScene = nodecg.Replicant('currentScene');
const currentLayout = nodecg.Replicant('currentLayout');
const layoutProperties = nodecg.Replicant('layoutProperties');
const showBorders = nodecg.Replicant('showBorders');

window.addEventListener('load', () => {

    // Load replicants.
    NodeCG.waitForReplicants(sceneList, layoutList, fonts, currentScene, currentLayout, layoutProperties, showBorders).then(() => {

        setTimeout(() => { changeElement() }, 100);

        // Populates dropdown with uploaded layouts.
        layoutList.on('change', (newVal) => {
            const dropdownContent = document.getElementById("layoutList");
            dropdownContent.innerHTML = '';
            for (let i = 0; i < newVal.length; i++) {
                let paperItem = document.createElement("paper-item");
                paperItem.innerHTML = newVal[i].name;
                if (newVal[i].name === currentLayout.value)
                    dropdownContent.setAttribute('selected', i)
                if (currentLayout.value === undefined)
                    dropdownContent.setAttribute('selected', 0)
                dropdownContent.appendChild(paperItem);
            }
        });

        // Update selected layout.
        currentLayout.on('change', (newVal) => {
            const dropdownContent = document.getElementById('layoutList');
            const items = dropdownContent.items;
            for (let i = 0; i < items.length; i++) {
                if (items[i].outerText === newVal) {
                    dropdownContent.selectIndex(i);
                    break;
                }
            }
            document.getElementById('elementList').selectIndex(0);
            changeElement();
        });

        // Populates font list.
        fonts.on('change', (newVal) => {
            const dropdownContent = document.getElementById('fontFamilyList');
            dropdownContent.innerHTML = '';
            let basePaperItem = document.createElement("paper-item");
            basePaperItem.innerHTML = 'Arial';
            dropdownContent.appendChild(basePaperItem);
            newVal.forEach(font => {
                let paperItem = document.createElement('paper-item');
                paperItem.innerHTML = font.name;
                dropdownContent.appendChild(paperItem)
            })
            changeElement();
        })

        showBorders.on('change', (newVal) => { document.getElementById('borderCheckbox').checked = newVal })
    })
})

function changeLayout(element) {
    currentLayout.value = element.selectedItem.innerHTML;
}

function changeElement() {
    let i = layoutProperties.value.findIndex(obj => obj.layout === currentLayout.value)
    let key = document.getElementById('elementList').selectedItem.getAttribute('key');
    if (!key.includes('twitch')) {
        let properties = layoutProperties.value[i][key];
        document.getElementById('posLeft').value = properties.posLeft;
        document.getElementById('posTop').value = properties.posTop;
        document.getElementById('width').value = properties.width;
        document.getElementById('height').value = properties.height;
        document.getElementById('paddingTB').value = properties.paddingTB;
        document.getElementById('paddingLR').value = properties.paddingLR;
        document.getElementById('fontSize').value = properties.fontSize;
        document.getElementById('fontColor').value = properties.fontColor;
        document.getElementById('prefix').value = properties.prefix;
        document.getElementById('suffix').value = properties.suffix;
        const dropdownContent1 = document.getElementById('textAlignList');
        const items1 = dropdownContent1.items;
        for (let j = 0; j < items1.length; j++) {
            if (items1[j].outerText === properties.textAlign) {
                dropdownContent1.selectIndex(j);
                break;
            }
        }
        const dropdownContent2 = document.getElementById('fontFamilyList');
        const items2 = dropdownContent2.items;
        for (let j = 0; j < items2.length; j++) {
            if (items2[j].outerText === properties.fontFamily) {
                dropdownContent2.selectIndex(j);
                break;
            }
        }
        switch (properties.visible) {
            case true: document.getElementById('visibleCheckbox').checked = true; break;
            case false: document.getElementById('visibleCheckbox').checked = false; break;
        }
        switch (layoutProperties.value[i].medals) {
            case true: document.getElementById('medalsCheckbox').checked = true; break;
            case false: document.getElementById('medalsCheckbox').checked = false; break;
        }
    }
}

function changeProperties() {
    let i = layoutProperties.value.findIndex(obj => obj.layout === document.getElementById('layoutList').selectedItem.innerHTML)
    let key = document.getElementById('elementList').selectedItem.getAttribute('key');
    if (!key.includes('twitch')) {
        showBorders.value = document.getElementById('borderCheckbox').checked;
        layoutProperties.value[i][key].posLeft = document.getElementById('posLeft').value;
        layoutProperties.value[i][key].posTop = document.getElementById('posTop').value;
        layoutProperties.value[i][key].width = document.getElementById('width').value;
        layoutProperties.value[i][key].height = document.getElementById('height').value;
        layoutProperties.value[i][key].paddingTB = document.getElementById('paddingTB').value;
        layoutProperties.value[i][key].paddingLR = document.getElementById('paddingLR').value;
        layoutProperties.value[i][key].fontSize = document.getElementById('fontSize').value;
        layoutProperties.value[i][key].fontColor = document.getElementById('fontColor').value;
        layoutProperties.value[i][key].textAlign = document.getElementById('textAlignList').selectedItem.innerHTML;
        layoutProperties.value[i][key].visible = document.getElementById('visibleCheckbox').checked;
        layoutProperties.value[i][key].prefix = document.getElementById('prefix').value;
        layoutProperties.value[i][key].suffix = document.getElementById('suffix').value;
        layoutProperties.value[i][key].fontFamily = document.getElementById('fontFamilyList').selectedItem.innerHTML;
        layoutProperties.value[i].medals = document.getElementById('medalsCheckbox').checked;
    }
}
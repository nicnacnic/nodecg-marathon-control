const intermissionLayout = nodecg.Replicant('assets:intermission-layout');
const intermissionProperties = nodecg.Replicant('intermissionProperties');
const fonts = nodecg.Replicant('assets:fonts');
const showBorders = nodecg.Replicant('showBorders');

window.addEventListener('load', () => {

    // Load replicants.
    NodeCG.waitForReplicants(intermissionLayout, intermissionProperties, fonts, showBorders).then(() => {

        //setTimeout(() => { changeElement() }, 100);
        document.getElementById('elementList').selectIndex(2);

        // Populates font list.
        fonts.on('change', async (newVal) => {
            const dropdownContent = document.getElementById('fontFamilyList');
            dropdownContent.innerHTML = '';
            let basePaperItem = document.createElement("paper-item");
            basePaperItem.innerHTML = 'Arial';
            dropdownContent.appendChild(basePaperItem);
            await newVal.forEach(font => {
                let paperItem = document.createElement('paper-item');
                paperItem.innerHTML = font.name;
                dropdownContent.appendChild(paperItem)
            });
            changeElement()
        })
        showBorders.on('change', (newVal) => { document.getElementById('borderCheckbox').checked = newVal })
    })
})

function changeElement() {
    let key = document.getElementById('elementList').selectedItem.getAttribute('key');
    let properties = intermissionProperties.value[key];
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
    switch (showBorders.value) {
        case true: document.getElementById('borderCheckbox').checked = true; break;
        case false: document.getElementById('borderCheckbox').checked = false; break;
    }
}

function changeProperties() {
    let key = document.getElementById('elementList').selectedItem.getAttribute('key');
    showBorders.value = document.getElementById('borderCheckbox').checked;
    intermissionProperties.value[key].posLeft = document.getElementById('posLeft').value;
    intermissionProperties.value[key].posTop = document.getElementById('posTop').value;
    intermissionProperties.value[key].width = document.getElementById('width').value;
    intermissionProperties.value[key].height = document.getElementById('height').value;
    intermissionProperties.value[key].paddingTB = document.getElementById('paddingTB').value;
    intermissionProperties.value[key].paddingLR = document.getElementById('paddingLR').value;
    intermissionProperties.value[key].fontSize = document.getElementById('fontSize').value;
    intermissionProperties.value[key].fontColor = document.getElementById('fontColor').value;
    intermissionProperties.value[key].textAlign = document.getElementById('textAlignList').selectedItem.innerHTML;
    intermissionProperties.value[key].visible = document.getElementById('visibleCheckbox').checked;
    intermissionProperties.value[key].prefix = document.getElementById('prefix').value;
    intermissionProperties.value[key].suffix = document.getElementById('suffix').value;
    intermissionProperties.value[key].fontFamily = document.getElementById('fontFamilyList').selectedItem.innerHTML;
}
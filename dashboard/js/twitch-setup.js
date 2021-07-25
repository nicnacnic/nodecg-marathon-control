const layoutList = nodecg.Replicant('assets:game-layouts');
const currentLayout = nodecg.Replicant('currentLayout');
const layoutProperties = nodecg.Replicant('layoutProperties');

window.addEventListener('load', function () {

    // Load replicants.
    NodeCG.waitForReplicants(layoutList, currentLayout, layoutProperties).then(() => {

        // Populates dropdown with uploaded layouts.
        layoutList.on('change', (newVal, oldVal) => {
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
        currentLayout.on('change', (newVal, oldVal) => {
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
    })
})

function changeLayout(element) {
    currentLayout.value = element.selectedItem.innerHTML;
}

function changeElement() {
    let i = layoutProperties.value.findIndex(obj => obj.layout === currentLayout.value)
    let key = document.getElementById('elementList').selectedItem.getAttribute('key');
    if (key.includes('twitch')) {
        let properties = layoutProperties.value[i][key];
        document.getElementById('posLeft').value = properties.posLeft;
        document.getElementById('posTop').value = properties.posTop;
        document.getElementById('cropTop').value = properties.cropTop;
        document.getElementById('cropBottom').value = properties.cropBottom;
        document.getElementById('cropLeft').value = properties.cropLeft;
        document.getElementById('cropRight').value = properties.cropRight;
        if (properties.visible)
            document.getElementById('visibleCheckbox').checked = true;
        else
            document.getElementById('visibleCheckbox').checked = false;
    }
}

function changeProperties() {
    let i = layoutProperties.value.findIndex(obj => obj.layout === document.getElementById('layoutList').selectedItem.innerHTML)
    let key = document.getElementById('elementList').selectedItem.getAttribute('key');
    if (key.includes('twitch')) {
        layoutProperties.value[i][key].posLeft = document.getElementById('posLeft').value;
        layoutProperties.value[i][key].posTop = document.getElementById('posTop').value;
        layoutProperties.value[i][key].cropTop = document.getElementById('cropTop').value;
        layoutProperties.value[i][key].cropBottom = document.getElementById('cropBottom').value;
        layoutProperties.value[i][key].cropLeft = document.getElementById('cropLeft').value;
        layoutProperties.value[i][key].cropRight = document.getElementById('cropRight').value;
        layoutProperties.value[i][key].visible = document.getElementById('visibleCheckbox').checked;
    }
}
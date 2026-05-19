const PREMIUM_PALETTE_PRESETS = [
    '#6366f1', '#4f46e5', '#4338ca', '#3b82f6', '#2563eb',
    '#1d4ed8', '#0ea5e9', '#0284c7', '#0369a1', '#06b6d4',
    '#0891b2', '#0e7490', '#10b981', '#059669', '#047857',
    '#22c55e', '#16a34a', '#15803d', '#84cc16', '#65a30d',
    '#eab308', '#ca8a04', '#f59e0b', '#d97706', '#b45309',
    '#f97316', '#ea580c', '#c2410c', '#ef4444', '#dc2626',
    '#b91c1c', '#ec4899', '#db2777', '#c21464', '#d946ef',
    '#c084fc', '#a855f7', '#8b5cf6', '#7c3aed', '#6d28d9',
    '#64748b', '#475569', '#334155', '#1e293b', '#0f172a'
];

let appState = {
    theme: 'light',
    chartType: 'bar',
    title: 'Performance Dashboard',
    datasetLabel: 'Target Conversions',
    showGrid: true,
    dataPoints: [] // Kept completely blank
};

let activeChartInstance = null;
let globallyTrackedPickerIndex = null;

const rowsContainer = document.getElementById('data-rows-container');
const btnAddData = document.getElementById('btn-add-datapoint');
const selectType = document.getElementById('chart-type');
const inputTitle = document.getElementById('chart-title');
const inputDatasetLabel = document.getElementById('dataset-label');
const checkboxGrid = document.getElementById('toggle-grid');
const checkboxTheme = document.getElementById('toggle-theme');

const colorModal = document.getElementById('custom-color-picker-modal');
const closePickerBtn = document.getElementById('close-picker-btn');
const paletteGridContainer = document.querySelector('.palette-grid');

document.addEventListener('DOMContentLoaded', () => {
    initializeWorkspace();
});

function initializeWorkspace() {
    buildCustomColorSelectionPalette();
    syncUiInputsFromState();
    buildActiveChartVisualization();
    registerGlobalInteractions();
    lucide.createIcons();
}

function buildCustomColorSelectionPalette() {
    PREMIUM_PALETTE_PRESETS.forEach(colorHex => {
        const swatch = document.createElement('button');
        swatch.className = 'palette-swatch';
        swatch.style.backgroundColor = colorHex;
        swatch.title = colorHex;
        
        swatch.addEventListener('click', () => {
            if (globallyTrackedPickerIndex !== null && appState.dataPoints[globallyTrackedPickerIndex]) {
                appState.dataPoints[globallyTrackedPickerIndex].color = colorHex;
                syncUiInputsFromState();
                buildActiveChartVisualization();
            }
            hideCustomColorPicker();
        });
        
        paletteGridContainer.appendChild(swatch);
    });
}

function showCustomColorPicker(targetRowIndex) {
    globallyTrackedPickerIndex = targetRowIndex;
    colorModal.classList.remove('hidden');
}

function hideCustomColorPicker() {
    globallyTrackedPickerIndex = null;
    colorModal.classList.add('hidden');
}

function syncUiInputsFromState() {
    selectType.value = appState.chartType;
    inputTitle.value = appState.title;
    inputDatasetLabel.value = appState.datasetLabel;
    checkboxGrid.checked = appState.showGrid;
    checkboxTheme.checked = appState.theme === 'dark';
    
    document.body.setAttribute('data-theme', appState.theme);
    
    rowsContainer.innerHTML = '';
    appState.dataPoints.forEach((dataNode, elementIndex) => {
        appendDataRowToMatrix(dataNode, elementIndex);
    });
}

function appendDataRowToMatrix(node, idx) {
    const rowEl = document.createElement('div');
    rowEl.className = 'data-row';
    rowEl.dataset.index = idx;

    rowEl.innerHTML = `
        <input type="text" class="input-row-label" value="${node.label}" placeholder="Label text...">
        <input type="number" class="input-row-value" value="${node.value}" placeholder="0">
        <div class="custom-color-swatch-trigger" style="background-color: ${node.color};" title="Click to open premium palette"></div>
        <button class="btn-trash btn-remove-row" title="Delete Point"><i data-lucide="trash-2"></i></button>
    `;

    rowEl.querySelector('.input-row-label').addEventListener('input', (e) => {
        appState.dataPoints[idx].label = e.target.value;
        buildActiveChartVisualization();
    });

    rowEl.querySelector('.input-row-value').addEventListener('input', (e) => {
        appState.dataPoints[idx].value = parseFloat(e.target.value) || 0;
        buildActiveChartVisualization();
    });

    rowEl.querySelector('.custom-color-swatch-trigger').addEventListener('click', () => {
        showCustomColorPicker(idx);
    });

    rowEl.querySelector('.btn-remove-row').addEventListener('click', () => {
        appState.dataPoints.splice(idx, 1);
        syncUiInputsFromState();
        buildActiveChartVisualization();
        lucide.createIcons();
    });

    rowsContainer.appendChild(rowEl);
}

function buildActiveChartVisualization() {
    const ctxElement = document.getElementById('app-chart-instance').getContext('2d');
    
    if (activeChartInstance) {
        activeChartInstance.destroy();
    }

    const currentModeDark = appState.theme === 'dark';
    const computedGridColor = currentModeDark ? '#475569' : '#e2e8f0';
    const computedTextColor = currentModeDark ? '#f8fafc' : '#0f172a';

    const extractionLabels = appState.dataPoints.map(p => p.label);
    const extractionValues = appState.dataPoints.map(p => p.value);
    const extractionColors = appState.dataPoints.map(p => p.color);

    const formatStyle = appState.chartType;
    
    let baseType = 'bar'; 
    if (formatStyle === 'line' || formatStyle === 'area') baseType = 'line';
    if (formatStyle === 'pie') baseType = 'pie';
    if (formatStyle === 'doughnut') baseType = 'doughnut';
    if (formatStyle === 'polarArea') baseType = 'polarArea';
    if (formatStyle === 'radar') baseType = 'radar';

    const isCircularLayout = ['pie', 'doughnut', 'polarArea'].includes(baseType);
    const isRadar = baseType === 'radar';

    // Simple single-dataset array matching standard options matrices
    const datasetsConfig = [{
        label: appState.datasetLabel,
        data: extractionValues,
        backgroundColor: (formatStyle === 'line' || isRadar) ? 'rgba(99, 102, 241, 0.2)' : extractionColors,
        borderColor: (formatStyle === 'line' || isRadar) ? '#6366f1' : (currentModeDark ? '#1e293b' : '#ffffff'),
        borderWidth: isCircularLayout ? 3 : 2,
        fill: formatStyle === 'area',
        hoverOffset: isCircularLayout ? 15 : 4
    }];

    let scalesConfig = {};
    if (!isCircularLayout && !isRadar) {
        scalesConfig = {
            x: {
                grid: { display: appState.showGrid, color: computedGridColor },
                ticks: { color: computedTextColor }
            },
            y: {
                grid: { display: appState.showGrid, color: computedGridColor },
                ticks: { color: computedTextColor }
            }
        };
    } else if (isRadar) {
        scalesConfig = {
            r: {
                grid: { color: computedGridColor },
                angleLines: { color: computedGridColor },
                pointLabels: { color: computedTextColor, font: { size: 11 } },
                ticks: { backdropColor: 'transparent', color: computedTextColor }
            }
        };
    }

    const structuredConfiguration = {
        type: baseType,
        data: {
            labels: extractionLabels,
            datasets: datasetsConfig
        },
        options: {
            indexAxis: formatStyle === 'horizontal-bar' ? 'y' : 'x',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: !!appState.title,
                    text: appState.title,
                    color: computedTextColor,
                    font: { size: 18, weight: '700', family: "'Inter', sans-serif" },
                    padding: { bottom: 20 }
                },
                legend: {
                    position: isCircularLayout ? 'right' : 'top',
                    labels: { color: computedTextColor, font: { weight: '500' } }
                }
            },
            scales: scalesConfig
        }
    };

    activeChartInstance = new Chart(ctxElement, structuredConfiguration);
}

function registerGlobalInteractions() {
    selectType.addEventListener('change', (e) => {
        appState.chartType = e.target.value;
        buildActiveChartVisualization();
    });

    inputTitle.addEventListener('input', (e) => {
        appState.title = e.target.value;
        buildActiveChartVisualization();
    });

    inputDatasetLabel.addEventListener('input', (e) => {
        appState.datasetLabel = e.target.value;
        buildActiveChartVisualization();
    });

    checkboxGrid.addEventListener('change', (e) => {
        appState.showGrid = e.target.checked;
        buildActiveChartVisualization();
    });

    checkboxTheme.addEventListener('change', (e) => {
        appState.theme = e.target.checked ? 'dark' : 'light';
        document.body.setAttribute('data-theme', appState.theme);
        buildActiveChartVisualization();
    });

    closePickerBtn.addEventListener('click', hideCustomColorPicker);
    document.querySelector('.picker-overlay').addEventListener('click', hideCustomColorPicker);

    btnAddData.addEventListener('click', () => {
        const fallbackPickedColor = PREMIUM_PALETTE_PRESETS[Math.floor(Math.random() * PREMIUM_PALETTE_PRESETS.length)];
        appState.dataPoints.push({
            label: `Metric ${appState.dataPoints.length + 1}`,
            value: Math.floor(Math.random() * 20000) + 5000,
            color: fallbackPickedColor
        });
        syncUiInputsFromState();
        buildActiveChartVisualization();
        lucide.createIcons();
    });

    document.getElementById('btn-save-local').addEventListener('click', () => {
        localStorage.setItem('graphstudio_pro_save', JSON.stringify(appState));
        alert('Success: Project setup map safely synchronized into internal browser database sandbox.');
    });

    document.getElementById('btn-load-local').addEventListener('click', () => {
        const cacheRef = localStorage.getItem('graphstudio_pro_save');
        if (cacheRef) {
            appState = JSON.parse(cacheRef);
            syncUiInputsFromState();
            buildActiveChartVisualization();
            lucide.createIcons();
        } else {
            alert('Notice: No valid local storage configuration traces discovered yet.');
        }
    });

    document.getElementById('btn-export-json').addEventListener('click', () => {
        const documentFormattedName = `${appState.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_studio_data.json`;
        const conversionPayloadString = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appState, null, 2));
        
        const anchorNodeInstance = document.createElement('a');
        anchorNodeInstance.setAttribute("href", conversionPayloadString);
        anchorNodeInstance.setAttribute("download", documentFormattedName);
        document.body.appendChild(anchorNodeInstance);
        
        anchorNodeInstance.click();
        anchorNodeInstance.remove();
    });

    const uploadInputNode = document.getElementById('file-import');
    document.getElementById('btn-import-trigger').addEventListener('click', () => uploadInputNode.click());
    
    uploadInputNode.addEventListener('change', (e) => {
        const fileRef = e.target.files[0];
        if (!fileRef) return;

        const dynamicReader = new FileReader();
        dynamicReader.onload = (fileEvent) => {
            try {
                const structuralVerificationObject = JSON.parse(fileEvent.target.result);
                if (structuralVerificationObject && Array.isArray(structuralVerificationObject.dataPoints)) {
                    appState = structuralVerificationObject;
                    syncUiInputsFromState();
                    buildActiveChartVisualization();
                    lucide.createIcons();
                } else {
                    alert('Error: Data maps structure error - verify formatting tokens configurations syntax.');
                }
            } catch (err) {
                alert('Internal Parsing Error: Target file corruption detected or layout formatting unreadable.');
            }
        };
        dynamicReader.readAsText(fileRef);
        uploadInputNode.value = '';
    });

    document.getElementById('btn-snap-png').addEventListener('click', () => {
        if (!activeChartInstance) return;
        const generationLink = document.createElement('a');
        generationLink.download = `${appState.title.toLowerCase().replace(/[^a-z0-9]+/g, '_') || 'graph_export'}.png`;
        generationLink.href = activeChartInstance.toBase64Image();
        document.body.appendChild(generationLink);
        generationLink.click();
        generationLink.remove();
    });
}
// Global App State
const state = {
    socket: null,
    dirHandle: null,
    logFileHandle: null,
    logStream: null,
    isConnected: false,
    globalT: false, // Temperature Reading
    globalF: false, // Fan
    activeView: 'view-menu',
    isLogging: false,
    experimentActive: false,
    // Chart Arrays (20s window at Ts=0.7s -> roughly 30 points)
    maxPoints: 30,
    charts: {}
};

// Elements
const els = {
    wsIp: document.getElementById('ws-ip'),
    btnConnect: document.getElementById('btn-connect'),
    connStatus: document.getElementById('conn-status'),
    btnSetDir: document.getElementById('btn-set-dir'),
    dirStatus: document.getElementById('dir-status'),
    
    btnToggleTemp: document.getElementById('btn-toggle-temp'),
    btnToggleFan: document.getElementById('btn-toggle-fan'),
    btnEmergencyStop: document.getElementById('btn-emergency-stop'),
    globalTin: document.getElementById('global-tin'),
    globalTout: document.getElementById('global-tout'),
    
    // Topbar Additions
    btnThemeToggle: document.getElementById('btn-theme-toggle'),
    iconThemeDark: document.getElementById('icon-theme-dark'),
    iconThemeLight: document.getElementById('icon-theme-light'),
    langSelect: document.getElementById('lang-select'),
    
    views: document.querySelectorAll('.view'),
    modeCards: document.querySelectorAll('.mode-card'),
    btnBacks: document.querySelectorAll('.btn-back'),
    
    // Manual Mode
    btnManualLog: document.getElementById('btn-manual-log'),
    manualVoltageInput: document.getElementById('manual-voltage-input'),
    btnManualSet: document.getElementById('btn-manual-set'),
    manualU: document.getElementById('manual-u'),
    
    // Reference Mode
    btnRefLog: document.getElementById('btn-ref-log'),
    refControllerSelect: document.getElementById('ref-controller-select'),
    refAddonContainer: document.getElementById('ref-addon-container'),
    refTargetInput: document.getElementById('ref-target-input'),
    btnRefSet: document.getElementById('btn-ref-set'),
    refValTin: document.getElementById('ref-val-tin'),
    refValTout: document.getElementById('ref-val-tout'),
    refValRef: document.getElementById('ref-val-ref'),
    refValErr: document.getElementById('ref-val-err'),
    refValUo: document.getElementById('ref-val-uo'),
    refValU: document.getElementById('ref-val-u'),
    
    // Plant Mode
    btnPlantStart: document.getElementById('btn-plant-start'),
    plantLogStatus: document.getElementById('plant-log-status'),
    plantTerminal: document.getElementById('plant-terminal')
};

// ==========================================
// FILE SYSTEM LOGGING
// ==========================================
els.btnSetDir.addEventListener('click', async () => {
    if (!window.showDirectoryPicker) {
        alert("Your browser does not support local folder selection (try Chrome/Edge). Logs will be saved in memory and downloaded automatically when stopped.");
        return;
    }
    try {
        state.dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
        els.dirStatus.textContent = state.dirHandle.name;
        els.btnSetDir.classList.replace('btn-secondary', 'btn-primary');
    } catch (err) {
        alert("Folder selection cancelled or blocked by privacy settings (e.g., Brave). Logs will be saved in memory and downloaded automatically when stopped.");
        state.dirHandle = null;
        console.warn("Directory selection failed", err);
    }
});

async function startLog(modeName) {
    if (state.isLogging) return;
    
    const now = new Date();
    const pad = n => n.toString().padStart(2, '0');
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    const fileName = `${dateStr}_${modeName}.csv`;

    if (state.dirHandle) {
        // Desktop: File System Access API
        try {
            state.logFileHandle = await state.dirHandle.getFileHandle(fileName, { create: true });
            const writable = await state.logFileHandle.createWritable();
            state.logStream = writable;
            state.isLogging = true;
            console.log(`Started local logging to ${fileName}`);
        } catch (err) {
            alert("Error creating file in directory: " + err.message);
            return;
        }
    } else {
        // Fallback for Mobile (collect in memory, download at end)
        state.mobileLogBuffer = "";
        state.mobileLogName = fileName;
        state.isLogging = true;
        console.log(`Started memory logging for ${fileName}`);
    }
    updateLogUI();
}

// ==========================================
// i18n & THEME LOGIC
// ==========================================

const i18n = {
    en: {
        btn_connect: "Connect",
        btn_disconnect: "Disconnect",
        status_offline: "Offline",
        status_online: "Online",
        btn_folder: "Set CSV Folder",
        status_no_folder: "No folder selected",
        menu_title: "Select Operational Mode",
        menu_manual_title: "Manual Voltage",
        menu_manual_desc: "Apply direct voltage to the Peltier cell and monitor real-time thermal response.",
        menu_ref_title: "Reference Testing",
        menu_ref_desc: "Evaluate closed-loop controllers (PID, MPC, Fuzzy) with precise temperature targets.",
        menu_plant_title: "Plant Experiment",
        menu_plant_desc: "Run automated step-response experiments for system identification.",
        btn_back: "Back",
        manual_title: "Manual Voltage Control",
        btn_start_log: "Start Log",
        btn_stop_log: "Stop Log",
        btn_apply_voltage: "Apply Voltage",
        label_applied: "Applied (u)",
        ref_title: "Reference Testing",
        ref_select: "Select Core Controller...",
        ref_opt_mpc: "MPC (Explicit Model Predictive)",
        ref_opt_hyst: "ON-OFF Hysteresis",
        ref_opt_fuzzy: "Fuzzy PD+I Parallel (Mamdani)",
        btn_start_control: "Start Control",
        plant_title: "Plant Experiment",
        status_log_inactive: "Log Inactive",
        status_log_active: "Log Active",
        plant_desc: "Executes a predefined sequence of cooling and voltage steps for system identification. Logs are saved automatically.",
        btn_start_exp: "START EXPERIMENT (E)",
        plant_csv: "CSV Data Stream",
        dock_sensors: "Sensors",
        dock_stop: "EMERGENCY STOP",
        dock_fan: "Fan",
        chart_temp: "Temperatures",
        chart_volt: "Applied Voltage (u)",
        chart_ref_temp: "Temperatures vs Target",
        chart_ref_err: "Control Error (e)",
        chart_ref_sat: "Saturation (u_o vs u)",
        chart_plant_temp: "Plant Temperatures",
        chart_plant_volt: "Plant Voltage Steps",
        ax_time: "Time (s)",
        ax_temp: "Temperature (°C)",
        ax_volt: "Voltage (V)",
        ax_err: "Error (°C)",
        ds_tin: "T_in (°C)",
        ds_tout: "T_out (°C)",
        ds_ref: "Reference (°C)",
        ds_uo: "Desired u_o",
        ds_err: "Error (°C)",
        ref_target: "Reference Temperature (°C)",
        status_exp_running: "EXPERIMENT RUNNING...",
        manual_voltage_ph: "Voltage (e.g. 5.5)"
    },
    ca: {
        btn_connect: "Connectar",
        btn_disconnect: "Desconnectar",
        status_offline: "Fora de línia",
        status_online: "En línia",
        btn_folder: "Seleccionar Carpeta CSV",
        status_no_folder: "Cap carpeta seleccionada",
        menu_title: "Selecciona el Mode Operatiu",
        menu_manual_title: "Voltatge Manual",
        menu_manual_desc: "Aplica voltatge directe a la cèl·lula Peltier i monitoritza la resposta tèrmica en temps real.",
        menu_ref_title: "Test de Referència",
        menu_ref_desc: "Avalua controladors en bucle tancat (PID, MPC, Fuzzy) amb consignes de temperatura precises.",
        menu_plant_title: "Experiment de Planta",
        menu_plant_desc: "Executa experiments automàtics per passos per a la identificació del sistema.",
        btn_back: "Tornar",
        manual_title: "Control Manual de Voltatge",
        btn_start_log: "Iniciar Registre",
        btn_stop_log: "Aturar Registre",
        btn_apply_voltage: "Aplicar Voltatge",
        label_applied: "Aplicat (u)",
        ref_title: "Test de Referència",
        ref_select: "Selecciona el Controlador Central...",
        ref_opt_mpc: "MPC (Predictiu per Model Explícit)",
        ref_opt_hyst: "Histeresi ON-OFF",
        ref_opt_fuzzy: "Fuzzy PD+I Paral·lel (Mamdani)",
        btn_start_control: "Iniciar Control",
        plant_title: "Experiment de Planta",
        status_log_inactive: "Registre Inactiu",
        status_log_active: "Registre Actiu",
        plant_desc: "Executa una seqüència predefinida de passos de refredament i voltatge per a la identificació del sistema. Els registres es guarden automàticament.",
        btn_start_exp: "INICIAR EXPERIMENT (E)",
        plant_csv: "Flux de Dades CSV",
        dock_sensors: "Sensors",
        dock_stop: "ATURADA D'EMERGÈNCIA",
        dock_fan: "Ventilador",
        chart_temp: "Temperatures",
        chart_volt: "Voltatge Aplicat (u)",
        chart_ref_temp: "Temperatures vs Consigna",
        chart_ref_err: "Error de Control (e)",
        chart_ref_sat: "Saturació (u_o vs u)",
        chart_plant_temp: "Temperatures Planta",
        chart_plant_volt: "Esglaons de Voltatge",
        ax_time: "Temps (s)",
        ax_temp: "Temperatura (°C)",
        ax_volt: "Voltatge (V)",
        ax_err: "Error (°C)",
        ds_tin: "T_in (°C)",
        ds_tout: "T_out (°C)",
        ds_ref: "Consigna (°C)",
        ds_uo: "u_o Desitjat",
        ds_err: "Error (°C)",
        ref_target: "Temperatura de Referència (°C)",
        status_exp_running: "EXPERIMENT EN CURS...",
        manual_voltage_ph: "Voltatge (ex. 5.5)"
    },
    es: {
        btn_connect: "Conectar",
        btn_disconnect: "Desconectar",
        status_offline: "Desconectado",
        status_online: "En línea",
        btn_folder: "Carpeta CSV",
        status_no_folder: "Ninguna carpeta",
        menu_title: "Selecciona Modo Operativo",
        menu_manual_title: "Voltaje Manual",
        menu_manual_desc: "Aplica voltaje directo a la celda Peltier y supervisa la respuesta térmica en tiempo real.",
        menu_ref_title: "Prueba de Referencia",
        menu_ref_desc: "Evalúa controladores en lazo cerrado (PID, MPC, Fuzzy) con consignas de temperatura.",
        menu_plant_title: "Experimento de Planta",
        menu_plant_desc: "Ejecuta experimentos automáticos por pasos para identificación de sistemas.",
        btn_back: "Volver",
        manual_title: "Control Manual de Voltaje",
        btn_start_log: "Iniciar Registro",
        btn_stop_log: "Detener Registro",
        btn_apply_voltage: "Aplicar Voltaje",
        label_applied: "Aplicado (u)",
        ref_title: "Prueba de Referencia",
        ref_select: "Selecciona Controlador Central...",
        ref_opt_mpc: "MPC (Predictivo por Modelo Explícito)",
        ref_opt_hyst: "Histéresis ON-OFF",
        ref_opt_fuzzy: "Fuzzy PD+I Paralelo (Mamdani)",
        btn_start_control: "Iniciar Control",
        plant_title: "Experimento de Planta",
        status_log_inactive: "Registro Inactivo",
        status_log_active: "Registro Activo",
        plant_desc: "Ejecuta una secuencia predefinida de pasos de enfriamiento y voltaje para la identificación del sistema. Los registros se guardan automáticamente.",
        btn_start_exp: "INICIAR EXPERIMENTO (E)",
        plant_csv: "Flujo de Datos CSV",
        dock_sensors: "Sensores",
        dock_stop: "PARADA DE EMERGENCIA",
        dock_fan: "Ventilador",
        chart_temp: "Temperaturas",
        chart_volt: "Voltaje Aplicado (u)",
        chart_ref_temp: "Temperaturas vs Consigna",
        chart_ref_err: "Error de Control (e)",
        chart_ref_sat: "Saturación (u_o vs u)",
        chart_plant_temp: "Temperaturas Planta",
        chart_plant_volt: "Escalones de Voltaje",
        ax_time: "Tiempo (s)",
        ax_temp: "Temperatura (°C)",
        ax_volt: "Voltaje (V)",
        ax_err: "Error (°C)",
        ds_tin: "T_in (°C)",
        ds_tout: "T_out (°C)",
        ds_ref: "Consigna (°C)",
        ds_uo: "u_o Deseado",
        ds_err: "Error (°C)",
        ref_target: "Temperatura de Referencia (°C)",
        status_exp_running: "EXPERIMENTO EN CURSO...",
        manual_voltage_ph: "Voltaje (ej. 5.5)"
    }
};

let currentLang = 'en';

function t(key) {
    return i18n[currentLang][key] || key;
}

function updateTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (i18n[currentLang][key]) {
            el.textContent = i18n[currentLang][key];
        }
    });
    
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (i18n[currentLang][key]) {
            el.placeholder = i18n[currentLang][key];
        }
    });
    
    // Dynamic values that might need translating based on current state
    if (state.isConnected) {
        els.btnConnect.textContent = t('btn_disconnect');
        els.connStatus.textContent = t('status_online');
    } else {
        els.btnConnect.textContent = t('btn_connect');
        els.connStatus.textContent = t('status_offline');
    }
    
    if (state.isLogging) {
        if (state.activeView === 'view-manual') els.btnManualLog.textContent = t('btn_stop_log');
        if (state.activeView === 'view-reference') els.btnRefLog.textContent = t('btn_stop_log');
        if (state.activeView === 'view-plant') els.plantLogStatus.textContent = t('status_log_active');
    } else {
        els.btnManualLog.textContent = t('btn_start_log');
        els.btnRefLog.textContent = t('btn_start_log');
        els.plantLogStatus.textContent = t('status_log_inactive');
    }
    if (state.experimentActive) {
        els.btnPlantStart.textContent = t('status_exp_running');
    } else {
        els.btnPlantStart.textContent = t('btn_start_exp');
    }
    
    // Update Chart texts
    if (Object.keys(state.charts).length > 0) {
        const updateChartText = (chart, titleKey, yAxisKey, dsKeys) => {
            if (!chart) return;
            chart.options.plugins.title.text = t(titleKey);
            chart.options.scales.x.title.text = t('ax_time');
            chart.options.scales.y.title.text = t(yAxisKey);
            chart.data.datasets.forEach((ds, i) => {
                if (dsKeys[i]) ds.label = t(dsKeys[i]);
            });
            chart.update();
        };
        
        updateChartText(state.charts.manualTemp, 'chart_temp', 'ax_temp', ['ds_tin', 'ds_tout']);
        updateChartText(state.charts.manualVolt, 'chart_volt', 'ax_volt', ['chart_volt']); // using title as label
        
        updateChartText(state.charts.refTemp, 'chart_ref_temp', 'ax_temp', ['ds_tin', 'ds_tout', 'ds_ref']);
        updateChartText(state.charts.refErr, 'chart_ref_err', 'ax_err', ['ds_err']);
        updateChartText(state.charts.refVolt, 'chart_volt', 'ax_volt', ['chart_volt']);
        updateChartText(state.charts.refSat, 'chart_ref_sat', 'ax_volt', ['ds_uo', 'chart_volt']);
        
        updateChartText(state.charts.plantTemp, 'chart_plant_temp', 'ax_temp', ['ds_tin', 'ds_tout']);
        updateChartText(state.charts.plantVolt, 'chart_plant_volt', 'ax_volt', ['chart_plant_volt']);
    }
}

els.langSelect.addEventListener('change', (e) => {
    currentLang = e.target.value;
    updateTranslations();
});

let isLight = false;
els.btnThemeToggle.addEventListener('click', () => {
    isLight = !isLight;
    if (isLight) {
        document.body.classList.add('light-theme');
        els.iconThemeDark.style.display = 'none';
        els.iconThemeLight.style.display = 'block';
    } else {
        document.body.classList.remove('light-theme');
        els.iconThemeDark.style.display = 'block';
        els.iconThemeLight.style.display = 'none';
    }
    updateChartColors();
});

// Initialize translations
updateTranslations();

async function stopLog() {
    if (!state.isLogging) return;
    
    if (state.logStream) {
        await state.logStream.close();
        state.logStream = null;
        state.logFileHandle = null;
    } else if (state.mobileLogBuffer !== undefined) {
        // Trigger download
        const blob = new Blob([state.mobileLogBuffer], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = state.mobileLogName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        state.mobileLogBuffer = undefined;
    }
    
    state.isLogging = false;
    updateLogUI();
}

async function writeLog(text) {
    if (!state.isLogging) return;
    
    if (state.logStream) {
        await state.logStream.write(text + "\n");
    } else if (state.mobileLogBuffer !== undefined) {
        state.mobileLogBuffer += text + "\n";
    }
}

function updateLogUI() {
    [els.btnManualLog, els.btnRefLog].forEach(btn => {
        if (state.isLogging) {
            btn.classList.replace('off', 'on');
            btn.textContent = t('btn_stop_log');
        } else {
            btn.classList.replace('on', 'off');
            btn.textContent = t('btn_start_log');
        }
    });
    
    if (state.isLogging && state.experimentActive) {
        els.plantLogStatus.classList.replace('inactive', 'active');
        els.plantLogStatus.textContent = t('status_log_active');
        els.plantLogStatus.style.background = "rgba(50, 215, 75, 0.2)";
        els.plantLogStatus.style.color = "var(--accent-green)";
    } else {
        els.plantLogStatus.classList.replace('active', 'inactive');
        els.plantLogStatus.textContent = t('status_log_inactive');
        els.plantLogStatus.style.background = "rgba(255, 69, 58, 0.2)";
        els.plantLogStatus.style.color = "var(--accent-red)";
    }
}

// ==========================================
// WEBSOCKETS COMMUNICATION
// ==========================================
function sendCmd(cmd) {
    if (state.socket && state.socket.readyState === WebSocket.OPEN) {
        state.socket.send(cmd + '\n');
    }
}

els.btnConnect.addEventListener('click', () => {
    if (state.isConnected) {
        state.socket.close();
        return;
    }
    
    const ip = els.wsIp.value;
    els.connStatus.textContent = "Connecting...";
    state.socket = new WebSocket(`ws://${ip}:81`);
    
    state.socket.onopen = () => {
        state.isConnected = true;
        els.connStatus.textContent = t('status_online');
        els.btnConnect.textContent = t('btn_disconnect');
        els.connStatus.classList.replace('offline', 'online');
        document.getElementById('lockable-ui').classList.remove('locked');
        document.getElementById('global-dock').classList.remove('locked');
    };
    
    state.socket.onclose = () => {
        state.isConnected = false;
        els.connStatus.textContent = t('status_offline');
        els.btnConnect.textContent = t('btn_connect');
        els.connStatus.classList.replace('online', 'offline');
        document.getElementById('lockable-ui').classList.add('locked');
        document.getElementById('global-dock').classList.add('locked');
    };
    
    state.socket.onmessage = (event) => {
        const lines = event.data.split('\n');
        lines.forEach(data => {
            data = data.trim();
            if (data === '') return;

            // Terminal output for Plant Experiment
            if (state.activeView === 'view-plant') {
                els.plantTerminal.textContent += data + "\n";
                els.plantTerminal.scrollTop = els.plantTerminal.scrollHeight;
            }

            // Handle Log Markers
            if (data.includes(">>> LOG_START")) {
                if (data.includes("PLANT_IDENTIFICATION")) {
                    state.experimentActive = true;
                    startLog("PlantExperiment");
                }
                // Do not write raw text to CSV to keep it clean
                return;
            }
            
            if (data.includes(">>> LOG_END <<<")) {
                stopLog();
                state.experimentActive = false;
                return;
            }
            
            // Filter clean CSV lines (Starts with digit or "Time")
            if (state.isLogging) {
                if (/^\d/.test(data) || data.startsWith("Time")) {
                    writeLog(data);
                }
            }

            // Parse CSV for telemetry and charts
            const parts = data.split(',').map(s => parseFloat(s.trim()));
            
            if (parts.length >= 4 && !isNaN(parts[0])) {
                // Determine format
                if (parts.length === 7) {
                    // Closed Loop
                    const [time, ref, u_o, tin, tout, u, err] = parts; 
                    // Let's rely on standard ESP32 output order:
                    const tin_val = parts[2];
                    const tout_val = parts[3];
                    const ref_val = parts[1];
                    const u_val = parts[5];
                    const err_val = parts[6];
                    
                    updateGlobalTelemetry(tin_val, tout_val);
                    
                    if (state.activeView === 'view-manual') {
                        els.manualU.textContent = u_val.toFixed(2);
                        addData(state.charts.manualTemp, time, [tin_val, tout_val]);
                        addData(state.charts.manualVolt, time, [u_val]);
                    } else if (state.activeView === 'view-reference') {
                        els.refValTin.textContent = tin_val.toFixed(2);
                        els.refValTout.textContent = tout_val.toFixed(2);
                        els.refValRef.textContent = ref_val.toFixed(2);
                        els.refValErr.textContent = err_val.toFixed(2);
                        els.refValUo.textContent = parts[4].toFixed(2);
                        els.refValU.textContent = u_val.toFixed(2);
                        addData(state.charts.refTemp, time, [tin_val, tout_val, ref_val]);
                        addData(state.charts.refErr, time, [err_val]);
                        addData(state.charts.refVolt, time, [u_val]);
                        addData(state.charts.refSat, time, [parts[4], u_val]); // u_o, u
                    }
                } else if (parts.length === 4) {
                    // Plant ID: Time, Voltage, TempIn, TempOut
                    const [time, v, tin, tout] = parts;
                    updateGlobalTelemetry(tin, tout);
                    
                    if (state.activeView === 'view-plant') {
                        addData(state.charts.plantTemp, time, [tin, tout]);
                        addData(state.charts.plantVolt, time, [v]);
                    } else if (state.activeView === 'view-manual') {
                        els.manualU.textContent = v.toFixed(2);
                        addData(state.charts.manualTemp, time, [tin, tout]);
                        addData(state.charts.manualVolt, time, [v]);
                    }
                }
            }
        }); // End lines.forEach
    };
});

// ==========================================
// UI LOGIC & NAVIGATION
// ==========================================
function updateGlobalTelemetry(tin, tout) {
    if (state.globalT) {
        els.globalTin.textContent = tin.toFixed(2);
        els.globalTout.textContent = tout.toFixed(2);
    } else {
        els.globalTin.textContent = "---";
        els.globalTout.textContent = "---";
    }
}

function switchView(targetId) {
    if (state.isLogging) {
        const confirmExit = confirm("A log is currently recording. Leaving this mode will send a STOP command and terminate the log permanently. Proceed?");
        if (!confirmExit) return;
        sendCmd('s');
        stopLog();
    } else {
        sendCmd('s'); // Always stop activities when switching context
    }
    
    // Sync UI to stopped state
    state.globalT = false;
    state.globalF = false;
    els.btnToggleTemp.classList.replace('on', 'off');
    els.btnToggleFan.classList.replace('on', 'off');
    updateGlobalTelemetry();
    
    if (targetId !== 'view-menu') {
        els.btnToggleFan.disabled = true;
        els.btnToggleFan.style.opacity = '0.5';
    } else {
        els.btnToggleFan.disabled = false;
        els.btnToggleFan.style.opacity = '1';
    }
    
    state.experimentActive = false;
    els.btnPlantStart.classList.replace('btn-secondary', 'btn-primary');
    els.btnPlantStart.textContent = t('btn_start_exp');
    
    // Re-enable Reference selects and reset manual U
    els.refControllerSelect.disabled = false;
    if (els.refAddonContainer) {
        els.refAddonContainer.querySelectorAll('input').forEach(el => el.disabled = false);
    }
    els.btnRefSet.disabled = false;
    if (els.manualU) els.manualU.textContent = "0.00";
    
    updateLogUI();
    
    els.views.forEach(v => v.classList.remove('active'));
    setTimeout(() => {
        els.views.forEach(v => v.classList.add('hidden'));
        const target = document.getElementById(targetId);
        target.classList.remove('hidden');
        setTimeout(() => target.classList.add('active'), 10);
    }, 300);
    
    state.activeView = targetId;
}

els.modeCards.forEach(card => {
    card.addEventListener('click', () => switchView(card.dataset.target));
});

els.btnBacks.forEach(btn => {
    btn.addEventListener('click', () => switchView('view-menu'));
});

// Global Buttons
els.btnToggleTemp.addEventListener('click', () => {
    state.globalT = !state.globalT;
    els.btnToggleTemp.classList.toggle('on', state.globalT);
    els.btnToggleTemp.classList.toggle('off', !state.globalT);
    sendCmd('t');
    if (!state.globalT) updateGlobalTelemetry();
});

els.btnToggleFan.addEventListener('click', () => {
    state.globalF = !state.globalF;
    els.btnToggleFan.classList.toggle('on', state.globalF);
    els.btnToggleFan.classList.toggle('off', !state.globalF);
    sendCmd(state.globalF ? 'f1' : 'f0');
});

els.btnEmergencyStop.addEventListener('click', () => {
    sendCmd('s');
    if (state.isLogging) stopLog();
    
    // Sync UI to stopped state
    state.globalT = false;
    state.globalF = false;
    els.btnToggleTemp.classList.replace('on', 'off');
    els.btnToggleFan.classList.replace('on', 'off');
    
    // Only re-enable fan if we are currently in menu
    if (state.activeView === 'view-menu') {
        els.btnToggleFan.disabled = false;
        els.btnToggleFan.style.opacity = '1';
    } else {
        els.btnToggleFan.disabled = true;
        els.btnToggleFan.style.opacity = '0.5';
    }
    updateGlobalTelemetry();
    
    state.experimentActive = false;
    els.btnPlantStart.classList.replace('btn-secondary', 'btn-primary');
    els.btnPlantStart.textContent = t('btn_start_exp');
    els.btnPlantStart.disabled = false;
    
    // Re-enable Reference selects and reset manual U
    els.refControllerSelect.disabled = false;
    if (els.refAddonContainer) {
        els.refAddonContainer.querySelectorAll('input').forEach(el => el.disabled = false);
    }
    els.btnRefSet.disabled = false;
    if (els.manualU) els.manualU.textContent = "0.00";
    
    updateLogUI();
});

// Manual Actions
els.btnManualSet.addEventListener('click', () => {
    const v = parseFloat(els.manualVoltageInput.value);
    if (!isNaN(v) && v >= -12 && v <= 12) {
        sendCmd(`p${v}`);
    } else {
        alert("Voltage must be between -12.0 and 12.0");
    }
});

els.btnManualLog.addEventListener('click', () => {
    sendCmd('l');
    if (!state.isLogging) startLog("ManualVoltage");
    else stopLog();
});

// Reference Actions
els.refControllerSelect.addEventListener('change', (e) => {
    const val = e.target.value;
    const container = els.refAddonContainer;
    container.innerHTML = '';
    container.style.display = 'none';
    
    if (val === 'I' || val === 'PI' || val === 'PD' || val === 'PID') {
        container.style.display = 'flex';
        
        const isI = (val === 'I');
        const isPI = (val === 'PI');
        const isPD = (val === 'PD');
        
        container.innerHTML = `
            <div style="font-weight: bold; font-size: 0.95rem; margin-bottom: 5px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 5px;">Addons:</div>
            <label style="font-size: 0.95rem; display: flex; align-items: center; gap: 8px; cursor: pointer;">
                <input type="checkbox" id="chk-awu" value="awu" ${isPD ? 'disabled' : ''}> AWU
            </label>
            <label style="font-size: 0.95rem; display: flex; align-items: center; gap: 8px; cursor: pointer;">
                <input type="checkbox" id="chk-adk" value="adk" ${(isI || isPI) ? 'disabled' : ''}> ADK
            </label>
            <label style="font-size: 0.95rem; display: flex; align-items: center; gap: 8px; cursor: pointer;">
                <input type="checkbox" id="chk-df" value="df" ${(isI || isPI) ? 'disabled' : ''}> DF
            </label>
            <label style="font-size: 0.95rem; display: flex; align-items: center; gap: 8px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 5px; margin-top: 5px; cursor: pointer;">
                <input type="checkbox" id="chk-all"> <b>All</b>
            </label>
        `;
        
        // Select All Logic
        document.getElementById('chk-all').addEventListener('change', (ev) => {
            const checked = ev.target.checked;
            ['chk-awu', 'chk-adk', 'chk-df'].forEach(id => {
                const cb = document.getElementById(id);
                if (!cb.disabled) cb.checked = checked;
            });
        });
        
    } else if (val === 'HYST') {
        container.style.display = 'flex';
        container.innerHTML = `
            <div style="font-weight: bold; font-size: 0.95rem; margin-bottom: 5px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 5px;">Hysteresis:</div>
            <label style="font-size: 0.95rem; display: flex; align-items: center; gap: 8px; cursor: pointer;">
                <input type="radio" name="hyst-type" value="7" checked> ON-OFF
            </label>
            <label style="font-size: 0.95rem; display: flex; align-items: center; gap: 8px; cursor: pointer;">
                <input type="radio" name="hyst-type" value="8"> Aggressive
            </label>
            <label style="font-size: 0.95rem; display: flex; align-items: center; gap: 8px; cursor: pointer;">
                <input type="radio" name="hyst-type" value="9"> Hybrid/PID
            </label>
        `;
    }
});

const delay = ms => new Promise(res => setTimeout(res, ms));

els.btnRefSet.addEventListener('click', async () => {
    const core = els.refControllerSelect.value;
    const ref = parseFloat(els.refTargetInput.value);
    
    let ctrlNum = 0;
    let awu = '0', adk = '0', df = '0';
    
    if (core === 'P') ctrlNum = 1;
    else if (core === 'I') ctrlNum = 2;
    else if (core === 'PI') ctrlNum = 3;
    else if (core === 'PD') ctrlNum = 4;
    else if (core === 'PID') ctrlNum = 5;
    else if (core === 'MPC') ctrlNum = 6;
    else if (core === 'FUZZY') ctrlNum = 10;
    else if (core === 'HYST') {
        const checkedRadio = document.querySelector('input[name="hyst-type"]:checked');
        ctrlNum = checkedRadio ? parseInt(checkedRadio.value) : 7;
    }
    
    if (core === 'I' || core === 'PI' || core === 'PD' || core === 'PID') {
        awu = document.getElementById('chk-awu').checked ? '1' : '0';
        adk = document.getElementById('chk-adk').checked ? '1' : '0';
        df = document.getElementById('chk-df').checked ? '1' : '0';
    }
    
    if (ctrlNum && !isNaN(ref)) {
        sendCmd('r'); await delay(50);
        sendCmd(ctrlNum.toString()); await delay(50);
        
        if (core === 'I' || core === 'PI' || core === 'PD' || core === 'PID') {
            if (core === 'I' || core === 'PI' || core === 'PID') { sendCmd(awu); await delay(50); }
            if (core === 'PD' || core === 'PID') { sendCmd(adk); await delay(50); sendCmd(df); await delay(50); }
        }
        sendCmd(ref.toString());
        
        // Disable controller selections while running, but keep target input enabled for live updates
        els.refControllerSelect.disabled = true;
        els.refAddonContainer.querySelectorAll('input').forEach(el => el.disabled = true);
        // Do NOT disable btnRefSet or refTargetInput so user can change temperature on the fly!
    } else {
        alert("Please select a controller and enter a valid target.");
    }
});

// ENTER key bindings
els.refTargetInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') els.btnRefSet.click();
});
els.manualVoltageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') els.btnManualSet.click();
});

els.btnRefLog.addEventListener('click', () => {
    sendCmd('l');
    if (!state.isLogging) startLog("ReferenceTesting");
    else stopLog();
});

// Plant Actions
els.btnPlantStart.addEventListener('click', () => {
    els.plantTerminal.textContent = "";
    els.btnPlantStart.disabled = true;
    els.btnPlantStart.classList.replace('btn-primary', 'btn-secondary');
    els.btnPlantStart.textContent = t('status_exp_running');
    sendCmd('e');
});

// ==========================================
// CHART.JS SETUP
// ==========================================
Chart.defaults.color = '#86868b';
Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, sans-serif';

const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    scales: {
        x: { 
            grid: { color: 'rgba(255,255,255,0.05)' },
            title: { display: true, text: 'Time (s)', color: '#86868b' }
        },
        y: { 
            grid: { color: 'rgba(255,255,255,0.05)' }
        }
    },
    plugins: { 
        legend: { 
            labels: { 
                color: '#f5f5f7',
                usePointStyle: true,
                pointStyle: 'rectRounded'
            } 
        } 
    }
};

function createChart(ctxId, title, datasets, yAxisLabel) {
    const ctx = document.getElementById(ctxId).getContext('2d');
    return new Chart(ctx, {
        type: 'line',
        data: { labels: [], datasets: datasets },
        options: {
            ...commonOptions,
            scales: {
                x: commonOptions.scales.x,
                y: { ...commonOptions.scales.y, title: { display: true, text: yAxisLabel, color: '#86868b' } }
            },
            plugins: { ...commonOptions.plugins, title: { display: true, text: title, color: '#f5f5f7' } }
        }
    });
}

function addData(chart, label, dataArr) {
    // We don't store labels for X axis, we render fixed relative labels -20s to 0s
    // Just maintain data queue length
    chart.data.datasets.forEach((ds, i) => {
        ds.data.push(dataArr[i]);
        if (ds.data.length > state.maxPoints) {
            ds.data.shift();
        }
    });
    
    // Maintain a constant X axis array: [-20, -19.3, ..., 0]
    // Length matches current dataset length.
    const pts = chart.data.datasets[0].data.length;
    chart.data.labels = Array.from({length: pts}, (_, i) => {
        return (0.7 * (i - pts + 1)).toFixed(1);
    });
    
    chart.update();
}

// Initialize Charts
window.onload = () => {
    const makeDsTin = () => ({ label: 'T_in (°C)', borderColor: '#ff453a', borderWidth: 2, tension: 0, pointRadius: 0 });
    const makeDsTout = () => ({ label: 'T_out (°C)', borderColor: '#ff9f0a', borderWidth: 2, tension: 0, pointRadius: 0 });
    const makeDsVolt = () => ({ label: 'Voltage (V)', borderColor: '#32d74b', borderWidth: 2, tension: 0, pointRadius: 0, fill: true, backgroundColor: 'rgba(50, 215, 75, 0.1)' });
    const makeDsRef = () => ({ label: 'Reference (°C)', borderColor: '#0a84ff', borderWidth: 2, borderDash: [5, 5], pointRadius: 0 });
    
    state.charts.manualTemp = createChart('manual-chart-temp', 'Temperatures', [makeDsTin(), makeDsTout()], 'Temperature (°C)');
    state.charts.manualVolt = createChart('manual-chart-volt', 'Applied Voltage', [makeDsVolt()], 'Voltage (V)');
    
    state.charts.refTemp = createChart('ref-chart-temp', 'Temperatures vs Target', [makeDsTin(), makeDsTout(), makeDsRef()], 'Temperature (°C)');
    state.charts.refErr = createChart('ref-chart-err', 'Control Error (e)', [{...makeDsVolt(), label: 'Error (°C)', borderColor: '#ff453a', backgroundColor: 'rgba(255, 69, 58, 0.1)'}], 'Error (°C)');
    state.charts.refVolt = createChart('ref-chart-volt', 'Applied Voltage (u)', [makeDsVolt()], 'Voltage (V)');
    state.charts.refSat = createChart('ref-chart-sat', 'Saturation (u_o vs u)', [
        { label: 'Desired u_o', borderColor: '#86868b', borderDash: [2, 2], pointRadius: 0 },
        makeDsVolt()
    ], 'Voltage (V)');
    
    state.charts.plantTemp = createChart('plant-chart-temp', 'Plant Temperatures', [makeDsTin(), makeDsTout()], 'Temperature (°C)');
    state.charts.plantVolt = createChart('plant-chart-volt', 'Plant Voltage Steps', [makeDsVolt()], 'Voltage (V)');
    
    // Set initial chart colors if light theme is active by default (it's not)
};

function updateChartColors() {
    const isLight = document.body.classList.contains('light-theme');
    const color = isLight ? '#515154' : '#86868b';
    const gridColor = isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';
    
    Chart.defaults.color = color;
    
    Object.values(state.charts).forEach(chart => {
        if (chart.options.scales.x) {
            chart.options.scales.x.grid.color = gridColor;
            chart.options.scales.x.ticks.color = color;
            chart.options.scales.x.title.color = color;
        }
        if (chart.options.scales.y) {
            chart.options.scales.y.grid.color = gridColor;
            chart.options.scales.y.ticks.color = color;
            chart.options.scales.y.title.color = color;
        }
        if (chart.options.plugins.title) {
            chart.options.plugins.title.color = color;
        }
        chart.options.plugins.legend.labels.color = color;
        chart.update();
    });
}


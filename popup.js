// Popup Script for Etimad Chrome Extension
// Handles UI interactions and coordinates extraction workflow

console.log('Popup script loaded');

// State
let currentTab = null;
let isProcessing = false;
let extractedData = null;
let currentSpreadsheetId = null;

// DOM Elements
const elements = {
  // Status
  statusSection: document.getElementById('statusSection'),
  statusIcon: document.getElementById('statusIcon'),
  statusText: document.getElementById('statusText'),
  statusIndicator: document.querySelector('.status-indicator'),

  // Config
  configSection: document.getElementById('configSection'),
  spreadsheetId: document.getElementById('spreadsheetId'),
  autoExport: document.getElementById('autoExport'),
  saveConfigBtn: document.getElementById('saveConfigBtn'),
  helpLink: document.getElementById('helpLink'),

  // Progress
  progressSection: document.getElementById('progressSection'),
  progressFill: document.getElementById('progressFill'),
  progressMessage: document.getElementById('progressMessage'),

  // Results
  resultsSection: document.getElementById('resultsSection'),
  resultsContent: document.getElementById('resultsContent'),
  viewSheetBtn: document.getElementById('viewSheetBtn'),
  extractAgainBtn: document.getElementById('extractAgainBtn'),

  // Error
  errorSection: document.getElementById('errorSection'),
  errorMessage: document.getElementById('errorMessage'),
  retryBtn: document.getElementById('retryBtn'),

  // Actions
  actionSection: document.getElementById('actionSection'),
  extractBtn: document.getElementById('extractBtn'),
  authenticateBtn: document.getElementById('authenticateBtn'),

  // Modal
  helpModal: document.getElementById('helpModal'),
  closeHelpBtn: document.getElementById('closeHelpBtn')
};

// Initialize popup
async function init() {
  console.log('Initializing popup...');

  // Load saved config
  await loadConfig();

  // Get current tab
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tabs[0];

  // Check if we're on an Etimad page
  await checkPage();

  // Setup event listeners
  setupEventListeners();

  // Auto-export if enabled
  if (elements.autoExport.checked && currentTab) {
    const isValid = await checkIfValidPage();
    if (isValid) {
      setTimeout(() => startExtraction(), 1000);
    }
  }
}

// Load saved configuration
async function loadConfig() {
  try {
    const result = await chrome.storage.local.get(['spreadsheetId', 'autoExport']);

    if (result.spreadsheetId) {
      elements.spreadsheetId.value = result.spreadsheetId;
      currentSpreadsheetId = result.spreadsheetId;
    }

    if (result.autoExport !== undefined) {
      elements.autoExport.checked = result.autoExport;
    }

    console.log('Config loaded:', result);
  } catch (error) {
    console.error('Error loading config:', error);
  }
}

// Save configuration
async function saveConfig() {
  try {
    const config = {
      spreadsheetId: elements.spreadsheetId.value.trim(),
      autoExport: elements.autoExport.checked
    };

    await chrome.storage.local.set(config);
    currentSpreadsheetId = config.spreadsheetId;

    showMessage('تم حفظ الإعدادات بنجاح! | Settings saved!', 'success');
    console.log('Config saved:', config);
  } catch (error) {
    console.error('Error saving config:', error);
    showMessage('فشل حفظ الإعدادات | Failed to save settings', 'error');
  }
}

// Check if current page is valid
async function checkPage() {
  try {
    if (!currentTab || !currentTab.id) {
      updateStatus('invalid', '❌', 'ليس على صفحة اعتماد | Not on Etimad page');
      elements.extractBtn.disabled = true;
      return;
    }

    updateStatus('processing', '⏳', 'جاري فحص الصفحة... | Checking page...');

    const response = await chrome.tabs.sendMessage(currentTab.id, {
      action: 'checkPage'
    });

    if (response.success && response.isValid) {
      updateStatus('valid', '✅', 'صفحة مناقصة صالحة | Valid tender page');
      elements.extractBtn.disabled = false;
    } else {
      updateStatus('invalid', '❌', 'ليست صفحة مناقصة | Not a tender page');
      elements.extractBtn.disabled = true;
    }
  } catch (error) {
    console.error('Error checking page:', error);
    updateStatus('invalid', '⚠️', 'تعذر فحص الصفحة | Cannot check page');
    elements.extractBtn.disabled = true;
  }
}

// Check if page is valid (returns boolean)
async function checkIfValidPage() {
  try {
    const response = await chrome.tabs.sendMessage(currentTab.id, {
      action: 'checkPage'
    });
    return response.success && response.isValid;
  } catch (error) {
    return false;
  }
}

// Update status indicator
function updateStatus(type, icon, text) {
  elements.statusIcon.textContent = icon;
  elements.statusText.textContent = text;

  elements.statusIndicator.classList.remove('valid', 'invalid', 'processing');
  if (type !== 'neutral') {
    elements.statusIndicator.classList.add(type);
  }
}

// Setup event listeners
function setupEventListeners() {
  elements.saveConfigBtn.addEventListener('click', saveConfig);
  elements.extractBtn.addEventListener('click', startExtraction);
  elements.extractAgainBtn.addEventListener('click', startExtraction);
  elements.retryBtn.addEventListener('click', startExtraction);
  elements.viewSheetBtn.addEventListener('click', viewSpreadsheet);
  elements.helpLink.addEventListener('click', (e) => {
    e.preventDefault();
    elements.helpModal.style.display = 'flex';
  });
  elements.closeHelpBtn.addEventListener('click', () => {
    elements.helpModal.style.display = 'none';
  });
  elements.authenticateBtn.addEventListener('click', authenticate);
}

// Start extraction process
async function startExtraction() {
  if (isProcessing) {
    console.log('Already processing, ignoring request');
    return;
  }

  isProcessing = true;

  try {
    // Hide results and errors
    elements.resultsSection.style.display = 'none';
    elements.errorSection.style.display = 'none';

    // Show progress
    elements.progressSection.style.display = 'block';
    elements.extractBtn.disabled = true;

    // Reset progress
    resetProgress();

    // Step 1: Check page
    updateStep(1, 'active', '⏳');
    updateProgress(10, 'فحص الصفحة... | Checking page...');

    const isValid = await checkIfValidPage();
    if (!isValid) {
      throw new Error('الصفحة الحالية ليست صفحة مناقصة صالحة | Current page is not a valid tender page');
    }

    updateStep(1, 'completed', '✅');
    updateProgress(20, 'الصفحة صالحة! | Page valid!');

    // Step 2-4: Extract data from content script
    updateStep(2, 'active', '⏳');
    updateProgress(30, 'استخراج البيانات... | Extracting data...');

    const extractResponse = await chrome.tabs.sendMessage(currentTab.id, {
      action: 'extractData'
    });

    if (!extractResponse.success) {
      throw new Error(extractResponse.error || 'فشل استخراج البيانات | Failed to extract data');
    }

    extractedData = extractResponse.data;
    console.log('Extracted data:', extractedData);

    updateStep(2, 'completed', '✅');
    updateStep(3, 'completed', '✅');
    updateStep(4, 'completed', '✅');
    updateProgress(60, 'تم الاستخراج بنجاح! | Extraction successful!');

    // Step 5: Write to Google Sheets
    updateStep(5, 'active', '⏳');
    updateProgress(70, 'الاتصال بجداول قوقل... | Connecting to Google Sheets...');

    await writeToSheets(extractedData);

    updateStep(5, 'completed', '✅');
    updateProgress(100, 'اكتمل! | Completed!');

    // Show results
    await showResults();

  } catch (error) {
    console.error('Extraction error:', error);
    showError(error.message);
    updateStepError();
  } finally {
    isProcessing = false;
    elements.extractBtn.disabled = false;
  }
}

// Write data to Google Sheets
async function writeToSheets(data) {
  try {
    // Get spreadsheet ID
    let spreadsheetId = elements.spreadsheetId.value.trim();

    if (!spreadsheetId) {
      // Create new spreadsheet
      updateProgress(75, 'إنشاء جدول جديد... | Creating new sheet...');
      spreadsheetId = await createNewSpreadsheet(data.projectMeta.projectName || 'Etimad Data');
      elements.spreadsheetId.value = spreadsheetId;
      await saveConfig();
    }

    // Get auth token
    const tokenResponse = await chrome.runtime.sendMessage({
      action: 'getAuthToken'
    });

    if (!tokenResponse.success) {
      throw new Error('فشل المصادقة: ' + tokenResponse.error + ' | Authentication failed: ' + tokenResponse.error);
    }

    const token = tokenResponse.token;

    // Prepare data for sheets
    const projectData = {
      reference: data.projectMeta.reference,
      projectName: data.projectMeta.projectName,
      entity: data.projectMeta.entity,
      location: data.projectMeta.location,
      status: data.projectMeta.status,
      publishDate: data.dates.publishDate,
      closingDate: data.dates.closingDate,
      openingDate: data.dates.openingDate,
      siteVisitDate: data.dates.siteVisitDate,
      clarificationDeadline: data.dates.clarificationDeadline,
      classification: data.classification,
      pageUrl: data.pageUrl
    };

    // Prepare BOQ data
    let boqSheetData = null;
    if (data.boqData && data.boqData.totalRows > 0) {
      const boqRows = [];

      // Combine all BOQ tables
      data.boqData.tables.forEach(table => {
        table.rows.forEach(row => {
          // Ensure we have at least 9 columns
          const normalizedRow = [
            row[0] || '', // Item No
            row[1] || '', // Description
            row[2] || '', // Unit
            row[3] || '', // Quantity
            row[4] || '', // Rate
            row[5] || '', // Amount
            row[6] || '', // Specs/Notes
            table.section || '', // Section
            data.pageUrl || '' // Source URL
          ];
          boqRows.push(normalizedRow);
        });
      });

      const sheetName = `BOQ_${projectData.reference || 'Unknown'}`.substring(0, 100);

      boqSheetData = {
        sheetName: sheetName,
        rows: boqRows
      };
    }

    // Prepare log data
    const logData = {
      reference: projectData.reference,
      status: 'Success',
      message: 'تم الاستخراج بنجاح | Extraction successful',
      boqCount: data.boqData ? data.boqData.totalRows : 0,
      pageUrl: data.pageUrl,
      processingTime: data.processingTime
    };

    updateProgress(85, 'كتابة البيانات... | Writing data...');

    // Send to service worker to write
    const writeResponse = await chrome.runtime.sendMessage({
      action: 'writeToSheets',
      data: {
        token,
        spreadsheetId,
        projectData,
        boqData: boqSheetData,
        logData
      }
    });

    if (!writeResponse.success) {
      throw new Error('فشلت الكتابة: ' + writeResponse.error + ' | Write failed: ' + writeResponse.error);
    }

    currentSpreadsheetId = spreadsheetId;
    console.log('Data written successfully:', writeResponse.results);

  } catch (error) {
    console.error('Error writing to sheets:', error);
    throw error;
  }
}

// Create new spreadsheet
async function createNewSpreadsheet(title) {
  try {
    const tokenResponse = await chrome.runtime.sendMessage({
      action: 'getAuthToken'
    });

    if (!tokenResponse.success) {
      throw new Error('Authentication failed');
    }

    const token = tokenResponse.token;

    const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: {
          title: title + ' - Etimad Data'
        },
        sheets: [
          { properties: { title: 'Projects' } },
          { properties: { title: 'Logs' } }
        ]
      })
    });

    if (!response.ok) {
      throw new Error('Failed to create spreadsheet: ' + response.statusText);
    }

    const data = await response.json();
    console.log('Created new spreadsheet:', data.spreadsheetId);

    return data.spreadsheetId;
  } catch (error) {
    console.error('Error creating spreadsheet:', error);
    throw error;
  }
}

// Authenticate with Google
async function authenticate() {
  try {
    updateProgress(0, 'المصادقة... | Authenticating...');

    const response = await chrome.runtime.sendMessage({
      action: 'getAuthToken'
    });

    if (response.success) {
      showMessage('تم تسجيل الدخول بنجاح! | Signed in successfully!', 'success');
    } else {
      showMessage('فشل تسجيل الدخول: ' + response.error, 'error');
    }
  } catch (error) {
    console.error('Authentication error:', error);
    showMessage('فشل تسجيل الدخول | Sign in failed', 'error');
  }
}

// Show results
async function showResults() {
  elements.progressSection.style.display = 'none';
  elements.resultsSection.style.display = 'block';

  let html = '';

  // Project info
  html += `<div class="result-item">`;
  html += `<div class="result-label">الرقم المرجعي | Reference:</div>`;
  html += `<div class="result-value">${extractedData.projectMeta.reference || 'N/A'}</div>`;
  html += `</div>`;

  html += `<div class="result-item">`;
  html += `<div class="result-label">اسم المشروع | Project Name:</div>`;
  html += `<div class="result-value">${extractedData.projectMeta.projectName || 'N/A'}</div>`;
  html += `</div>`;

  html += `<div class="result-item">`;
  html += `<div class="result-label">الجهة | Entity:</div>`;
  html += `<div class="result-value">${extractedData.projectMeta.entity || 'N/A'}</div>`;
  html += `</div>`;

  html += `<div class="result-item">`;
  html += `<div class="result-label">تاريخ الإغلاق | Closing Date:</div>`;
  html += `<div class="result-value">${extractedData.dates.closingDate || 'N/A'}</div>`;
  html += `</div>`;

  html += `<div class="result-item">`;
  html += `<div class="result-label">التصنيف | Classification:</div>`;
  html += `<div class="result-value">${extractedData.classification || 'N/A'}</div>`;
  html += `</div>`;

  html += `<div class="result-item">`;
  html += `<div class="result-label">عدد بنود جدول الكميات | BOQ Rows:</div>`;
  html += `<div class="result-value success">${extractedData.boqData.totalRows}</div>`;
  html += `</div>`;

  html += `<div class="result-item">`;
  html += `<div class="result-label">وقت المعالجة | Processing Time:</div>`;
  html += `<div class="result-value">${extractedData.processingTime}</div>`;
  html += `</div>`;

  elements.resultsContent.innerHTML = html;

  if (currentSpreadsheetId) {
    elements.viewSheetBtn.style.display = 'block';
  }
}

// Show error
function showError(message) {
  elements.progressSection.style.display = 'none';
  elements.errorSection.style.display = 'block';
  elements.errorMessage.textContent = message;
}

// Show temporary message
function showMessage(message, type) {
  updateStatus(type === 'success' ? 'valid' : 'invalid', type === 'success' ? '✅' : '❌', message);
}

// Update progress
function updateProgress(percent, message) {
  elements.progressFill.style.width = percent + '%';
  elements.progressMessage.textContent = message;
}

// Reset progress
function resetProgress() {
  updateProgress(0, 'جاري البدء... | Starting...');

  // Reset all steps
  for (let i = 1; i <= 5; i++) {
    updateStep(i, 'pending', '⏳');
  }
}

// Update step status
function updateStep(stepNum, status, icon) {
  const step = document.querySelector(`.step[data-step="${stepNum}"]`);
  if (!step) return;

  step.classList.remove('pending', 'active', 'completed', 'error');
  step.classList.add(status);

  const statusEl = step.querySelector('.step-status');
  if (statusEl) {
    statusEl.textContent = icon;
  }
}

// Mark current active step as error
function updateStepError() {
  const activeStep = document.querySelector('.step.active');
  if (activeStep) {
    activeStep.classList.remove('active');
    activeStep.classList.add('error');
    const statusEl = activeStep.querySelector('.step-status');
    if (statusEl) {
      statusEl.textContent = '❌';
    }
  }
}

// View spreadsheet
function viewSpreadsheet() {
  if (currentSpreadsheetId) {
    const url = `https://docs.google.com/spreadsheets/d/${currentSpreadsheetId}/edit`;
    chrome.tabs.create({ url });
  }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);

console.log('Popup script ready');

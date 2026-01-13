// Service Worker for Etimad Chrome Extension
// Handles OAuth authentication and coordination between components

let authToken = null;
let tokenExpiryTime = null;

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Service worker received message:', request.action);

  if (request.action === 'getAuthToken') {
    handleGetAuthToken(sendResponse);
    return true; // Keep channel open for async response
  }

  if (request.action === 'clearAuthToken') {
    handleClearAuthToken(sendResponse);
    return true;
  }

  if (request.action === 'writeToSheets') {
    handleWriteToSheets(request.data, sendResponse);
    return true;
  }

  if (request.action === 'log') {
    console.log('[Content Script Log]:', request.message);
    sendResponse({ success: true });
    return false;
  }
});

// Get OAuth token for Google Sheets API
async function handleGetAuthToken(sendResponse) {
  try {
    // Check if we have a valid cached token
    if (authToken && tokenExpiryTime && Date.now() < tokenExpiryTime) {
      console.log('Using cached auth token');
      sendResponse({ success: true, token: authToken });
      return;
    }

    console.log('Fetching new auth token...');

    // Get OAuth token using chrome.identity
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError) {
        console.error('Auth error:', chrome.runtime.lastError);
        sendResponse({
          success: false,
          error: chrome.runtime.lastError.message
        });
        return;
      }

      if (!token) {
        sendResponse({
          success: false,
          error: 'No token received'
        });
        return;
      }

      // Cache token (expires in ~55 minutes, we'll refresh at 50)
      authToken = token;
      tokenExpiryTime = Date.now() + (50 * 60 * 1000);

      console.log('Auth token obtained successfully');
      sendResponse({ success: true, token: token });
    });
  } catch (error) {
    console.error('Error getting auth token:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Clear cached auth token
async function handleClearAuthToken(sendResponse) {
  try {
    if (authToken) {
      chrome.identity.removeCachedAuthToken({ token: authToken }, () => {
        authToken = null;
        tokenExpiryTime = null;
        console.log('Auth token cleared');
        sendResponse({ success: true });
      });
    } else {
      sendResponse({ success: true });
    }
  } catch (error) {
    console.error('Error clearing auth token:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Write data to Google Sheets
async function handleWriteToSheets(data, sendResponse) {
  try {
    const { token, spreadsheetId, projectData, boqData, logData } = data;

    if (!token || !spreadsheetId) {
      sendResponse({
        success: false,
        error: 'Missing token or spreadsheet ID'
      });
      return;
    }

    console.log('Writing to sheets...', {
      projectData: !!projectData,
      boqData: !!boqData,
      logData: !!logData
    });

    // Create or update sheets
    const results = await writeAllSheets(
      token,
      spreadsheetId,
      projectData,
      boqData,
      logData
    );

    sendResponse({ success: true, results });
  } catch (error) {
    console.error('Error writing to sheets:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Write all data to Google Sheets
async function writeAllSheets(token, spreadsheetId, projectData, boqData, logData) {
  const baseUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const results = {
    project: null,
    boq: null,
    logs: null
  };

  try {
    // 1. Ensure Projects sheet exists and write project data
    if (projectData) {
      await ensureSheetExists(baseUrl, headers, 'Projects');
      results.project = await writeProjectData(baseUrl, headers, projectData);
    }

    // 2. Create/update BOQ sheet for this project
    if (boqData && boqData.sheetName && boqData.rows) {
      await ensureSheetExists(baseUrl, headers, boqData.sheetName);
      results.boq = await writeBOQData(baseUrl, headers, boqData);
    }

    // 3. Append log entry
    if (logData) {
      await ensureSheetExists(baseUrl, headers, 'Logs');
      results.logs = await appendLogData(baseUrl, headers, logData);
    }

    return results;
  } catch (error) {
    console.error('Error in writeAllSheets:', error);
    throw error;
  }
}

// Ensure a sheet exists in the spreadsheet
async function ensureSheetExists(baseUrl, headers, sheetName) {
  try {
    // Get spreadsheet metadata
    const response = await fetch(`${baseUrl}?fields=sheets.properties`, {
      headers
    });

    if (!response.ok) {
      throw new Error(`Failed to get spreadsheet: ${response.statusText}`);
    }

    const data = await response.json();
    const sheets = data.sheets || [];
    const sheetExists = sheets.some(s => s.properties.title === sheetName);

    if (!sheetExists) {
      console.log(`Creating sheet: ${sheetName}`);

      // Create the sheet
      const createResponse = await fetch(`${baseUrl}:batchUpdate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          requests: [{
            addSheet: {
              properties: {
                title: sheetName,
                gridProperties: {
                  frozenRowCount: 1
                }
              }
            }
          }]
        })
      });

      if (!createResponse.ok) {
        throw new Error(`Failed to create sheet: ${createResponse.statusText}`);
      }

      console.log(`Sheet created: ${sheetName}`);
    }

    return true;
  } catch (error) {
    console.error(`Error ensuring sheet exists (${sheetName}):`, error);
    throw error;
  }
}

// Write project data to Projects sheet
async function writeProjectData(baseUrl, headers, projectData) {
  try {
    const sheetName = 'Projects';

    // Define headers
    const headerRow = [
      'الرقم المرجعي (Reference)',
      'اسم المشروع (Project Name)',
      'الجهة (Entity)',
      'الموقع (Location)',
      'الحالة (Status)',
      'تاريخ النشر (Publish Date)',
      'تاريخ الإغلاق (Closing Date)',
      'تاريخ الفتح (Opening Date)',
      'تاريخ الزيارة الميدانية (Site Visit)',
      'آخر موعد للاستفسار (Clarification Deadline)',
      'التصنيف (Classification)',
      'رابط الصفحة (Page URL)',
      'تاريخ الاستخراج (Extraction Date)'
    ];

    // Check if project already exists
    const getResponse = await fetch(
      `${baseUrl}/values/${sheetName}!A:A?majorDimension=COLUMNS`,
      { headers }
    );

    let rowIndex = -1;
    if (getResponse.ok) {
      const data = await getResponse.json();
      const column = data.values ? data.values[0] : [];
      rowIndex = column.indexOf(projectData.reference);
    }

    const dataRow = [
      projectData.reference || '',
      projectData.projectName || '',
      projectData.entity || '',
      projectData.location || '',
      projectData.status || '',
      projectData.publishDate || '',
      projectData.closingDate || '',
      projectData.openingDate || '',
      projectData.siteVisitDate || '',
      projectData.clarificationDeadline || '',
      projectData.classification || '',
      projectData.pageUrl || '',
      new Date().toLocaleString('ar-SA')
    ];

    let range;
    if (rowIndex > 0) {
      // Update existing row (rowIndex + 1 because of 1-based indexing)
      range = `${sheetName}!A${rowIndex + 1}:M${rowIndex + 1}`;
      console.log(`Updating existing project at row ${rowIndex + 1}`);
    } else {
      // Check if headers exist, if not add them first
      const headerCheck = await fetch(
        `${baseUrl}/values/${sheetName}!A1:M1`,
        { headers }
      );

      if (headerCheck.ok) {
        const headerData = await headerCheck.json();
        if (!headerData.values || headerData.values.length === 0) {
          // Add headers
          await fetch(`${baseUrl}/values/${sheetName}!A1:M1?valueInputOption=RAW`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({
              values: [headerRow]
            })
          });
        }
      }

      // Append new row
      range = `${sheetName}!A:M`;
      console.log('Appending new project row');
    }

    const updateResponse = await fetch(
      `${baseUrl}/values/${range}?valueInputOption=RAW`,
      {
        method: rowIndex > 0 ? 'PUT' : 'POST',
        headers,
        body: JSON.stringify({
          values: [dataRow]
        })
      }
    );

    if (!updateResponse.ok) {
      throw new Error(`Failed to write project data: ${updateResponse.statusText}`);
    }

    console.log('Project data written successfully');
    return { success: true, rowIndex };
  } catch (error) {
    console.error('Error writing project data:', error);
    throw error;
  }
}

// Write BOQ data to dedicated sheet
async function writeBOQData(baseUrl, headers, boqData) {
  try {
    const sheetName = boqData.sheetName;

    // Clear existing data (except we'll rewrite everything)
    const clearResponse = await fetch(
      `${baseUrl}/values/${sheetName}!A:Z:clear`,
      {
        method: 'POST',
        headers
      }
    );

    // Define headers
    const headerRow = [
      'رقم البند (Item No)',
      'الوصف (Description)',
      'الوحدة (Unit)',
      'الكمية (Quantity)',
      'السعر (Rate)',
      'المبلغ (Amount)',
      'المواصفات/ملاحظات (Specs/Notes)',
      'القسم (Section)',
      'رابط المصدر (Source URL)'
    ];

    // Prepare all rows (header + data)
    const allRows = [headerRow, ...boqData.rows];

    // Write all data at once
    const updateResponse = await fetch(
      `${baseUrl}/values/${sheetName}!A1:I${allRows.length}?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          values: allRows
        })
      }
    );

    if (!updateResponse.ok) {
      throw new Error(`Failed to write BOQ data: ${updateResponse.statusText}`);
    }

    console.log(`BOQ data written successfully: ${boqData.rows.length} rows`);
    return { success: true, rowCount: boqData.rows.length };
  } catch (error) {
    console.error('Error writing BOQ data:', error);
    throw error;
  }
}

// Append log entry to Logs sheet
async function appendLogData(baseUrl, headers, logData) {
  try {
    const sheetName = 'Logs';

    // Check if headers exist
    const headerCheck = await fetch(
      `${baseUrl}/values/${sheetName}!A1:G1`,
      { headers }
    );

    if (headerCheck.ok) {
      const headerData = await headerCheck.json();
      if (!headerData.values || headerData.values.length === 0) {
        // Add headers
        const headerRow = [
          'التاريخ والوقت (Timestamp)',
          'الرقم المرجعي (Reference)',
          'الحالة (Status)',
          'الرسالة (Message)',
          'عدد بنود جدول الكميات (BOQ Count)',
          'رابط الصفحة (Page URL)',
          'وقت المعالجة (Processing Time)'
        ];

        await fetch(`${baseUrl}/values/${sheetName}!A1:G1?valueInputOption=RAW`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            values: [headerRow]
          })
        });
      }
    }

    // Append log entry
    const logRow = [
      new Date().toLocaleString('ar-SA'),
      logData.reference || '',
      logData.status || '',
      logData.message || '',
      logData.boqCount || 0,
      logData.pageUrl || '',
      logData.processingTime || ''
    ];

    const appendResponse = await fetch(
      `${baseUrl}/values/${sheetName}!A:G:append?valueInputOption=RAW`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          values: [logRow]
        })
      }
    );

    if (!appendResponse.ok) {
      throw new Error(`Failed to append log: ${appendResponse.statusText}`);
    }

    console.log('Log entry appended successfully');
    return { success: true };
  } catch (error) {
    console.error('Error appending log:', error);
    throw error;
  }
}

console.log('Etimad Service Worker initialized');

// Enhanced Service Worker for Etimad Chrome Extension - V2
// Handles OAuth, Google Sheets API, and Google Drive API

let authToken = null;
let tokenExpiryTime = null;

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Service worker received message:', request.action);

  if (request.action === 'getAuthToken') {
    handleGetAuthToken(sendResponse);
    return true;
  }

  if (request.action === 'clearAuthToken') {
    handleClearAuthToken(sendResponse);
    return true;
  }

  if (request.action === 'processAndExport') {
    handleProcessAndExport(request.data, sendResponse);
    return true;
  }
});

// Get OAuth token
async function handleGetAuthToken(sendResponse) {
  try {
    if (authToken && tokenExpiryTime && Date.now() < tokenExpiryTime) {
      console.log('Using cached auth token');
      sendResponse({ success: true, token: authToken });
      return;
    }

    console.log('Fetching new auth token...');

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

// Clear auth token
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

// Main processing function
async function handleProcessAndExport(data, sendResponse) {
  try {
    const { token, extractedData } = data;

    if (!token || !extractedData) {
      sendResponse({
        success: false,
        error: 'Missing token or extracted data'
      });
      return;
    }

    console.log('Starting process and export...');

    // Step 1: Create Drive folder
    const folderName = extractedData.basicInfo.competitionName ||
                       extractedData.basicInfo.referenceNumber ||
                       'Etimad_Project_' + Date.now();

    const folderId = await createDriveFolder(token, folderName);
    console.log('Created folder:', folderId);

    // Step 2: Create Google Sheet in folder
    const sheetId = await createGoogleSheet(token, folderName, folderId);
    console.log('Created sheet:', sheetId);

    // Step 3: Write data to sheets
    await writeDataToSheets(token, sheetId, extractedData);
    console.log('Data written to sheets');

    // Step 4: Upload attachments
    const uploadedFiles = await uploadAttachments(token, folderId, extractedData.attachments);
    console.log('Uploaded attachments:', uploadedFiles.length);

    sendResponse({
      success: true,
      results: {
        folderId,
        folderName,
        sheetId,
        uploadedFiles
      }
    });

  } catch (error) {
    console.error('Error in handleProcessAndExport:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// ====== Google Drive Functions ======

async function createDriveFolder(token, folderName) {
  try {
    const response = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder'
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to create folder: ${response.statusText}`);
    }

    const data = await response.json();
    return data.id;

  } catch (error) {
    console.error('Error creating Drive folder:', error);
    throw error;
  }
}

async function createGoogleSheet(token, sheetName, folderId) {
  try {
    const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: {
          title: sheetName + ' - بيانات المنافسة'
        },
        sheets: [
          { properties: { title: 'المعلومات الأساسية', gridProperties: { frozenRowCount: 1 } } },
          { properties: { title: 'جداول الكميات', gridProperties: { frozenRowCount: 1 } } },
          { properties: { title: 'معايير التقييم', gridProperties: { frozenRowCount: 1 } } }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to create sheet: ${response.statusText}`);
    }

    const data = await response.json();
    const spreadsheetId = data.spreadsheetId;

    // Move sheet to folder
    await moveFileTofolder(token, spreadsheetId, folderId);

    return spreadsheetId;

  } catch (error) {
    console.error('Error creating Google Sheet:', error);
    throw error;
  }
}

async function moveFileTofolder(token, fileId, folderId) {
  try {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?addParents=${folderId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      console.error('Failed to move file to folder');
    }

  } catch (error) {
    console.error('Error moving file to folder:', error);
  }
}

// ====== Write Data to Sheets ======

async function writeDataToSheets(token, spreadsheetId, extractedData) {
  try {
    const baseUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // صفحة 1: المعلومات الأساسية
    await writeSheet1_BasicInfo(baseUrl, headers, extractedData);

    // صفحة 2: جداول الكميات
    if (extractedData.boqData && extractedData.boqData.totalRows > 0) {
      await writeSheet2_BOQ(baseUrl, headers, extractedData.boqData);
    }

    // صفحة 3: معايير التقييم
    if (extractedData.evaluationCriteria && extractedData.evaluationCriteria.found) {
      await writeSheet3_Evaluation(baseUrl, headers, extractedData.evaluationCriteria);
    }

  } catch (error) {
    console.error('Error writing data to sheets:', error);
    throw error;
  }
}

// صفحة 1: المعلومات الأساسية
async function writeSheet1_BasicInfo(baseUrl, headers, data) {
  try {
    const sheetName = 'المعلومات الأساسية';

    // بناء البيانات
    const rows = [
      // Header row
      ['الحقل', 'القيمة'],

      // قسم المعلومات الأساسية
      ['', ''],
      ['═══ المعلومات الأساسية ═══', ''],
      ['اسم المنافسة', data.basicInfo.competitionName || ''],
      ['رقم المنافسة', data.basicInfo.competitionNumber || ''],
      ['الرقم المرجعي', data.basicInfo.referenceNumber || ''],
      ['الغرض من المنافسة', data.basicInfo.purpose || ''],
      ['قيمة وثائق المنافسة', data.basicInfo.documentPrice || ''],
      ['مدة العقد', data.basicInfo.contractDuration || ''],
      ['نوع المنافسة', data.basicInfo.competitionType || ''],
      ['الجهة الحكومية', data.basicInfo.governmentEntity || ''],
      ['طريقة تقديم العروض', data.basicInfo.submissionMethod || ''],

      // قسم المواعيد
      ['', ''],
      ['═══ المواعيد المتعلقة بالمنافسة ═══', ''],
      ['آخر موعد لاستلام الاستفسارات', data.deadlines.inquiryDeadline || ''],
      ['آخر موعد لتقديم العروض', data.deadlines.submissionDeadline || ''],
      ['تاريخ النشر', data.deadlines.publishDate || ''],
      ['تاريخ الفتح', data.deadlines.openingDate || ''],
      ['تاريخ الزيارة الميدانية', data.deadlines.siteVisitDate || ''],

      // قسم مجال التصنيف وموقع التنفيذ
      ['', ''],
      ['═══ مجال التصنيف وموقع التنفيذ ═══', ''],
      ['مكان التنفيذ', data.locationAndClassification.executionLocation || ''],
      ['التفاصيل', data.locationAndClassification.details || ''],
      ['التصنيف', data.locationAndClassification.classification || ''],
      ['النشاط', data.locationAndClassification.activity || ''],

      // معلومات إضافية
      ['', ''],
      ['═══ معلومات إضافية ═══', ''],
      ['رابط الصفحة', data.pageUrl || ''],
      ['تاريخ الاستخراج', new Date().toLocaleString('ar-SA')],
      ['وقت المعالجة', data.processingTime || '']
    ];

    // كتابة البيانات
    const range = `${sheetName}!A1:B${rows.length}`;

    const response = await fetch(
      `${baseUrl}/values/${range}?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify({ values: rows })
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to write sheet 1: ${response.statusText}`);
    }

    // تنسيق الصفحة
    await formatSheet1(baseUrl, headers);

    console.log('Sheet 1 (Basic Info) written successfully');

  } catch (error) {
    console.error('Error writing sheet 1:', error);
    throw error;
  }
}

async function formatSheet1(baseUrl, headers) {
  try {
    // Get sheet ID
    const metadataResponse = await fetch(`${baseUrl}?fields=sheets.properties`, { headers });
    const metadata = await metadataResponse.json();
    const sheet = metadata.sheets.find(s => s.properties.title === 'المعلومات الأساسية');

    if (!sheet) return;

    const sheetId = sheet.properties.sheetId;

    // Apply formatting
    const requests = [
      // تكبير عرض العمود الثاني
      {
        updateDimensionProperties: {
          range: {
            sheetId: sheetId,
            dimension: 'COLUMNS',
            startIndex: 1,
            endIndex: 2
          },
          properties: {
            pixelSize: 500
          },
          fields: 'pixelSize'
        }
      },
      // تنسيق الترويسة
      {
        repeatCell: {
          range: {
            sheetId: sheetId,
            startRowIndex: 0,
            endRowIndex: 1
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.4, green: 0.6, blue: 0.8 },
              textFormat: {
                bold: true,
                fontSize: 12,
                foregroundColor: { red: 1, green: 1, blue: 1 }
              },
              horizontalAlignment: 'CENTER'
            }
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
        }
      },
      // تنسيق عناوين الأقسام
      {
        repeatCell: {
          range: {
            sheetId: sheetId,
            startColumnIndex: 0,
            endColumnIndex: 2
          },
          cell: {
            userEnteredFormat: {
              textFormat: {
                bold: true,
                fontSize: 11
              }
            }
          },
          fields: 'userEnteredFormat.textFormat'
        }
      }
    ];

    await fetch(`${baseUrl}:batchUpdate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ requests })
    });

  } catch (error) {
    console.error('Error formatting sheet 1:', error);
  }
}

// صفحة 2: جداول الكميات
async function writeSheet2_BOQ(baseUrl, headers, boqData) {
  try {
    const sheetName = 'جداول الكميات';

    // Header row
    const headerRow = [
      'رقم البند',
      'الوصف',
      'الوحدة',
      'الكمية',
      'السعر',
      'المبلغ',
      'المواصفات/ملاحظات',
      'القسم/المصدر'
    ];

    // Combine all BOQ tables
    const allRows = [headerRow];

    boqData.tables.forEach(table => {
      table.rows.forEach(row => {
        const normalizedRow = [
          row[0] || '',
          row[1] || '',
          row[2] || '',
          row[3] || '',
          row[4] || '',
          row[5] || '',
          row[6] || '',
          table.section || table.source || ''
        ];
        allRows.push(normalizedRow);
      });
    });

    // Write data
    const range = `${sheetName}!A1:H${allRows.length}`;

    const response = await fetch(
      `${baseUrl}/values/${range}?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify({ values: allRows })
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to write sheet 2: ${response.statusText}`);
    }

    console.log(`Sheet 2 (BOQ) written successfully: ${allRows.length - 1} rows`);

  } catch (error) {
    console.error('Error writing sheet 2:', error);
    throw error;
  }
}

// صفحة 3: معايير التقييم
async function writeSheet3_Evaluation(baseUrl, headers, criteriaData) {
  try {
    const sheetName = 'معايير التقييم';

    const allRows = [['معايير التقييم']];

    if (criteriaData.items && criteriaData.items.length > 0) {
      criteriaData.items.forEach(item => {
        allRows.push(['']); // Empty row for spacing

        if (item.type === 'table' && Array.isArray(item.data)) {
          item.data.forEach(row => {
            allRows.push(row);
          });
        } else if (item.type === 'list' && Array.isArray(item.data)) {
          item.data.forEach(listItem => {
            allRows.push([listItem]);
          });
        } else if (item.type === 'text') {
          allRows.push([item.data]);
        }
      });
    } else {
      allRows.push(['لم يتم العثور على معايير تقييم']);
    }

    // Write data
    const maxColumns = Math.max(...allRows.map(row => row.length));
    const range = `${sheetName}!A1:${String.fromCharCode(65 + maxColumns - 1)}${allRows.length}`;

    const response = await fetch(
      `${baseUrl}/values/${range}?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify({ values: allRows })
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to write sheet 3: ${response.statusText}`);
    }

    console.log('Sheet 3 (Evaluation Criteria) written successfully');

  } catch (error) {
    console.error('Error writing sheet 3:', error);
    throw error;
  }
}

// ====== Upload Attachments ======

async function uploadAttachments(token, folderId, attachments) {
  const uploadedFiles = [];

  if (!attachments || attachments.length === 0) {
    console.log('No attachments to upload');
    return uploadedFiles;
  }

  for (const attachment of attachments) {
    try {
      console.log('Downloading attachment:', attachment.name);

      // Download file
      const fileResponse = await fetch(attachment.url);

      if (!fileResponse.ok) {
        console.error('Failed to download:', attachment.name);
        continue;
      }

      const blob = await fileResponse.blob();

      // Upload to Drive
      const metadata = {
        name: attachment.name,
        parents: [folderId]
      };

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', blob);

      const uploadResponse = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: form
        }
      );

      if (uploadResponse.ok) {
        const uploadedFile = await uploadResponse.json();
        uploadedFiles.push({
          name: attachment.name,
          id: uploadedFile.id,
          type: attachment.type
        });
        console.log('Uploaded:', attachment.name);
      } else {
        console.error('Failed to upload:', attachment.name);
      }

    } catch (error) {
      console.error('Error uploading attachment:', attachment.name, error);
    }
  }

  return uploadedFiles;
}

console.log('Etimad Service Worker V2 initialized');

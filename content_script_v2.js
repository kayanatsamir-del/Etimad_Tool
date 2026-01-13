// Enhanced Content Script for Etimad Chrome Extension - V2
// Extracts comprehensive project data including evaluation criteria and attachments

console.log('Etimad Content Script V2 loaded');

// Store intercepted BOQ data from network requests
let interceptedBOQData = [];

// Monkey-patch fetch to intercept API responses
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  const response = await originalFetch.apply(this, args);
  const clonedResponse = response.clone();

  try {
    const url = args[0];
    if (typeof url === 'string' && (
      url.includes('boq') ||
      url.includes('quantity') ||
      url.includes('كميات') ||
      url.includes('bill')
    )) {
      const data = await clonedResponse.json();
      console.log('Intercepted BOQ API call:', url, data);
      interceptedBOQData.push({ url, data });
    }
  } catch (e) {
    // Not JSON or error reading, ignore
  }

  return response;
};

// Monkey-patch XMLHttpRequest
const originalXHROpen = XMLHttpRequest.prototype.open;
const originalXHRSend = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function(method, url, ...rest) {
  this._url = url;
  return originalXHROpen.call(this, method, url, ...rest);
};

XMLHttpRequest.prototype.send = function(...args) {
  this.addEventListener('load', function() {
    try {
      if (this._url && (
        this._url.includes('boq') ||
        this._url.includes('quantity') ||
        this._url.includes('كميات') ||
        this._url.includes('bill')
      )) {
        const data = JSON.parse(this.responseText);
        console.log('Intercepted BOQ XHR call:', this._url, data);
        interceptedBOQData.push({ url: this._url, data });
      }
    } catch (e) {
      // Not JSON or error, ignore
    }
  });
  return originalXHRSend.apply(this, args);
};

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request.action);

  if (request.action === 'extractData') {
    handleExtractData(sendResponse);
    return true;
  }

  if (request.action === 'checkPage') {
    handleCheckPage(sendResponse);
    return false;
  }
});

// Check if current page is a valid Etimad tender page
function handleCheckPage(sendResponse) {
  try {
    const isEtimadPage = window.location.hostname.includes('etimad.sa');
    const pageUrl = window.location.href;

    const isTenderPage = isEtimadPage && (
      pageUrl.includes('tender') ||
      pageUrl.includes('Tender') ||
      pageUrl.includes('opportunity') ||
      pageUrl.includes('Competition') ||
      document.querySelector('[class*="tender"]') !== null ||
      document.querySelector('[class*="competition"]') !== null ||
      document.body.textContent.includes('الرقم المرجعي') ||
      document.body.textContent.includes('تاريخ الإغلاق')
    );

    sendResponse({
      success: true,
      isValid: isTenderPage,
      url: pageUrl
    });
  } catch (error) {
    console.error('Error checking page:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

// Main extraction handler
async function handleExtractData(sendResponse) {
  const startTime = Date.now();

  try {
    console.log('Starting comprehensive data extraction...');

    // Extract all data
    const extractedData = {
      // صفحة 1: المعلومات الأساسية
      basicInfo: extractBasicInfo(),

      // المواعيد المتعلقة بالمنافسة
      deadlines: extractDeadlines(),

      // مجال التصنيف وموقع التنفيذ
      locationAndClassification: extractLocationAndClassification(),

      // صفحة 2: جداول الكميات
      boqData: await extractBOQ(),

      // صفحة 3: معايير التقييم
      evaluationCriteria: extractEvaluationCriteria(),

      // المرفقات
      attachments: extractAttachments(),

      // معلومات إضافية
      pageUrl: window.location.href,
      extractionDate: new Date().toISOString()
    };

    const processingTime = ((Date.now() - startTime) / 1000).toFixed(2) + 's';
    extractedData.processingTime = processingTime;

    console.log('Extracted data:', extractedData);

    sendResponse({
      success: true,
      data: extractedData
    });
  } catch (error) {
    console.error('Error extracting data:', error);
    sendResponse({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
}

// ====== استخراج المعلومات الأساسية ======
function extractBasicInfo() {
  const info = {
    competitionName: '',      // اسم المنافسة
    competitionNumber: '',    // رقم المنافسة
    referenceNumber: '',      // الرقم المرجعي
    purpose: '',              // الغرض من المنافسة
    documentPrice: '',        // قيمة وثائق المنافسة
    contractDuration: '',     // مدة العقد
    competitionType: '',      // نوع المنافسة
    governmentEntity: '',     // الجهة الحكومية
    submissionMethod: ''      // طريقة تقديم العروض
  };

  try {
    // اسم المنافسة - من العنوان الرئيسي
    const nameLabels = ['اسم المنافسة', 'اسم المناقصة', 'Competition Name', 'عنوان المشروع'];
    for (const label of nameLabels) {
      const value = findValueByLabel(label);
      if (value) {
        info.competitionName = value;
        break;
      }
    }

    // إذا لم نجد، حاول من العنوان
    if (!info.competitionName) {
      const h1 = document.querySelector('h1, h2, [class*="title"]');
      if (h1) info.competitionName = h1.textContent.trim();
    }

    // رقم المنافسة
    const numberLabels = ['رقم المنافسة', 'رقم المناقصة', 'Competition Number'];
    for (const label of numberLabels) {
      const value = findValueByLabel(label);
      if (value) {
        info.competitionNumber = value;
        break;
      }
    }

    // الرقم المرجعي
    const refLabels = ['الرقم المرجعي', 'Reference Number', 'رقم الفرصة'];
    for (const label of refLabels) {
      const value = findValueByLabel(label);
      if (value) {
        info.referenceNumber = value;
        break;
      }
    }

    // الغرض من المنافسة / التفاصيل
    const purposeLabels = ['الغرض من المنافسة', 'التفاصيل', 'الوصف', 'Purpose', 'Description'];
    for (const label of purposeLabels) {
      const value = findValueByLabel(label);
      if (value) {
        info.purpose = value;
        break;
      }
    }

    // قيمة وثائق المنافسة
    const priceLabels = ['قيمة وثائق المنافسة', 'قيمة الوثائق', 'Document Price', 'سعر الوثيقة'];
    for (const label of priceLabels) {
      const value = findValueByLabel(label);
      if (value) {
        info.documentPrice = value;
        break;
      }
    }

    // مدة العقد
    const durationLabels = ['مدة العقد', 'مدة التنفيذ', 'Contract Duration', 'فترة التنفيذ'];
    for (const label of durationLabels) {
      const value = findValueByLabel(label);
      if (value) {
        info.contractDuration = value;
        break;
      }
    }

    // نوع المنافسة
    const typeLabels = ['نوع المنافسة', 'نوع المناقصة', 'Competition Type', 'النوع'];
    for (const label of typeLabels) {
      const value = findValueByLabel(label);
      if (value) {
        info.competitionType = value;
        break;
      }
    }

    // الجهة الحكومية
    const entityLabels = ['الجهة الحكومية', 'الجهة', 'Government Entity', 'المالك', 'الجهة المشرفة'];
    for (const label of entityLabels) {
      const value = findValueByLabel(label);
      if (value) {
        info.governmentEntity = value;
        break;
      }
    }

    // طريقة تقديم العروض
    const methodLabels = ['طريقة تقديم العروض', 'Submission Method', 'آلية التقديم'];
    for (const label of methodLabels) {
      const value = findValueByLabel(label);
      if (value) {
        info.submissionMethod = value;
        break;
      }
    }

  } catch (error) {
    console.error('Error in extractBasicInfo:', error);
  }

  return info;
}

// ====== استخراج المواعيد ======
function extractDeadlines() {
  const deadlines = {
    inquiryDeadline: '',      // آخر موعد لاستلام الاستفسارات
    submissionDeadline: '',   // آخر موعد لتقديم العروض
    publishDate: '',          // تاريخ النشر
    openingDate: '',          // تاريخ الفتح
    siteVisitDate: ''         // تاريخ الزيارة الميدانية
  };

  try {
    // آخر موعد لاستلام الاستفسارات
    const inquiryLabels = [
      'آخر موعد لاستلام الاستفسارات',
      'آخر موعد للاستفسار',
      'موعد الاستفسارات',
      'Inquiry Deadline'
    ];
    for (const label of inquiryLabels) {
      const value = findValueByLabel(label);
      if (value) {
        deadlines.inquiryDeadline = value;
        break;
      }
    }

    // آخر موعد لتقديم العروض
    const submissionLabels = [
      'آخر موعد لتقديم العروض',
      'تاريخ الإغلاق',
      'آخر موعد للتقديم',
      'Submission Deadline',
      'Closing Date'
    ];
    for (const label of submissionLabels) {
      const value = findValueByLabel(label);
      if (value) {
        deadlines.submissionDeadline = value;
        break;
      }
    }

    // تاريخ النشر
    const publishLabels = ['تاريخ النشر', 'تاريخ الإعلان', 'Publish Date'];
    for (const label of publishLabels) {
      const value = findValueByLabel(label);
      if (value) {
        deadlines.publishDate = value;
        break;
      }
    }

    // تاريخ الفتح
    const openingLabels = ['تاريخ الفتح', 'تاريخ فتح المظاريف', 'Opening Date'];
    for (const label of openingLabels) {
      const value = findValueByLabel(label);
      if (value) {
        deadlines.openingDate = value;
        break;
      }
    }

    // تاريخ الزيارة الميدانية
    const visitLabels = ['تاريخ الزيارة', 'الزيارة الميدانية', 'Site Visit'];
    for (const label of visitLabels) {
      const value = findValueByLabel(label);
      if (value) {
        deadlines.siteVisitDate = value;
        break;
      }
    }

  } catch (error) {
    console.error('Error in extractDeadlines:', error);
  }

  return deadlines;
}

// ====== استخراج مجال التصنيف وموقع التنفيذ ======
function extractLocationAndClassification() {
  const data = {
    executionLocation: '',    // مكان التنفيذ
    details: '',              // التفاصيل
    classification: '',       // التصنيف
    activity: ''              // النشاط
  };

  try {
    // مكان التنفيذ
    const locationLabels = [
      'مكان التنفيذ',
      'موقع التنفيذ',
      'الموقع',
      'المنطقة',
      'Location',
      'Execution Location'
    ];
    for (const label of locationLabels) {
      const value = findValueByLabel(label);
      if (value) {
        data.executionLocation = value;
        break;
      }
    }

    // التفاصيل
    const detailsLabels = ['التفاصيل', 'Details', 'الوصف', 'Description'];
    for (const label of detailsLabels) {
      const value = findValueByLabel(label);
      if (value) {
        data.details = value;
        break;
      }
    }

    // التصنيف
    const classificationLabels = [
      'التصنيف',
      'مجال التصنيف',
      'Classification',
      'Category'
    ];
    for (const label of classificationLabels) {
      const value = findValueByLabel(label);
      if (value) {
        data.classification = value;
        break;
      }
    }

    // النشاط
    const activityLabels = ['النشاط', 'نوع النشاط', 'Activity', 'المجال'];
    for (const label of activityLabels) {
      const value = findValueByLabel(label);
      if (value) {
        data.activity = value;
        break;
      }
    }

  } catch (error) {
    console.error('Error in extractLocationAndClassification:', error);
  }

  return data;
}

// ====== استخراج جداول الكميات ======
async function extractBOQ() {
  const boqData = {
    tables: [],
    totalRows: 0
  };

  try {
    // Method 1: Extract from DOM tables
    const domTables = extractBOQFromDOM();
    if (domTables.length > 0) {
      boqData.tables.push(...domTables);
    }

    // Method 2: Wait for API calls
    await sleep(2000);

    if (interceptedBOQData.length > 0) {
      const apiTables = extractBOQFromAPI();
      if (apiTables.length > 0) {
        boqData.tables.push(...apiTables);
      }
    }

    // Calculate total rows
    boqData.totalRows = boqData.tables.reduce((sum, table) => sum + table.rows.length, 0);

    // Method 3: Aggressive search if no data found
    if (boqData.totalRows === 0) {
      const aggressiveTables = extractBOQAggressive();
      if (aggressiveTables.length > 0) {
        boqData.tables.push(...aggressiveTables);
        boqData.totalRows = boqData.tables.reduce((sum, table) => sum + table.rows.length, 0);
      }
    }

  } catch (error) {
    console.error('Error in extractBOQ:', error);
  }

  return boqData;
}

function extractBOQFromDOM() {
  const tables = [];

  try {
    const allTables = document.querySelectorAll('table');
    console.log(`Found ${allTables.length} tables on page`);

    allTables.forEach((table, idx) => {
      const rows = extractTableRows(table);

      if (rows.length > 0) {
        const firstRow = rows[0];
        const isBOQ = (
          firstRow.some(cell =>
            cell.includes('بند') ||
            cell.includes('وصف') ||
            cell.includes('كمية') ||
            cell.includes('Item') ||
            cell.includes('Description') ||
            cell.includes('Quantity')
          )
        );

        if (isBOQ || rows.length > 3) {
          tables.push({
            source: 'DOM',
            section: `Table ${idx + 1}`,
            rows: rows.slice(1),
            headerRow: rows[0]
          });
          console.log(`Extracted BOQ table ${idx + 1} with ${rows.length - 1} rows`);
        }
      }
    });

  } catch (error) {
    console.error('Error in extractBOQFromDOM:', error);
  }

  return tables;
}

function extractTableRows(table) {
  const rows = [];

  try {
    const trs = table.querySelectorAll('tr');

    trs.forEach(tr => {
      const cells = [];
      const tds = tr.querySelectorAll('td, th');

      tds.forEach(td => {
        cells.push(td.textContent.trim());
      });

      if (cells.length > 0 && cells.some(c => c !== '')) {
        rows.push(cells);
      }
    });

  } catch (error) {
    console.error('Error extracting table rows:', error);
  }

  return rows;
}

function extractBOQFromAPI() {
  const tables = [];

  try {
    interceptedBOQData.forEach((item, idx) => {
      const { url, data } = item;
      const arrays = findArraysInObject(data);

      arrays.forEach((arr, arrIdx) => {
        if (arr.length > 0 && typeof arr[0] === 'object') {
          const keys = Object.keys(arr[0]);
          const rows = arr.map(obj => keys.map(k => String(obj[k] || '')));

          if (rows.length > 0) {
            tables.push({
              source: 'API',
              section: `API Response ${idx + 1}-${arrIdx + 1}`,
              rows: rows,
              headerRow: keys
            });
          }
        }
      });
    });

  } catch (error) {
    console.error('Error in extractBOQFromAPI:', error);
  }

  return tables;
}

function extractBOQAggressive() {
  const tables = [];

  try {
    const keywords = ['جدول الكميات', 'بنود', 'bill of quantities', 'boq'];

    for (const keyword of keywords) {
      const elements = document.querySelectorAll('*');

      for (const el of elements) {
        const text = el.textContent.toLowerCase();

        if (text.includes(keyword)) {
          const rows = extractRowsFromElement(el);

          if (rows.length > 2) {
            tables.push({
              source: 'Aggressive DOM',
              section: keyword,
              rows: rows
            });
            break;
          }
        }
      }

      if (tables.length > 0) break;
    }

  } catch (error) {
    console.error('Error in extractBOQAggressive:', error);
  }

  return tables;
}

function extractRowsFromElement(element) {
  const rows = [];

  try {
    const children = Array.from(element.children);

    if (children.length > 3) {
      children.forEach(child => {
        const text = child.textContent.trim();
        if (text && text.length > 5) {
          rows.push([text]);
        }
      });
    }

  } catch (error) {
    console.error('Error in extractRowsFromElement:', error);
  }

  return rows;
}

// ====== استخراج معايير التقييم ======
function extractEvaluationCriteria() {
  const criteria = {
    found: false,
    items: []
  };

  try {
    // ابحث عن قسم معايير التقييم
    const criteriaKeywords = [
      'معايير التقييم',
      'معايير الترسية',
      'Evaluation Criteria',
      'التقييم'
    ];

    let criteriaSection = null;

    // ابحث عن القسم
    for (const keyword of criteriaKeywords) {
      const elements = document.querySelectorAll('h1, h2, h3, h4, [class*="title"], [class*="heading"]');

      for (const el of elements) {
        if (el.textContent.includes(keyword)) {
          criteriaSection = el.parentElement || el;
          break;
        }
      }

      if (criteriaSection) break;
    }

    if (criteriaSection) {
      criteria.found = true;

      // استخرج الجداول في هذا القسم
      const tables = criteriaSection.querySelectorAll('table');

      tables.forEach(table => {
        const rows = extractTableRows(table);
        if (rows.length > 0) {
          criteria.items.push({
            type: 'table',
            data: rows
          });
        }
      });

      // استخرج القوائم
      const lists = criteriaSection.querySelectorAll('ul, ol');

      lists.forEach(list => {
        const items = Array.from(list.querySelectorAll('li')).map(li => li.textContent.trim());
        if (items.length > 0) {
          criteria.items.push({
            type: 'list',
            data: items
          });
        }
      });

      // إذا لم نجد جداول أو قوائم، استخرج النص
      if (criteria.items.length === 0) {
        const text = criteriaSection.textContent.trim();
        if (text.length > 50) {
          criteria.items.push({
            type: 'text',
            data: text
          });
        }
      }
    }

  } catch (error) {
    console.error('Error in extractEvaluationCriteria:', error);
  }

  return criteria;
}

// ====== استخراج المرفقات ======
function extractAttachments() {
  const attachments = [];

  try {
    // ابحث عن روابط التحميل
    const downloadLinks = document.querySelectorAll('a[href*="download"], a[href*="file"], a[href*="attachment"], a[href*="pdf"], a[download]');

    downloadLinks.forEach(link => {
      const href = link.href;
      const text = link.textContent.trim();

      if (href && href !== window.location.href) {
        attachments.push({
          name: text || 'مرفق',
          url: href,
          type: getFileTypeFromUrl(href)
        });
      }
    });

    // ابحث في قسم المرفقات
    const attachmentKeywords = ['المرفق', 'الملفات', 'Attachments', 'Files', 'Documents'];

    for (const keyword of attachmentKeywords) {
      const elements = document.querySelectorAll('*');

      for (const el of elements) {
        if (el.textContent.includes(keyword)) {
          const links = el.querySelectorAll('a');

          links.forEach(link => {
            const href = link.href;
            const text = link.textContent.trim();

            if (href && href !== window.location.href) {
              // تجنب التكرار
              if (!attachments.some(att => att.url === href)) {
                attachments.push({
                  name: text || 'مرفق',
                  url: href,
                  type: getFileTypeFromUrl(href)
                });
              }
            }
          });
        }
      }
    }

  } catch (error) {
    console.error('Error in extractAttachments:', error);
  }

  return attachments;
}

function getFileTypeFromUrl(url) {
  try {
    const extension = url.split('.').pop().toLowerCase().split('?')[0];

    const types = {
      'pdf': 'PDF',
      'doc': 'Word',
      'docx': 'Word',
      'xls': 'Excel',
      'xlsx': 'Excel',
      'ppt': 'PowerPoint',
      'pptx': 'PowerPoint',
      'zip': 'Archive',
      'rar': 'Archive',
      '7z': 'Archive',
      'jpg': 'Image',
      'jpeg': 'Image',
      'png': 'Image',
      'gif': 'Image'
    };

    return types[extension] || 'Unknown';
  } catch (error) {
    return 'Unknown';
  }
}

// ====== Helper Functions ======

function findValueByLabel(labelText) {
  try {
    const labels = document.querySelectorAll('label, span, div, td, th, dt');

    for (const label of labels) {
      if (label.textContent.trim().includes(labelText)) {
        let value = label.nextElementSibling?.textContent.trim();

        if (!value || value === labelText) {
          value = label.parentElement?.nextElementSibling?.textContent.trim();
        }

        if (!value || value === labelText) {
          const parent = label.parentElement;
          if (parent) {
            value = parent.textContent.replace(label.textContent, '').trim();
          }
        }

        if (!value || value === labelText) {
          const dd = label.nextElementSibling;
          if (dd && dd.tagName === 'DD') {
            value = dd.textContent.trim();
          }
        }

        if (value && value !== labelText && value.length > 0 && value.length < 1000) {
          return value;
        }
      }
    }

    const cells = document.querySelectorAll('td, th');
    for (let i = 0; i < cells.length - 1; i++) {
      if (cells[i].textContent.trim().includes(labelText)) {
        const value = cells[i + 1].textContent.trim();
        if (value && value.length > 0 && value.length < 1000) {
          return value;
        }
      }
    }

  } catch (error) {
    console.error('Error in findValueByLabel:', error);
  }

  return '';
}

function findArraysInObject(obj, arrays = []) {
  try {
    if (Array.isArray(obj)) {
      arrays.push(obj);
    } else if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        findArraysInObject(obj[key], arrays);
      }
    }
  } catch (error) {
    console.error('Error in findArraysInObject:', error);
  }

  return arrays;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

console.log('Etimad Content Script V2 ready');

// Content Script for Etimad Chrome Extension
// Extracts project metadata, dates, classification, and BOQ from Etimad tender pages

console.log('Etimad Content Script loaded');

// Store intercepted BOQ data from network requests
let interceptedBOQData = [];

// Monkey-patch fetch to intercept API responses
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  const response = await originalFetch.apply(this, args);

  // Clone response to read it without consuming the original
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
    return true; // Keep channel open for async response
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

    // Check for indicators that this is a tender detail page
    const isTenderPage = isEtimadPage && (
      pageUrl.includes('tender') ||
      pageUrl.includes('opportunity') ||
      document.querySelector('[class*="tender"]') !== null ||
      document.querySelector('[class*="project"]') !== null ||
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
    console.log('Starting data extraction...');

    // Step 1: Extract project metadata
    const projectMeta = extractProjectMetadata();
    console.log('Project metadata:', projectMeta);

    // Step 2: Extract dates
    const dates = extractDates();
    console.log('Dates:', dates);

    // Step 3: Extract classification
    const classification = extractClassification();
    console.log('Classification:', classification);

    // Step 4: Extract BOQ
    const boqData = await extractBOQ();
    console.log('BOQ data:', boqData);

    const processingTime = ((Date.now() - startTime) / 1000).toFixed(2) + 's';

    sendResponse({
      success: true,
      data: {
        projectMeta,
        dates,
        classification,
        boqData,
        processingTime,
        pageUrl: window.location.href
      }
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

// Extract project metadata (name, reference, entity, location, status)
function extractProjectMetadata() {
  const metadata = {
    projectName: '',
    reference: '',
    entity: '',
    location: '',
    status: ''
  };

  try {
    // Strategy: Look for common labels in Arabic
    const labels = {
      reference: ['الرقم المرجعي', 'رقم المناقصة', 'Reference Number', 'رقم الفرصة'],
      projectName: ['اسم المشروع', 'اسم المناقصة', 'Project Name', 'عنوان المشروع', 'اسم الفرصة'],
      entity: ['الجهة', 'الجهة المشرفة', 'Entity', 'Owner', 'المالك'],
      location: ['الموقع', 'المنطقة', 'Location', 'المدينة'],
      status: ['الحالة', 'Status', 'حالة المناقصة']
    };

    // Method 1: Try to find by label text
    for (const [key, labelVariants] of Object.entries(labels)) {
      for (const label of labelVariants) {
        const value = findValueByLabel(label);
        if (value && value.trim()) {
          metadata[key] = value.trim();
          break;
        }
      }
    }

    // Method 2: Try common selectors and data attributes
    if (!metadata.projectName) {
      const titleSelectors = [
        'h1', 'h2',
        '[class*="title"]',
        '[class*="heading"]',
        '[class*="project-name"]',
        '[class*="tender-title"]'
      ];

      for (const selector of titleSelectors) {
        const el = document.querySelector(selector);
        if (el && el.textContent.trim() && el.textContent.length > 10) {
          metadata.projectName = el.textContent.trim();
          break;
        }
      }
    }

    // Method 3: Try meta tags
    if (!metadata.projectName) {
      const metaTitle = document.querySelector('meta[property="og:title"]');
      if (metaTitle) {
        metadata.projectName = metaTitle.content;
      }
    }

    // Method 4: Try page title as fallback
    if (!metadata.projectName && document.title) {
      metadata.projectName = document.title.split('|')[0].trim();
    }

  } catch (error) {
    console.error('Error in extractProjectMetadata:', error);
  }

  return metadata;
}

// Extract all dates from the page
function extractDates() {
  const dates = {
    publishDate: '',
    closingDate: '',
    openingDate: '',
    siteVisitDate: '',
    clarificationDeadline: ''
  };

  try {
    const labels = {
      publishDate: ['تاريخ النشر', 'تاريخ الاعلان', 'Publish Date', 'Publication Date'],
      closingDate: ['تاريخ الإغلاق', 'آخر موعد للتقديم', 'Closing Date', 'Submission Deadline'],
      openingDate: ['تاريخ الفتح', 'تاريخ فتح المظاريف', 'Opening Date'],
      siteVisitDate: ['تاريخ الزيارة', 'الزيارة الميدانية', 'Site Visit', 'موعد الزيارة'],
      clarificationDeadline: ['آخر موعد للاستفسار', 'موعد الاستفسارات', 'Clarification Deadline']
    };

    for (const [key, labelVariants] of Object.entries(labels)) {
      for (const label of labelVariants) {
        const value = findValueByLabel(label);
        if (value && value.trim()) {
          dates[key] = value.trim();
          break;
        }
      }
    }

    // Additional: scan for any date-like patterns if fields are still empty
    if (!dates.closingDate) {
      const datePattern = /\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/g;
      const pageText = document.body.textContent;
      const matches = pageText.match(datePattern);
      if (matches && matches.length > 0) {
        // Try to find the most relevant date
        const closingKeywords = ['إغلاق', 'تقديم', 'closing'];
        for (const keyword of closingKeywords) {
          const idx = pageText.indexOf(keyword);
          if (idx > -1) {
            const snippet = pageText.substring(idx, idx + 100);
            const dateMatch = snippet.match(datePattern);
            if (dateMatch) {
              dates.closingDate = dateMatch[0];
              break;
            }
          }
        }
      }
    }

  } catch (error) {
    console.error('Error in extractDates:', error);
  }

  return dates;
}

// Extract classification/category field
function extractClassification() {
  let classification = '';

  try {
    const labels = [
      'التصنيف',
      'مجال التصنيف',
      'النشاط',
      'نوع النشاط',
      'Classification',
      'Category',
      'المجال'
    ];

    for (const label of labels) {
      const value = findValueByLabel(label);
      if (value && value.trim()) {
        classification = value.trim();
        break;
      }
    }

    // Fallback: look for category-like elements
    if (!classification) {
      const categorySelectors = [
        '[class*="category"]',
        '[class*="classification"]',
        '[class*="type"]'
      ];

      for (const selector of categorySelectors) {
        const el = document.querySelector(selector);
        if (el && el.textContent.trim().length > 3 && el.textContent.trim().length < 100) {
          classification = el.textContent.trim();
          break;
        }
      }
    }

  } catch (error) {
    console.error('Error in extractClassification:', error);
  }

  return classification;
}

// Extract BOQ (Bill of Quantities) data
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

    // Method 2: Wait a bit for any API calls to complete
    await sleep(2000);

    // Check intercepted data
    if (interceptedBOQData.length > 0) {
      console.log('Processing intercepted BOQ data:', interceptedBOQData.length);
      const apiTables = extractBOQFromAPI();
      if (apiTables.length > 0) {
        boqData.tables.push(...apiTables);
      }
    }

    // Calculate total rows
    boqData.totalRows = boqData.tables.reduce((sum, table) => sum + table.rows.length, 0);

    // Method 3: If still no data, try more aggressive DOM search
    if (boqData.totalRows === 0) {
      console.log('Trying aggressive DOM search for BOQ...');
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

// Extract BOQ from DOM tables
function extractBOQFromDOM() {
  const tables = [];

  try {
    // Look for tables that might contain BOQ
    const allTables = document.querySelectorAll('table');
    console.log(`Found ${allTables.length} tables on page`);

    allTables.forEach((table, idx) => {
      const rows = extractTableRows(table);

      if (rows.length > 0) {
        // Check if this looks like a BOQ table
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
            rows: rows.slice(1), // Skip header row
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

// Extract rows from a table element
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

// Extract BOQ from intercepted API data
function extractBOQFromAPI() {
  const tables = [];

  try {
    interceptedBOQData.forEach((item, idx) => {
      const { url, data } = item;

      // Try to find array data in the response
      const arrays = findArraysInObject(data);

      arrays.forEach((arr, arrIdx) => {
        if (arr.length > 0 && typeof arr[0] === 'object') {
          // Convert objects to rows
          const keys = Object.keys(arr[0]);
          const rows = arr.map(obj => keys.map(k => String(obj[k] || '')));

          if (rows.length > 0) {
            tables.push({
              source: 'API',
              section: `API Response ${idx + 1}-${arrIdx + 1}`,
              rows: rows,
              headerRow: keys
            });
            console.log(`Extracted BOQ from API with ${rows.length} rows`);
          }
        }
      });
    });

  } catch (error) {
    console.error('Error in extractBOQFromAPI:', error);
  }

  return tables;
}

// More aggressive BOQ extraction
function extractBOQAggressive() {
  const tables = [];

  try {
    // Look for divs/sections that might contain BOQ in list format
    const keywords = ['جدول الكميات', 'بنود', 'bill of quantities', 'boq'];

    for (const keyword of keywords) {
      const elements = document.querySelectorAll('*');

      for (const el of elements) {
        const text = el.textContent.toLowerCase();

        if (text.includes(keyword)) {
          // Found a potential BOQ container
          const rows = extractRowsFromElement(el);

          if (rows.length > 2) {
            tables.push({
              source: 'Aggressive DOM',
              section: keyword,
              rows: rows
            });
            console.log(`Aggressively extracted ${rows.length} rows from ${keyword}`);
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

// Extract rows from a generic element
function extractRowsFromElement(element) {
  const rows = [];

  try {
    // Try to find repeated patterns
    const children = Array.from(element.children);

    if (children.length > 3) {
      children.forEach(child => {
        const text = child.textContent.trim();
        if (text && text.length > 5) {
          // Parse as single row with the text
          rows.push([text]);
        }
      });
    }

  } catch (error) {
    console.error('Error in extractRowsFromElement:', error);
  }

  return rows;
}

// Helper: Find value by label text
function findValueByLabel(labelText) {
  try {
    // Method 1: Look for label elements
    const labels = document.querySelectorAll('label, span, div, td, th');

    for (const label of labels) {
      if (label.textContent.trim().includes(labelText)) {
        // Try to find the associated value
        // Check next sibling
        let value = label.nextElementSibling?.textContent.trim();

        if (!value || value === labelText) {
          // Check parent's next sibling
          value = label.parentElement?.nextElementSibling?.textContent.trim();
        }

        if (!value || value === labelText) {
          // Check within same parent
          const parent = label.parentElement;
          if (parent) {
            value = parent.textContent.replace(label.textContent, '').trim();
          }
        }

        if (!value || value === labelText) {
          // Check for input/select
          const input = label.nextElementSibling?.querySelector('input, select, textarea');
          if (input) {
            value = input.value;
          }
        }

        if (value && value !== labelText && value.length > 0 && value.length < 500) {
          return value;
        }
      }
    }

    // Method 2: Look in table cells
    const cells = document.querySelectorAll('td, th');
    for (let i = 0; i < cells.length - 1; i++) {
      if (cells[i].textContent.trim().includes(labelText)) {
        const value = cells[i + 1].textContent.trim();
        if (value && value.length > 0 && value.length < 500) {
          return value;
        }
      }
    }

  } catch (error) {
    console.error('Error in findValueByLabel:', error);
  }

  return '';
}

// Helper: Find arrays in nested object
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

// Helper: Sleep function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

console.log('Etimad Content Script ready');

# Test Scenarios & QA Checklist | سيناريوهات الاختبار

<div dir="rtl">

هذا الملف يحتوي على سيناريوهات اختبار شاملة للتحقق من صحة عمل الإضافة في جميع الحالات.

</div>

This document contains comprehensive test scenarios to verify the extension works correctly in all cases.

---

## ✅ Pre-Testing Checklist | قائمة ما قبل الاختبار

Before starting tests, verify:

- [ ] Chrome Extension is installed and enabled
- [ ] Google Cloud Project is set up correctly
- [ ] OAuth Client ID is configured in manifest.json
- [ ] Extension ID is added to Google Cloud credentials
- [ ] Test email is added as a test user in OAuth consent screen
- [ ] Google Sheets API is enabled
- [ ] You have access to Etimad platform
- [ ] You're logged into Google account

---

## 📋 Test Scenarios

### Scenario 1: Complete Tender with All Data
**الاختبار الأول: مناقصة كاملة بجميع البيانات**

<div dir="rtl">

**الهدف:** التحقق من أن الإضافة تستخرج جميع الحقول بنجاح عندما تكون متوفرة.

</div>

**Objective:** Verify extension extracts all fields successfully when available.

**Steps:**
1. Navigate to a complete tender page on Etimad that has:
   - Project name and reference number
   - Entity/owner information
   - Location
   - Status
   - All dates (publish, closing, opening, site visit, clarification)
   - Classification/category
   - Complete BOQ tables

2. Open the extension popup
3. Verify status shows: "صفحة مناقصة صالحة ✅"
4. Enter a Spreadsheet ID (or leave empty for new sheet)
5. Click "استخراج البيانات"
6. Monitor progress steps (all should complete ✅)
7. View results

**Expected Results:**
- ✅ All metadata fields extracted correctly
- ✅ All dates extracted in correct format
- ✅ Classification field populated
- ✅ BOQ data extracted (item count > 0)
- ✅ Data written to Google Sheets successfully
- ✅ "Projects" sheet contains one row with all columns filled
- ✅ "BOQ_[Reference]" sheet created with all items
- ✅ "Logs" sheet contains success entry
- ✅ Processing time displayed
- ✅ All Arabic text displays correctly (RTL)

**Pass Criteria:**
- All fields contain data (not "N/A" or empty)
- No errors in console
- Sheet link is clickable and opens correct spreadsheet

---

### Scenario 2: Tender with Missing Optional Fields
**الاختبار الثاني: مناقصة بحقول ناقصة**

<div dir="rtl">

**الهدف:** التحقق من أن الإضافة تعمل بشكل صحيح حتى عند غياب بعض الحقول الاختيارية.

</div>

**Objective:** Verify extension works correctly even when optional fields are missing.

**Steps:**
1. Find a tender page missing some optional fields:
   - Location might be missing
   - Site visit date might be N/A
   - Some dates might not be published yet

2. Run extraction process
3. Check results

**Expected Results:**
- ✅ Extraction completes without errors
- ✅ Missing fields show as "N/A" or empty
- ✅ Available fields are extracted correctly
- ✅ Sheet is created successfully
- ✅ No JavaScript errors

**Pass Criteria:**
- Process completes successfully
- Essential fields (name, reference) are present
- Missing fields don't cause failures

---

### Scenario 3: Multiple BOQ Tables/Sections
**الاختبار الثالث: جداول كميات متعددة**

<div dir="rtl">

**الهدف:** التحقق من استخراج جميع جداول الكميات عبر أقسام أو صفحات مختلفة.

</div>

**Objective:** Verify extraction of all BOQ tables across different sections/pages.

**Steps:**
1. Find a tender with BOQ split across multiple tabs or sections
2. Make sure to scroll through all BOQ sections before extraction
3. Run extraction
4. Check BOQ sheet

**Expected Results:**
- ✅ All BOQ tables combined in one sheet
- ✅ Section column indicates source of each row
- ✅ No duplicate items (unless actually duplicated in source)
- ✅ Item count matches total across all sections

**Pass Criteria:**
- Total BOQ rows = sum of all sections
- All sections are represented
- No data loss

---

### Scenario 4: Tender Without BOQ
**الاختبار الرابع: مناقصة بدون جدول كميات**

<div dir="rtl">

**الهدف:** التحقق من أن الإضافة تعمل حتى بدون وجود جدول كميات.

</div>

**Objective:** Verify extension works even without BOQ data.

**Steps:**
1. Find a tender in early stages (no BOQ published yet)
2. Run extraction
3. Check results

**Expected Results:**
- ✅ Extraction completes successfully
- ✅ Project metadata extracted correctly
- ✅ BOQ count shows "0"
- ✅ No BOQ sheet created (or empty BOQ sheet)
- ✅ "Projects" sheet updated correctly
- ✅ Log shows success with BOQ count = 0

**Pass Criteria:**
- No errors occur
- Project data is saved
- Message indicates BOQ not available

---

### Scenario 5: Paginated BOQ Data
**الاختبار الخامس: جدول كميات مقسّم على صفحات**

<div dir="rtl">

**الهدف:** التحقق من استخراج البيانات عند تقسيم جدول الكميات على صفحات متعددة.

</div>

**Objective:** Verify extraction when BOQ is paginated.

**Steps:**
1. Find a tender with large BOQ split across pages
2. Before extraction, navigate through all pages to trigger loading
3. Run extraction
4. Check if all pages captured

**Expected Results:**
- ✅ All pages of BOQ extracted
- ✅ No missing items from any page
- ✅ Correct total count

**Note:** Current version may require manual scrolling/pagination before extraction. Future versions could automate this.

**Pass Criteria:**
- Total items = expected from all pages
- Last page items are included

---

### Scenario 6: Slow Loading Page
**الاختبار السادس: صفحة بطيئة التحميل**

<div dir="rtl">

**الهدف:** التحقق من عمل الإضافة مع صفحات بطيئة أو اتصال ضعيف.

</div>

**Objective:** Verify extension works with slow-loading pages.

**Steps:**
1. Open Chrome DevTools > Network tab
2. Enable "Slow 3G" throttling
3. Navigate to tender page (will load slowly)
4. Wait for page to fully load
5. Run extraction

**Expected Results:**
- ✅ Extension waits for content to load
- ✅ Extraction completes (may take longer)
- ✅ No timeout errors
- ✅ All data extracted correctly

**Pass Criteria:**
- Process completes without errors
- All available data extracted
- Processing time is reasonable (< 2 minutes)

---

### Scenario 7: Arabic Text Formatting & RTL
**الاختبار السابع: تنسيق النصوص العربية**

<div dir="rtl">

**الهدف:** التحقق من صحة عرض وحفظ النصوص العربية في جميع المراحل.

</div>

**Objective:** Verify Arabic text displays and saves correctly throughout.

**Steps:**
1. Run extraction on a tender with Arabic content
2. Check popup UI for RTL layout
3. Check results display in popup
4. Open Google Sheet and verify Arabic text

**Expected Results:**
- ✅ Popup displays in RTL (right-to-left)
- ✅ Arabic labels show correctly
- ✅ Extracted Arabic text displays correctly in results
- ✅ Google Sheet shows Arabic text correctly
- ✅ No garbled characters or encoding issues
- ✅ Sheet columns have bilingual headers (Arabic + English)

**Pass Criteria:**
- All Arabic text is readable and correctly formatted
- RTL layout works properly
- No encoding issues

---

### Scenario 8: Various Date Formats
**الاختبار الثامن: صيغ تواريخ مختلفة**

<div dir="rtl">

**الهدف:** التحقق من استخراج التواريخ بصيغ مختلفة.

</div>

**Objective:** Verify extraction of dates in different formats.

**Test Dates:**
- Hijri dates: `١٤٤٥/٠٦/١٥ هـ`
- Gregorian dates: `15/06/2024`
- Mixed format: `15-06-2024`
- Time included: `15/06/2024 11:59 PM`
- Arabic numerals: `١٥/٠٦/٢٠٢٤`

**Steps:**
1. Test with tenders showing different date formats
2. Verify extracted dates

**Expected Results:**
- ✅ All date formats recognized
- ✅ Dates extracted as shown (not reformatted unless specified)
- ✅ Time included if present

**Pass Criteria:**
- Dates are captured accurately
- No date parsing errors

---

### Scenario 9: Large BOQ (100+ Items)
**الاختبار التاسع: جدول كميات كبير**

<div dir="rtl">

**الهدف:** التحقق من الأداء مع جداول كميات كبيرة.

</div>

**Objective:** Verify performance with large BOQ tables.

**Steps:**
1. Find a tender with BOQ containing 100+ items
2. Run extraction
3. Monitor performance and memory usage

**Expected Results:**
- ✅ All items extracted (count ≥ 100)
- ✅ No browser freezing or crashing
- ✅ Processing time < 5 minutes
- ✅ All items written to sheet correctly
- ✅ Sheet is navigable (not too slow)

**Pass Criteria:**
- Complete extraction of all items
- Reasonable performance
- No data corruption

---

### Scenario 10: Duplicate Extraction (Update Existing)
**الاختبار العاشر: استخراج مكرر لنفس المناقصة**

<div dir="rtl">

**الهدف:** التحقق من تحديث البيانات عند استخراج نفس المناقصة مرتين.

</div>

**Objective:** Verify data updates when extracting same tender twice.

**Steps:**
1. Extract data from a tender (first time)
2. Verify it's saved in sheet
3. Run extraction again for same tender
4. Check sheet

**Expected Results:**
- ✅ Project row is updated (not duplicated)
- ✅ BOQ sheet is replaced with new data
- ✅ Old BOQ data is removed
- ✅ Log shows two entries (one for each extraction)
- ✅ Extraction date/time is updated

**Pass Criteria:**
- No duplicate rows in Projects sheet
- Only latest extraction data is present
- Reference number is used to match existing row

---

### Scenario 11: Create New Spreadsheet
**الاختبار الحادي عشر: إنشاء جدول جديد**

<div dir="rtl">

**الهدف:** التحقق من إنشاء جدول جديد تلقائياً.

</div>

**Objective:** Verify automatic creation of new spreadsheet.

**Steps:**
1. Clear spreadsheet ID from settings (leave empty)
2. Run extraction
3. Check if new sheet is created

**Expected Results:**
- ✅ New spreadsheet is created automatically
- ✅ Spreadsheet title includes project name
- ✅ Three sheets created: Projects, BOQ_[Ref], Logs
- ✅ Headers are added to all sheets
- ✅ Data is populated correctly
- ✅ Spreadsheet ID is saved in extension settings
- ✅ Sheet link is viewable

**Pass Criteria:**
- New spreadsheet exists in your Google Drive
- All data is present
- Future extractions use this same sheet

---

### Scenario 12: Use Existing Spreadsheet
**الاختبار الثاني عشر: استخدام جدول موجود**

<div dir="rtl">

**الهدف:** التحقق من الكتابة إلى جدول موجود مسبقاً.

</div>

**Objective:** Verify writing to an existing spreadsheet.

**Steps:**
1. Create a blank Google Sheet manually
2. Copy its ID
3. Enter ID in extension settings and save
4. Run extraction

**Expected Results:**
- ✅ Data is written to existing sheet
- ✅ Required sheet tabs are created if missing
- ✅ Existing data (if any) is preserved or updated correctly
- ✅ No permission errors

**Pass Criteria:**
- Specified sheet is used
- Data is appended/updated correctly

---

### Scenario 13: Authentication Flow
**الاختبار الثالث عشر: عملية المصادقة**

<div dir="rtl">

**الهدف:** التحقق من عملية المصادقة مع Google.

</div>

**Objective:** Verify Google authentication flow.

**Steps:**
1. Clear all extension data (remove and reinstall)
2. Open extension popup
3. Try to extract (should trigger auth)
4. Complete OAuth consent screen
5. Verify extraction works after auth

**Expected Results:**
- ✅ OAuth popup opens automatically
- ✅ Consent screen shows correct scopes
- ✅ After granting permission, token is saved
- ✅ Extraction proceeds automatically
- ✅ Subsequent extractions don't require re-auth

**Pass Criteria:**
- Authentication succeeds
- Token is cached for future use
- No repeated auth prompts

---

### Scenario 14: Auto-Export Feature
**الاختبار الرابع عشر: التصدير التلقائي**

<div dir="rtl">

**الهدف:** التحقق من ميزة التصدير التلقائي عند فتح الصفحة.

</div>

**Objective:** Verify auto-export feature on page load.

**Steps:**
1. Enable "تصدير تلقائي" in settings and save
2. Navigate to a tender page
3. Wait a few seconds
4. Check if extraction starts automatically

**Expected Results:**
- ✅ Extraction starts automatically within 1-2 seconds
- ✅ Progress is shown in popup (if opened)
- ✅ Data is saved without user intervention
- ✅ Feature can be disabled by unchecking the option

**Pass Criteria:**
- Auto-extraction works on valid pages
- No false triggers on non-tender pages

---

### Scenario 15: Error Handling - Invalid Sheet ID
**الاختبار الخامس عشر: معالجة الأخطاء - معرف جدول خاطئ**

<div dir="rtl">

**الهدف:** التحقق من معالجة الأخطاء عند إدخال معرف جدول خاطئ.

</div>

**Objective:** Verify error handling with invalid spreadsheet ID.

**Steps:**
1. Enter invalid/random spreadsheet ID
2. Run extraction
3. Observe error handling

**Expected Results:**
- ✅ Error message displayed clearly
- ✅ No browser crash
- ✅ Error indicates problem with sheet ID
- ✅ User can correct and retry

**Pass Criteria:**
- Clear error message
- Extension remains functional
- Retry works after correction

---

### Scenario 16: Network Interruption
**الاختبار السادس عشر: انقطاع الاتصال**

<div dir="rtl">

**الهدف:** التحقق من التعامل مع انقطاع الاتصال أثناء الكتابة.

</div>

**Objective:** Verify handling of network interruption during write.

**Steps:**
1. Start extraction
2. When "Writing to Sheets" step starts, turn off internet
3. Observe error handling

**Expected Results:**
- ✅ Error message shows network issue
- ✅ Extracted data is not lost (stored in memory)
- ✅ User can retry after reconnecting
- ✅ Graceful failure (no crash)

**Pass Criteria:**
- Clear error indication
- Ability to retry
- No data loss

---

### Scenario 17: BOQ from API Calls
**الاختبار السابع عشر: جدول كميات من API**

<div dir="rtl">

**الهدف:** التحقق من استخراج بيانات جدول الكميات المحملة عبر API.

</div>

**Objective:** Verify extraction of BOQ data loaded via API.

**Steps:**
1. Find a tender where BOQ is loaded dynamically via AJAX/fetch
2. Open DevTools > Network tab
3. Observe API calls for BOQ data
4. Run extraction

**Expected Results:**
- ✅ Network interception captures API responses
- ✅ BOQ data extracted from JSON responses
- ✅ Combined with DOM-extracted data if any
- ✅ All items accounted for

**Pass Criteria:**
- API-loaded BOQ is captured
- Data is parsed correctly from JSON
- No duplicate entries

---

### Scenario 18: Console Errors Check
**الاختبار الثامن عشر: فحص أخطاء Console**

<div dir="rtl">

**الهدف:** التحقق من عدم وجود أخطاء JavaScript في Console.

</div>

**Objective:** Verify no JavaScript errors in console.

**Steps:**
1. Open DevTools > Console
2. Run full extraction process
3. Monitor console for errors

**Expected Results:**
- ✅ No red errors in console
- ✅ Only info/log messages
- ✅ Warnings (if any) are non-critical

**Pass Criteria:**
- Zero JavaScript errors
- No undefined variables or functions

---

### Scenario 19: Extension Icon and UI
**الاختبار التاسع عشر: أيقونة الإضافة والواجهة**

<div dir="rtl">

**الهدف:** التحقق من صحة عرض الأيقونة والواجهة.

</div>

**Objective:** Verify extension icon and UI display correctly.

**Steps:**
1. Check extension icon in Chrome toolbar
2. Open popup and verify layout
3. Test all buttons and inputs
4. Check responsive behavior

**Expected Results:**
- ✅ Icon displays (even if placeholder)
- ✅ Popup opens with correct size (450px width)
- ✅ RTL layout is correct
- ✅ All buttons clickable
- ✅ Input fields work properly
- ✅ Progress bars animate smoothly
- ✅ Modal opens/closes correctly
- ✅ Colors and styling match design

**Pass Criteria:**
- Professional appearance
- No layout issues
- All interactive elements functional

---

### Scenario 20: Permissions and Security
**الاختبار العشرون: الصلاحيات والأمان**

<div dir="rtl">

**الهدف:** التحقق من أن الإضافة تستخدم الصلاحيات بشكل صحيح وآمن.

</div>

**Objective:** Verify extension uses permissions correctly and securely.

**Steps:**
1. Review requested permissions in manifest
2. Verify only necessary permissions requested
3. Test that extension doesn't access unauthorized sites
4. Check that credentials aren't stored insecurely

**Expected Results:**
- ✅ Minimal permissions requested
- ✅ No access to sites other than etimad.sa and Google APIs
- ✅ OAuth token stored securely by Chrome
- ✅ No credentials in localStorage
- ✅ Content script only runs on etimad.sa

**Pass Criteria:**
- Security best practices followed
- No unnecessary permissions
- OAuth properly implemented

---

## 📊 Test Results Summary | ملخص نتائج الاختبار

Use this table to track your test results:

| # | Scenario | Status | Notes |
|---|----------|--------|-------|
| 1 | Complete Tender | ⬜ Pass ⬜ Fail | |
| 2 | Missing Fields | ⬜ Pass ⬜ Fail | |
| 3 | Multiple BOQ | ⬜ Pass ⬜ Fail | |
| 4 | No BOQ | ⬜ Pass ⬜ Fail | |
| 5 | Paginated BOQ | ⬜ Pass ⬜ Fail | |
| 6 | Slow Loading | ⬜ Pass ⬜ Fail | |
| 7 | Arabic Formatting | ⬜ Pass ⬜ Fail | |
| 8 | Date Formats | ⬜ Pass ⬜ Fail | |
| 9 | Large BOQ | ⬜ Pass ⬜ Fail | |
| 10 | Duplicate Extract | ⬜ Pass ⬜ Fail | |
| 11 | New Spreadsheet | ⬜ Pass ⬜ Fail | |
| 12 | Existing Sheet | ⬜ Pass ⬜ Fail | |
| 13 | Authentication | ⬜ Pass ⬜ Fail | |
| 14 | Auto-Export | ⬜ Pass ⬜ Fail | |
| 15 | Invalid Sheet ID | ⬜ Pass ⬜ Fail | |
| 16 | Network Interruption | ⬜ Pass ⬜ Fail | |
| 17 | BOQ from API | ⬜ Pass ⬜ Fail | |
| 18 | Console Errors | ⬜ Pass ⬜ Fail | |
| 19 | UI/Icon | ⬜ Pass ⬜ Fail | |
| 20 | Security | ⬜ Pass ⬜ Fail | |

---

## 🐛 Bug Reporting Template | نموذج الإبلاغ عن الأخطاء

<div dir="rtl">

عند اكتشاف خطأ، استخدم هذا النموذج للإبلاغ:

</div>

When you find a bug, use this template to report:

```
**Bug Title:** [Brief description]

**Severity:** Critical / High / Medium / Low

**Steps to Reproduce:**
1.
2.
3.

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happened]

**Screenshots:**
[If applicable]

**Console Errors:**
[Any errors from DevTools console]

**Environment:**
- Chrome Version:
- Extension Version:
- OS:
- Tender URL (if applicable):

**Additional Notes:**
[Any other relevant information]
```

---

## ✅ QA Sign-off | موافقة ضمان الجودة

<div dir="rtl">

عند اكتمال جميع الاختبارات بنجاح، وقّع هنا:

</div>

When all tests pass successfully, sign off here:

```
✅ All test scenarios completed
✅ No critical or high severity bugs
✅ Documentation reviewed
✅ Ready for production use

Tested by: ________________
Date: ________________
Signature: ________________
```

---

<div dir="rtl">

## 🎯 نصائح للاختبار الفعّال

</div>

## 🎯 Tips for Effective Testing

<div dir="rtl">

1. **اختبر بيانات حقيقية:** استخدم مناقصات فعلية من منصة اعتماد
2. **سجّل الملاحظات:** وثّق أي سلوك غير متوقع حتى لو لم يكن خطأ
3. **اختبر الحدود:** جرّب حالات قصوى (نصوص طويلة جداً، جداول ضخمة، إلخ)
4. **تحقق من الأداء:** راقب استهلاك الذاكرة والمعالج
5. **اختبر على أجهزة مختلفة:** لو أمكن، جرّب على أجهزة كمبيوتر مختلفة

</div>

1. **Test with real data:** Use actual tenders from Etimad platform
2. **Document everything:** Note any unexpected behavior even if not a bug
3. **Test edge cases:** Try extreme scenarios (very long text, huge tables, etc.)
4. **Monitor performance:** Watch memory and CPU usage
5. **Test on different machines:** If possible, try on different computers

---

**Happy Testing! 🧪**
**بالتوفيق في الاختبار! 🎊**

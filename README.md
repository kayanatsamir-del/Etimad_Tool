# Etimad Tender Data Extractor | مستخرج بيانات منصة اعتماد

<div dir="rtl">

أداة Chrome Extension لاستخراج بيانات المناقصات من منصة اعتماد السعودية إلى جداول قوقل تلقائياً.

</div>

A Chrome Extension tool for extracting tender data from Saudi Arabia's Etimad platform to Google Sheets automatically.

## 🎯 Features | المميزات

<div dir="rtl">

### الوظائف الرئيسية:
- ✅ استخراج البيانات الأساسية للمشروع (الاسم، الرقم المرجعي، الجهة، الموقع، الحالة)
- 📅 استخراج جميع التواريخ (النشر، الإغلاق، الفتح، الزيارة الميدانية، الاستفسارات)
- 🏷️ استخراج مجال التصنيف والنشاط
- 📊 استخراج جداول الكميات (BOQ) الكاملة من جميع الأقسام
- 📝 حفظ البيانات تلقائياً في جداول قوقل
- 🔄 دعم التصدير التلقائي عند فتح الصفحة
- 🌐 دعم كامل للغة العربية والـ RTL
- 📱 واجهة مستخدم بسيطة وسهلة الاستخدام

</div>

### Main Features:
- ✅ Extract project metadata (name, reference, entity, location, status)
- 📅 Extract all dates (publish, closing, opening, site visit, clarification)
- 🏷️ Extract classification/category fields
- 📊 Extract complete Bill of Quantities (BOQ) tables from all sections
- 📝 Automatically save data to Google Sheets
- 🔄 Support auto-export when opening pages
- 🌐 Full Arabic and RTL support
- 📱 Simple and user-friendly interface

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Google Cloud Setup](#google-cloud-setup)
3. [Extension Installation](#extension-installation)
4. [Usage Guide](#usage-guide)
5. [Data Schema](#data-schema)
6. [Troubleshooting](#troubleshooting)
7. [Test Scenarios](#test-scenarios)

---

## 🔧 Prerequisites | المتطلبات الأساسية

<div dir="rtl">

قبل البدء، تحتاج إلى:
- 💻 متصفح Google Chrome
- 📧 حساب Google (Gmail)
- 🔐 الوصول إلى Google Cloud Console
- 🌐 الوصول إلى منصة اعتماد (Etimad)

</div>

Before starting, you need:
- 💻 Google Chrome browser
- 📧 Google Account (Gmail)
- 🔐 Access to Google Cloud Console
- 🌐 Access to Etimad platform

---

## ☁️ Google Cloud Setup | إعداد Google Cloud

<div dir="rtl">

### الخطوة 1: إنشاء مشروع في Google Cloud

</div>

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Create Project"** or **"New Project"**
3. Enter project name: `Etimad Extractor` or any name you prefer
4. Click **"Create"**
5. Wait for the project to be created (takes a few seconds)

<div dir="rtl">

### الخطوة 2: تفعيل Google Sheets API

</div>

### Step 2: Enable Google Sheets API

1. In the project dashboard, click **"Enable APIs and Services"**
2. Search for **"Google Sheets API"**
3. Click on it and press **"Enable"**
4. Wait for it to be enabled

Alternatively, use this direct link (replace PROJECT_ID):
```
https://console.cloud.google.com/apis/library/sheets.googleapis.com?project=PROJECT_ID
```

<div dir="rtl">

### الخطوة 3: إعداد OAuth Consent Screen

</div>

### Step 3: Configure OAuth Consent Screen

1. Go to **"APIs & Services"** > **"OAuth consent screen"**
2. Select **"External"** (unless you have Google Workspace)
3. Click **"Create"**

**Fill in the required information:**
- **App name:** `Etimad Data Extractor` or `مستخرج بيانات اعتماد`
- **User support email:** Your email
- **Developer contact email:** Your email

4. Click **"Save and Continue"**

**Add Scopes:**
5. Click **"Add or Remove Scopes"**
6. Search and select these scopes:
   - `https://www.googleapis.com/auth/spreadsheets`
   - `https://www.googleapis.com/auth/drive.file`
7. Click **"Update"** then **"Save and Continue"**

**Add Test Users (Important!):**
8. Click **"Add Users"**
9. Enter your Gmail address (the one you'll use to test)
10. Click **"Add"** then **"Save and Continue"**

11. Review and click **"Back to Dashboard"**

<div dir="rtl">

### الخطوة 4: إنشاء OAuth Client ID

</div>

### Step 4: Create OAuth Client ID

1. Go to **"APIs & Services"** > **"Credentials"**
2. Click **"Create Credentials"** > **"OAuth client ID"**
3. Select **Application type:** `Chrome extension` or `Chrome app`
4. **Name:** `Etimad Extractor Extension`
5. **Application ID:** Leave empty for now (we'll update it later)
6. Click **"Create"**

7. **Copy the Client ID** - it looks like:
   ```
   123456789012-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com
   ```

8. **Save this Client ID** - you'll need it in the next step!

<div dir="rtl">

### ملاحظة هامة:
سنحتاج لتحديث الـ Client ID في ملف manifest.json، ثم العودة لتحديث Application ID في Google Cloud Console بعد تحميل الإضافة.

</div>

**Important Note:**
We'll need to update the Client ID in manifest.json, then return to update the Application ID in Google Cloud Console after loading the extension.

---

## 🔌 Extension Installation | تثبيت الإضافة

<div dir="rtl">

### الخطوة 1: تحديث OAuth Client ID

</div>

### Step 1: Update OAuth Client ID

1. Open the file: `manifest.json`
2. Find the line with `"client_id"`
3. Replace `YOUR_OAUTH_CLIENT_ID.apps.googleusercontent.com` with your actual Client ID from Step 4 above

Example:
```json
"oauth2": {
  "client_id": "123456789012-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com",
  "scopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.file"
  ]
}
```

<div dir="rtl">

### الخطوة 2: تحميل الإضافة في Chrome

</div>

### Step 2: Load Extension in Chrome

1. Open Chrome browser
2. Go to: `chrome://extensions/`
3. Enable **"Developer mode"** (toggle in top-right corner)
4. Click **"Load unpacked"**
5. Select the `Etimad_Tool` folder (the one containing manifest.json)
6. The extension should now appear in your extensions list

<div dir="rtl">

### الخطوة 3: الحصول على Extension ID وتحديثه في Google Cloud

</div>

### Step 3: Get Extension ID and Update in Google Cloud

1. In `chrome://extensions/`, find your extension
2. **Copy the Extension ID** - it looks like: `abcdefghijklmnopqrstuvwxyz123456`
3. Go back to [Google Cloud Console](https://console.cloud.google.com/)
4. Navigate to **"APIs & Services"** > **"Credentials"**
5. Click on your OAuth Client ID (the one you created)
6. In **"Application ID"**, paste your Extension ID
7. Click **"Save"**

<div dir="rtl">

### الخطوة 4: التحقق من التثبيت

</div>

### Step 4: Verify Installation

1. You should see the extension icon in Chrome toolbar
2. Click on it to open the popup
3. The interface should display in Arabic (RTL layout)
4. You should see settings and an extract button

---

## 📖 Usage Guide | دليل الاستخدام

<div dir="rtl">

### الاستخدام الأساسي

</div>

### Basic Usage

<div dir="rtl">

#### 1. الإعداد الأولي:

</div>

#### 1. Initial Setup:

1. **Open Etimad tender page** - Navigate to any tender/project page on etimad.sa
2. **Click the extension icon** to open the popup
3. **(Optional) Enter Spreadsheet ID:**
   - If you have an existing Google Sheet, copy its ID from the URL:
     ```
     https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit
     ```
   - Paste it in the "معرّف جدول البيانات" field
   - If you leave it empty, a new spreadsheet will be created automatically
4. **Click "حفظ الإعدادات" (Save Settings)**

<div dir="rtl">

#### 2. استخراج البيانات:

</div>

#### 2. Extract Data:

1. Make sure you're on a valid Etimad tender page
2. The extension will show: **"صفحة مناقصة صالحة ✅"** (Valid tender page)
3. Click **"🚀 استخراج البيانات"** (Extract Data)
4. Watch the progress steps:
   - ⏳ Checking page
   - ⏳ Extracting metadata
   - ⏳ Extracting dates and classification
   - ⏳ Extracting BOQ tables
   - ⏳ Writing to Google Sheets
5. When complete, you'll see the results summary
6. Click **"📊 عرض الجدول"** (View Sheet) to open your Google Sheet

<div dir="rtl">

#### 3. التصدير التلقائي (اختياري):

</div>

#### 3. Auto Export (Optional):

1. Open extension settings
2. Check the box: **"تصدير تلقائي عند فتح الصفحة"** (Auto export)
3. Click **"حفظ الإعدادات"** (Save Settings)
4. Now whenever you open a tender page, data will be extracted automatically

---

## 📊 Data Schema | هيكل البيانات

<div dir="rtl">

### جدول "Projects" (المشاريع)

</div>

### "Projects" Sheet

Contains one row per tender/project with the following columns:

| Column | Arabic | Description |
|--------|--------|-------------|
| A | الرقم المرجعي | Reference Number |
| B | اسم المشروع | Project Name |
| C | الجهة | Entity/Owner |
| D | الموقع | Location |
| E | الحالة | Status |
| F | تاريخ النشر | Publish Date |
| G | تاريخ الإغلاق | Closing Date |
| H | تاريخ الفتح | Opening Date |
| I | تاريخ الزيارة الميدانية | Site Visit Date |
| J | آخر موعد للاستفسار | Clarification Deadline |
| K | التصنيف | Classification/Category |
| L | رابط الصفحة | Page URL |
| M | تاريخ الاستخراج | Extraction Date/Time |

<div dir="rtl">

### جدول "BOQ_[Reference]" (جدول الكميات)

</div>

### "BOQ_[Reference]" Sheet

Contains all Bill of Quantities items for a specific project:

| Column | Arabic | Description |
|--------|--------|-------------|
| A | رقم البند | Item Number |
| B | الوصف | Description |
| C | الوحدة | Unit of Measurement |
| D | الكمية | Quantity |
| E | السعر | Unit Rate/Price |
| F | المبلغ | Total Amount |
| G | المواصفات/ملاحظات | Specifications/Notes |
| H | القسم | Section/Category |
| I | رابط المصدر | Source URL |

<div dir="rtl">

### جدول "Logs" (السجلات)

</div>

### "Logs" Sheet

Tracks all extraction operations:

| Column | Arabic | Description |
|--------|--------|-------------|
| A | التاريخ والوقت | Timestamp |
| B | الرقم المرجعي | Reference Number |
| C | الحالة | Status (Success/Error) |
| D | الرسالة | Message |
| E | عدد بنود BOQ | BOQ Item Count |
| F | رابط الصفحة | Page URL |
| G | وقت المعالجة | Processing Time |

---

## 🔍 Troubleshooting | حل المشاكل

<div dir="rtl">

### مشاكل شائعة وحلولها

</div>

### Common Issues and Solutions

<div dir="rtl">

#### 1. "فشل المصادقة" (Authentication Failed)

</div>

#### 1. "Authentication Failed" Error

**Problem:** OAuth not working

**Solutions:**
- ✅ Make sure you added your email as a test user in OAuth consent screen
- ✅ Verify the Client ID in manifest.json is correct
- ✅ Check that the Extension ID is added in Google Cloud credentials
- ✅ Try signing out and signing in again
- ✅ Clear extension data: Right-click extension icon > "Remove" > Re-install

<div dir="rtl">

#### 2. "ليست صفحة مناقصة" (Not a tender page)

</div>

#### 2. "Not a tender page" Message

**Problem:** Extension doesn't recognize the page

**Solutions:**
- ✅ Make sure you're on a tender detail page (not the list page)
- ✅ Wait for the page to fully load
- ✅ Refresh the page and try again
- ✅ Check if the URL contains "tender" or similar keywords

<div dir="rtl">

#### 3. جدول الكميات فارغ (BOQ is empty)

</div>

#### 3. BOQ Data is Empty

**Problem:** No BOQ data extracted

**Solutions:**
- ✅ The tender might not have BOQ tables yet
- ✅ BOQ might be in PDF format (extension can't extract from PDFs)
- ✅ Wait longer for BOQ tables to load (they might load via AJAX)
- ✅ Try scrolling down to load more content
- ✅ Check if BOQ requires clicking a specific tab/button

<div dir="rtl">

#### 4. "فشلت الكتابة إلى الجدول" (Failed to write to sheet)

</div>

#### 4. "Failed to write to sheet" Error

**Problem:** Can't write to Google Sheets

**Solutions:**
- ✅ Check if the Spreadsheet ID is correct
- ✅ Make sure you have edit permissions on the sheet
- ✅ Verify Google Sheets API is enabled in Cloud Console
- ✅ Check if you've exceeded Google API quota (unlikely for normal use)
- ✅ Try creating a new spreadsheet (leave ID empty)

<div dir="rtl">

#### 5. الواجهة لا تظهر بالعربية (UI not showing in Arabic)

</div>

#### 5. UI Not Displaying in Arabic

**Problem:** Interface showing incorrectly

**Solutions:**
- ✅ Clear browser cache and reload extension
- ✅ Check if RTL is blocked by browser settings
- ✅ Reinstall the extension
- ✅ Try a different Chrome profile

---

## 🧪 Test Scenarios | سيناريوهات الاختبار

See [TEST_SCENARIOS.md](TEST_SCENARIOS.md) for detailed test cases.

<div dir="rtl">

### سيناريوهات الاختبار الأساسية:

</div>

### Basic Test Scenarios:

1. **Complete tender with all data** - Extract from a tender that has all fields filled
2. **Missing fields** - Test with tender missing optional fields
3. **Multiple BOQ sections** - Test with tender having multiple BOQ tables/tabs
4. **No BOQ** - Test with tender that doesn't have BOQ yet
5. **Slow loading page** - Test with slow internet/heavy page
6. **Arabic formatting** - Verify all Arabic text displays correctly
7. **Date formats** - Check various date format extractions
8. **Large BOQ** - Test with BOQ containing 100+ items
9. **Duplicate extraction** - Extract same tender twice (should update existing row)
10. **New spreadsheet creation** - Test creating new sheet vs. using existing

---

## 📁 Project Structure | هيكل المشروع

```
Etimad_Tool/
├── manifest.json              # Extension manifest (Manifest V3)
├── service_worker.js          # Background service worker (OAuth + Sheets API)
├── content_script.js          # Content script (DOM extraction + network intercept)
├── popup.html                 # Popup UI (Arabic/RTL interface)
├── popup.css                  # Popup styles
├── popup.js                   # Popup logic
├── icons/                     # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── README.md                  # This file
└── TEST_SCENARIOS.md          # Detailed test cases
```

---

## 🔒 Security & Privacy | الأمان والخصوصية

<div dir="rtl">

### ملاحظات أمنية مهمة:

</div>

### Important Security Notes:

- 🔐 **No credentials stored** - Extension uses Chrome's built-in OAuth
- 🌐 **Read-only on Etimad** - Extension only reads page content, never modifies
- 📊 **Your data** - All data goes to YOUR Google Sheets (you control access)
- 🚫 **No external servers** - Everything runs client-side in your browser
- 🔑 **Google authentication** - Uses official Google OAuth 2.0

<div dir="rtl">

### الأذونات المطلوبة:

</div>

### Required Permissions:

- `activeTab` - To read content from Etimad pages you're viewing
- `storage` - To save your settings (spreadsheet ID, auto-export preference)
- `identity` - To authenticate with Google for Sheets access
- `host_permissions` - To access etimad.sa and Google APIs

---

## 🚀 Advanced Configuration | إعدادات متقدمة

<div dir="rtl">

### تخصيص عملية الاستخراج:

</div>

### Customizing Extraction:

The extension uses multiple strategies to find data:

1. **Primary:** DOM selectors for known labels
2. **Fallback:** Text search by Arabic keywords
3. **Network:** Intercepts API calls for BOQ data

You can modify extraction logic in `content_script.js`:
- `extractProjectMetadata()` - Customize project field extraction
- `extractDates()` - Modify date extraction logic
- `extractClassification()` - Adjust classification finding
- `extractBOQ()` - Change BOQ extraction strategy

<div dir="rtl">

### إضافة حقول جديدة:

</div>

### Adding New Fields:

To extract additional fields:

1. Edit `content_script.js` - Add extraction logic
2. Edit `service_worker.js` - Update `writeProjectData()` to include new columns
3. Update this README documentation

---

## 📞 Support | الدعم

<div dir="rtl">

للدعم والاستفسارات:
- 📧 البريد الإلكتروني: [أضف بريدك]
- 📝 المشاكل والأخطاء: [أضف رابط Issues في GitHub]
- 📖 التوثيق: راجع هذا الملف

</div>

For support and questions:
- 📧 Email: [Add your email]
- 📝 Issues & Bugs: [Add GitHub Issues link]
- 📖 Documentation: Refer to this file

---

## 📄 License | الترخيص

This project is provided as-is for educational and productivity purposes.

---

## 🙏 Credits | شكر وتقدير

<div dir="rtl">

تم تطوير هذه الأداة لتسهيل عملية استخراج بيانات المناقصات من منصة اعتماد السعودية.

</div>

Developed to simplify the process of extracting tender data from Saudi Arabia's Etimad platform.

---

## 📝 Version History | سجل الإصدارات

- **v1.0.0** (2026-01-13)
  - Initial release
  - Basic extraction functionality
  - Google Sheets integration
  - Arabic/RTL UI support
  - Auto-export feature

---

<div dir="rtl">

## 🎉 ابدأ الآن!

1. أكمل إعداد Google Cloud ☁️
2. ثبّت الإضافة 🔌
3. افتح صفحة مناقصة على اعتماد 🌐
4. اضغط زر الاستخراج 🚀
5. شاهد البيانات في جداول قوقل 📊

**بالتوفيق! 🎊**

</div>

## 🎉 Get Started Now!

1. Complete Google Cloud setup ☁️
2. Install the extension 🔌
3. Open a tender page on Etimad 🌐
4. Click the extract button 🚀
5. View data in Google Sheets 📊

**Good luck! 🎊**

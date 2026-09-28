# Google Sheet Setup Guide for Admin Portal

This guide explains how to create and connect a dedicated Google Sheet to power your **Admin Portal** backend:
- 📊 **Log History**: Automatically records all student logins, timestamps, emails, statuses (`SUCCESS` / `DENIED`), and device types.
- 📝 **Changes Request**: Stores student-submitted record update requests with `PENDING`, `APPROVED`, or `REJECTED` states.
- 🔒 **Portal Lock (Maintenance Mode)**: Controls whether student access is active or locked with a custom notice.

---

## Step 1: Create the Google Sheet

1. Open your browser and navigate to [sheets.new](https://sheets.new) (creates a new Google Spreadsheet).
2. Name the spreadsheet: **`Student Portal Admin Backend`**.
3. Create **3 separate tabs (sheets)** at the bottom with these **exact names**:

### Tab 1: `Logins`
Set the following headers in **Row 1**:
| Column | Header Name | Description |
|---|---|---|
| **A** | `ID` | Unique log ID |
| **B** | `Timestamp` | Date & time of login event |
| **C** | `Student Name` | Name of student |
| **D** | `USN` | Student USN (e.g. `CS25131`) |
| **E** | `Email` | Authenticated Google email |
| **F** | `Status` | `SUCCESS`, `DENIED`, or `BLOCKED` |
| **G** | `Device` | Operating system & browser |
| **H** | `Reason` | Failure reason (if denied or blocked) |

---

### Tab 2: `ChangeRequests`
Set the following headers in **Row 1**:
| Column | Header Name | Description |
|---|---|---|
| **A** | `ID` | Unique request ID |
| **B** | `Submitted At` | Timestamp of request |
| **C** | `USN` | Student USN |
| **D** | `Name` | Student Name |
| **E** | `Field` | Field to update (e.g. Phone, Blood Group) |
| **F** | `Old Value` | Previous value |
| **G** | `New Value` | Requested new value |
| **H** | `Reason` | Student justification |
| **I** | `Status` | `PENDING`, `APPROVED`, or `REJECTED` |

---

### Tab 3: `Settings`
Set up the initial configuration in **Columns A and B**:
| Cell | Value | Description |
|---|---|---|
| **A1** | `is_locked` | Setting key |
| **B1** | `FALSE` | Set to `TRUE` to lock student portal |
| **A2** | `lock_reason` | Notice displayed to students |
| **B2** | `System maintenance in progress.` | Maintenance message |

---

## Step 2: Add Google Apps Script

1. In your Google Sheet, click **Extensions** in the top menu and select **Apps Script**.
2. Erase any placeholder code in `Code.gs` and paste the following script:

```javascript
/**
 * Student Portal - Admin Backend Web App
 * Handles GET (fetch data) and POST (save logs, requests, portal lock)
 */

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var action = (e.parameter && e.parameter.action) || "GET_ALL";
  
  var responseData = {};
  
  if (action === "GET_LOGS" || action === "GET_ALL") {
    var loginSheet = ss.getSheetByName("Logins");
    responseData.logs = loginSheet ? loginSheet.getDataRange().getValues() : [];
  }
  
  if (action === "GET_REQUESTS" || action === "GET_ALL") {
    var reqSheet = ss.getSheetByName("ChangeRequests");
    responseData.requests = reqSheet ? reqSheet.getDataRange().getValues() : [];
  }
  
  if (action === "GET_SETTINGS" || action === "GET_ALL") {
    var setSheet = ss.getSheetByName("Settings");
    responseData.settings = setSheet ? setSheet.getDataRange().getValues() : [];
  }
  
  return ContentService.createTextOutput(JSON.stringify({ success: true, data: responseData }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. Append Login Log
    if (body.action === "ADD_LOG") {
      var logSheet = ss.getSheetByName("Logins") || ss.insertSheet("Logins");
      if (logSheet.getLastRow() === 0) {
        logSheet.appendRow(["ID", "Timestamp", "Student Name", "USN", "Email", "Status", "Device", "Reason"]);
      }
      var log = body.log;
      logSheet.appendRow([
        log.id || ("log-" + Date.now()),
        log.timestamp || new Date().toISOString(),
        log.student_name || "Unknown",
        log.usn || "N/A",
        log.email || "",
        log.status || "SUCCESS",
        log.device || "Browser",
        log.reason || ""
      ]);
    }
    
    // 2. Submit Student Change Request
    if (body.action === "ADD_REQUEST") {
      var reqSheet = ss.getSheetByName("ChangeRequests") || ss.insertSheet("ChangeRequests");
      if (reqSheet.getLastRow() === 0) {
        reqSheet.appendRow(["ID", "Submitted At", "USN", "Name", "Field", "Old Value", "New Value", "Reason", "Status"]);
      }
      var req = body.request;
      reqSheet.appendRow([
        req.id || ("req-" + Date.now()),
        req.submitted_at || new Date().toISOString(),
        req.student_usn,
        req.student_name,
        req.field_name,
        req.old_value,
        req.new_value,
        req.reason || "",
        req.status || "PENDING"
      ]);
    }
    
    // 3. Update Change Request Status (Approve / Reject)
    if (body.action === "UPDATE_REQUEST") {
      var reqSheet = ss.getSheetByName("ChangeRequests");
      if (reqSheet) {
        var data = reqSheet.getDataRange().getValues();
        for (var i = 1; i < data.length; i++) {
          if (data[i][0] === body.id) {
            reqSheet.getRange(i + 1, 9).setValue(body.status);
            break;
          }
        }
      }
    }
    
    // 4. Set Portal Lock Status
    if (body.action === "SET_LOCK") {
      var setSheet = ss.getSheetByName("Settings") || ss.insertSheet("Settings");
      setSheet.getRange("A1:B1").setValues([["is_locked", body.is_locked ? "TRUE" : "FALSE"]]);
      if (body.lock_reason) {
        setSheet.getRange("A2:B2").setValues([["lock_reason", body.lock_reason]]);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

3. Click **Save** (💾 icon) or press `Ctrl + S`. Name the project `StudentPortalAdminApi`.

---

## Step 3: Deploy as Web App

1. In the Apps Script editor, click the blue **Deploy** button (top right) and choose **New deployment**.
2. Click the gear icon (**Select type**) and select **Web app**.
3. Configure the deployment settings:
   - **Description**: `Student Portal Admin API v1`
   - **Execute as**: `Me (your email address)`
   - **Who has access**: `Anyone` *(Crucial so the frontend can send logs and status updates)*
4. Click **Deploy**.
5. Click **Authorize access**, choose your Google account, click **Advanced**, and then click **Go to StudentPortalAdminApi (unsafe)** to allow access.
6. Copy the **Web App URL** (format: `https://script.google.com/macros/s/AKfycb.../exec`).

---

## Step 4: Connect to Your Admin Portal

You can connect the URL in either of two ways:

### Option A: Directly in the Admin Portal (Easiest)
1. Go to `http://localhost:3000/admin` (or your deployed site's `/admin`).
2. Sign in with your Google account (**`2007aniketsonwane@gmail.com`**) or use the emergency passcode (`admin2026`).
3. Click the **Google Sheet Setup** button in the top navigation bar.
4. Paste your **Web App URL** into the input box under Step 4 and click **Save & Connect**.

### Option B: In `.env` File
Add the following line to your `.env` file:
```env
VITE_GOOGLE_SHEETS_ADMIN_API_URL=https://script.google.com/macros/s/YOUR_DEPLOYED_SCRIPT_ID/exec
```

---

## Features Now Active:
- **Admin Access Control**: Online access to `/admin` is strictly secured for `2007aniketsonwane@gmail.com` via Google Sign-In.
- **Login Logs**: Every time a student logs in (or attempts an unauthorized login), an entry is automatically appended to the **`Logins`** tab in Google Sheets.
- **Student Data Change Requests**: Students click the **"Change / Update Data"** button in **Settings** to submit correction requests (phone number, blood group, address, etc.), which instantly record in the **`ChangeRequests`** tab and appear on the Admin Dashboard for approval/rejection.
- **Portal Lock**: Toggling **Lock Portal** in the Admin Portal syncs with the **`Settings`** tab.


# Google Apps Script Setup & Synchronization Guide

## Why Edits Were Not Syncing
The deployed Google Apps Script Web App previously only had actions for:
- `ADD_LOG` (Login auditing)
- `ADD_REQUEST` (Profile change requests)
- `SET_LOCK` (Maintenance mode)

It was **missing the actions for**:
- `SAVE_TIMETABLE` (Syncing timetable lectures directly to the Timetable Google Sheet)
- `ADD_EXAM_DATE` (Appending newly added exams to the Exam Dates Google Sheet)
- `DELETE_EXAM_DATE` (Removing deleted exams from the Exam Dates Google Sheet)

Because the deployed Apps Script didn't handle those actions, it received the requests but wrote nothing to Google Sheets.

---

## How to Fix and Enable Google Sheets Sync (2 Minutes)

### Step 1: Open Your Google Apps Script
1. Open the Google Spreadsheet connected to your Admin Portal (or any of your administrative spreadsheets).
2. Click **Extensions** > **Apps Script** in the top menu.

---

### Step 2: Replace Script Code
Delete everything in the Apps Script editor and paste the code from [google-apps-script/Code.gs](file:///a:/My%20Data/VS%20Code/Personal%20Projects/StudentPortal/Student-Portal%20V3/google-apps-script/Code.gs):

```javascript
/**
 * Complete Google Apps Script for Student Portal Backend & Admin
 */

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || "";
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  if (action === "SETTINGS") {
    var setSheet = ss.getSheetByName("Settings");
    var sData = setSheet ? setSheet.getDataRange().getValues() : [];
    return jsonResponse({ success: true, settings: sData });
  }

  var logSheet = ss.getSheetByName("Logins");
  var reqSheet = ss.getSheetByName("ChangeRequests");
  var setSheet = ss.getSheetByName("Settings");

  var logs = logSheet ? logSheet.getDataRange().getValues() : [];
  var requests = reqSheet ? reqSheet.getDataRange().getValues() : [];
  var settings = setSheet ? setSheet.getDataRange().getValues() : [];

  return jsonResponse({
    success: true,
    data: {
      logs: logs,
      requests: requests,
      settings: settings
    }
  });
}

function getTargetSpreadsheet(customId) {
  if (customId && String(customId).trim().length > 10) {
    try {
      return SpreadsheetApp.openById(String(customId).trim());
    } catch (err) {
      Logger.log("openById failed, falling back to active spreadsheet: " + err);
    }
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var activeSS = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. ADD LOGIN AUDIT LOG
    if (body.action === "ADD_LOG") {
      var logSheet = activeSS.getSheetByName("Logins") || activeSS.insertSheet("Logins");
      if (logSheet.getLastRow() === 0) {
        logSheet.appendRow(["ID", "Timestamp", "Student Name", "USN", "Email", "Status", "Device", "Reason"]);
      }
      var log = body.log;
      logSheet.appendRow([
        log.id,
        log.timestamp,
        log.student_name,
        log.usn,
        log.email,
        log.status,
        log.device || "",
        log.reason || ""
      ]);
      return jsonResponse({ success: true });
    }
    
    // 2. ADD CHANGE REQUEST
    if (body.action === "ADD_REQUEST") {
      var reqSheet = activeSS.getSheetByName("ChangeRequests") || activeSS.insertSheet("ChangeRequests");
      if (reqSheet.getLastRow() === 0) {
        reqSheet.appendRow(["ID", "Submitted At", "USN", "Name", "Field", "Old Value", "New Value", "Reason", "Status"]);
      }
      var req = body.request;
      reqSheet.appendRow([
        req.id,
        req.submitted_at,
        req.student_usn,
        req.student_name,
        req.field_name,
        req.old_value,
        req.new_value,
        req.reason || "",
        req.status
      ]);
      return jsonResponse({ success: true });
    }
    
    // 3. SET PORTAL LOCK / MAINTENANCE
    if (body.action === "SET_LOCK") {
      var setSheet = activeSS.getSheetByName("Settings") || activeSS.insertSheet("Settings");
      setSheet.getRange("A1:B1").setValues([["is_locked", body.is_locked ? "TRUE" : "FALSE"]]);
      setSheet.getRange("A2:B2").setValues([["lock_reason", body.lock_reason || ""]]);
      return jsonResponse({ success: true });
    }
    
    // 4. SAVE TIMETABLE (Directly to Timetable Master Google Sheet)
    if (body.action === "SAVE_TIMETABLE") {
      var tSS = getTargetSpreadsheet(body.spreadsheetId);
      var tSheet = tSS.getSheetByName("Timetable") || tSS.getSheetByName("Sheet1") || tSS.getSheets()[0];
      
      var existingData = tSheet.getDataRange().getValues();
      var defaultHeader = ["Semester", "Day", "Period", "Timings", "Subject Code", "Subject Name", "Room", "Faculty", "Type"];
      var header = (existingData.length > 0 && existingData[0].length >= 9) ? existingData[0] : defaultHeader;
      
      var targetSem = Number(body.semester) || 3;
      var otherSemRows = [];
      
      // Preserve all rows from other semesters
      for (var r = 1; r < existingData.length; r++) {
        var row = existingData[r];
        if (!row || row.length === 0 || !row[0]) continue;
        var rSem = parseInt(String(row[0]).replace(/\D/g, ""), 10);
        if (rSem !== targetSem) {
          otherSemRows.push(row);
        }
      }
      
      // Build rows for the updated semester from body.schedule
      var newSemRows = [];
      var schedule = body.schedule || [];
      for (var s = 0; s < schedule.length; s++) {
        var daySchedule = schedule[s];
        var dayName = daySchedule.day;
        var lecs = daySchedule.lectures || [];
        for (var l = 0; l < lecs.length; l++) {
          var lec = lecs[l];
          newSemRows.push([
            targetSem,
            dayName,
            lec.period || (l + 1),
            lec.timings || "",
            lec.subjectCode || "",
            lec.subjectName || "",
            lec.room || "—",
            lec.faculty || "—",
            lec.type || "Theory"
          ]);
        }
      }
      
      // Combine: Header + other semesters + updated semester rows
      var finalRows = [header].concat(otherSemRows).concat(newSemRows);
      
      tSheet.clearContents();
      tSheet.getRange(1, 1, finalRows.length, header.length).setValues(finalRows);
      
      return jsonResponse({
        success: true,
        updatedSemester: targetSem,
        totalRows: finalRows.length
      });
    }
    
    // 5. ADD EXAM DATE (Directly to Exam Dates Master Google Sheet)
    if (body.action === "ADD_EXAM_DATE") {
      var eSS = getTargetSpreadsheet(body.spreadsheetId);
      var eSheet = eSS.getSheetByName("ExamDates") || eSS.getSheetByName("Exams") || eSS.getSheets()[0];
      
      if (eSheet.getLastRow() === 0) {
        eSheet.appendRow(["Semester", "Exam Type", "Date", "Subject Name", "Subject Code", "Timings", "Venue", "Status"]);
      }
      
      var ex = body.exam;
      var dateFormatted = ex.date || "";
      if (dateFormatted && dateFormatted.indexOf("-") !== -1) {
        var dParts = dateFormatted.split("-");
        if (dParts.length === 3 && dParts[0].length === 4) {
          // Convert YYYY-MM-DD -> DD-MM-YY to match existing sheet format (e.g. 26-10-26)
          dateFormatted = dParts[2] + "-" + dParts[1] + "-" + dParts[0].slice(2);
        }
      }
      
      eSheet.appendRow([
        Number(ex.semester) || 3,
        ex.examType || "CAE-1",
        dateFormatted,
        ex.subjectName || "",
        ex.subjectCode || "",
        ex.timings || "10:00 AM - 01:00 PM",
        ex.venue || "—",
        ex.status || "Upcoming"
      ]);
      
      return jsonResponse({ success: true });
    }
    
    // 6. DELETE EXAM DATE
    if (body.action === "DELETE_EXAM_DATE") {
      var dSS = getTargetSpreadsheet(body.spreadsheetId);
      var dSheet = dSS.getSheetByName("ExamDates") || dSS.getSheetByName("Exams") || dSS.getSheets()[0];
      var examRows = dSheet.getDataRange().getValues();
      
      var targetSem = body.semester ? Number(body.semester) : null;
      var targetCode = (body.subjectCode || "").trim().toUpperCase();
      
      for (var er = examRows.length - 1; er >= 1; er--) {
        var eRow = examRows[er];
        var matchSem = !targetSem || Number(eRow[0]) === targetSem;
        var matchCode = !targetCode || String(eRow[4]).trim().toUpperCase() === targetCode;
        
        if (matchSem && matchCode) {
          dSheet.deleteRow(er + 1);
          break;
        }
      }
      
      return jsonResponse({ success: true });
    }
    
    return jsonResponse({ success: true, message: "Action processed" });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
```

---

### Step 3: Crucial - Deploy a New Version!
> [!IMPORTANT]
> In Google Apps Script, editing the code will **NOT** update the live Web App until you deploy a new version!

1. In Apps Script, click **Deploy** (top right) > **Manage deployments**.
2. Click the **Pencil (Edit)** icon next to your active deployment.
3. Under **Version**, click the dropdown and select **New version**.
4. Click **Deploy**.
5. If Google prompts: *"Authorization required"*, click **Review permissions** > Choose your Google account > **Advanced** > **Go to Student Portal Admin (unsafe)** > Click **Allow**.

Now, every time you:
- Edit the Timetable and click **"Save Timetable Changes"**, it will update the Google Sheet database.
- Add or delete an exam date in **"Add Exam Dates on Website"**, it will update the Google Sheet database in real time.

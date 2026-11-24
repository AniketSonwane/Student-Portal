/**
 * Google Apps Script for DASHBOARD LOGIN & ADMIN CONTROL SHEET
 * 
 * Paste this in:
 * Extensions > Apps Script inside your Admin / Dashboard Google Spreadsheet.
 *
 * CONFIGURATION (Zero Hardcoded Secrets / IDs):
 * 1. Bound Mode: When pasted into your Admin spreadsheet, SpreadsheetApp.getActiveSpreadsheet()
 *    is used automatically with zero setup required.
 * 2. Request Mode: The frontend passes spreadsheetId and rootFolderId dynamically with each request.
 * 3. Script Properties (Optional for standalone deployments):
 *    Project Settings (gear icon) > Script Properties:
 *    - ADMIN_SPREADSHEET_ID
 *    - NOTICES_SPREADSHEET_ID
 *    - NOTICES_ROOT_FOLDER_ID
 *    - SEMESTER_1_DRIVE_FOLDER_ID
 *    - SEMESTER_2_DRIVE_FOLDER_ID
 *    - SEMESTER_3_DRIVE_FOLDER_ID
 */

function getScriptProperty(key, fallback) {
  try {
    var val = PropertiesService.getScriptProperties().getProperty(key);
    if (val && String(val).trim().length > 0) return String(val).trim();
  } catch (e) {}
  return fallback || "";
}

var ADMIN_SPREADSHEET_ID = getScriptProperty("ADMIN_SPREADSHEET_ID", "");
var NOTICES_SPREADSHEET_ID = getScriptProperty("NOTICES_SPREADSHEET_ID", "");

/**
 * ----------------------------------------------------
 * ONE-TIME AUTHORIZATION TRIGGER
 * ----------------------------------------------------
 * If you see: "You do not have permission to call DriveApp... Required permissions: https://www.googleapis.com/auth/drive"
 * 
 * Simply:
 * 1. Select 'authorizeScript' from the function dropdown at the top of the Google Apps Script toolbar.
 * 2. Click the 'Run' (▶) button.
 * 3. In the popup, click 'Review permissions' -> select your Google account -> click 'Advanced' -> click 'Go to ... (unsafe)' -> click 'Allow'.
 * 4. Re-deploy: Deploy -> Manage deployments -> Edit -> select 'New version' -> Deploy!
 */
function authorizeScript() {
  var rootFolder = getNoticesRootFolder();
  var folderName = rootFolder ? rootFolder.getName() : "Root";
  var testCreate = rootFolder ? rootFolder.createFolder("AUTH_TEST_DELETE_ME") : null;
  if (testCreate) {
    testCreate.setTrashed(true);
  }
  var ss = getAdminSpreadsheet();
  var ssName = ss ? ss.getName() : "Admin Sheet";
  Logger.log("✅ Successfully authorized DriveApp & SpreadsheetApp!");
  Logger.log("Connected Drive Folder: " + folderName);
  Logger.log("Connected Spreadsheet: " + ssName);
  return "Authorization successful! All Drive and Spreadsheet permissions are active.";
}

function getAdminSpreadsheet(customId) {
  var id = (customId && String(customId).trim()) || getScriptProperty("ADMIN_SPREADSHEET_ID", "");
  if (id && id.length > 10) {
    try {
      return SpreadsheetApp.openById(id);
    } catch (err) {
      Logger.log("openById failed: " + err);
    }
  }
  try {
    var active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) return active;
  } catch (err) {}
  return null;
}

function getNoticesSpreadsheet(customId) {
  var id = (customId && String(customId).trim()) || getScriptProperty("NOTICES_SPREADSHEET_ID", "");
  if (id && id.length > 10) {
    try {
      return SpreadsheetApp.openById(id);
    } catch (err) {
      Logger.log("openById notices failed: " + err);
    }
  }
  return getAdminSpreadsheet(customId);
}

function getTargetSpreadsheet(customId) {
  return getAdminSpreadsheet(customId);
}

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || "";
    var customId = (e && e.parameter && e.parameter.spreadsheetId) || "";
    var ss = getAdminSpreadsheet(customId);

    if (action === "SETTINGS") {
      var setSheet = ss ? ss.getSheetByName("Settings") : null;
      var sData = setSheet ? setSheet.getDataRange().getValues() : [];
      return jsonResponse({ success: true, settings: sData });
    }

    if (action === "SET_LOCK" || action === "LOCK_PORTAL") {
      var isLocked = (e && e.parameter && (e.parameter.is_locked === "true" || e.parameter.is_locked === "TRUE"));
      var lockReason = (e && e.parameter && e.parameter.lock_reason) || "";
      var setSheet = ss ? (ss.getSheetByName("Settings") || ss.insertSheet("Settings")) : null;
      if (setSheet) {
        setSheet.getRange("A1:B1").setValues([["is_locked", isLocked ? "TRUE" : "FALSE"]]);
        setSheet.getRange("A2:B2").setValues([["lock_reason", lockReason]]);
        SpreadsheetApp.flush();
        return jsonResponse({ success: true, is_locked: isLocked, lock_reason: lockReason });
      }
      return jsonResponse({ success: false, error: "Settings sheet not found" });
    }

    if (action === "GET_SEMESTER_FILES" || action === "SEMESTER_FILES") {
      var targetSemester = (e && e.parameter && e.parameter.semester) ? Number(e.parameter.semester) : null;
      var rootFolderId = (e && e.parameter && e.parameter.folderId) || (targetSemester && SEMESTER_DRIVE_FOLDERS[targetSemester]) || null;
      var result = getSemesterFilesFromDrive(rootFolderId, targetSemester);
      return jsonResponse({
        success: true,
        files: result.files,
        folderName: result.folderName,
        errors: result.errors.length > 0 ? result.errors : undefined
      });
    }

    if (action === "GET_NOTICES" || action === "NOTICES") {
      var nSS = getNoticesSpreadsheet(customId);
      var nSheet = nSS ? (nSS.getSheetByName("Notices") || nSS.getSheets()[0]) : null;
      if (nSheet && nSheet.getLastRow() === 0) {
        nSheet.setName("Notices");
        nSheet.appendRow([
          "Timestamp",
          "Notice ID",
          "Semester",
          "Title",
          "Content",
          "Links",
          "Document Name",
          "Document URL",
          "Folder ID",
          "Folder URL"
        ]);
        try {
          var hr = nSheet.getRange(1, 1, 1, 10);
          hr.setFontWeight("bold");
          hr.setBackground("#F3E8FF");
          nSheet.setFrozenRows(1);
        } catch (e) {}
      }
      var nRows = nSheet ? nSheet.getDataRange().getValues() : [];
      return jsonResponse({ success: true, notices: nRows });
    }

    if (action === "GET_BLOCKED_USERS" || action === "BLOCKED_USERS" || action === "BLOCKED") {
      var bSS = getAdminSpreadsheet(customId);
      var bSheet = bSS ? (bSS.getSheetByName("BlockedUsers") || bSS.insertSheet("BlockedUsers")) : null;
      if (bSheet && bSheet.getLastRow() === 0) {
        bSheet.appendRow(["Timestamp", "User ID", "Student Name", "Reason", "Blocked By"]);
        try {
          var bHr = bSheet.getRange(1, 1, 1, 5);
          bHr.setFontWeight("bold");
          bHr.setBackground("#FEE2E2");
          bSheet.setFrozenRows(1);
        } catch (e) {}
      }
      var bRows = bSheet ? bSheet.getDataRange().getValues() : [];
      return jsonResponse({ success: true, blocked: bRows });
    }

    // ----------------------------------------------------
    // GET-based Fallback for BLOCK_USER (guarantees cross-origin writes on Netlify/browsers)
    // ----------------------------------------------------
    if (action === "BLOCK_USER") {
      var bSS = getAdminSpreadsheet(customId);
      var bSheet = bSS ? (bSS.getSheetByName("BlockedUsers") || bSS.insertSheet("BlockedUsers")) : null;
      if (bSheet && bSheet.getLastRow() === 0) {
        bSheet.appendRow(["Timestamp", "User ID", "Student Name", "Reason", "Blocked By"]);
      }
      var targetUserId = String((e && e.parameter && (e.parameter.userId || e.parameter.user_id)) || "").trim();
      if (!targetUserId) {
        return jsonResponse({ success: false, error: "User ID is required" });
      }
      var existingData = bSheet ? bSheet.getDataRange().getValues() : [];
      var alreadyBlocked = false;
      for (var bi = 1; bi < existingData.length; bi++) {
        var existingId = String(existingData[bi][1] || "").trim().toLowerCase();
        if (existingId === targetUserId.toLowerCase()) {
          alreadyBlocked = true;
          var newReason = (e && e.parameter && e.parameter.reason);
          var newName = (e && e.parameter && (e.parameter.studentName || e.parameter.student_name));
          if (newReason) bSheet.getRange(bi + 1, 4).setValue(newReason);
          if (newName) bSheet.getRange(bi + 1, 3).setValue(newName);
          break;
        }
      }
      var bTimestamp = (e && e.parameter && e.parameter.timestamp) || new Date().toISOString();
      var bName = (e && e.parameter && (e.parameter.studentName || e.parameter.student_name)) || "";
      var bReason = (e && e.parameter && e.parameter.reason) || "Blocked by administrator";
      var bBlockedBy = (e && e.parameter && (e.parameter.blockedBy || e.parameter.blocked_by)) || "Admin";

      if (!alreadyBlocked && bSheet) {
        bSheet.appendRow([bTimestamp, targetUserId, bName, bReason, bBlockedBy]);
      }
      SpreadsheetApp.flush();
      return jsonResponse({
        success: true,
        user: {
          timestamp: bTimestamp,
          userId: targetUserId,
          studentName: bName,
          reason: bReason,
          blockedBy: bBlockedBy
        }
      });
    }

    // ----------------------------------------------------
    // GET-based Fallback for UNBLOCK_USER
    // ----------------------------------------------------
    if (action === "UNBLOCK_USER") {
      var bSS = getAdminSpreadsheet(customId);
      var bSheet = bSS ? bSS.getSheetByName("BlockedUsers") : null;
      var targetUserId = String((e && e.parameter && (e.parameter.userId || e.parameter.user_id)) || "").trim().toLowerCase();
      if (bSheet && targetUserId) {
        var existingData = bSheet.getDataRange().getValues();
        for (var bi = existingData.length - 1; bi >= 1; bi--) {
          var existingId = String(existingData[bi][1] || "").trim().toLowerCase();
          if (existingId === targetUserId) {
            bSheet.deleteRow(bi + 1);
          }
        }
        SpreadsheetApp.flush();
      }
      return jsonResponse({ success: true, userId: targetUserId });
    }

    // ----------------------------------------------------
    // GET-based Fallback for ADD_LOG
    // ----------------------------------------------------
    if (action === "ADD_LOG") {
      var logSS = getAdminSpreadsheet(customId);
      var logSheet = logSS ? (logSS.getSheetByName("Logins") || logSS.insertSheet("Logins")) : null;
      if (logSheet) {
        if (logSheet.getLastRow() === 0) {
          logSheet.appendRow(["ID", "Timestamp", "Student Name", "USN", "Email", "Status", "Device", "Reason"]);
        }
        var p = e && e.parameter ? e.parameter : {};
        logSheet.appendRow([
          p.id || ("log-" + Date.now()),
          p.timestamp || new Date().toISOString(),
          p.student_name || "Unknown User",
          p.usn || "N/A",
          p.email || "",
          p.status || "SUCCESS",
          p.device || "",
          p.reason || ""
        ]);
        SpreadsheetApp.flush();
        return jsonResponse({ success: true });
      }
    }

    var logSheet = ss ? ss.getSheetByName("Logins") : null;
    var reqSheet = ss ? ss.getSheetByName("ChangeRequests") : null;
    var setSheet = ss ? ss.getSheetByName("Settings") : null;
    var nSheet = ss ? ss.getSheetByName("Notices") : null;
    var blockSheet = ss ? ss.getSheetByName("BlockedUsers") : null;

    if (ss && !blockSheet) {
      try {
        blockSheet = ss.insertSheet("BlockedUsers");
        blockSheet.appendRow(["Timestamp", "User ID", "Student Name", "Reason", "Blocked By"]);
        var bHrInit = blockSheet.getRange(1, 1, 1, 5);
        bHrInit.setFontWeight("bold");
        bHrInit.setBackground("#FEE2E2");
        blockSheet.setFrozenRows(1);
      } catch (e) {}
    }

    var logs = logSheet ? logSheet.getDataRange().getValues() : [];
    var requests = reqSheet ? reqSheet.getDataRange().getValues() : [];
    var settings = setSheet ? setSheet.getDataRange().getValues() : [];
    var notices = nSheet ? nSheet.getDataRange().getValues() : [];
    var blocked = blockSheet ? blockSheet.getDataRange().getValues() : [];

    return jsonResponse({
      success: true,
      data: {
        logs: logs,
        requests: requests,
        settings: settings,
        notices: notices,
        blocked: blocked
      }
    });
  } catch (err) {
    return jsonResponse({
      success: false,
      error: String(err)
    });
  }
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var activeSS = getAdminSpreadsheet(body.spreadsheetId);
    if (!activeSS) {
      return jsonResponse({ success: false, error: "Could not open Admin Spreadsheet" });
    }
    
    // ----------------------------------------------------
    // 1. ADD LOGIN AUDIT LOG
    // ----------------------------------------------------
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
    
    // ----------------------------------------------------
    // 2. ADD CHANGE REQUEST
    // ----------------------------------------------------
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

    // ----------------------------------------------------
    // 2b. DELETE CHANGE REQUEST (Removes row after clicking Done)
    // ----------------------------------------------------
    if (body.action === "DELETE_REQUEST") {
      var rSS = getTargetSpreadsheet(body.spreadsheetId);
      var reqSheet = (rSS && rSS.getSheetByName("ChangeRequests")) || activeSS.getSheetByName("ChangeRequests");
      if (reqSheet) {
        var reqRows = reqSheet.getDataRange().getValues();
        var targetId = String(body.id || "").trim();
        for (var i = reqRows.length - 1; i >= 1; i--) {
          var rowId = String(reqRows[i][0] || "").trim();
          if (rowId === targetId) {
            reqSheet.deleteRow(i + 1);
            break;
          }
        }
      }
      return jsonResponse({ success: true });
    }
    
    // ----------------------------------------------------
    // 3. SET PORTAL LOCK / MAINTENANCE
    // ----------------------------------------------------
    if (body.action === "SET_LOCK") {
      var setSheet = activeSS.getSheetByName("Settings") || activeSS.insertSheet("Settings");
      setSheet.getRange("A1:B1").setValues([["is_locked", body.is_locked ? "TRUE" : "FALSE"]]);
      setSheet.getRange("A2:B2").setValues([["lock_reason", body.lock_reason || ""]]);
      SpreadsheetApp.flush();
      return jsonResponse({ success: true });
    }
    
    // ----------------------------------------------------
    // 4. SAVE TIMETABLE (Directly to Timetable Master Google Sheet)
    // ----------------------------------------------------
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
    
    // ----------------------------------------------------
    // 5. ADD EXAM DATE (Directly to Exam Dates Master Google Sheet)
    // ----------------------------------------------------
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
    
    // ----------------------------------------------------
    // 6. DELETE EXAM DATE
    // ----------------------------------------------------
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

    // ----------------------------------------------------
    // 6b. UPDATE / EDIT EXAM DATE
    // ----------------------------------------------------
    if (body.action === "UPDATE_EXAM_DATE" || body.action === "EDIT_EXAM_DATE") {
      var uSS = getTargetSpreadsheet(body.spreadsheetId);
      var uSheet = uSS.getSheetByName("ExamDates") || uSS.getSheetByName("Exams") || uSS.getSheets()[0];
      var uRows = uSheet.getDataRange().getValues();
      
      var origSem = body.originalSemester ? Number(body.originalSemester) : (body.exam ? Number(body.exam.semester) : null);
      var origCode = String(body.originalSubjectCode || (body.exam && body.exam.originalSubjectCode) || (body.exam && body.exam.subjectCode) || "").trim().toUpperCase();
      var origType = String(body.originalExamType || (body.exam && body.exam.originalExamType) || (body.exam && body.exam.examType) || "").trim().toUpperCase();
      
      var ex = body.exam || {};
      var dateFormatted = ex.date || "";
      if (dateFormatted && dateFormatted.indexOf("-") !== -1) {
        var dParts = dateFormatted.split("-");
        if (dParts.length === 3 && dParts[0].length === 4) {
          dateFormatted = dParts[2] + "-" + dParts[1] + "-" + dParts[0].slice(2);
        }
      }

      var rowUpdated = false;
      for (var ur = 1; ur < uRows.length; ur++) {
        var r = uRows[ur];
        var rowSem = Number(r[0]);
        var rowType = String(r[1] || "").trim().toUpperCase();
        var rowCode = String(r[4] || "").trim().toUpperCase();

        var match = (!origSem || rowSem === origSem) &&
                    (!origCode || rowCode === origCode) &&
                    (!origType || rowType === origType);

        if (match) {
          uSheet.getRange(ur + 1, 1, 1, 8).setValues([[
            Number(ex.semester) || rowSem || 3,
            ex.examType || r[1] || "CAE-1",
            dateFormatted || r[2],
            ex.subjectName || r[3] || "",
            ex.subjectCode || r[4] || "",
            ex.timings || r[5] || "10:00 AM - 01:00 PM",
            ex.venue || r[6] || "—",
            ex.status || r[7] || "Upcoming"
          ]]);
          rowUpdated = true;
          break;
        }
      }

      if (!rowUpdated) {
        uSheet.appendRow([
          Number(ex.semester) || 3,
          ex.examType || "CAE-1",
          dateFormatted,
          ex.subjectName || "",
          ex.subjectCode || "",
          ex.timings || "10:00 AM - 01:00 PM",
          ex.venue || "—",
          ex.status || "Upcoming"
        ]);
      }
      SpreadsheetApp.flush();
      return jsonResponse({ success: true, updated: true });
    }

function formatDateToIST(val) {
  var d;
  if (!val) {
    d = new Date();
  } else if (typeof val === "string") {
    var s = val.trim();
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) {
      s += ":00+05:30";
    }
    d = new Date(s);
    if (isNaN(d.getTime())) d = new Date();
  } else if (val instanceof Date) {
    d = val;
  } else {
    d = new Date();
  }
  return Utilities.formatDate(d, "Asia/Kolkata", "yyyy-MM-dd'T'HH:mm:ss'+05:30'");
}

    // ----------------------------------------------------
    // 7. ADD NOTICE (Saves to Google Sheet & uploads document to unique Drive folder)
    // ----------------------------------------------------
    if (body.action === "ADD_NOTICE") {
      var nSS = getNoticesSpreadsheet(body.spreadsheetId);
      if (!nSS) return jsonResponse({ success: false, error: "Could not open Notices spreadsheet." });

      var nSheet = nSS.getSheetByName("Notices");
      if (!nSheet) {
        if (nSS.getSheets().length === 1 && nSS.getSheets()[0].getLastRow() === 0) {
          nSheet = nSS.getSheets()[0];
          nSheet.setName("Notices");
        } else {
          nSheet = nSS.insertSheet("Notices");
        }
      }
      if (nSheet.getLastRow() === 0) {
        nSheet.appendRow([
          "Timestamp",
          "Notice ID",
          "Semester",
          "Title",
          "Content",
          "Links",
          "Document Name",
          "Document URL",
          "Folder ID",
          "Folder URL"
        ]);
        try {
          var hr = nSheet.getRange(1, 1, 1, 10);
          hr.setFontWeight("bold");
          hr.setBackground("#F3E8FF");
          nSheet.setFrozenRows(1);
        } catch (e) {}
      }

      var notice = body.notice || {};
      var noticeId = String(notice.id || ("NTC-" + Date.now())).trim();
      var timestamp = formatDateToIST(notice.timestamp);
      var semester = notice.semester !== undefined ? notice.semester : "ALL";
      var title = notice.title || "";
      var content = notice.content || "";
      var linksJoined = "";
      if (Array.isArray(notice.links)) {
        linksJoined = notice.links.join(", ");
      } else {
        linksJoined = String(notice.links || "");
      }

      // 1. Create unique subfolder for this notice in Google Drive
      var rootFolder = getNoticesRootFolder(body.rootFolderId);
      var noticeFolder = rootFolder.createFolder(noticeId);

      var docNames = [];
      var docUrls = [];
      var documents = [];

      // 2. Put documents into the notice folder if provided (supports multiple files)
      var inputFiles = [];
      if (Array.isArray(notice.files) && notice.files.length > 0) {
        inputFiles = notice.files;
      } else if (notice.file && notice.file.base64 && notice.file.name) {
        inputFiles = [notice.file];
      }

      for (var fi = 0; fi < inputFiles.length; fi++) {
        var fItem = inputFiles[fi];
        if (!fItem || !fItem.base64 || !fItem.name) continue;
        try {
          var cleanBase64 = String(fItem.base64).replace(/^data:[^;]+;base64,/, "");
          var fileBlob = Utilities.newBlob(
            Utilities.base64Decode(cleanBase64),
            fItem.type || "application/octet-stream",
            fItem.name
          );
          var docFile = noticeFolder.createFile(fileBlob);
          var fName = docFile.getName();
          var fUrl = "https://drive.google.com/file/d/" + docFile.getId() + "/view";
          docNames.push(fName);
          docUrls.push(fUrl);
          documents.push({ name: fName, url: fUrl });
        } catch (fErr) {
          Logger.log("Error uploading notice document #" + fi + ": " + fErr);
        }
      }

      var docNameJoined = docNames.join("\n");
      var docUrlJoined = docUrls.join("\n");

      // 3. Append row to Notices sheet
      nSheet.appendRow([
        timestamp,
        noticeId,
        semester,
        title,
        content,
        linksJoined,
        docNameJoined,
        docUrlJoined,
        noticeFolder.getId(),
        noticeFolder.getUrl()
      ]);
      SpreadsheetApp.flush();

      return jsonResponse({
        success: true,
        notice: {
          id: noticeId,
          timestamp: timestamp,
          semester: semester,
          title: title,
          content: content,
          links: linksJoined ? linksJoined.split(/[\r\n,]+/).map(function(l) { return l.trim(); }).filter(Boolean) : [],
          documentName: docNames[0] || "",
          documentUrl: docUrls[0] || "",
          documents: documents,
          folderId: noticeFolder.getId(),
          folderUrl: noticeFolder.getUrl()
        }
      });
    }

    // ----------------------------------------------------
    // 8. DELETE NOTICE
    // ----------------------------------------------------
    if (body.action === "DELETE_NOTICE") {
      var nSS = getNoticesSpreadsheet(body.spreadsheetId);
      var nSheet = nSS ? (nSS.getSheetByName("Notices") || nSS.getSheets()[0]) : null;
      if (nSheet) {
        var nRows = nSheet.getDataRange().getValues();
        var targetId = String(body.id || "").trim();
        for (var i = nRows.length - 1; i >= 1; i--) {
          var rowId = String(nRows[i][1] || "").trim();
          if (rowId === targetId) {
            var folderId = String(nRows[i][8] || "").trim();
            if (folderId && folderId.length > 5) {
              try {
                var folder = DriveApp.getFolderById(folderId);
                folder.setTrashed(true);
              } catch (e) {}
            }
            nSheet.deleteRow(i + 1);
            break;
          }
        }
        SpreadsheetApp.flush();
      }
      return jsonResponse({ success: true });
    }

    // ----------------------------------------------------
    // 8B. UPDATE / EDIT NOTICE (Updates row in Notices sheet & content in Drive folder)
    // ----------------------------------------------------
    if (body.action === "UPDATE_NOTICE" || body.action === "EDIT_NOTICE") {
      var nSS = getNoticesSpreadsheet(body.spreadsheetId);
      if (!nSS) return jsonResponse({ success: false, error: "Could not open Notices spreadsheet." });

      var nSheet = nSS.getSheetByName("Notices") || nSS.getSheets()[0];
      if (!nSheet) return jsonResponse({ success: false, error: "Notices sheet tab not found." });

      var nRows = nSheet.getDataRange().getValues();
      var targetId = String(body.id || (body.notice && body.notice.id) || "").trim();
      var targetRowIndex = -1;

      for (var i = 1; i < nRows.length; i++) {
        var rowId = String(nRows[i][1] || "").trim();
        if (rowId === targetId) {
          targetRowIndex = i + 1; // 1-based row index
          break;
        }
      }

      if (targetRowIndex === -1) {
        return jsonResponse({ success: false, error: "Notice with ID " + targetId + " not found." });
      }

      var notice = body.notice || {};
      var updatedTimestamp = notice.timestamp ? formatDateToIST(notice.timestamp) : String(nRows[targetRowIndex - 1][0] || "");
      if (notice.timestamp) {
        nSheet.getRange(targetRowIndex, 1).setValue(updatedTimestamp);
      }
      var semester = notice.semester !== undefined ? notice.semester : nRows[targetRowIndex - 1][2];
      var title = notice.title !== undefined ? notice.title : nRows[targetRowIndex - 1][3];
      var content = notice.content !== undefined ? notice.content : nRows[targetRowIndex - 1][4];
      
      var linksJoined = "";
      if (notice.links !== undefined) {
        if (Array.isArray(notice.links)) {
          linksJoined = notice.links.join(", ");
        } else {
          linksJoined = String(notice.links || "");
        }
      } else {
        linksJoined = String(nRows[targetRowIndex - 1][5] || "");
      }

      var existingFolderId = String(nRows[targetRowIndex - 1][8] || "").trim();
      var existingFolderUrl = String(nRows[targetRowIndex - 1][9] || "").trim();

      // Handle documents/files: preserve existing or add new ones
      var existingNames = String(nRows[targetRowIndex - 1][6] || "").split(/\r?\n|\|\|/).map(function(s) { return s.trim(); }).filter(Boolean);
      var existingUrls = String(nRows[targetRowIndex - 1][7] || "").split(/\r?\n|\|\|/).map(function(s) { return s.trim(); }).filter(Boolean);

      var docNames = [];
      var docUrls = [];
      var documents = [];

      if (Array.isArray(notice.documents)) {
        for (var di = 0; di < notice.documents.length; di++) {
          if (notice.documents[di] && notice.documents[di].url) {
            docNames.push(notice.documents[di].name || ("Document " + (di + 1)));
            docUrls.push(notice.documents[di].url);
            documents.push(notice.documents[di]);
          }
        }
      } else {
        docNames = existingNames;
        docUrls = existingUrls;
        for (var k = 0; k < existingUrls.length; k++) {
          documents.push({ name: existingNames[k] || ("Document " + (k + 1)), url: existingUrls[k] });
        }
      }

      // Helper to extract Google Drive file ID from a URL
      function getDriveFileIdFromUrl(u) {
        if (!u) return null;
        var s = String(u).trim();
        var m = s.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
                s.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
                s.match(/\/d\/([a-zA-Z0-9_-]+)/);
        return m ? m[1] : null;
      }

      // Collect removed / deleted files to trash from Google Drive
      var removedFileIds = [];
      var explicitDeleted = (notice && notice.deletedDocuments) || body.deletedDocuments || (notice && notice.deletedDocumentUrls) || [];
      if (Array.isArray(explicitDeleted)) {
        for (var ed = 0; ed < explicitDeleted.length; ed++) {
          var edItem = explicitDeleted[ed];
          var edUrl = typeof edItem === "string" ? edItem : (edItem && edItem.url);
          var edId = getDriveFileIdFromUrl(edUrl) || (edItem && edItem.id);
          if (edId && removedFileIds.indexOf(edId) === -1) {
            removedFileIds.push(edId);
          }
        }
      }

      // Any file previously attached that is no longer kept in docUrls
      if (Array.isArray(notice.documents)) {
        for (var eu = 0; eu < existingUrls.length; eu++) {
          var oldUrl = existingUrls[eu];
          var isKept = false;
          for (var ku = 0; ku < docUrls.length; ku++) {
            if (docUrls[ku] === oldUrl) {
              isKept = true;
              break;
            }
          }
          if (!isKept && oldUrl) {
            var fId = getDriveFileIdFromUrl(oldUrl);
            if (fId && removedFileIds.indexOf(fId) === -1) {
              removedFileIds.push(fId);
            }
          }
        }
      }

      // Trash removed files from Google Drive by File ID
      for (var rfi = 0; rfi < removedFileIds.length; rfi++) {
        try {
          var fileToTrash = DriveApp.getFileById(removedFileIds[rfi]);
          fileToTrash.setTrashed(true);
          Logger.log("Trashed removed notice file from Drive: " + removedFileIds[rfi]);
        } catch (trashErr) {
          Logger.log("Could not trash file " + removedFileIds[rfi] + ": " + trashErr);
        }
      }

      // Upload new files to the notice folder if provided
      var newFiles = [];
      if (Array.isArray(notice.files) && notice.files.length > 0) {
        newFiles = notice.files;
      } else if (notice.file && notice.file.base64 && notice.file.name) {
        newFiles = [notice.file];
      }

      if (newFiles.length > 0) {
        var noticeFolder = null;
        if (existingFolderId && existingFolderId.length > 5) {
          try {
            noticeFolder = DriveApp.getFolderById(existingFolderId);
          } catch (fe) {}
        }
        if (!noticeFolder) {
          var rootFolder = getNoticesRootFolder(body.rootFolderId);
          noticeFolder = rootFolder.createFolder(targetId);
          existingFolderId = noticeFolder.getId();
          existingFolderUrl = noticeFolder.getUrl();
        }

        for (var fi = 0; fi < newFiles.length; fi++) {
          var fItem = newFiles[fi];
          if (!fItem || !fItem.base64 || !fItem.name) continue;
          try {
            var cleanBase64 = String(fItem.base64).replace(/^data:[^;]+;base64,/, "");
            var fileBlob = Utilities.newBlob(
              Utilities.base64Decode(cleanBase64),
              fItem.type || "application/octet-stream",
              fItem.name
            );
            var docFile = noticeFolder.createFile(fileBlob);
            var fName = docFile.getName();
            var fUrl = "https://drive.google.com/file/d/" + docFile.getId() + "/view";
            docNames.push(fName);
            docUrls.push(fUrl);
            documents.push({ name: fName, url: fUrl });
          } catch (fErr) {
            Logger.log("Error uploading notice document #" + fi + ": " + fErr);
          }
        }
      }

      var docNameJoined = docNames.join("\n");
      var docUrlJoined = docUrls.join("\n");

      // Also clean up notice folder: trash files matching removed IDs
      if (existingFolderId && existingFolderId.length > 5) {
        try {
          var nFolderCheck = DriveApp.getFolderById(existingFolderId);
          if (nFolderCheck) {
            var nFolderFiles = nFolderCheck.getFiles();
            while (nFolderFiles.hasNext()) {
              var nff = nFolderFiles.next();
              var nffId = nff.getId();
              if (removedFileIds.indexOf(nffId) !== -1) {
                try { nff.setTrashed(true); } catch (e) {}
              } else if (docUrls.length === 0 && (!newFiles || newFiles.length === 0)) {
                try { nff.setTrashed(true); } catch (e) {}
              }
            }
          }
        } catch (cleanFolderErr) {
          Logger.log("Error cleaning notice folder: " + cleanFolderErr);
        }
      }

      // Update row in sheet: Semester (Col C/3), Title (Col D/4), Content (Col E/5), Links (Col F/6), Document Name (Col G/7), Document URL (Col H/8), Folder ID (Col I/9), Folder URL (Col J/10)
      nSheet.getRange(targetRowIndex, 3, 1, 8).setValues([[
        semester,
        title,
        content,
        linksJoined,
        docNameJoined,
        docUrlJoined,
        existingFolderId,
        existingFolderUrl
      ]]);
      SpreadsheetApp.flush();

      return jsonResponse({
        success: true,
        notice: {
          id: targetId,
          timestamp: updatedTimestamp,
          semester: semester,
          title: title,
          content: content,
          links: linksJoined ? linksJoined.split(/[\r\n,]+/).map(function(s){return s.trim();}).filter(Boolean) : [],
          documents: documents,
          documentName: docNames[0] || "",
          documentUrl: docUrls[0] || "",
          folderId: existingFolderId,
          folderUrl: existingFolderUrl
        }
      });
    }
    
    // ----------------------------------------------------
    // 9. BLOCK USER ID (Stored in 'BlockedUsers' tab of Admin Google Sheet)
    // ----------------------------------------------------
    if (body.action === "BLOCK_USER") {
      var blockSheet = activeSS.getSheetByName("BlockedUsers");
      if (!blockSheet) {
        blockSheet = activeSS.insertSheet("BlockedUsers");
        blockSheet.appendRow(["Timestamp", "User ID", "Student Name", "Reason", "Blocked By"]);
        try {
          var bHr = blockSheet.getRange(1, 1, 1, 5);
          bHr.setFontWeight("bold");
          bHr.setBackground("#FEE2E2");
          blockSheet.setFrozenRows(1);
        } catch (e) {}
      }

      var targetUserId = String(body.userId || body.user_id || "").trim();
      if (!targetUserId) {
        return jsonResponse({ success: false, error: "User ID is required" });
      }

      var existingData = blockSheet.getDataRange().getValues();
      var alreadyBlocked = false;
      for (var bi = 1; bi < existingData.length; bi++) {
        var existingId = String(existingData[bi][1] || "").trim().toLowerCase();
        if (existingId === targetUserId.toLowerCase()) {
          alreadyBlocked = true;
          if (body.reason) {
            blockSheet.getRange(bi + 1, 4).setValue(body.reason);
          }
          if (body.studentName || body.student_name) {
            blockSheet.getRange(bi + 1, 3).setValue(body.studentName || body.student_name);
          }
          break;
        }
      }

      var bTimestamp = body.timestamp || new Date().toISOString();
      var bName = body.studentName || body.student_name || "";
      var bReason = body.reason || "Blocked by administrator";
      var bBlockedBy = body.blockedBy || body.blocked_by || "Admin";

      if (!alreadyBlocked) {
        blockSheet.appendRow([bTimestamp, targetUserId, bName, bReason, bBlockedBy]);
      }
      SpreadsheetApp.flush();

      return jsonResponse({
        success: true,
        user: {
          timestamp: bTimestamp,
          userId: targetUserId,
          studentName: bName,
          reason: bReason,
          blockedBy: bBlockedBy
        }
      });
    }

    // ----------------------------------------------------
    // 10. UNBLOCK USER ID (Removes row from 'BlockedUsers' tab)
    // ----------------------------------------------------
    if (body.action === "UNBLOCK_USER") {
      var blockSheet = activeSS.getSheetByName("BlockedUsers");
      var targetUserId = String(body.userId || body.user_id || "").trim().toLowerCase();
      if (blockSheet && targetUserId) {
        var existingData = blockSheet.getDataRange().getValues();
        for (var bi = existingData.length - 1; bi >= 1; bi--) {
          var existingId = String(existingData[bi][1] || "").trim().toLowerCase();
          if (existingId === targetUserId) {
            blockSheet.deleteRow(bi + 1);
          }
        }
        SpreadsheetApp.flush();
      }
      return jsonResponse({ success: true, userId: body.userId });
    }

    // ----------------------------------------------------
    // 11. UPLOAD SEMESTER DATA FILE(S) TO GOOGLE DRIVE
    // ----------------------------------------------------
    if (body.action === "UPLOAD_SEMESTER_FILES" || body.action === "UPLOAD_SEMESTER_FILE") {
      var targetSem = Number(body.semester) || 3;
      var targetFolderId = body.folderId || (SEMESTER_DRIVE_FOLDERS && SEMESTER_DRIVE_FOLDERS[targetSem]) || null;
      if (!targetFolderId) {
        return jsonResponse({ success: false, error: "No target folder ID found for Semester " + targetSem });
      }

      var targetFolder = null;
      try {
        targetFolder = DriveApp.getFolderById(targetFolderId);
      } catch (fErr) {
        return jsonResponse({ success: false, error: "Could not open Google Drive folder: " + fErr.toString() });
      }

      // Files ALWAYS go directly into the root semester folder (NO subject subfolders)
      var uploadFolder = targetFolder;

      // Auto-flatten: If any files were previously placed in subfolders (e.g. 'DSA'), move them up to the root folder & trash the empty subfolders
      try {
        var existingSubs = targetFolder.getFolders();
        while (existingSubs.hasNext()) {
          var sub = existingSubs.next();
          var subFiles = sub.getFiles();
          while (subFiles.hasNext()) {
            var sf = subFiles.next();
            targetFolder.addFile(sf);
            sub.removeFile(sf);
          }
          sub.setTrashed(true);
        }
      } catch (cleanErr) {
        Logger.log("Auto-flatten note: " + cleanErr);
      }

      var uploadedFiles = [];
      var inputFiles = [];
      if (Array.isArray(body.files) && body.files.length > 0) {
        inputFiles = body.files;
      } else if (body.file && body.file.base64 && body.file.name) {
        inputFiles = [body.file];
      }

      for (var ufi = 0; ufi < inputFiles.length; ufi++) {
        var ufItem = inputFiles[ufi];
        if (!ufItem || !ufItem.base64 || !ufItem.name) continue;
        try {
          var cleanBase64 = String(ufItem.base64).replace(/^data:[^;]+;base64,/, "");
          var fileBlob = Utilities.newBlob(
            Utilities.base64Decode(cleanBase64),
            ufItem.type || "application/octet-stream",
            ufItem.name
          );
          var newFile = uploadFolder.createFile(fileBlob);
          try {
            newFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          } catch (nfErr) {}

          var formatted = formatDriveFile(newFile, targetSem, uploadFolder.getName());
          uploadedFiles.push(formatted);
        } catch (uErr) {
          Logger.log("Error uploading semester file #" + ufi + ": " + uErr);
        }
      }

      return jsonResponse({
        success: true,
        files: uploadedFiles,
        folderName: uploadFolder.getName(),
        folderUrl: uploadFolder.getUrl(),
        count: uploadedFiles.length
      });
    }

    // ----------------------------------------------------
    // 12. DELETE SEMESTER DATA FILE FROM GOOGLE DRIVE
    // ----------------------------------------------------
    if (body.action === "DELETE_SEMESTER_FILE") {
      var fileId = body.fileId;
      if (!fileId) {
        return jsonResponse({ success: false, error: "Missing fileId parameter" });
      }
      try {
        var fileToTrash = DriveApp.getFileById(fileId);
        fileToTrash.setTrashed(true);
        return jsonResponse({ success: true, fileId: fileId, message: "File trashed successfully" });
      } catch (trErr) {
        return jsonResponse({ success: false, error: "Failed to trash file: " + trErr.toString() });
      }
    }

    // ----------------------------------------------------
    // 13. FLATTEN SEMESTER FOLDERS (Moves files out of any subfolders directly into root)
    // ----------------------------------------------------
    if (body.action === "FLATTEN_SEMESTER_FILES" || body.action === "FLATTEN_SEMESTER_FOLDER") {
      var flatSem = Number(body.semester) || 3;
      var fFolderId = body.folderId || (SEMESTER_DRIVE_FOLDERS && SEMESTER_DRIVE_FOLDERS[flatSem]) || null;
      var movedCount = 0;
      if (fFolderId) {
        try {
          var semRoot = DriveApp.getFolderById(fFolderId);
          var subFolders = semRoot.getFolders();
          while (subFolders.hasNext()) {
            var subF = subFolders.next();
            var sfList = subF.getFiles();
            while (sfList.hasNext()) {
              var oneFile = sfList.next();
              semRoot.addFile(oneFile);
              subF.removeFile(oneFile);
              movedCount++;
            }
            subF.setTrashed(true);
          }
        } catch (fErr) {
          return jsonResponse({ success: false, error: fErr.toString() });
        }
      }
      return jsonResponse({ success: true, movedCount: movedCount });
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

// ----------------------------------------------------
// GOOGLE DRIVE SEMESTER FILES RETRIEVER
// ----------------------------------------------------
function getSemesterDriveFolderConfig() {
  return {
    1: getScriptProperty("SEMESTER_1_DRIVE_FOLDER_ID", ""),
    2: getScriptProperty("SEMESTER_2_DRIVE_FOLDER_ID", ""),
    3: getScriptProperty("SEMESTER_3_DRIVE_FOLDER_ID", "")
  };
}

function getSemesterFilesFromDrive(targetFolderId, requestedSem) {
  var results = [];
  var errors = [];
  var folderName = "";
  var semesterFolders = getSemesterDriveFolderConfig();

  try {
    var targets = [];
    if (targetFolderId && String(targetFolderId).trim().length > 10) {
      targets.push({ id: String(targetFolderId).trim(), sem: requestedSem || 3 });
    } else if (requestedSem && semesterFolders[requestedSem] && semesterFolders[requestedSem].length > 10) {
      targets.push({ id: semesterFolders[requestedSem], sem: requestedSem });
    } else {
      for (var s in semesterFolders) {
        if (semesterFolders[s] && semesterFolders[s].length > 10) {
          targets.push({ id: semesterFolders[s], sem: Number(s) });
        }
      }
    }

    for (var i = 0; i < targets.length; i++) {
      var item = targets[i];
      try {
        var folder = DriveApp.getFolderById(item.id);
        var sem = item.sem;
        folderName = folder.getName();

        // 1. Files in the semester folder directly
        var directFiles = folder.getFiles();
        while (directFiles.hasNext()) {
          var f = directFiles.next();
          if (f.isTrashed()) continue;
          results.push(formatDriveFile(f, sem, folderName));
        }

        // 2. Files in subfolders (e.g. subject folders or units)
        var subFolders = folder.getFolders();
        while (subFolders.hasNext()) {
          var sub = subFolders.next();
          var subFiles = sub.getFiles();
          while (subFiles.hasNext()) {
            var sf = subFiles.next();
            if (sf.isTrashed()) continue;
            results.push(formatDriveFile(sf, sem, sub.getName()));
          }
        }
      } catch (fErr) {
        errors.push("Folder " + item.id + " error: " + fErr.toString());
      }
    }
  } catch (err) {
    errors.push("General DriveApp error: " + err.toString());
  }
  return { files: results, folderName: folderName, errors: errors };
}

/**
 * Run this function directly inside Google Apps Script editor
 * to move any files trapped in subfolders (e.g. 'DSA') directly into the root semester folder
 * and delete the empty subfolders!
 */
function flattenSemesterFolders(customFolderMap) {
  var folders = customFolderMap || getSemesterDriveFolderConfig();
  for (var s in folders) {
    if (!folders[s] || folders[s].length <= 10) continue;
    try {
      var root = DriveApp.getFolderById(folders[s]);
      var subs = root.getFolders();
      while (subs.hasNext()) {
        var sub = subs.next();
        var files = sub.getFiles();
        while (files.hasNext()) {
          var f = files.next();
          root.addFile(f);
          sub.removeFile(f);
          Logger.log("Moved file: " + f.getName() + " to root folder: " + root.getName());
        }
        sub.setTrashed(true);
        Logger.log("Trashed subfolder: " + sub.getName());
      }
    } catch (e) {
      Logger.log("Flatten semester " + s + " error: " + e);
    }
  }
  Logger.log("Finished flattening all semester folders! All files are now in the root semester folders.");
}

/**
 * 1. SELECT THIS FUNCTION IN TOOLBAR AND CLICK 'RUN'
 * Automatically sets all semester folders and all existing files inside them
 * to "Anyone with the link: Viewer".
 * This immediately eliminates the "403 Forbidden" error on file downloads!
 */
function makeDriveFoldersPublic(customFolderIds) {
  var folderIds = Array.isArray(customFolderIds) && customFolderIds.length > 0 ? customFolderIds : [];
  if (folderIds.length === 0) {
    var semFolders = getSemesterDriveFolderConfig();
    for (var k in semFolders) {
      if (semFolders[k] && semFolders[k].length > 10) folderIds.push(semFolders[k]);
    }
    var noticesRoot = getNoticesRootFolder();
    if (noticesRoot) folderIds.push(noticesRoot.getId());
  }

  folderIds.forEach(function(fid) {
    try {
      var folder = DriveApp.getFolderById(fid);
      folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      Logger.log("Folder '" + folder.getName() + "' set to ANYONE_WITH_LINK.");

      var files = folder.getFiles();
      var count = 0;
      while (files.hasNext()) {
        var f = files.next();
        f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        count++;
      }
      Logger.log("Updated " + count + " files in '" + folder.getName() + "'.");

      var subFolders = folder.getFolders();
      while (subFolders.hasNext()) {
        var sub = subFolders.next();
        sub.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        var subFiles = sub.getFiles();
        while (subFiles.hasNext()) {
          var sf = subFiles.next();
          sf.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        }
      }
    } catch (e) {
      Logger.log("Folder " + fid + " update error: " + e.toString());
    }
  });
  Logger.log("All semester folders & files are now shared with Anyone With Link!");
}

/**
 * Run this function directly inside the Google Apps Script editor
 * to test that files are found!
 */
function testDriveAccess(folderId, sem) {
  var targetFolderId = folderId || getSemesterDriveFolderConfig()[sem || 3];
  var testSem3 = getSemesterFilesFromDrive(targetFolderId, sem || 3);
  Logger.log("Semester " + (sem || 3) + " Files: " + JSON.stringify(testSem3));
  return testSem3;
}

function formatDriveFile(file, semester, folderName) {
  var id = file.getId();
  try {
    if (file.getSharingAccess() !== DriveApp.Access.ANYONE_WITH_LINK) {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    }
  } catch (e) {}

  return {
    id: id,
    name: file.getName(),
    semester: semester,
    folderName: folderName,
    mimeType: file.getMimeType(),
    size: file.getSize(),
    lastUpdated: file.getLastUpdated().toISOString(),
    viewUrl: file.getUrl(),
    previewUrl: "https://drive.google.com/file/d/" + id + "/preview",
    downloadUrl: "https://drive.google.com/uc?export=download&id=" + id + "&confirm=t"
  };
}

// ----------------------------------------------------
// NOTICES GOOGLE DRIVE ROOT FOLDER
// ----------------------------------------------------
function getNoticesRootFolderId() {
  return getScriptProperty("NOTICES_ROOT_FOLDER_ID", "");
}

function getNoticesRootFolder(customFolderId) {
  var folderId = (customFolderId && String(customFolderId).trim().length > 10) ? String(customFolderId).trim() : getNoticesRootFolderId();
  if (folderId && folderId.length > 10) {
    try {
      return DriveApp.getFolderById(folderId);
    } catch (e) {
      Logger.log("getNoticesRootFolder ID " + folderId + " failed: " + e);
    }
  }
  try {
    var folders = DriveApp.getFoldersByName("Student Portal Notices");
    if (folders.hasNext()) {
      return folders.next();
    }
    var newFolder = DriveApp.createFolder("Student Portal Notices");
    newFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return newFolder;
  } catch (err) {
    Logger.log("getNoticesRootFolder default failed: " + err);
    return DriveApp.getRootFolder();
  }
}

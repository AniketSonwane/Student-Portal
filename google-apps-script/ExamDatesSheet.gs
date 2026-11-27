/**
 * Google Apps Script for EXAM DATES SPREADSHEET
 * 
 * Paste this in:
 * Extensions > Apps Script INSIDE your Exam Dates Google Spreadsheet
 *
 * HOW TO DEPLOY:
 * 1. Open your Exam Dates Google Spreadsheet.
 * 2. Click Extensions > Apps Script.
 * 3. Delete any code inside and paste this file.
 * 4. Click "Deploy" > "New deployment".
 * 5. Select type: "Web app" (gear icon).
 * 6. Set Description: "Exam Dates Sync API".
 * 7. Set "Execute as: Me".
 * 8. Set "Who has access: Anyone".
 * 9. Click "Deploy" and authorize permissions.
 * 10. Copy the Web App URL!
 */

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("ExamDates") || ss.getSheetByName("Exams") || ss.getSheetByName("Sheet1") || ss.getSheets()[0];
  var data = sheet.getDataRange().getValues();
  
  var targetSem = (e && e.parameter && e.parameter.semester) ? Number(e.parameter.semester) : null;
  
  if (targetSem) {
    var filtered = [data[0]];
    for (var i = 1; i < data.length; i++) {
      if (Number(data[i][0]) === targetSem) {
        filtered.push(data[i]);
      }
    }
    return jsonResponse({ success: true, semester: targetSem, data: filtered });
  }
  
  return jsonResponse({ success: true, data: data });
}

function doPost(e) {
  try {
    var contents = e.postData.contents;
    var body = JSON.parse(contents);
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("ExamDates") || ss.getSheetByName("Exams") || ss.getSheetByName("Sheet1") || ss.getSheets()[0];
    
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Semester",
        "Exam Type",
        "Date",
        "Subject Name",
        "Subject Code",
        "Timings",
        "Venue",
        "Status"
      ]);
    }
    
    // ----------------------------------------------------
    // 1. ADD EXAM DATE
    // ----------------------------------------------------
    if (body.action === "ADD_EXAM_DATE" || body.exam) {
      var ex = body.exam || body;
      var dateFormatted = ex.date || "";
      
      // Convert YYYY-MM-DD -> DD-MM-YY to match existing sheet convention (e.g. 26-10-26)
      if (dateFormatted && dateFormatted.indexOf("-") !== -1) {
        var dParts = dateFormatted.split("-");
        if (dParts.length === 3 && dParts[0].length === 4) {
          dateFormatted = dParts[2] + "-" + dParts[1] + "-" + dParts[0].slice(2);
        }
      }
      
      sheet.appendRow([
        Number(ex.semester) || 3,
        ex.examType || "CAE-1",
        dateFormatted,
        ex.subjectName || "",
        ex.subjectCode || "",
        ex.timings || "10:00 AM - 01:00 PM",
        ex.venue || "—",
        ex.status || "Upcoming"
      ]);
      
      return jsonResponse({
        success: true,
        message: "Exam date added successfully for " + ex.subjectCode
      });
    }
    
    // ----------------------------------------------------
    // 2. DELETE EXAM DATE
    // ----------------------------------------------------
    if (body.action === "DELETE_EXAM_DATE") {
      var examRows = sheet.getDataRange().getValues();
      var targetSem = body.semester ? Number(body.semester) : null;
      var targetCode = (body.subjectCode || "").trim().toUpperCase();
      var deleted = false;
      
      for (var er = examRows.length - 1; er >= 1; er--) {
        var eRow = examRows[er];
        var matchSem = !targetSem || Number(eRow[0]) === targetSem;
        var matchCode = !targetCode || String(eRow[4]).trim().toUpperCase() === targetCode;
        
        if (matchSem && matchCode) {
          sheet.deleteRow(er + 1);
          deleted = true;
          break;
        }
      }
      
      return jsonResponse({
        success: true,
        deleted: deleted,
        message: deleted ? "Exam deleted successfully" : "Exam not found in sheet"
      });
    }
    
    return jsonResponse({ success: true, message: "Action processed" });
    
  } catch (err) {
    return jsonResponse({
      success: false,
      error: err.toString()
    });
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

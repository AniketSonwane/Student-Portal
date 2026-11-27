/**
 * Google Apps Script for TIMETABLE SPREADSHEET
 * 
 * Paste this in:
 * Extensions > Apps Script INSIDE your Timetable Google Spreadsheet
 *
 * HOW TO DEPLOY:
 * 1. Open your Timetable Google Spreadsheet.
 * 2. Click Extensions > Apps Script.
 * 3. Delete any code inside and paste this file.
 * 4. Click "Deploy" > "New deployment".
 * 5. Select type: "Web app" (gear icon).
 * 6. Set Description: "Timetable Sync API".
 * 7. Set "Execute as: Me".
 * 8. Set "Who has access: Anyone".
 * 9. Click "Deploy" and authorize permissions.
 * 10. Copy the Web App URL!
 */

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Timetable") || ss.getSheetByName("Sheet1") || ss.getSheets()[0];
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
    var sheet = ss.getSheetByName("Timetable") || ss.getSheetByName("Sheet1") || ss.getSheets()[0];
    
    var targetSem = Number(body.semester) || 3;
    var schedule = body.schedule || [];
    
    var existingData = sheet.getDataRange().getValues();
    var defaultHeader = [
      "Semester",
      "Day",
      "Period",
      "Timings",
      "Subject Code",
      "Subject Name",
      "Room",
      "Faculty",
      "Type"
    ];
    
    var header = (existingData.length > 0 && existingData[0].length >= 9) 
      ? existingData[0] 
      : defaultHeader;
    
    // 1. Preserve all existing rows for OTHER semesters (e.g. Sem 1 and Sem 2 when updating Sem 3)
    var otherSemRows = [];
    for (var r = 1; r < existingData.length; r++) {
      var row = existingData[r];
      if (!row || row.length === 0 || row[0] === "" || row[0] === null) continue;
      
      var rowSem = parseInt(String(row[0]).replace(/\D/g, ""), 10);
      if (rowSem !== targetSem) {
        otherSemRows.push(row);
      }
    }
    
    // 2. Build new rows for the updated semester from the website schedule
    var newSemRows = [];
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
    
    // 3. Combine: Header + other semesters rows + updated semester rows
    var finalRows = [header].concat(otherSemRows).concat(newSemRows);
    
    // 4. Overwrite sheet cleanly
    sheet.clearContents();
    sheet.getRange(1, 1, finalRows.length, header.length).setValues(finalRows);
    
    return jsonResponse({
      success: true,
      updatedSemester: targetSem,
      totalRows: finalRows.length,
      message: "Semester " + targetSem + " timetable updated successfully"
    });
    
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

/**
 * ClaimDataTracker — backend
 * =============================================================================
 * Paste this into Extensions -> Apps Script on your Google Sheet, then
 * Deploy -> New deployment -> Web app.
 *
 *   Execute as:      Me
 *   Who has access:  Anyone
 *
 * "Anyone" sounds alarming, but it only means Google will let the request
 * through to this script. THIS script then decides. Every single request must
 * carry a valid Google ID token belonging to an email in ALLOWED_EMAILS below,
 * and that check runs here on Google's servers where nobody can edit it.
 * A stranger hitting the URL gets {"error":"unauthorised"} and nothing else.
 * =============================================================================
 */

// ---------------------------------------------------------------------------
// 1. WHO IS ALLOWED IN.  Put the exact Gmail addresses of your staff here.
//    This is the real access control for the whole app.
// ---------------------------------------------------------------------------
const ALLOWED_EMAILS = [
  "owner@example.com",       // <-- replace with your email
  "manager@example.com",     // <-- add / remove lines as needed
  "inspector@example.com"
];

// ---------------------------------------------------------------------------
// 2. Your OAuth Client ID (same one you put in index.html).
//    Used to confirm the token was issued for THIS app, not some other site.
// ---------------------------------------------------------------------------
const CLIENT_ID = "";  // e.g. "1234567890-abcdef.apps.googleusercontent.com"

const SHEET_NAME = "Main";

const HEADERS = ["WC_ID","S No","ClaimDate","CustomerName","CustomerMobile",
  "Company","TyreGroup","TyreItem","SerialNumber","ProblemDescription",
  "DocketNumber","CompanySentDate","Result","ApprovedAmount",
  "CustomerContribution","NewTyreReceivedDate","NewTyreGivenDate",
  "CompanyReturnDate","ReturnedToCustomerDate","Remark"];

// sheet header "S No" -> app field "S_No"; everything else matches 1:1
const FIELD_MAP = { "S No": "S_No" };
function fieldFor(header) { return FIELD_MAP[header] || header; }


// =============================================================================
// AUTH
// =============================================================================

/**
 * Verifies a Google ID token and returns the email, or null if anything is off.
 * Google does the cryptographic verification for us at the tokeninfo endpoint.
 */
function verifyToken_(idToken) {
  if (!idToken) return null;
  try {
    const res = UrlFetchApp.fetch(
      "https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(idToken),
      { muteHttpExceptions: true }
    );
    if (res.getResponseCode() !== 200) return null;

    const info = JSON.parse(res.getContentText());

    // Token must have been issued for this app.
    if (CLIENT_ID && info.aud !== CLIENT_ID) return null;

    // Token must be from Google and not expired.
    if (info.iss !== "accounts.google.com" && info.iss !== "https://accounts.google.com") return null;
    if (info.exp && (parseInt(info.exp, 10) * 1000) < Date.now()) return null;

    // Email must be verified by Google.
    if (info.email_verified !== "true" && info.email_verified !== true) return null;

    return String(info.email || "").toLowerCase();
  } catch (err) {
    return null;
  }
}

function isAllowed_(email) {
  if (!email) return false;
  return ALLOWED_EMAILS.map(function (e) { return e.trim().toLowerCase(); }).indexOf(email) !== -1;
}


// =============================================================================
// ENTRY POINTS
// =============================================================================

function doPost(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ error: "bad_request" });
  }

  var email = verifyToken_(body.idToken);
  if (!isAllowed_(email)) {
    return json_({ error: "unauthorised" });
  }

  var sh = getSheet_();

  switch (body.action) {
    case "list":
      return json_({ rows: readAll_(sh), you: email });
    case "create":
      appendRow_(sh, body.row);
      return json_({ ok: true });
    case "update":
      updateRow_(sh, body.row);
      return json_({ ok: true });
    case "delete":
      deleteRow_(sh, body.id);
      return json_({ ok: true });
    default:
      return json_({ error: "unknown_action" });
  }
}

// A plain GET is only used to check the deployment is alive.
function doGet() {
  return json_({ ok: true, service: "ClaimDataTracker", note: "POST with a valid idToken to use this API." });
}


// =============================================================================
// SHEET I/O
// =============================================================================

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADERS);
  }
  if (sh.getLastRow() === 0) sh.appendRow(HEADERS);
  return sh;
}

function readAll_(sh) {
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  var header = values[0];
  var tz = Session.getScriptTimeZone();
  var rows = [];

  for (var r = 1; r < values.length; r++) {
    if (!values[r][0]) continue;                 // skip blank rows
    var obj = {};
    for (var c = 0; c < header.length; c++) {
      var v = values[r][c];
      if (v instanceof Date) v = Utilities.formatDate(v, tz, "yyyy-MM-dd");
      obj[fieldFor(header[c])] = (v === null || v === undefined) ? "" : String(v);
    }
    rows.push(obj);
  }
  return rows;
}

function rowArray_(sh, obj) {
  var header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  return header.map(function (h) {
    var v = obj[fieldFor(h)];
    return (v === null || v === undefined) ? "" : v;
  });
}

function appendRow_(sh, obj) {
  sh.appendRow(rowArray_(sh, obj));
}

function findRow_(sh, id) {
  var ids = sh.getRange(1, 1, sh.getLastRow(), 1).getValues();
  for (var r = 1; r < ids.length; r++) {
    if (String(ids[r][0]) === String(id)) return r + 1;   // 1-indexed sheet row
  }
  return -1;
}

function updateRow_(sh, obj) {
  var line = rowArray_(sh, obj);
  var r = findRow_(sh, obj.WC_ID);
  if (r === -1) sh.appendRow(line);
  else sh.getRange(r, 1, 1, line.length).setValues([line]);
}

function deleteRow_(sh, id) {
  var r = findRow_(sh, id);
  if (r !== -1) sh.deleteRow(r);
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

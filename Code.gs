/**
 * Suleco Before-After Photo Contest — backend (Google Apps Script)
 * Bind this script to the Google Sheet "Suleco Before-After Contest - Data",
 * then Deploy > New deployment > Web app
 *   Execute as: Me
 *   Who has access: Anyone
 * Copy the resulting /exec URL into index.html (CONFIG.WEBAPP_URL).
 *
 * One-time setup: run `setAdminPassword` once from the Apps Script editor
 * (Run menu) after changing the password below, or set the script property
 * ADMIN_PASSWORD manually under Project Settings > Script properties.
 */

const SHEET_NAME = 'DangKy';
const DRIVE_FOLDER_NAME = 'Suleco BA Contest - Anh';
const HEADERS = ['Timestamp', 'ID', 'HoTen', 'HangMuc', 'LinkFacebook',
  'AnhTruocUrl', 'AnhSauUrl', 'SoLike', 'SoShare', 'DiemBTC', 'TrangThai', 'GhiChu', 'SoComment', 'DongYSuDungAnh'];

function nowVietnam_() {
  // Ghi timestamp dạng chuỗi giờ Việt Nam cố định, không phụ thuộc múi giờ
  // cấu hình trong Google Sheet (tránh lệch giờ khi Sheet để múi giờ khác).
  return Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm:ss');
}

function setAdminPassword() {
  // Run this once manually, after editing the password string below.
  PropertiesService.getScriptProperties().setProperty('ADMIN_PASSWORD', 'DoiMatKhauNay123');
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
  } else {
    // Tự thêm cột header còn thiếu (ví dụ khi mới thêm SoComment) mà không đụng dữ liệu cũ.
    const lastCol = sheet.getLastColumn();
    if (lastCol < HEADERS.length) {
      sheet.getRange(1, lastCol + 1, 1, HEADERS.length - lastCol).setValues([HEADERS.slice(lastCol)]);
    }
  }
  return sheet;
}

function getHeaderMap_(sheet) {
  // Đọc đúng tiêu đề thực tế trong Sheet để tìm cột theo TÊN thay vì số thứ tự
  // cố định — an toàn kể cả khi ai đó kéo đổi vị trí cột trong Google Sheet.
  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const map = {};
  headers.forEach((h, i) => { if (h) map[h] = i + 1; });
  return map;
}

function getFolder_() {
  const it = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
  if (it.hasNext()) return it.next();
  return DriveApp.createFolder(DRIVE_FOLDER_NAME);
}

function getOrCreateSubfolder_(parent, name) {
  const it = parent.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  return parent.createFolder(name);
}

function sanitizeName_(s) {
  return (s || '').toString().replace(/[\/\\:*?"<>|]/g, '-').trim();
}

// Root > Hạng mục (Chân dung / Phong cảnh) > Tên người dự thi
function getContestantFolder_(hoTen, hangMuc) {
  const root = getFolder_();
  const catFolder = getOrCreateSubfolder_(root, sanitizeName_(hangMuc));
  return getOrCreateSubfolder_(catFolder, sanitizeName_(hoTen));
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function checkAdmin_(password) {
  const real = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD');
  return real && password && password === real;
}

function saveImage_(folder, fileObj, baseName) {
  // fileObj: { name, mimeType, data (base64, no data-url prefix) }
  if (!fileObj || !fileObj.data) return '';
  const bytes = Utilities.base64Decode(fileObj.data);
  const ext = (fileObj.name && fileObj.name.indexOf('.') > -1)
    ? fileObj.name.substring(fileObj.name.lastIndexOf('.'))
    : '';
  const blob = Utilities.newBlob(bytes, fileObj.mimeType || 'image/jpeg', baseName + ext);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return 'https://drive.google.com/uc?export=view&id=' + file.getId();
}

function rowToObject_(headers, row) {
  const obj = {};
  headers.forEach((h, i) => obj[h] = row[i]);
  return obj;
}

function doGet(e) {
  const action = e.parameter.action || 'list';
  if (action === 'list') {
    const sheet = getSheet_();
    const values = sheet.getDataRange().getValues();
    const headers = values.shift();
    const rows = values
      .filter(r => r[1]) // has ID
      .map(r => rowToObject_(headers, r));
    return jsonOut_({ ok: true, data: rows });
  }
  return jsonOut_({ ok: false, error: 'Unknown action' });
}

function doPost(e) {
  let payload;
  try {
    payload = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonOut_({ ok: false, error: 'Invalid JSON body' });
  }

  const action = payload.action;

  if (action === 'register') {
    return handleRegister_(payload);
  }
  if (action === 'adminLogin') {
    return jsonOut_({ ok: checkAdmin_(payload.password) });
  }
  if (action === 'adminUpdate') {
    return handleAdminUpdate_(payload);
  }
  if (action === 'adminDelete') {
    return handleAdminDelete_(payload);
  }
  if (action === 'adminDeleteBulk') {
    return handleAdminDeleteBulk_(payload);
  }
  return jsonOut_({ ok: false, error: 'Unknown action' });
}

function handleRegister_(payload) {
  const hoTen = (payload.hoTen || '').toString().trim();
  const hangMuc = (payload.hangMuc || '').toString().trim();
  const linkFacebook = (payload.linkFacebook || '').toString().trim();

  if (!hoTen || !hangMuc || !linkFacebook) {
    return jsonOut_({ ok: false, error: 'Thiếu thông tin bắt buộc' });
  }
  if (!payload.anhTruoc || !payload.anhSau) {
    return jsonOut_({ ok: false, error: 'Thiếu ảnh Trước/Sau' });
  }
  if (payload.dongYSuDungAnh !== true) {
    return jsonOut_({ ok: false, error: 'Cần đồng ý cho Suleco sử dụng hình ảnh cho mục đích truyền thông' });
  }

  const id = Utilities.getUuid();
  const folder = getContestantFolder_(hoTen, hangMuc);
  const baseName = sanitizeName_(hoTen) + ' - ' + sanitizeName_(hangMuc);

  const anhTruocUrl = saveImage_(folder, payload.anhTruoc, baseName + ' - Truoc');
  const anhSauUrl = saveImage_(folder, payload.anhSau, baseName + ' - Sau');

  const sheet = getSheet_();
  const map = getHeaderMap_(sheet);
  const row = new Array(sheet.getLastColumn()).fill('');
  const setCol = (name, value) => { if (map[name]) row[map[name] - 1] = value; };
  setCol('Timestamp', nowVietnam_());
  setCol('ID', id);
  setCol('HoTen', hoTen);
  setCol('HangMuc', hangMuc);
  setCol('LinkFacebook', linkFacebook);
  setCol('AnhTruocUrl', anhTruocUrl);
  setCol('AnhSauUrl', anhSauUrl);
  setCol('SoLike', 0);
  setCol('SoShare', 0);
  setCol('SoComment', 0);
  setCol('DiemBTC', 0);
  setCol('TrangThai', 'Chờ duyệt');
  setCol('GhiChu', '');
  setCol('DongYSuDungAnh', 'Có');
  sheet.appendRow(row);

  return jsonOut_({ ok: true, id: id });
}

function findRowById_(sheet, id) {
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][1] === id) return i + 1; // 1-indexed row number
  }
  return -1;
}

function handleAdminUpdate_(payload) {
  if (!checkAdmin_(payload.password)) {
    return jsonOut_({ ok: false, error: 'Sai mật khẩu admin' });
  }
  const sheet = getSheet_();
  const rowNum = findRowById_(sheet, payload.id);
  if (rowNum === -1) {
    return jsonOut_({ ok: false, error: 'Không tìm thấy bài đăng ký' });
  }
  const map = getHeaderMap_(sheet);
  const fieldNames = ['SoLike', 'SoShare', 'SoComment', 'DiemBTC', 'TrangThai', 'GhiChu'];
  fieldNames.forEach(key => {
    if (payload.fields && Object.prototype.hasOwnProperty.call(payload.fields, key) && map[key]) {
      sheet.getRange(rowNum, map[key]).setValue(payload.fields[key]);
    }
  });
  return jsonOut_({ ok: true });
}

function handleAdminDelete_(payload) {
  if (!checkAdmin_(payload.password)) {
    return jsonOut_({ ok: false, error: 'Sai mật khẩu admin' });
  }
  const sheet = getSheet_();
  const rowNum = findRowById_(sheet, payload.id);
  if (rowNum === -1) {
    return jsonOut_({ ok: false, error: 'Không tìm thấy bài đăng ký' });
  }
  sheet.deleteRow(rowNum);
  return jsonOut_({ ok: true });
}

function handleAdminDeleteBulk_(payload) {
  if (!checkAdmin_(payload.password)) {
    return jsonOut_({ ok: false, error: 'Sai mật khẩu admin' });
  }
  const ids = Array.isArray(payload.ids) ? payload.ids : [];
  const sheet = getSheet_();
  let deleted = 0;
  ids.forEach(id => {
    const rowNum = findRowById_(sheet, id);
    if (rowNum !== -1) {
      sheet.deleteRow(rowNum);
      deleted++;
    }
  });
  return jsonOut_({ ok: true, deleted: deleted });
}

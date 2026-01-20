/**
 * スプレッドシート操作モジュール
 *
 * 投稿、回答、ユーザー、トークルームの各シートへのアクセスと
 * データの記録・取得を行う関数群を提供します。
 */

// シート名の定数定義
var SHEET_NAMES = {
  POSTS: '投稿',
  ANSWERS: '回答',
  USERS: 'ユーザー',
  ROOMS: 'トークルーム'
};

/**
 * スプレッドシートを取得する関数
 * @returns {GoogleAppsScript.Spreadsheet.Spreadsheet} アクティブなスプレッドシート
 */
function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * 投稿を記録する関数
 *
 * @param {string} postId LINEのメッセージID
 * @param {Date} timestamp 投稿日時
 * @param {string} userId ユーザーID
 * @param {string} roomId トークルームID（個人チャットの場合はnullまたはuserIdと同じ）
 * @param {string} messageText メッセージ内容
 * @param {boolean} hasPoll アンケートが含まれているかどうか
 */
function recordPost(postId, timestamp, userId, roomId, messageText, hasPoll) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAMES.POSTS);

  // シートが存在しない場合は作成
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAMES.POSTS);
    sheet.appendRow(['post_id', 'timestamp', 'user_id', 'room_id', 'message_text', 'has_poll']);
  }

  sheet.appendRow([postId, timestamp, userId, roomId, messageText, hasPoll]);
}

/**
 * 回答を記録する関数
 *
 * @param {string} pollPostId アンケートの元投稿ID
 * @param {Date} timestamp 回答日時
 * @param {string} userId 回答したユーザーID
 * @param {string} answerValue 回答内容 (OK/NG)
 */
function recordAnswer(pollPostId, timestamp, userId, answerValue) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAMES.ANSWERS);

  // シートが存在しない場合は作成
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAMES.ANSWERS);
    sheet.appendRow(['answer_id', 'timestamp', 'poll_post_id', 'user_id', 'answer_value']);
  }

  var answerId = Utilities.getUuid();
  sheet.appendRow([answerId, timestamp, pollPostId, userId, answerValue]);
}

/**
 * ユーザーが存在しない場合に新規登録する関数
 *
 * @param {string} userId ユーザーID
 */
function ensureUser(userId) {
  if (!userId) return;

  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAMES.USERS);

  // シートが存在しない場合は作成
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAMES.USERS);
    sheet.appendRow(['user_id', 'display_name']);
  }

  var data = sheet.getDataRange().getValues();
  // ヘッダー行を除くデータから検索
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === userId) {
      return; // 既に存在する
    }
  }

  // 存在しない場合のみ追加。名前は空欄（管理者が手動入力）
  sheet.appendRow([userId, '']);
}

/**
 * トークルームが存在しない場合に新規登録する関数
 *
 * @param {string} roomId トークルームID
 */
function ensureRoom(roomId) {
  if (!roomId) return;

  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAMES.ROOMS);

  // シートが存在しない場合は作成
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAMES.ROOMS);
    sheet.appendRow(['room_id', 'room_name']);
  }

  var data = sheet.getDataRange().getValues();
  // ヘッダー行を除くデータから検索
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === roomId) {
      return; // 既に存在する
    }
  }

  // 存在しない場合のみ追加。ルーム名は空欄（管理者が手動入力）
  sheet.appendRow([roomId, '']);
}

/**
 * 指定された投稿IDに対する回答を集計する関数
 *
 * @param {string} postId アンケートの投稿ID
 * @returns {Object} {ok: number, ng: number} 集計結果
 */
function getPollResults(postId) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAMES.ANSWERS);
  if (!sheet) return { ok: 0, ng: 0 };

  var data = sheet.getDataRange().getValues();
  var okCount = 0;
  var ngCount = 0;

  // 1行目はヘッダーなのでスキップ
  for (var i = 1; i < data.length; i++) {
    // poll_post_id は 3列目 (index 2)
    // answer_value は 5列目 (index 4)
    if (data[i][2] === postId) {
      var value = data[i][4];
      if (value === 'OK') okCount++;
      if (value === 'NG') ngCount++;
    }
  }

  return { ok: okCount, ng: ngCount };
}

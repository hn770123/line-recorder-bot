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
  ROOMS: 'トークルーム',
  DEBUG: 'デバッグ'
};

/**
 * デバッグシートにログを出力する関数
 *
 * @param {string} message エラーメッセージ
 * @param {string} stack スタックトレース
 */
function debugToSheet(message, stack) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAMES.DEBUG);

    // シートが存在しない場合は作成
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAMES.DEBUG);
      sheet.appendRow(['timestamp', 'message', 'stack']);
    }

    sheet.appendRow([new Date(), message, stack || '']);
  } catch (e) {
    console.error('debugToSheet failed: ' + e);
  }
}

/**
 * スプレッドシートを取得する関数
 * @returns {GoogleAppsScript.Spreadsheet.Spreadsheet} アクティブなスプレッドシート
 */
function getSpreadsheet() {
  var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  return SpreadsheetApp.openById(id);
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

  var data = sheet.getDataRange().getValues();
  // 1行目はヘッダーなのでスキップ
  for (var i = 1; i < data.length; i++) {
    // poll_post_id は 3列目 (index 2)
    // user_id は 4列目 (index 3)
    if (data[i][2] === pollPostId && data[i][3] === userId) {
      // 既存の回答を更新
      // timestamp (index 1 -> 列2)
      // answer_value (index 4 -> 列5)
      sheet.getRange(i + 1, 2).setValue(timestamp);
      sheet.getRange(i + 1, 5).setValue(answerValue);
      return;
    }
  }

  // 存在しない場合は新規追加
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
 * ユーザー名を更新する関数
 *
 * @param {string} userId ユーザーID
 * @param {string} newName 新しいユーザー名
 */
function updateUserName(userId, newName) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAMES.USERS);
  if (!sheet) return;

  var data = sheet.getDataRange().getValues();
  // 1行目はヘッダーなのでスキップ
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === userId) {
      // 2列目 (index 1) を更新
      sheet.getRange(i + 1, 2).setValue(newName);
      return;
    }
  }
  // ユーザーが存在しない場合は追加
  sheet.appendRow([userId, newName]);
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

/**
 * アンケートの詳細結果を取得する関数
 *
 * @param {string} postId アンケートの投稿ID
 * @returns {Array} 回答詳細の配列 [{timestamp, userName, answerValue}, ...]
 */
function getPollResultDetails(postId) {
  var ss = getSpreadsheet();

  // ユーザー情報を取得してマッピングを作成
  var userSheet = ss.getSheetByName(SHEET_NAMES.USERS);
  var userMap = {};
  if (userSheet) {
    var userData = userSheet.getDataRange().getValues();
    for (var i = 1; i < userData.length; i++) {
      userMap[userData[i][0]] = userData[i][1];
    }
  }

  // 回答データを取得
  var answerSheet = ss.getSheetByName(SHEET_NAMES.ANSWERS);
  if (!answerSheet) return [];

  var data = answerSheet.getDataRange().getValues();
  var results = [];

  // 1行目はヘッダーなのでスキップ
  for (var i = 1; i < data.length; i++) {
    // poll_post_id は 3列目 (index 2)
    if (data[i][2] === postId) {
      var timestamp = new Date(data[i][1]);
      var userId = data[i][3];
      var answerValue = data[i][4];
      var userName = userMap[userId] || '未登録';

      results.push({
        timestamp: timestamp,
        userName: userName,
        answerValue: answerValue
      });
    }
  }

  // 日時の降順でソート（新しい順）
  results.sort(function(a, b) {
    return b.timestamp - a.timestamp;
  });

  return results;
}

/**
 * LINE Messaging API操作モジュール
 *
 * メッセージの返信、Flex Messageの生成など、LINE関連の機能を提供します。
 */

/**
 * プロパティサービスから設定値を取得
 */
function getScriptProperty(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

/**
 * メッセージを返信する関数
 *
 * @param {string} replyToken 返信用トークン
 * @param {Array} messages 送信するメッセージオブジェクトの配列
 */
function replyMessages(replyToken, messages) {
  var token = getScriptProperty('CHANNEL_ACCESS_TOKEN');
  var url = 'https://api.line.me/v2/bot/message/reply';
  var payload = {
    'replyToken': replyToken,
    'messages': messages
  };

  UrlFetchApp.fetch(url, {
    'headers': {
      'Content-Type': 'application/json; charset=UTF-8',
      'Authorization': 'Bearer ' + token,
    },
    'method': 'post',
    'payload': JSON.stringify(payload)
  });
}

/**
 * Loadingアニメーションを表示する関数
 *
 * @param {string} userId ユーザーID
 * @param {number} seconds 表示秒数 (デフォルト2秒)
 */
function sendLoadingAnimation(userId, seconds) {
  var token = getScriptProperty('CHANNEL_ACCESS_TOKEN');
  var url = 'https://api.line.me/v2/bot/chat/loading/start';
  var payload = {
    'chatId': userId,
    'loadingSeconds': seconds || 2
  };

  try {
    UrlFetchApp.fetch(url, {
      'headers': {
        'Content-Type': 'application/json; charset=UTF-8',
        'Authorization': 'Bearer ' + token,
      },
      'method': 'post',
      'payload': JSON.stringify(payload)
    });
  } catch (e) {
    console.error('sendLoadingAnimation failed: ' + e);
  }
}

/**
 * アンケート用のFlex Messageを作成する関数
 *
 * @param {string} originalPostId アンケート対象の投稿ID
 * @returns {Object} Flex Messageオブジェクト
 */
function createPollFlexMessage(originalPostId) {
  var webAppUrl = getScriptProperty('WEB_APP_URL');
  var resultsUrl = webAppUrl + '?postId=' + originalPostId;

  return {
    "type": "flex",
    "altText": "アンケート: OKですか？NGですか？",
    "contents": {
      "type": "bubble",
      "body": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "text",
            "text": "アンケート",
            "weight": "bold",
            "size": "xl"
          },
          {
            "type": "text",
            "text": "以下のボタンで回答してください。",
            "margin": "md",
            "wrap": true
          }
        ]
      },
      "footer": {
        "type": "box",
        "layout": "vertical",
        "spacing": "sm",
        "contents": [
          {
            "type": "box",
            "layout": "horizontal",
            "spacing": "sm",
            "contents": [
              {
                "type": "button",
                "style": "primary",
                "height": "sm",
                "action": {
                  "type": "postback",
                  "label": "OK",
                  "data": "action=answer&value=OK&postId=" + originalPostId,
                  "displayText": "OK"
                }
              },
              {
                "type": "button",
                "style": "secondary",
                "height": "sm",
                "action": {
                  "type": "postback",
                  "label": "NG",
                  "data": "action=answer&value=NG&postId=" + originalPostId,
                  "displayText": "NG"
                }
              }
            ]
          },
          {
            "type": "separator",
            "margin": "sm"
          },
          {
            "type": "button",
            "style": "link",
            "height": "sm",
            "action": {
              "type": "uri",
              "label": "現在の結果を見る",
              "uri": resultsUrl
            }
          }
        ],
        "flex": 0
      }
    }
  };
}

/**
 * LINE Bot メインエントリーポイント
 *
 * Webhookからのリクエストを受け取り、適切な処理に振り分けます。
 */

/**
 * 重複イベント（リトライ）かどうかを判定する関数
 *
 * @param {string} eventId WebhookイベントID
 * @returns {boolean} 処理済みの場合はtrue、未処理の場合はfalse
 */
function isProcessed(eventId) {
  var cache = CacheService.getScriptCache();
  // キャッシュに存在する場合は処理済みとみなす
  if (cache.get(eventId)) {
    return true;
  }
  // 処理済みとしてマーク（10分間キャッシュ）
  cache.put(eventId, 'processed', 600);
  return false;
}

/**
 * WebhookへのPOSTリクエストを処理する関数
 *
 * @param {Object} e イベントオブジェクト
 */
function doPost(e) {
  try {
    // LINEプラットフォームからの検証用リクエストの場合
    if (!e || !e.postData) {
      return ContentService.createTextOutput("OK");
    }

    var json = JSON.parse(e.postData.contents);
    var events = json.events;

    events.forEach(function(event) {
      // リトライガード: 処理済みのイベントIDはスキップ
      if (event.webhookEventId && isProcessed(event.webhookEventId)) {
        return;
      }

      if (event.type === 'message' && event.message.type === 'text') {
        handleMessageEvent(event);
      } else if (event.type === 'postback') {
        handlePostbackEvent(event);
      }
    });

    return ContentService.createTextOutput("OK");
  } catch (error) {
    debugToSheet(error.message, error.stack);
    // LINEプラットフォームにエラーを返さないようにOKを返す
    return ContentService.createTextOutput("OK");
  }
}

/**
 * メッセージイベントを処理する関数
 *
 * @param {Object} event LINEイベントオブジェクト
 */
function handleMessageEvent(event) {
  var messageId = event.message.id;
  var timestamp = new Date(event.timestamp);
  var userId = event.source.userId;
  // グループまたはルームIDを取得。個人チャットの場合は空文字
  var roomId = event.source.roomId || event.source.groupId || "";
  var text = event.message.text;

  // ユーザーの確認・登録
  ensureUser(userId);

  // ルームIDがある場合のみ、ルームの確認・登録
  if (roomId) {
    ensureRoom(roomId);
  }

  // アンケートキーワードの判定
  var hasPoll = text.indexOf('[アンケート]') !== -1;

  // ユーザー名更新コマンドの判定
  var nameMatch = text.match(/^\[私の名前\]は"(.*)"$/);
  if (nameMatch) {
    var newName = nameMatch[1];
    updateUserName(userId, newName);
    replyMessages(event.replyToken, [{
      "type": "text",
      "text": "名前を「" + newName + "」に更新しました。"
    }]);
  }

  // 投稿を記録
  recordPost(messageId, timestamp, userId, roomId, text, hasPoll);

  // アンケートがある場合はFlex Messageを返信
  if (hasPoll) {
    var flexMessage = createPollFlexMessage(messageId);
    replyMessages(event.replyToken, [flexMessage]);
  }
}

/**
 * ポストバックイベントを処理する関数
 *
 * @param {Object} event LINEイベントオブジェクト
 */
function handlePostbackEvent(event) {
  var data = event.postback.data;
  var params = parseQuery(data);

  if (params['action'] === 'answer') {
    var userId = event.source.userId;
    var timestamp = new Date(event.timestamp);
    var answerValue = params['value'];
    var pollPostId = params['postId'];

    // Loadingアニメーションを表示 (受付メッセージの代わり)
    sendLoadingAnimation(userId, 2);

    // 回答を記録
    recordAnswer(pollPostId, timestamp, userId, answerValue);
  }
}

/**
 * クエリ文字列をパースするヘルパー関数
 *
 * @param {string} queryString クエリ文字列 (key=value&key2=value2)
 * @returns {Object} パース結果のオブジェクト
 */
function parseQuery(queryString) {
  var query = {};
  var pairs = (queryString[0] === '?' ? queryString.substr(1) : queryString).split('&');
  for (var i = 0; i < pairs.length; i++) {
    var pair = pairs[i].split('=');
    query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
  }
  return query;
}

/**
 * Webアプリケーションモジュール
 *
 * アンケート結果を表示するWebページを提供します。
 */

/**
 * HTTP GETリクエストを処理する関数
 *
 * @param {Object} e イベントオブジェクト
 */
function doGet(e) {
  try {
    // index.html からテンプレートを作成
    var template = HtmlService.createTemplateFromFile('index');

    var postId = e.parameter.postId;
    var results = [];

    // postId が指定されている場合、詳細結果を取得
    if (postId) {
      results = getPollResultDetails(postId);
    }

    // テンプレート変数に値を設定
    template.postId = postId || "指定されていません";
    template.results = results;

    return template.evaluate()
        .setTitle('アンケート結果')
        .setSandboxMode(HtmlService.SandboxMode.IFRAME)
        .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  } catch (error) {
    debugToSheet(error.message, error.stack);
    return ContentService.createTextOutput("エラーが発生しました。");
  }
}

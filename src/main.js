/**
 * LINE Bot メインエントリーポイント
 *
 * Webhookからのリクエストを受け取り、適切な処理に振り分けます。
 */

/**
 * WebhookへのPOSTリクエストを処理する関数
 *
 * @param {Object} e イベントオブジェクト
 */
function doPost(e) {
  // LINEプラットフォームからの検証用リクエストの場合
  if (!e || !e.postData) {
    return ContentService.createTextOutput("OK");
  }

  var json = JSON.parse(e.postData.contents);
  var events = json.events;

  events.forEach(function(event) {
    if (event.type === 'message' && event.message.type === 'text') {
      handleMessageEvent(event);
    } else if (event.type === 'postback') {
      handlePostbackEvent(event);
    }
  });

  return ContentService.createTextOutput("OK");
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

    // 回答を記録
    recordAnswer(pollPostId, timestamp, userId, answerValue);

    // 受付完了メッセージを返信
    var replyText = {
      "type": "text",
      "text": "回答を受け付けました: " + answerValue
    };
    replyMessages(event.replyToken, [replyText]);
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

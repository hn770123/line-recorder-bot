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

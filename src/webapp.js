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
  // index.html からテンプレートを作成
  var template = HtmlService.createTemplateFromFile('index');

  var postId = e.parameter.postId;
  var results = { ok: 0, ng: 0 };

  // postId が指定されている場合、集計結果を取得
  if (postId) {
    results = getPollResults(postId);
  }

  // テンプレート変数に値を設定
  template.postId = postId || "指定されていません";
  template.results = results;

  return template.evaluate()
      .setTitle('アンケート結果')
      .setSandboxMode(HtmlService.SandboxMode.IFRAME)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

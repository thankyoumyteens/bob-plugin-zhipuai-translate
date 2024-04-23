const CryptoJS = require("crypto-js");

function base64UrlEncode(str) {
  let encodedSource = CryptoJS.enc.Base64.stringify(str);
  const reg = new RegExp("/", "g");
  encodedSource = encodedSource
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(reg, "_");
  return encodedSource;
}

function generateToken(apiKey, secretSalt) {
  const header = JSON.stringify({
    alg: "HS256",
    sign_type: "SIGN",
  });

  const iat = new Date().getTime();
  const exp = iat + 2 * 60 * 60 * 1000;
  const payload = JSON.stringify({
    api_key: apiKey,
    timestamp: iat,
    exp: exp,
  });

  const before_sign =
    base64UrlEncode(CryptoJS.enc.Utf8.parse(header)) +
    "." +
    base64UrlEncode(CryptoJS.enc.Utf8.parse(payload));
  let signature = CryptoJS.HmacSHA256(before_sign, secretSalt);
  signature = base64UrlEncode(signature);
  const final_sign = before_sign + "." + signature;
  return final_sign;
}

function supportLanguages() {
  return ["en", "zh-Hans"];
}

function pluginTimeoutInterval() {
  try {
    const apiTimeout = parseInt($option.apiTimeout);
    if (apiTimeout < 30) {
      apiTimeout = 30;
    }
    if (apiTimeout > 300) {
      apiTimeout = 300;
    }
    return apiTimeout;
  } catch (error) {
    return 300;
  }
}

function translate(query, completion) {
  const keyId = $option.zhipuAIKeyId;
  const secret = $option.zhipuAIKeySecret;
  let prompt = $option.zhipuAIPrompt;
  const key = generateToken(keyId, secret);
  const text = query.text;

  if (!prompt) {
    prompt = "我希望你能帮我将以下英文翻译成中文:";
  }
  const params = {
    model: "glm-4",
    messages: [
      {
        role: "user",
        content: prompt + "\\n" + text,
      },
      {
        role: "user",
        content: text,
      },
    ],
  };
  $log.info("zhipu ai params: " + JSON.stringify(params));
  $http.request({
    method: "POST",
    url: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
    header: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + key,
    },
    body: params,
    handler: function (resp) {
      $log.info("zhipu ai response: " + JSON.stringify(resp));
      const data = resp.data;
      // 翻译成功
      query.onCompletion({
        result: {
          toParagraphs: data.choices[0].message.content.split("\\n"),
          from: "en",
          to: "zh-Hans",
        },
      });
    },
  });

  // 翻译失败
  // completion({'error': error});
}

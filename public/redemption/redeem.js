const field = document.querySelector('.redeem-area');
const instructions = document.querySelector('.instructions');
const start = field.querySelector('button[type="button"]');
const form = field.querySelector('form');
const password = form.querySelector('input');
const confirmation = field.querySelector('output');
function resetRedemption() {
  start.hidden = false;
  form.hidden = true;
  confirmation.hidden = true;
  password.value = '';
  instructions.textContent = '按下之後，請將手機交給店員輸入兌換密碼。';
}
start.addEventListener('click', () => {
  start.hidden = true;
  form.hidden = false;
  instructions.textContent = '請由店員輸入密碼，並確認兌換。';
  password.focus();
});
function showRedeemed() {
  start.hidden = true;
  form.hidden = true;
  confirmation.hidden = false;
  if (self !== top) parent.postMessage('prize-redeemed', location.origin);
  password.value = '';
  instructions.textContent = '兌換成功，可隨時查看這份驚喜。';
}

async function checkRedemption() {
  try {
    const response = await fetch('../api/prize/status');
    if (response.ok && (await response.json()).redeemed) showRedeemed();
  } catch {
    // A temporary connection error can be retried when submitting the form.
  }
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  const submit = form.querySelector('button[type="submit"]');
  if (submit.disabled) return;
  submit.disabled = true;
  try {
    const response = await fetch('../api/prize/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: password.value }),
    });
    if (response.status === 403) {
      instructions.textContent = '密碼不正確，請重新輸入。';
      password.focus();
      password.select();
      return;
    }
    if (!response.ok) {
      const messages = {
        401: 'LINE 登入已過期，請關閉彈窗並重新整理活動頁後再試。',
        404: '找不到抽獎紀錄，請重新整理活動頁後再試。',
        503: '核銷服務目前無法使用，請聯絡活動管理員。',
      };
      instructions.textContent = messages[response.status] || '核銷失敗（' + response.status + '），請稍後重試。';
      return;
    }
    if (!(await response.json()).redeemed) throw new Error('Redemption failed');
    showRedeemed();
  } catch {
    instructions.textContent = '暫時無法確認兌換，請再試一次。';
  } finally {
    submit.disabled = false;
  }
});
resetRedemption();
if (new URLSearchParams(location.search).get('redeemed') === '1') {
  showRedeemed();
} else {
  void checkRedemption();
}
window.addEventListener('focus', checkRedemption);

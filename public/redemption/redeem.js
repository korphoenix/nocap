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
form.addEventListener('submit', event => {
  event.preventDefault();
  if (password.value !== '1121') {
    instructions.textContent = '密碼不正確，請重新輸入。';
    password.focus();
    password.select();
    return;
  }
  password.value = '';
  form.hidden = true;
  confirmation.hidden = false;
  instructions.textContent = '兌換成功，可隨時查看這份驚喜。';
});
resetRedemption();

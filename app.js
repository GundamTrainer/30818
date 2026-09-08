const messagesEl = document.querySelector('#chat-messages');
const form = document.querySelector('#chat-form');
const input = document.querySelector('#message-input');
const promptRow = document.querySelector('#prompt-row');
const resetButton = document.querySelector('#reset-button');
const sendButton = form.querySelector('.send-button');
const history = [];

const today = new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric' }).format(new Date());
document.querySelector('#today-date').textContent = today;

function addMessage(role, content, isTyping = false) {
  const item = document.createElement('div');
  item.className = `message ${role === 'user' ? 'user-message' : 'assistant-message'}${isTyping ? ' typing' : ''}`;
  const avatar = role === 'assistant' ? '<div class="message-avatar">ㅁ</div>' : '';
  item.innerHTML = `${avatar}<div><div class="bubble"></div><time>${isTyping ? '작성 중' : '방금 전'}</time></div>`;
  item.querySelector('.bubble').textContent = content;
  messagesEl.appendChild(item);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return item;
}

function setBusy(busy) {
  input.disabled = busy;
  sendButton.disabled = busy;
  sendButton.style.opacity = busy ? '.55' : '1';
}

async function sendMessage(content) {
  const text = content.trim();
  if (!text || input.disabled) return;
  history.push({ role: 'user', content: text });
  addMessage('user', text);
  input.value = '';
  input.style.height = 'auto';
  promptRow.hidden = true;
  setBusy(true);
  const typing = addMessage('assistant', '답변을 준비하고 있어요', true);

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '응답 오류');
    typing.remove();
    history.push({ role: 'assistant', content: data.reply });
    addMessage('assistant', data.reply);
  } catch (error) {
    typing.remove();
    addMessage('assistant', error.message || '연결이 잠시 불안정해요. 다시 시도해 주세요.');
  } finally {
    setBusy(false);
    input.focus();
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  sendMessage(input.value);
});

input.addEventListener('input', () => {
  input.style.height = 'auto';
  input.style.height = `${Math.min(input.scrollHeight, 100)}px`;
});

input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

promptRow.addEventListener('click', (event) => {
  const button = event.target.closest('[data-prompt]');
  if (button) sendMessage(button.dataset.prompt);
});

resetButton.addEventListener('click', () => {
  history.length = 0;
  messagesEl.innerHTML = '<div class="message assistant-message"><div class="message-avatar">ㅁ</div><div><div class="bubble">다시 천천히 시작해볼까요? 지금 마음에 가장 가까운 말부터 들려주세요.</div><time>방금 전</time></div></div>';
  promptRow.hidden = false;
  input.value = '';
  input.focus();
});

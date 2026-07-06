(function(){
  const sendButton = document.querySelector('button[type="button"]');
  const nameInput = document.getElementById('name');
  const emailInput = document.getElementById('email');
  const subjectInput = document.getElementById('subject');
  const messageInput = document.getElementById('message');

  function showStatus(message, isError){
    let el = document.getElementById('contact-status');
    if(!el){
      el = document.createElement('div');
      el.id = 'contact-status';
      el.className = 'form-status';
      sendButton.insertAdjacentElement('afterend', el);
    }
    el.textContent = message;
    el.className = 'form-status ' + (isError ? 'is-error' : 'is-success');
  }

  async function handleSend(){
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const subject = subjectInput.value.trim();
    const message = messageInput.value.trim();
    if(!name || !email || !message){
      showStatus('Please complete name, email and message.', true);
      return;
    }
    sendButton.disabled = true;
    showStatus('Sending message...');
    try{
      console.log('Sending contact request to API...');
      const payload = await CityReport.request('/api/contact', {
        method: 'POST',
        body: JSON.stringify({ name, email, subject, message })
      });
      console.log('Contact API response:', payload);
      showStatus('Message sent — thank you!');
      nameInput.value = '';
      emailInput.value = '';
      subjectInput.value = '';
      messageInput.value = '';
    }catch(err){
      showStatus(err.message || 'Failed to send message', true);
    }finally{
      sendButton.disabled = false;
    }
  }

  if(sendButton){
    sendButton.addEventListener('click', handleSend);
  }
})();

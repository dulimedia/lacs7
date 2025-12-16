// EmailJS configuration and utilities
export const EMAIL_RECIPIENTS = ['lacenterstudios3d@gmail.com', 'dwyatt@lacenterstudios.com'];

export const sendEmailRequest = async (templateParams) => {
  // Load EmailJS if not already loaded
  if (!window.emailjs) {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
    document.head.appendChild(script);
    await new Promise(resolve => script.onload = resolve);
    
    // Initialize EmailJS
    window.emailjs.init('7v5wJOSuv1p_PkcU5'); // Your public key
  }

  // Send email using EmailJS
  const response = await window.emailjs.send(
    'service_q47lbr7', // Your service ID
    'template_0zeil8m', // Your template ID
    templateParams
  );

  return response;
};
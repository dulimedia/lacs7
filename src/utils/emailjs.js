// EmailJS configuration and utilities

// EmailJS configuration with your actual credentials
export const EMAILJS_CONFIG = {
  // Your actual public key from EmailJS dashboard
  PUBLIC_KEY: '7v5wJOSuv1p_PkcU5',
  
  // Your confirmed service ID  
  SERVICE_ID: 'service_q47lbr7',
  
  // Template ID (keeping existing - update if you have a specific one)
  TEMPLATE_ID: 'template_0zeil8m'
};

export const EMAIL_RECIPIENTS = ['lacenterstudios3d@gmail.com', 'dwyatt@lacenterstudios.com'];

export const sendEmailRequest = async (templateParams) => {
  // Load EmailJS if not already loaded
  if (!window.emailjs) {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
    document.head.appendChild(script);
    await new Promise(resolve => script.onload = resolve);
    
    // Initialize EmailJS with centralized config
    window.emailjs.init(EMAILJS_CONFIG.PUBLIC_KEY);
    console.log('📧 EmailJS initialized with key:', EMAILJS_CONFIG.PUBLIC_KEY);
  }

  // Send email using EmailJS with centralized config
  const response = await window.emailjs.send(
    EMAILJS_CONFIG.SERVICE_ID,
    EMAILJS_CONFIG.TEMPLATE_ID,
    templateParams
  );

  return response;
};
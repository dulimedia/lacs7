// EmailJS configuration and utilities

// TODO: Update these with your actual EmailJS dashboard values
// Get these from: https://dashboard.emailjs.com/admin
export const EMAILJS_CONFIG = {
  // From Account tab - copy your Public Key
  PUBLIC_KEY: '7v5wJOSuv1p_PkcU5', // REPLACE: user_abc123XYZ 
  
  // From Email Services tab - note your Service ID  
  SERVICE_ID: 'service_q47lbr7', // REPLACE: service_123abc
  
  // From Email Templates tab - note your Template ID
  TEMPLATE_ID: 'template_0zeil8m' // REPLACE: template_xyz789
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
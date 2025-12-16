import { useState, useEffect } from 'react';
import { useExploreState } from '../store/exploreState';
import { X, MapPin, Square, Building, Users, ChefHat, Send } from 'lucide-react';

// EmailJS type declaration
declare global {
  interface Window {
    emailjs?: {
      init: (publicKey: string) => void;
      send: (serviceId: string, templateId: string, templateParams: any) => Promise<any>;
    };
  }
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  company: string;
  message: string;
}

export function UnitRequestSidebar() {
  const { singleUnitRequestOpen, requestUnitData, setSingleUnitRequestOpen, getUnitData } = useExploreState();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    company: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Load unit details
  const unitDetails = requestUnitData ? getUnitData(requestUnitData.unitKey) : null;

  // Load EmailJS script
  useEffect(() => {
    if (singleUnitRequestOpen && !window.emailjs) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
      script.onload = () => {
        console.log('🔧 EmailJS script loaded, initializing with PUBLIC key: 7v5wJOSuv1p_PkcU5');
        window.emailjs?.init('7v5wJOSuv1p_PkcU5');
        console.log('✅ EmailJS initialized');
      };
      document.head.appendChild(script);
    }
  }, [singleUnitRequestOpen]);

  // Auto-populate message with unit details
  useEffect(() => {
    if (singleUnitRequestOpen && requestUnitData && !formData.message) {
      const defaultMessage = `Hi, I'm interested in leasing ${requestUnitData.unitName}${unitDetails?.building ? ` in ${unitDetails.building}` : ''}. Could you please provide more information about availability, pricing, and lease terms?`;
      setFormData(prev => ({ ...prev, message: defaultMessage }));
    }
  }, [singleUnitRequestOpen, requestUnitData, unitDetails, formData.message]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      if (!window.emailjs) {
        throw new Error('EmailJS not loaded');
      }

      const templateParams = {
        to_name: 'LA Center Studios',
        from_name: formData.name || 'Anonymous',
        from_email: formData.email || 'no-email@provided.com',
        phone: formData.phone || 'Not provided',
        company: formData.company || 'Not provided',
        unit_name: requestUnitData?.unitName || 'Unknown Unit',
        unit_key: requestUnitData?.unitKey || 'Unknown Key',
        building: unitDetails?.building || 'Unknown Building',
        message: formData.message || 'No message provided',
        timestamp: new Date().toLocaleString(),
      };

      // Send to both email addresses
      const primaryEmail = 'lacenterstudios3d@gmail.com';
      const secondaryEmail = 'dwyatt@lacenterstudios.com';

      console.log('📧 Attempting to send emails with:');
      console.log('  Service ID: service_q47lbr7');
      console.log('  Template ID: template_0zeil8m');
      console.log('  To emails:', primaryEmail, secondaryEmail);
      console.log('  Template params:', templateParams);

      await Promise.all([
        window.emailjs.send('service_q47lbr7', 'template_0zeil8m', {
          ...templateParams,
          to_email: primaryEmail
        }),
        window.emailjs.send('service_q47lbr7', 'template_0zeil8m', {
          ...templateParams,
          to_email: secondaryEmail
        })
      ]);

      setSubmitStatus('success');
      // Reset form after success
      setTimeout(() => {
        setFormData({ name: '', email: '', phone: '', company: '', message: '' });
        setSingleUnitRequestOpen(false);
        setSubmitStatus('idle');
      }, 2000);

    } catch (error) {
      console.error('❌ Failed to send unit request:', error);
      console.error('❌ Error details:', {
        message: error.message,
        status: error.status,
        text: error.text,
        name: error.name
      });
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSingleUnitRequestOpen(false);
    setFormData({ name: '', email: '', phone: '', company: '', message: '' });
    setSubmitStatus('idle');
  };

  if (!singleUnitRequestOpen || !requestUnitData) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${
          singleUnitRequestOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={handleClose}
      />

      {/* Sidebar */}
      <div 
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white z-50 shadow-2xl transition-transform duration-400 ease-out overflow-y-auto ${
          singleUnitRequestOpen ? 'transform translate-x-0' : 'transform translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">Request Information</h2>
              <p className="text-sm text-gray-600 mt-1">
                {requestUnitData.unitName}
                {unitDetails?.building && (
                  <span className="ml-2 text-gray-500">• {unitDetails.building}</span>
                )}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-600" />
            </button>
          </div>

          {/* Unit Details */}
          {unitDetails && (
            <div className="p-6 border-b border-gray-100 bg-gradient-to-br from-blue-50 to-indigo-50">
              <div className="grid grid-cols-2 gap-4">
                {unitDetails.area_sqft && (
                  <div className="flex items-center space-x-2">
                    <Square size={16} className="text-blue-600" />
                    <span className="text-sm text-gray-700">{unitDetails.area_sqft.toLocaleString()} sq ft</span>
                  </div>
                )}
                {unitDetails.building && (
                  <div className="flex items-center space-x-2">
                    <Building size={16} className="text-blue-600" />
                    <span className="text-sm text-gray-700">{unitDetails.building}</span>
                  </div>
                )}
                {unitDetails.private_offices && (
                  <div className="flex items-center space-x-2">
                    <Users size={16} className="text-blue-600" />
                    <span className="text-sm text-gray-700">{unitDetails.private_offices} offices</span>
                  </div>
                )}
                {unitDetails.has_kitchen && (
                  <div className="flex items-center space-x-2">
                    <ChefHat size={16} className="text-blue-600" />
                    <span className="text-sm text-gray-700">Kitchen</span>
                  </div>
                )}
              </div>
              <div className="mt-4">
                <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  unitDetails.status 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {unitDetails.status ? 'Available' : 'Unavailable'}
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <div className="flex-1 p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="your.email@company.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company
                </label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Your company name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <textarea
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Tell us about your needs..."
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || submitStatus === 'success'}
                className={`w-full py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center space-x-2 ${
                  submitStatus === 'success'
                    ? 'bg-green-600 text-white cursor-default'
                    : submitStatus === 'error'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : isSubmitting
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : submitStatus === 'success' ? (
                  <>
                    <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
                      <div className="w-2 h-1 bg-green-600 rotate-45 transform origin-bottom-left"></div>
                      <div className="w-1 h-2 bg-green-600 -rotate-45 transform origin-top-left -ml-1"></div>
                    </div>
                    <span>Request Sent!</span>
                  </>
                ) : submitStatus === 'error' ? (
                  <>
                    <Send size={16} />
                    <span>Retry Send</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>Send Request</span>
                  </>
                )}
              </button>

              {submitStatus === 'error' && (
                <p className="text-red-600 text-sm text-center">
                  Failed to send request. Please try again.
                </p>
              )}
            </form>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-500 text-center">
              By submitting this form, you agree to be contacted about this property.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
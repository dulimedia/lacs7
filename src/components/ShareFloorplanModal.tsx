import React, { useState } from 'react';
import { useExploreState } from '../store/exploreState';
import { X, Mail, Send } from 'lucide-react';
import { APP_CONFIG } from '../config/appConfig';

export function ShareFloorplanModal() {
    const { shareModalOpen, shareModalData, setShareModalOpen } = useExploreState();
    const [emails, setEmails] = useState('');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [senderName, setSenderName] = useState('');
    const [senderPhone, setSenderPhone] = useState('');

    if (!shareModalOpen || !shareModalData) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!emails.trim()) {
            alert('Please enter at least one email address');
            return;
        }
        
        // Parse multiple emails (separated by commas or semicolons)
        const emailList = emails.split(/[,;]/).map(email => email.trim()).filter(email => email);
        
        // Validate all emails
        for (const email of emailList) {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                alert(`Invalid email address: ${email}`);
                return;
            }
        }

        setSending(true);

        try {
            // Load EmailJS if needed (reusing logic from RequestTab)
            if (!window.emailjs) {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
                document.head.appendChild(script);
                await new Promise<void>((resolve, reject) => {
                    script.onload = () => {
                        window.emailjs?.init('7v5wJOSuv1p_PkcU5');
                        resolve();
                    };
                    script.onerror = reject;
                });
            }

            // Construct URLs
            // 1. App Link: Use deep link format
            const shareUrl = `${APP_CONFIG.shareBaseUrl || 'https://lacs7.vercel.app'}/?unit=${encodeURIComponent(shareModalData.unitName.toLowerCase())}`;

            // 2. PDF Links: ALWAYS use Vercel deployment URL for PDFs (not local development server)
            const vercelOrigin = 'https://lacs7.vercel.app';
            const floorplanLink = shareModalData.floorplanUrl && !shareModalData.floorplanUrl.startsWith('http')
                ? `${vercelOrigin}${shareModalData.floorplanUrl.startsWith('/') ? '' : '/'}${encodeURI(shareModalData.floorplanUrl)}`
                : shareModalData.floorplanUrl;

            // const fullFloorLink = shareModalData.fullFloorUrl && !shareModalData.fullFloorUrl.startsWith('http')
            //     ? `${vercelOrigin}${shareModalData.fullFloorUrl.startsWith('/') ? '' : '/'}${encodeURI(shareModalData.fullFloorUrl)}`
            //     : shareModalData.fullFloorUrl;

            // Send email to each recipient
            for (const email of emailList) {
                const templateParams = {
                    to_email: email,
                    from_name: senderName || "LA Center Studios",
                    from_email: "noreply@lacenterstudios.com",
                    message: `${message ? `${message}\n\n` : ''
                        }Below is information about suite ${shareModalData.unitName}:

🏢 3D Interactive Tour

View ${shareModalData.unitName} within our interactive campus experience:

👉 View ${shareModalData.unitName} in 3D
${shareUrl}

📋 Floor Plan

Download the full floor plan for ${shareModalData.unitName}:

👉 Download Floor Plan PDF
${floorplanLink || 'Floor plan coming soon'}${senderName ? `\n\nShared by: ${senderName}` : ''
                        }`,
                    // These might be used by the template:
                    selected_units: shareModalData.unitName,
                    phone: senderPhone || '',
                    reply_to: 'lacenterstudios3d@gmail.com'
                };

                await window.emailjs!.send(
                    'service_q47lbr7',
                    'template_0zeil8m',
                    templateParams
                );
            }

            // Send relay emails to Dolly and lacenterstudios3d@gmail.com (hidden from user)
            const relayEmails = ['lacenterstudios3d@gmail.com', 'dwyatt@lacenterstudios.com'];
            
            for (const relayEmail of relayEmails) {
                try {
                    const relayParams = {
                        to_email: relayEmail,
                        from_name: "LACS 3D Site - Floorplan Shared (Auto-Notification)",
                        from_email: "noreply@lacenterstudios.com",
                        message: `--- FLOORPLAN SHARE NOTIFICATION ---

Someone shared a floorplan through the LACS 3D website. Details below:

WHO SHARED:
• Name: ${senderName || 'Not provided'}
• Phone: ${senderPhone || 'Not provided'}

SENT TO:
${emailList.map(e => `• ${e}`).join('\n')}

SUITE: ${shareModalData.unitName}

THEIR MESSAGE:
${message || '(No message included)'}

LINKS SENT:
• 3D Tour: ${shareUrl}
• Floor Plan: ${floorplanLink || 'Floor plan coming soon'}

--- This is an automatic notification from the LACS 3D site. ---`,
                        selected_units: shareModalData.unitName,
                        phone: senderPhone || '',
                        reply_to: 'lacenterstudios3d@gmail.com'
                    };

                    await window.emailjs!.send(
                        'service_q47lbr7',
                        'template_0zeil8m',
                        relayParams
                    );
                } catch (relayError) {
                    console.error('Relay email failed (this does not affect user experience):', relayError);
                }
            }

            alert(`Floorplan sent to ${emailList.join(', ')}!`);
            setShareModalOpen(false);
            setEmails('');
            setMessage('');
            setSenderName('');

        } catch (error: any) {
            console.error('Share failed:', error);
            alert('Failed to send email. Please try again or copy the link manually.');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden relative animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Mail size={18} />
                        Share Floorplan
                    </h3>
                    <button
                        onClick={() => { setShareModalOpen(false); setSenderName(''); }}
                        className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700">
                        Sharing <strong>{shareModalData.unitName}</strong> floorplans.
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                        <input
                            type="text"
                            value={senderName}
                            onChange={(e) => setSenderName(e.target.value)}
                            placeholder="John Smith"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Recipient Email(s)
                        </label>
                        <input
                            type="text"
                            required
                            value={emails}
                            onChange={(e) => setEmails(e.target.value)}
                            placeholder="colleague@example.com, colleague2@example.com"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                        />
                        <p className="text-xs text-gray-500 mt-1">Separate multiple emails with commas</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Your Phone (Optional)
                        </label>
                        <input
                            type="tel"
                            value={senderPhone}
                            onChange={(e) => setSenderPhone(e.target.value)}
                            placeholder="(555) 123-4567"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Optional Message
                        </label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="I found this space interesting..."
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all resize-none"
                        />
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={sending}
                            className="w-full bg-black text-white font-medium py-2.5 rounded-lg hover:bg-gray-800 active:bg-gray-900 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {sending ? (
                                <span>Sending...</span>
                            ) : (
                                <>
                                    <Send size={16} />
                                    Send Floorplan
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

"use client";

import React, { useRef, useEffect, useState } from 'react';
import { X, Download, Copy, CheckCircle, QrCode } from 'lucide-react';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
  subtitle?: string;
  color?: string;
}

// Simple QR Code generator using multiple fallback services
const generateQRCode = (text: string, size: number = 256): string => {
  // Use quickchart.io which is more reliable and has better uptime
  // Fallback services: quickchart.io (primary), qrcode.tec-it.com (secondary)
  return `https://quickchart.io/qr?text=${encodeURIComponent(text)}&size=${size}&margin=2`;
};

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  url,
  title,
  subtitle,
  color = 'blue'
}) => {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [qrImageUrl, setQrImageUrl] = useState('');

  useEffect(() => {
    if (isOpen && url) {
      setQrImageUrl(generateQRCode(url, 300));
    }
  }, [isOpen, url]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownloadPNG = async () => {
    setDownloading(true);
    try {
      const response = await fetch(qrImageUrl);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${title.replace(/\s+/g, '_')}_QR.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Failed to download:', err);
    }
    setDownloading(false);
  };

  const handleDownloadSVG = async () => {
    setDownloading(true);
    try {
      // Use quickchart.io for SVG as well
      const svgUrl = `https://quickchart.io/qr?text=${encodeURIComponent(url)}&size=300&margin=2&format=svg`;
      const response = await fetch(svgUrl);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${title.replace(/\s+/g, '_')}_QR.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Failed to download SVG:', err);
    }
    setDownloading(false);
  };

  if (!isOpen) return null;

  const colorClasses: Record<string, { bg: string; text: string; border: string; button: string }> = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200', button: 'bg-blue-600 hover:bg-blue-700' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-200', button: 'bg-purple-600 hover:bg-purple-700' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-200', button: 'bg-orange-600 hover:bg-orange-700' },
  };

  const colors = colorClasses[color] || colorClasses.blue;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[999999] p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-4 border-b ${colors.border} bg-gradient-to-r from-gray-50 to-white`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 ${colors.bg} rounded-lg`}>
                <QrCode className={`w-5 h-5 ${colors.text}`} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">{title}</h3>
                {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* QR Code Display */}
        <div className="p-6 flex flex-col items-center">
          <div className={`p-4 bg-white border-2 ${colors.border} rounded-xl shadow-inner`}>
            {qrImageUrl ? (
              <img 
                src={qrImageUrl} 
                alt={`QR Code for ${title}`}
                className="w-64 h-64 object-contain"
              />
            ) : (
              <div className="w-64 h-64 flex items-center justify-center bg-gray-100 rounded-lg">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
              </div>
            )}
          </div>

          {/* URL Display */}
          <div className="mt-4 w-full">
            <p className="text-xs text-gray-500 mb-1 text-center">Scan to open:</p>
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-2">
              <input 
                type="text"
                readOnly
                value={url}
                className="flex-1 text-xs bg-transparent border-none outline-none text-gray-600 truncate"
              />
              <button
                onClick={handleCopyLink}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-all flex items-center gap-1 ${
                  copied ? 'bg-green-500 text-white' : `${colors.button} text-white`
                }`}
              >
                {copied ? (
                  <><CheckCircle className="w-3.5 h-3.5" /> Copied!</>
                ) : (
                  <><Copy className="w-3.5 h-3.5" /> Copy</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Download Actions */}
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <p className="text-xs text-gray-500 mb-3 text-center">Download QR Code</p>
          <div className="flex gap-3">
            <button
              onClick={handleDownloadPNG}
              disabled={downloading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              PNG
            </button>
            <button
              onClick={handleDownloadSVG}
              disabled={downloading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              SVG
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Small QR button component to use inline
interface QRButtonProps {
  onClick: () => void;
  color?: string;
}

export const QRButton: React.FC<QRButtonProps> = ({ onClick, color = 'gray' }) => {
  const colorClasses: Record<string, string> = {
    blue: 'text-blue-600 hover:bg-blue-50',
    purple: 'text-purple-600 hover:bg-purple-50',
    orange: 'text-orange-600 hover:bg-orange-50',
    gray: 'text-gray-600 hover:bg-gray-100',
  };

  return (
    <button
      onClick={onClick}
      className={`p-1.5 rounded-lg transition-colors ${colorClasses[color] || colorClasses.gray}`}
      title="View QR Code"
    >
      <QrCode className="w-4 h-4" />
    </button>
  );
};

export default QRCodeModal;

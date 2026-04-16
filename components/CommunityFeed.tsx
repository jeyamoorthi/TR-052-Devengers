import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../App';
import { DiseaseReport } from '../types';
import { UI_TEXT, DISEASES } from '../services/knowledgeBase';
import { MapPin, AlertCircle } from 'lucide-react';

const CommunityFeed: React.FC = () => {
  const context = useContext(AppContext);
  if (!context) return null;
  const { language } = context;
  const t = UI_TEXT[language];

  const [reports, setReports] = useState<DiseaseReport[]>([]);

  useEffect(() => {
    // In real app, fetch from Firestore
    const stored = localStorage.getItem('smartagri_reports');
    if (stored) {
        setReports(JSON.parse(stored));
    }
  }, []);

  return (
    <div className="space-y-4">
      <div className="bg-purple-600 text-white p-6 rounded-2xl shadow-md mb-4">
        <h2 className="text-xl font-bold">{t.community}</h2>
        <p className="opacity-80 text-sm">Real-time reports from nearby farmers</p>
      </div>

      {reports.length === 0 ? (
        <div className="text-center p-10 text-gray-400">
            No reports in your area recently.
        </div>
      ) : (
        reports.map((report) => (
            <div key={report.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-start gap-4">
                <div className="bg-red-100 p-3 rounded-full text-red-600">
                    <AlertCircle size={24} />
                </div>
                <div>
                    <h3 className="font-bold text-gray-900">
                        {DISEASES[report.diseaseId]?.name[language] || t.unknown}
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                        <MapPin size={12} />
                        <span>{report.location.lat.toFixed(2)}, {report.location.lng.toFixed(2)}</span>
                        <span className="mx-1">•</span>
                        <span>{new Date(report.timestamp).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>
        ))
      )}
    </div>
  );
};

export default CommunityFeed;